/** Shared pieces of the Pages Functions. No secret is ever returned, logged or put in an error message. */

export interface KV {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  /** Read-only Fly token. Used by /api/status, which never starts anything. */
  FLY_READONLY_TOKEN?: string;
  /** Token allowed to start machines. Used only by /api/demo/start, after Turnstile. */
  FLY_WAKE_TOKEN?: string;
  /** Comma-separated app names in wake order, e.g. "db,redis,idp,p05". */
  STACK_APPS?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
  CONSOLE_URL?: string;
  /** JSON array of {role,user,password}. Demo accounts only; they are shown on the page by design. */
  DEMO_ACCOUNTS?: string;
  /** Base URL of the P05 API, for the sanitized run list. */
  P05_BASE?: string;
  DEMO_KV?: KV;
}

export interface Context<E = Env> {
  request: Request;
  env: E;
}

export const MACHINES_API = "https://api.machines.dev/v1";

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

export const stackApps = (env: Env): string[] => (env.STACK_APPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export interface Machine {
  id: string;
  state: string;
}

/** Listing machines is a control-plane read. It does not go through the Fly proxy, so it cannot wake anything. */
export async function listMachines(app: string, token: string, fetcher: typeof fetch = fetch): Promise<Machine[] | null> {
  try {
    const response = await fetcher(`${MACHINES_API}/apps/${encodeURIComponent(app)}/machines`, { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    return ((await response.json()) as { id: string; state: string }[]).map((m) => ({ id: m.id, state: m.state }));
  } catch {
    return null;
  }
}

export type StackState = "asleep" | "waking" | "awake" | "unknown";

export function summarize(states: (string[] | null)[]): StackState {
  if (states.length === 0 || states.some((s) => s === null)) return "unknown";
  const all = states.flat() as string[];
  if (all.length === 0) return "unknown";
  if (all.every((s) => s === "started")) return "awake";
  if (all.some((s) => s === "started" || s === "starting")) return "waking";
  return "asleep";
}
