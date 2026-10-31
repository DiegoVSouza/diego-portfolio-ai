import { json, type Context, type Env } from "../../_lib";

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

/**
 * GET /api/runs/latest. Returns recorded live runs: model, tokens, latency, cost estimate. No visitor text.
 * It serves the cached copy and never wakes the stack. A fresh copy is cached by whoever has seen the stack awake.
 */
export async function onRequestGet({ env }: Context<Env>): Promise<Response> {
  const cached = await env.DEMO_KV?.get("runs");
  if (!cached) return json({ runs: [] }, 200, { "cache-control": "public, max-age=30" });
  try {
    return json(sanitize(JSON.parse(cached)), 200, { "cache-control": "public, max-age=30" });
  } catch {
    return json({ runs: [] });
  }
}
