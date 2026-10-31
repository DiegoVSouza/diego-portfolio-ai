import { describe, expect, it, vi } from "vitest";
import { onRequestPost } from "./api/demo/start";
import { onRequestGet as latest, sanitize } from "./api/runs/latest";
import { onRequestGet as status } from "./api/status";
import type { Env, KV } from "./_lib";

function memoryKV(initial: Record<string, string> = {}): KV & { store: Map<string, string> } {
  const store = new Map(Object.entries(initial));
  return { store, get: async (k) => store.get(k) ?? null, put: async (k, v) => void store.set(k, v) };
}


/** A fake Fly and Turnstile. Records every call so a test can prove what was and was not requested. */
function fakeNetwork(machines: Record<string, { id: string; state: string }[]>, turnstile = true) {
  const calls: { method: string; url: string }[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    calls.push({ method, url });
    if (url.includes("siteverify")) return new Response(JSON.stringify({ success: turnstile }), { status: 200 });
    const list = /apps\/([^/]+)\/machines$/.exec(url);
    if (list) return new Response(JSON.stringify(machines[list[1]!] ?? []), { status: 200 });
    if (/\/start$/.test(url)) return new Response("{}", { status: 200 });
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
  return { fetcher, calls };
}

const env = (extra: Partial<Env> = {}): Env => ({ FLY_READONLY_TOKEN: "ro-token", FLY_WAKE_TOKEN: "wake-token", TURNSTILE_SECRET: "ts-secret", TURNSTILE_SITE_KEY: "site", STACK_APPS: "db,redis,idp,p05", ...extra });
const post = (token: unknown, headers: Record<string, string> = {}) =>
  new Request("https://site.test/api/demo/start", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9", ...headers }, body: JSON.stringify({ token }) });

describe("GET /api/status", () => {
  it("reads machine state with the read-only token and never starts anything (LIVE-004)", async () => {
    const { fetcher, calls } = fakeNetwork({ db: [{ id: "m1", state: "stopped" }], redis: [{ id: "m2", state: "stopped" }], idp: [{ id: "m3", state: "stopped" }], p05: [{ id: "m4", state: "stopped" }] });
    const reply = await status({ request: new Request("https://site.test/api/status"), env: env() }, fetcher);
    const body = await reply.json();
    expect(body.state).toBe("asleep");
    expect(body.services).toHaveLength(4);
    expect(calls.every((c) => c.method === "GET" && /\/machines$/.test(c.url))).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/ro-token|wake-token|ts-secret/);
    expect(reply.headers.get("cache-control")).toContain("max-age");
  });

  it("is awake only when every machine runs, waking when some do", async () => {
    const all = fakeNetwork({ db: [{ id: "a", state: "started" }], redis: [{ id: "b", state: "started" }], idp: [{ id: "c", state: "started" }], p05: [{ id: "d", state: "started" }] });
    expect((await (await status({ request: new Request("https://x.test"), env: env() }, all.fetcher)).json()).state).toBe("awake");
    const some = fakeNetwork({ db: [{ id: "a", state: "started" }], redis: [{ id: "b", state: "stopped" }], idp: [{ id: "c", state: "stopped" }], p05: [{ id: "d", state: "stopped" }] });
    expect((await (await status({ request: new Request("https://x.test"), env: env() }, some.fetcher)).json()).state).toBe("waking");
  });

  it("says unknown, not asleep, when it cannot read the stack", async () => {
    const down = vi.fn(async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    expect((await (await status({ request: new Request("https://x.test"), env: env() }, down)).json()).state).toBe("unknown");
    expect((await (await status({ request: new Request("https://x.test"), env: env({ FLY_READONLY_TOKEN: undefined }) }, down)).json()).state).toBe("unknown");
  });

  it("reports the budget from KV, hides start when the kill switch is on, and survives bad JSON", async () => {
    const kv = memoryKV({ budget: JSON.stringify({ leftUsd: 7.5, ceilingUsd: 10 }), autostart_disabled: "1" });
    const { fetcher } = fakeNetwork({});
    const body = await (await status({ request: new Request("https://x.test"), env: env({ DEMO_KV: kv, DEMO_ACCOUNTS: "not json" }) }, fetcher)).json();
    expect(body.budget).toEqual({ leftUsd: 7.5, ceilingUsd: 10 });
    expect(body.startAvailable).toBe(false);
    expect(body.accounts).toEqual([]);
  });
});

describe("POST /api/demo/start", () => {
  it("refuses when it is not configured, and when the kill switch is on", async () => {
    const { fetcher, calls } = fakeNetwork({});
    expect((await onRequestPost({ request: post("t"), env: { STACK_APPS: "db" } }, fetcher)).status).toBe(503);
    expect((await onRequestPost({ request: post("t"), env: env({ DEMO_KV: memoryKV({ autostart_disabled: "1" }) }) }, fetcher)).status).toBe(503);
    expect(calls).toEqual([]);
  });

  it("starts nothing when the challenge fails (SEC-001)", async () => {
    const { fetcher, calls } = fakeNetwork({ db: [{ id: "m1", state: "stopped" }] }, false);
    const reply = await onRequestPost({ request: post("bad"), env: env() }, fetcher);
    expect(reply.status).toBe(403);
    expect(calls.filter((c) => c.method === "POST" && c.url.endsWith("/start"))).toEqual([]);
    expect((await onRequestPost({ request: post(""), env: env() }, fetcher)).status).toBe(403);
  });

  it("starts stopped machines in dependency order and skips the ones already running", async () => {
    const { fetcher, calls } = fakeNetwork({ db: [{ id: "m1", state: "stopped" }], redis: [{ id: "m2", state: "started" }], idp: [{ id: "m3", state: "stopped" }], p05: [{ id: "m4", state: "stopped" }] });
    const reply = await onRequestPost({ request: post("good"), env: env() }, fetcher);
    expect(reply.status).toBe(202);
    expect((await reply.json()).started).toEqual(["db", "idp", "p05"]);
    const starts = calls.filter((c) => c.url.endsWith("/start")).map((c) => /apps\/([^/]+)\//.exec(c.url)![1]);
    expect(starts).toEqual(["db", "idp", "p05"]);
  });

  it("limits how often one visitor can start the stack", async () => {
    const kv = memoryKV();
    const { fetcher } = fakeNetwork({ db: [{ id: "m1", state: "started" }] });
    let last = 0;
    for (let i = 0; i < 8; i++) last = (await onRequestPost({ request: post("good"), env: env({ DEMO_KV: kv, STACK_APPS: "db" }) }, fetcher)).status;
    expect(last).toBe(429);
  });

  it("stops and reports when a machine cannot be started, never claiming success", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("siteverify")) return new Response(JSON.stringify({ success: true }));
      if (url.endsWith("/machines")) return new Response(JSON.stringify([{ id: "m1", state: "stopped" }]));
      return new Response("{}", { status: 500 });
    }) as unknown as typeof fetch;
    const reply = await onRequestPost({ request: post("good"), env: env({ STACK_APPS: "db,redis" }) }, fetcher);
    expect(reply.status).toBe(502);
    expect((await reply.json()).error).toBe("start_failed");
  });
});

describe("GET /api/runs/latest", () => {
  it("returns an empty list when nothing is recorded, and never fabricates a run", async () => {
    expect(await (await latest({ request: new Request("https://x.test"), env: {} })).json()).toEqual({ runs: [] });
  });

  it("keeps identifiers and numbers and drops any other field, including visitor text", async () => {
    const dirty = { runs: [{ id: "r1", at: "2026-10-31", visitorText: "my secret ticket", steps: [{ id: "s1", agent: "classifier", project: "P01", model: "m", latencyMs: 412, tokens: 960, costUsd: 0.0001, prompt: "hello", response: "world" }] }] };
    const kv = memoryKV({ runs: JSON.stringify(dirty) });
    const text = JSON.stringify(await (await latest({ request: new Request("https://x.test"), env: { DEMO_KV: kv } })).json());
    expect(text).toContain("412");
    expect(text).not.toMatch(/secret ticket|hello|world|visitorText|prompt|response/);
  });

  describe("refreshing from P05", () => {
    const env = (kv: ReturnType<typeof memoryKV>) => ({ DEMO_KV: kv, P05_BASE: "https://p05.test", P05_APP: "p05", FLY_READONLY_TOKEN: "r" });
    const run = { runs: [{ id: "r9", at: "2026-10-31T10:00:00", steps: [{ id: "1", agent: "classifier", project: "P01", model: "m", latencyMs: 400, tokens: 595, costUsd: 0.00006 }] }] };
    const fetcherFor = (state: string) =>
      vi.fn(async (url: string) => {
        if (url.includes("api.machines.dev")) return new Response(JSON.stringify([{ id: "m", state }]), { status: 200 });
        return new Response(JSON.stringify(run), { status: 200 });
      }) as unknown as typeof fetch;

    it("reads the P05 list and caches it when the machine is already started", async () => {
      const kv = memoryKV({});
      const body = await (await latest({ request: new Request("https://x.test"), env: env(kv) }, fetcherFor("started"))).json();
      expect(body.runs[0].id).toBe("r9");
      expect(await kv.get("runs")).toContain("r9");
    });

    it("never calls P05 when the machine is stopped, and serves the last cached run", async () => {
      const kv = memoryKV({ runs: JSON.stringify(run) });
      const fetcher = fetcherFor("stopped");
      const body = await (await latest({ request: new Request("https://x.test"), env: env(kv) }, fetcher)).json();
      expect(body.runs[0].id).toBe("r9");
      const urls = (fetcher as unknown as { mock: { calls: [string][] } }).mock.calls.map((c) => c[0]);
      expect(urls.some((u) => u.startsWith("https://p05.test"))).toBe(false);
    });
  });

  it("clamps garbage numbers to zero", () => {
    const out = sanitize({ runs: [{ id: "r", at: "x", steps: [{ latencyMs: -5, tokens: "NaN", costUsd: Infinity }] }] });
    expect(out.runs[0]!.steps[0]).toMatchObject({ latencyMs: 0, tokens: 0, costUsd: 0 });
  });
});

