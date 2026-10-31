/**
 * Cost guard (COST-001). A scheduled Worker, separate from the Pages project so that its write token is never
 * reachable from a request a visitor can make.
 *
 * Every run it:
 *  1. lists the stack machines with a read-only token (a control-plane call, it wakes nothing),
 *  2. estimates compute spend from the `start` / `exit` / `stop` events and the machine size,
 *  3. writes `budget` to KV, which /api/status shows,
 *  4. at or above the ceiling sets `autostart_disabled` and stops every running machine with the write token.
 *
 * The number is an estimate from machine events at list prices, not the invoice. The Fly dashboard is the source
 * of truth. Prices below are conservative list prices and are PENDING a check against Fly's pricing page.
 */

export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface GuardEnv {
  FLY_READONLY_TOKEN?: string;
  /** Used only to stop machines when the ceiling is reached. */
  FLY_STOP_TOKEN?: string;
  STACK_APPS?: string;
  /** Ceiling for Fly compute, in USD. Default 5, the owner's limit. */
  FLY_CEILING_USD?: string;
  /** Spend is counted from this instant (ISO). Everything before it was paid for before the portfolio went live. */
  COUNT_FROM?: string;
  DEMO_KV?: KV;
}

export interface FlyEvent {
  type: string;
  timestamp: number;
}
export interface FlyMachine {
  id: string;
  state: string;
  config?: { guest?: { memory_mb?: number; cpus?: number; cpu_kind?: string } };
  events?: FlyEvent[];
}

const MACHINES_API = "https://api.machines.dev/v1";

/** USD per machine-hour for shared-cpu-1x, by memory in MB. Rounded up on purpose: the guard should trip early, not late. */
const PER_HOUR_USD: [number, number][] = [
  [256, 0.0030],
  [512, 0.0046],
  [1024, 0.0082],
  [2048, 0.0150],
];

export function pricePerHour(memoryMb: number, cpus = 1): number {
  const row = PER_HOUR_USD.find(([mb]) => memoryMb <= mb) ?? PER_HOUR_USD[PER_HOUR_USD.length - 1]!;
  return row[1] * Math.max(1, cpus);
}

/** Seconds a machine ran inside [from, now], from its event log. A `start` with no later end counts to `now` if it is still started. */
export function runSeconds(machine: FlyMachine, from: number, now: number): number {
  const events = [...(machine.events ?? [])].filter((e) => ["start", "exit", "stop"].includes(e.type)).sort((a, b) => a.timestamp - b.timestamp);
  let total = 0;
  let open: number | null = null;
  for (const e of events) {
    if (e.type === "start") open = open ?? e.timestamp;
    else if (open !== null) {
      total += Math.max(0, Math.min(e.timestamp, now) - Math.max(open, from));
      open = null;
    }
  }
  if (open !== null && machine.state === "started") total += Math.max(0, now - Math.max(open, from));
  return total / 1000;
}

export function estimateUsd(machines: FlyMachine[], from: number, now: number): number {
  return machines.reduce((sum, m) => {
    const guest = m.config?.guest ?? {};
    return sum + (runSeconds(m, from, now) / 3600) * pricePerHour(guest.memory_mb ?? 512, guest.cpus ?? 1);
  }, 0);
}

async function list(app: string, token: string, fetcher: typeof fetch): Promise<FlyMachine[] | null> {
  try {
    const r = await fetcher(`${MACHINES_API}/apps/${encodeURIComponent(app)}/machines`, { headers: { authorization: `Bearer ${token}` } });
    return r.ok ? ((await r.json()) as FlyMachine[]) : null;
  } catch {
    return null;
  }
}

export interface GuardResult {
  spentUsd: number;
  ceilingUsd: number;
  tripped: boolean;
  stopped: number;
  ok: boolean;
}

export async function runGuard(env: GuardEnv, now: number = Date.now(), fetcher: typeof fetch = fetch): Promise<GuardResult> {
  const ceiling = Number(env.FLY_CEILING_USD ?? "5");
  const apps = (env.STACK_APPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const from = env.COUNT_FROM ? Date.parse(env.COUNT_FROM) : now - 30 * 86_400_000;
  // Fail closed: with no token or no app list the guard cannot see spend, so it must not leave autostart on.
  if (!env.FLY_READONLY_TOKEN || apps.length === 0 || !Number.isFinite(ceiling) || ceiling <= 0 || !Number.isFinite(from)) {
    await env.DEMO_KV?.put("autostart_disabled", "1");
    return { spentUsd: NaN, ceilingUsd: ceiling, tripped: true, stopped: 0, ok: false };
  }
  const lists = await Promise.all(apps.map((a) => list(a, env.FLY_READONLY_TOKEN!, fetcher)));
  if (lists.some((l) => l === null)) {
    await env.DEMO_KV?.put("autostart_disabled", "1");
    return { spentUsd: NaN, ceilingUsd: ceiling, tripped: true, stopped: 0, ok: false };
  }
  const machines = lists.flatMap((l, i) => (l as FlyMachine[]).map((m) => ({ app: apps[i]!, m })));
  const spent = estimateUsd(machines.map((x) => x.m), from, now);
  const tripped = spent >= ceiling;
  let stopped = 0;
  if (tripped) {
    await env.DEMO_KV?.put("autostart_disabled", "1");
    if (env.FLY_STOP_TOKEN) {
      for (const { app, m } of machines.filter((x) => x.m.state === "started" || x.m.state === "starting")) {
        const r = await fetcher(`${MACHINES_API}/apps/${encodeURIComponent(app)}/machines/${encodeURIComponent(m.id)}/stop`, {
          method: "POST",
          headers: { authorization: `Bearer ${env.FLY_STOP_TOKEN}` },
        });
        if (r.ok) stopped += 1;
      }
    }
  } else {
    await env.DEMO_KV?.put("autostart_disabled", "0");
  }
  await env.DEMO_KV?.put("budget", JSON.stringify({ leftUsd: Math.max(0, +(ceiling - spent).toFixed(2)), ceilingUsd: ceiling }));
  return { spentUsd: spent, ceilingUsd: ceiling, tripped, stopped, ok: true };
}

export default {
  async scheduled(_event: unknown, env: GuardEnv): Promise<void> {
    await runGuard(env);
  },
};
