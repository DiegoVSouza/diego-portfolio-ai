import { render as mount, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import { preload } from "../site/pages";
import { parsePath } from "../site/router";
import { emitPulse, onPulse } from "./pulse";

const step = (id: string) => ({ id, agent: "classifier", project: "P01", model: "m", latencyMs: 400, tokens: 600, costUsd: 0.00006 });
const run = (id: string, n: number) => ({ id, at: "2026-10-31T10:00:00", steps: Array.from({ length: n }, (_, i) => step(`${id}-${i}`)) });

describe("scene events on the demo page", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("the channel delivers each event once to each listener and stops after unsubscribe", () => {
    const seen = vi.fn();
    const off = onPulse(seen);
    emitPulse();
    off();
    emitPulse();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("runs listed on arrival make no event, and a run that appears later makes one event per step", async () => {
    let polls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const body = String(url).includes("/api/status") ? { state: "awake" } : { runs: polls++ === 0 ? [run("r1", 4)] : [run("r2", 4), run("r1", 4)] };
      return { ok: true, json: async () => body };
    }));
    const pulses = vi.fn();
    const off = onPulse(pulses);
    await preload(parsePath("/demo/"));
    mount(<App url="/demo/" />);
    await waitFor(() => expect(screen.getAllByText("400 ms").length).toBeGreaterThan(0));
    expect(pulses).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8100);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(pulses).toHaveBeenCalledTimes(4);
    off();
  });
});
