/**
 * The descent: four diagonal stripes sweep the screen while a project opens (scene S2). A person's action starts it,
 * never the scroll. With reduced motion, or in the simple version, there is no wipe and the page changes at once.
 */
const SWEEP_MS = 250;
const CLEAR_MS = 700;
let clear = 0;

const reduced = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const simple = (): boolean => typeof document !== "undefined" && document.documentElement.dataset.simple === "true";

/** Run `change` under the stripes, or straight away when motion is not wanted. */
export function descend(change: () => void): void {
  const wipe = typeof document === "undefined" ? null : document.getElementById("wipe");
  if (!wipe || reduced() || simple()) {
    change();
    return;
  }
  window.clearTimeout(clear);
  wipe.classList.remove("go");
  void wipe.offsetWidth; // restart the animation
  wipe.classList.add("go");
  window.setTimeout(change, SWEEP_MS);
  clear = window.setTimeout(() => wipe.classList.remove("go"), CLEAR_MS);
}
