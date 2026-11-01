import { useEffect, useRef, type ReactNode } from "react";

/**
 * The diagram is the focus of its stop. It takes the full width (no sideways scroll), says where to click, and plays
 * itself once when it first comes into view, so the pulse is already moving when the visitor arrives. Reduced motion
 * and keyboard users keep the controls; nothing here is required to read it.
 */
export function FlowStage({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        // The first control of the diagram is Play.
        el.querySelector<HTMLButtonElement>(".flow-controls .flow-btn")?.click();
      },
      { threshold: 0.45 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flow-stage-wrap" ref={root} role="region" aria-label={label}>
      <p className="flow-hint"><span className="flow-hint-dot" aria-hidden="true" />{hint}</p>
      {children}
    </div>
  );
}
