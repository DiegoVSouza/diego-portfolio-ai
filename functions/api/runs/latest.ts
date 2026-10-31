import { json, listMachines, type Context, type Env } from "../../_lib";

export interface PublicStep {
  id: string;
  agent: string;
  project: string;
  model: string;
  latencyMs: number;
  tokens: number;
  costUsd: number;
}

const str = (v: unknown, max = 80): string => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);

/** Keep only the numeric and identifier fields. Anything else, including any text a visitor wrote, is dropped. */
export function sanitize(raw: unknown): { runs: { id: string; at: string; steps: PublicStep[] }[] } {
  const runs = Array.isArray((raw as { runs?: unknown })?.runs) ? ((raw as { runs: unknown[] }).runs) : [];
  return {
    runs: runs.slice(0, 5).map((r) => {
      const run = r as { id?: unknown; at?: unknown; steps?: unknown };
      const steps = Array.isArray(run.steps) ? run.steps : [];
      return {
        id: str(run.id),
        at: str(run.at, 30),
        steps: steps.slice(0, 12).map((s, i) => {
          const step = s as Record<string, unknown>;
          return {
            id: str(step.id) || String(i),
            agent: str(step.agent),
            project: str(step.project, 20),
            model: str(step.model),
            latencyMs: num(step.latencyMs),
            tokens: num(step.tokens),
            costUsd: num(step.costUsd),
          };
        }),
      };
    }),
  };
}

const KEEP_SECONDS = 30 * 86_400;

/**
 * GET /api/runs/latest. Returns recorded live runs: model, tokens, latency, cost estimate. No visitor text.
 * It never wakes the stack. When the read-only token shows the P05 machine already started, it reads the public
 * P05 list and refreshes the cache; otherwise it serves the cached copy, which is the last real run.
 */
export async function onRequestGet({ env }: Context<Env>, fetcher: typeof fetch = fetch): Promise<Response> {
  const headers = { "cache-control": "public, max-age=15" };
  const app = env.P05_APP;
  if (env.P05_BASE && app && env.FLY_READONLY_TOKEN) {
    const machines = await listMachines(app, env.FLY_READONLY_TOKEN, fetcher);
    if (machines && machines.length > 0 && machines.every((m) => m.state === "started")) {
      try {
        const response = await fetcher(`${env.P05_BASE.replace(/\/$/, "")}/v1/demo/runs`);
        if (response.ok) {
          const fresh = sanitize(await response.json());
          if (fresh.runs.length > 0) await env.DEMO_KV?.put("runs", JSON.stringify(fresh), { expirationTtl: KEEP_SECONDS });
          if (fresh.runs.length > 0) return json(fresh, 200, headers);
        }
      } catch {
        // fall through to the cached copy
      }
    }
  }
  const cached = await env.DEMO_KV?.get("runs");
  if (!cached) return json({ runs: [] }, 200, headers);
  try {
    return json(sanitize(JSON.parse(cached)), 200, headers);
  } catch {
    return json({ runs: [] });
  }
}
