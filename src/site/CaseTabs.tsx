import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabPanel {
  /** Used in the hash: #demo, #architecture, #decisions, #numbers. */
  id: string;
  label: string;
  /** Element ids inside the panel. A link to one of them opens the panel that holds it. */
  anchors?: string[];
  children: ReactNode;
}

/**
 * Tabs as an enhancement. The server and a visitor without JavaScript get every panel stacked, in order, each with its own
 * heading, and no tab bar. With JavaScript the bar appears and one panel shows at a time; the choice lives in the hash, so a
 * link opens the right tab, and a link to an element inside a panel opens that panel.
 */
export function CaseTabs({ label, panels }: { label: string; panels: TabPanel[] }) {
  const [enhanced, setEnhanced] = useState(false);
  const [active, setActive] = useState(0);
  const base = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const fromHash = useCallback((): number => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return -1;
    return panels.findIndex((p) => p.id === hash || (p.anchors ?? []).includes(hash));
  }, [panels]);

  useEffect(() => {
    setEnhanced(true);
    const start = fromHash();
    if (start >= 0) setActive(start);
    const onHash = () => {
      const i = fromHash();
      if (i >= 0) setActive(i);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [fromHash]);

  const choose = (i: number, focus: boolean) => {
    setActive(i);
    try {
      window.history.replaceState(null, "", `#${panels[i]!.id}`);
    } catch {
      // history can be blocked in a sandbox; the tab still changes
    }
    if (focus) buttons.current[i]?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = panels.length - 1;
    const next = event.key === "ArrowRight" ? (i === last ? 0 : i + 1) : event.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : event.key === "Home" ? 0 : event.key === "End" ? last : -1;
    if (next < 0) return;
    event.preventDefault();
    choose(next, true);
  };

  return (
    <div className="case-tabs" data-enhanced={enhanced ? "true" : undefined}>
      {enhanced && (
        <div role="tablist" aria-label={label} className="tablist">
          {panels.map((panel, i) => (
            <button
              key={panel.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${base}-tab-${panel.id}`}
              aria-selected={i === active}
              aria-controls={`${base}-panel-${panel.id}`}
              tabIndex={i === active ? 0 : -1}
              className="tg"
              onClick={() => choose(i, false)}
              onKeyDown={(event) => onKey(event, i)}
            >
              {panel.label}
            </button>
          ))}
        </div>
      )}
      {panels.map((panel, i) => (
        <div
          key={panel.id}
          id={enhanced ? `${base}-panel-${panel.id}` : panel.id}
          className="case-panel"
          role={enhanced ? "tabpanel" : undefined}
          aria-labelledby={enhanced ? `${base}-tab-${panel.id}` : undefined}
          hidden={enhanced && i !== active}
        >
          {panel.children}
        </div>
      ))}
    </div>
  );
}
