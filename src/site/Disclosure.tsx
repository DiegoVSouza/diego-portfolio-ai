import { useEffect, useRef, type ReactNode } from "react";
import type { gsap as Gsap } from "gsap";

const reduced = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = (): boolean => typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * A native <details> with a smooth open and close. Without JavaScript it is a plain disclosure. GSAP loads after the
 * page is interactive (its own chunk, so it never counts toward first load); until then the toggle is instant. With
 * `hover`, a fine pointer opens it on enter and closes it on leave; keyboard and touch still use the summary, so nothing
 * depends on hover. Reduced motion toggles at once.
 */
export function Disclosure({ summary, hint, children, hover = false, defaultOpen = false, className = "" }: { summary: ReactNode; hint?: ReactNode; children: ReactNode; hover?: boolean; defaultOpen?: boolean; className?: string }) {
  const root = useRef<HTMLDetailsElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const gsap = useRef<typeof Gsap | null>(null);

  useEffect(() => {
    let alive = true;
    void import("gsap").then((m) => {
      if (alive) gsap.current = m.gsap;
    });
    const panel = body.current;
    return () => {
      alive = false;
      if (panel && gsap.current) gsap.current.killTweensOf(panel);
    };
  }, []);

  const open = () => {
    const el = root.current;
    const panel = body.current;
    const g = gsap.current;
    if (!el || !panel) return;
    if (el.open && !el.dataset.closing) return;
    delete el.dataset.closing;
    el.open = true;
    if (!g || reduced()) return;
    g.fromTo(panel, { height: 0, opacity: 0 }, { height: "auto", opacity: 1, duration: 0.45, ease: "power3.out", overwrite: true, onComplete: () => void g.set(panel, { clearProps: "height,opacity" }) });
  };

  const close = () => {
    const el = root.current;
    const panel = body.current;
    const g = gsap.current;
    if (!el || !panel || !el.open) return;
    if (!g || reduced()) {
      el.open = false;
      return;
    }
    el.dataset.closing = "1";
    g.to(panel, {
      height: 0,
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut",
      overwrite: true,
      onComplete: () => {
        el.open = false;
        delete el.dataset.closing;
        g.set(panel, { clearProps: "height,opacity" });
      },
    });
  };

  return (
    <details
      ref={root}
      className={`disclosure ${className}`.trim()}
      open={defaultOpen}
      onMouseEnter={hover ? () => canHover() && open() : undefined}
      onMouseLeave={hover ? () => canHover() && close() : undefined}
    >
      <summary
        onClick={(event) => {
          // Take over the toggle so it can animate; without this script the browser toggles it as usual.
          event.preventDefault();
          if (root.current?.open && !root.current.dataset.closing) close();
          else open();
        }}
      >
        <span className="disclosure-title">{summary}</span>
        {hint && <span className="disclosure-hint">{hint}</span>}
        <span className="disclosure-mark" aria-hidden="true" />
      </summary>
      <div className="disclosure-body" ref={body}>{children}</div>
    </details>
  );
}
