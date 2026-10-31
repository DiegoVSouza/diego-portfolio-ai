import { json, listMachines, stackApps, summarize, type Context, type Env } from "../_lib";

/**
 * GET /api/status. Reads machine state with a read-only token and starts nothing (LIVE-004).
 * The answer is cached for a few seconds so a crowd cannot turn the status page into load on the Fly API.
 */
export async function onRequestGet({ env }: Context<Env>, fetcher: typeof fetch = fetch): Promise<Response> {
  const apps = stackApps(env);
  const token = env.FLY_READONLY_TOKEN;
  const services: { name: string; state: string }[] = [];
  let state: ReturnType<typeof summarize> = "unknown";
  if (token && apps.length > 0) {
    const lists = await Promise.all(apps.map((app) => listMachines(app, token, fetcher)));
    state = summarize(lists.map((l) => (l ? l.map((m) => m.state) : null)));
    apps.forEach((app, i) => {
      const machines = lists[i];
      services.push({ name: app, state: machines ? (machines.every((m) => m.state === "started") ? "started" : machines.some((m) => m.state === "started") ? "starting" : "stopped") : "unknown" });
    });
  }
  let budget: { leftUsd: number; ceilingUsd: number } | null = null;
  const raw = await env.DEMO_KV?.get("budget");
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { leftUsd?: number; ceilingUsd?: number };
      if (typeof parsed.leftUsd === "number" && typeof parsed.ceilingUsd === "number") budget = { leftUsd: parsed.leftUsd, ceilingUsd: parsed.ceilingUsd };
    } catch {
      budget = null;
    }
  }
  const disabled = (await env.DEMO_KV?.get("autostart_disabled")) === "1";
  let accounts: unknown = [];
  try {
    accounts = env.DEMO_ACCOUNTS ? JSON.parse(env.DEMO_ACCOUNTS) : [];
  } catch {
    accounts = [];
  }
  return json(
    {
      state,
      services,
      budget,
      turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null,
      consoleUrl: env.CONSOLE_URL ?? null,
      accounts,
      startAvailable: Boolean(env.FLY_WAKE_TOKEN && env.TURNSTILE_SECRET && apps.length > 0 && !disabled),
    },
    200,
    { "cache-control": "public, max-age=10" },
  );
}
