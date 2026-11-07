import { describe, expect, it } from "vitest";
import { createFrameScheduler } from "./loop";

/** A tiny stand-in for requestAnimationFrame: requests queue up and a tick runs every request that was not cancelled. */
function fakeFrames() {
  let next = 1;
  const queue = new Map<number, (now: number) => void>();
  return {
    api: {
      request: (callback: (now: number) => void) => {
        queue.set(next, callback);
        return next++;
      },
      cancel: (id: number) => void queue.delete(id),
    },
    tick(now: number) {
      const due = [...queue.entries()];
      for (const [id, callback] of due) if (queue.has(id)) { queue.delete(id); callback(now); }
    },
    pending: () => queue.size,
  };
}

describe("frame scheduler", () => {
  it("draws once per tick even when the first draw is a direct call made while a request is pending", () => {
    const frames = fakeFrames();
    let draws = 0;
    const scheduler = createFrameScheduler(
      (now) => {
        scheduler.enter();
        draws += 1;
        void now;
        scheduler.schedule();
      },
      () => true,
      frames.api,
    );
    // Start-up as the scene does it: something asks for a frame, then the first frame is drawn directly.
    scheduler.schedule();
    scheduler.enter();
    draws += 1;
    scheduler.schedule();
    expect(frames.pending()).toBe(1);
    for (let tick = 1; tick <= 20; tick += 1) frames.tick(tick * 10);
    expect(draws).toBe(21);
  });
  it("does not request a frame when nothing is wanted, and not a second one while one is pending", () => {
    const frames = fakeFrames();
    let wanted = false;
    const scheduler = createFrameScheduler(() => undefined, () => wanted, frames.api);
    scheduler.schedule();
    expect(frames.pending()).toBe(0);
    wanted = true;
    scheduler.schedule();
    scheduler.schedule();
    expect(frames.pending()).toBe(1);
    scheduler.cancel();
    expect(frames.pending()).toBe(0);
  });
});
