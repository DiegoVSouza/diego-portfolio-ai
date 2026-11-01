import { useEffect, useState, type ReactNode } from "react";
import { Link } from "./router";

export interface Step {
  /** Used in the hash: #demo, #flow, #readme. */
  id: string;
  label: string;
  /** Ids inside the step that older links used (#architecture, #decisions, #numbers). A hash naming one scrolls there. */
  legacy?: string[];
  /** What the visitor does when this stop ends: the label and target of its primary action. */
  next: { label: string; href: string };
  children: ReactNode;
}

/**
 * The stops of a project, stacked in reading order. Nothing is hidden: the server, a visitor without JavaScript and a
 * visitor with it all get the same three stops, each with its heading, its anchor and one "next" action at the end.
 * The rail at the top is a list of in-page links; with JavaScript it also marks the stop that is on screen.
 */
export function CaseSteps({ railLabel, position, steps }: { railLabel: string; position: string; steps: Step[] }) {
  const [current, setCurrent] = useState("");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set((entry.target as HTMLElement).id, entry.isIntersecting ? entry.intersectionRatio : 0);
        let best = "";
        let bestRatio = 0;
        for (const [id, ratio] of visible) if (ratio > bestRatio) [best, bestRatio] = [id, ratio];
        if (best) setCurrent(best);
      },
      { rootMargin: "-20% 0px -40% 0px", threshold: [0, 0.1, 0.3, 0.6, 1] },
    );
    for (const step of steps) {
      const el = document.getElementById(step.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [steps]);

  return (
    <>
      <nav className="step-rail" aria-label={railLabel}>
        <p className="step-pos">{position}</p>
        <ol>
          {steps.map((step, i) => (
            <li key={step.id}>
              <a href={`#${step.id}`} aria-current={current === step.id ? "step" : undefined}>
                <span className="step-n">{i + 1}</span> {step.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {steps.map((step, i) => (
        <section key={step.id} id={step.id} className="step" aria-labelledby={`${step.id}-h`}>
          <h2 id={`${step.id}-h`} className="step-h">
            <span className="step-n" aria-hidden="true">{i + 1}</span> {step.label}
          </h2>
          {step.children}
          <p className="step-next">
            {step.next.href.startsWith("#") ? <a className="btn" href={step.next.href}>{step.next.label}</a> : <Link className="btn" to={step.next.href}>{step.next.label}</Link>}
          </p>
        </section>
      ))}
    </>
  );
}
