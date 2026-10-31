import { describe, expect, it, vi } from "vitest";
import { estimateUsd, pricePerHour, runGuard, runSeconds, type FlyMachine, type KV } from "./index";

const HOUR = 3_600_000;
const kv = (): KV & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, get: async (k) => data.get(k) ?? null, put: async (k, v) => void data.set(k, v) };
};
const machine = (events: [string, number][], state = "stopped", memory_mb = 256): FlyMachine => ({
  id: "m1",
  state,
  config: { guest: { memory_mb, cpus: 1 } },
  events: events.map(([type, timestamp]) => ({ type, timestamp })),
});

describe("cost guard (COST-001)", () => {
  it("counts start to exit and ignores time outside the window", () => {
    const m = machine([["start", 0], ["exit", 2 * HOUR]]);
    expect(runSeconds(m, 0, 10 * HOUR)).toBe(7200);
    expect(runSeconds(m, HOUR, 10 * HOUR)).toBe(3600);
  });
  it("counts a still-started machine up to now, and a stopped one not at all", () => {
    expect(runSeconds(machine([["start", 0]], "started"), 0, HOUR)).toBe(3600);
    expect(runSeconds(machine([["start", 0]], "stopped"), 0, HOUR)).toBe(0);
  });
  it("prices by memory and rounds up to the next size", () => {
    expect(pricePerHour(256)).toBeLessThan(pricePerHour(512));
    expect(pricePerHour(300)).toBe(pricePerHour(512));
  });
  it("estimates from machine size", () => {
    expect(estimateUsd([machine([["start", 0], ["exit", HOUR]])], 0, 2 * HOUR)).toBeCloseTo(pricePerHour(256), 6);
  });

  const respond = (machines: FlyMachine[]) =>
    vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "POST") return new Response("{}", { status: 200 });
      void url;
      return new Response(JSON.stringify(machines), { status: 200 });
    }) as unknown as typeof fetch;

  it("writes the budget and leaves autostart on below the ceiling", async () => {
    const store = kv();
    const result = await runGuard({ FLY_READONLY_TOKEN: "r", STACK_APPS: "a", DEMO_KV: store, COUNT_FROM: new Date(0).toISOString() }, 2 * HOUR, respond([machine([["start", 0], ["exit", HOUR]])]));
    expect(result.tripped).toBe(false);
    expect(store.data.get("autostart_disabled")).toBe("0");
    expect(JSON.parse(store.data.get("budget")!).ceilingUsd).toBe(5);
  });
  it("trips at the ceiling: disables autostart and stops running machines", async () => {
    const store = kv();
    const fetcher = respond([machine([["start", 0]], "started", 1024)]);
    const result = await runGuard({ FLY_READONLY_TOKEN: "r", FLY_STOP_TOKEN: "w", STACK_APPS: "a", FLY_CEILING_USD: "1", DEMO_KV: store, COUNT_FROM: new Date(0).toISOString() }, 1000 * HOUR, fetcher);
    expect(result.tripped).toBe(true);
    expect(result.stopped).toBe(1);
    expect(store.data.get("autostart_disabled")).toBe("1");
  });
  it("fails closed when it cannot see the stack", async () => {
    const store = kv();
    const down = vi.fn(async () => new Response("", { status: 500 })) as unknown as typeof fetch;
    expect((await runGuard({ FLY_READONLY_TOKEN: "r", STACK_APPS: "a", DEMO_KV: store }, 1, down)).ok).toBe(false);
    expect(store.data.get("autostart_disabled")).toBe("1");
    const none = kv();
    expect((await runGuard({ DEMO_KV: none })).ok).toBe(false);
    expect(none.data.get("autostart_disabled")).toBe("1");
  });
});
