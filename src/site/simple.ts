import { useEffect, useState } from "react";

/**
 * The simple version: no scene, no background layers, no stripes. Only the text and the diagrams. The choice is kept in
 * localStorage when it is available, and lasts for the visit when it is not.
 */
const KEY = "simple-version";

function read(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

function apply(on: boolean): void {
  document.documentElement.dataset.simple = on ? "true" : "false";
  window.dispatchEvent(new CustomEvent("simple-version", { detail: on }));
}

export function setSimple(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // storage can be blocked
  }
  apply(on);
}

/** The current choice. False on the server and on the first render, so the markup matches; set after hydration. */
export function useSimple(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const initial = read();
    setOn(initial);
    apply(initial);
    const listener = (event: Event) => setOn(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("simple-version", listener);
    return () => window.removeEventListener("simple-version", listener);
  }, []);
  return on;
}
