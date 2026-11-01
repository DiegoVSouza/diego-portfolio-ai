import { useCallback, useEffect, useRef, useState } from "react";
import { caseCards } from "../content/caseIndex";
import { districts, stops } from "../content/districts";
import { useLang } from "./Shell";

const reduced = (): boolean => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The game menu of the home: one entry per district, the active one on a red shard with its projects listed under it, a description box, and
 * the keys. Choosing an entry scrolls to its stop, so the transition is the camera flying there (the scene reads the scroll). Nothing is
 * hijacked: the page scrolls natively, the menu only follows it and offers shortcuts. On a narrow screen it is a bar with previous and next.
 */
export function DistrictMenu() {
  const { lang, t } = useLang();
  const [active, setActive] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const last = useRef(-1);
  const total = stops.length;
  const stopTitle = (i: number): string => {
    const stop = stops[i]!;
    const card = stop.slug ? caseCards.find((c) => c.slug === stop.slug) : undefined;
    return card ? card.name[lang] : districts[stop.district]!.name[lang];
  };

  // The active stop follows the section that crosses the middle of the screen. No layout reads on scroll.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const seen = new Map<number, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(stops.findIndex((s) => `s-${s.id}` === entry.target.id), entry.isIntersecting);
        const open = [...seen.entries()].filter(([, on]) => on).map(([i]) => i);
        if (open.length) setActive(Math.min(...open));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    stops.forEach((s) => {
      const el = document.getElementById(`s-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (active === last.current) return;
    last.current = active;
    setAnnouncement(t.districtAnnounce.replace("{n}", String(active + 1)).replace("{total}", String(total)).replace("{name}", stopTitle(active)));
  }, [active, lang, t, total]);

  const goTo = useCallback(
    (index: number) => {
      const i = Math.min(total - 1, Math.max(0, index));
      const el = document.getElementById(`s-${stops[i]!.id}`);
      if (!el) return;
      // The scene measures each section's middle and writes it here; without a scene the section's own middle is used.
      const station = Number(el.dataset.stationY);
      const top = (Number.isFinite(station) && station > 0 ? station : el.getBoundingClientRect().top + window.scrollY + el.offsetHeight / 2) - window.innerHeight / 2;
      window.scrollTo({ top: Math.max(0, top), behavior: reduced() ? "auto" : "smooth" });
    },
    [total],
  );
  const goToDistrict = (d: number) => goTo(stops.findIndex((s) => s.district === d));

  // j and k step one stop, the number keys jump to a district. They never fire while typing, with a modifier, or over a dialog.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      const k = event.key.toLowerCase();
      if (k === "j") goTo(active + 1);
      else if (k === "k") goTo(active - 1);
      else if (/^[1-9]$/.test(k) && Number(k) <= districts.length) goToDistrict(Number(k) - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  const district = stops[active]!.district;
  const mates = stops.map((s, i) => ({ s, i })).filter((x) => x.s.district === district && x.s.slug);
  return (
    <nav className="districts" aria-label={t.districtsLabel}>
      <span className="sr" role="status" aria-live="polite">{announcement}</span>
      <p className="districts-prompt" aria-hidden="true">{t.menuPrompt}</p>
      <ol className="districts-list">
        {districts.map((d, i) => (
          <li key={d.id} className={i === district ? "on" : undefined}>
            <a
              href={`#s-${stops[stops.findIndex((s) => s.district === i)]!.id}`}
              aria-current={i === district ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                goToDistrict(i);
              }}
            >
              <span className="d-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="d-name">{d.name[lang]}</span>
            </a>
            {i === district && mates.length > 1 && (
              <ul className="d-sub">
                {mates.map(({ s, i: stopIndex }) => (
                  <li key={s.id} className={stopIndex === active ? "on" : undefined}>
                    <a
                      href={`#s-${s.id}`}
                      aria-current={stopIndex === active ? "step" : undefined}
                      onClick={(event) => {
                        event.preventDefault();
                        goTo(stopIndex);
                      }}
                    >
                      {stopTitle(stopIndex)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <p className="districts-desc" key={districts[district]!.id}>{districts[district]!.blurb[lang]}</p>
      <p className="districts-keys" aria-hidden="true">
        <kbd>J</kbd> <kbd>K</kbd> {t.menuKeys} <kbd>1</kbd>-<kbd>{districts.length}</kbd>
      </p>
      <div className="districts-bar">
        <button type="button" className="tg" onClick={() => goTo(active - 1)} disabled={active <= 0} aria-label={t.menuPrev}>◂</button>
        <span className="districts-now">{String(active + 1).padStart(2, "0")} · {stopTitle(active)}</span>
        <button type="button" className="tg" onClick={() => goTo(active + 1)} disabled={active >= total - 1} aria-label={t.menuNext}>▸</button>
      </div>
    </nav>
  );
}
