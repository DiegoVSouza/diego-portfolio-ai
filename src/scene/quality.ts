export type Quality = "auto" | "high" | "low";

export const SCALES = [1, 0.8, 0.65, 0.5];
const WARM_UP = 90;
const WINDOW = 45;
const SLOW = 0.027;
const FAST = 0.0175;
const RAISE_LOCK_MS = 6000;

/**
 * Adaptive resolution. After 90 warm-up frames (shader compile, first load) it averages 45 frames: slow drops one step
 * at once, fast raises one step only after a lock, so it does not oscillate.
 */
export function createQuality(onChange: () => void) {
  let level = 0;
  let mode: Quality = "auto";
  let warm = 0;
  let acc = 0;
  let frames = 0;
  let lockUntil = 0;
  return {
    get scale(): number {
      return mode === "high" ? SCALES[0]! : mode === "low" ? SCALES[2]! : SCALES[level]!;
    },
    set(next: Quality) {
      mode = next;
      if (next === "high") level = 0;
      else if (next === "low") level = 2;
      onChange();
    },
    /** Feed the real frame time in seconds. Frames longer than 250 ms (tab switches) are ignored. */
    sample(dt: number, now: number) {
      if (mode !== "auto" || dt > 0.25) return;
      if (++warm < WARM_UP) return;
      acc += dt;
      frames += 1;
      if (frames < WINDOW) return;
      const average = acc / frames;
      acc = 0;
      frames = 0;
      if (average > SLOW && level < SCALES.length - 1) {
        level += 1;
        lockUntil = now + RAISE_LOCK_MS;
        onChange();
      } else if (average < FAST && level > 0 && now > lockUntil) {
        level -= 1;
        lockUntil = now + RAISE_LOCK_MS;
        onChange();
      }
    },
  };
}
