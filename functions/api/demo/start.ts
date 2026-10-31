import { MACHINES_API, json, listMachines, stackApps, type Context, type Env } from "../../_lib";

const PER_IP_PER_HOUR = 6;

/** Verifies the Turnstile token with Cloudflare. The secret never leaves this function. */
export async function verifyTurnstile(token: string, secret: string, ip: string | null, fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    return response.ok && ((await response.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}

/**
 * POST /api/demo/start. The only path that can start machines, and only after a human check, a kill-switch check
 * and a per-visitor limit. Machines start in the order given by STACK_APPS (dependency order).
 */
export async function onRequestPost({ request, env }: Context<Env>, fetcher: typeof fetch = fetch): Promise<Response> {
  const apps = stackApps(env);
  if (!env.FLY_WAKE_TOKEN || !env.TURNSTILE_SECRET || apps.length === 0) return json({ error: "not_configured" }, 503);
  if ((await env.DEMO_KV?.get("autostart_disabled")) === "1") return json({ error: "autostart_disabled" }, 503);

  let token: string;
  try {
    token = String(((await request.json()) as { token?: string }).token ?? "");
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const ip = request.headers.get("cf-connecting-ip");
  if (!token || !(await verifyTurnstile(token, env.TURNSTILE_SECRET, ip, fetcher))) return json({ error: "challenge_failed" }, 403);

  if (env.DEMO_KV && ip) {
    const key = `start:${ip}`;
    const used = Number((await env.DEMO_KV.get(key)) ?? "0");
    if (used >= PER_IP_PER_HOUR) return json({ error: "rate_limited" }, 429);
    await env.DEMO_KV.put(key, String(used + 1), { expirationTtl: 3600 });
  }

  const started: string[] = [];
  for (const app of apps) {
    const machines = await listMachines(app, env.FLY_WAKE_TOKEN, fetcher);
    if (!machines) return json({ error: "stack_unreachable", started }, 502);
    for (const m of machines.filter((x) => x.state === "stopped" || x.state === "suspended")) {
      const response = await fetcher(`${MACHINES_API}/apps/${encodeURIComponent(app)}/machines/${encodeURIComponent(m.id)}/start`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.FLY_WAKE_TOKEN}` },
      });
      if (!response.ok) return json({ error: "start_failed", app, started }, 502);
      started.push(app);
    }
  }
  return json({ started }, 202);
}
