import type { ReactNode } from "react";

/**
 * A wide diagram keeps its text readable by staying wide and scrolling sideways inside this box. A scrollable region has
 * to be reachable by keyboard (axe: scrollable-region-focusable), so the box is focusable and named.
 */
export function FlowScroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flow-scroll" tabIndex={0} role="region" aria-label={label}>
      {children}
    </div>
  );
}
