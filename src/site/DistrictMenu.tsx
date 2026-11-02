import { useCallback, useEffect, useRef, useState } from "react";
import { caseCards } from "../content/caseIndex";
import { districts, stops } from "../content/districts";
import { useLang } from "./Shell";

/** One move from stop to stop takes this long: the camera flies the whole way, so the visitor can enjoy the ride. */
const FLIGHT_MS = 2200;
/** Starts at once (a wheel turn must not wait) and glides to a stop: the long part of the trip is the arrival, not the take-off. */
const ease = (x: number) => 1 - Math.pow(1 - x, 3);
const setFlight = (on: boolean) => {
  if (on) document.documentElement.dataset.flight = "1";
  else delete document.documentElement.dataset.flight;
};

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

  // Where the last move is heading, and whether a flight is under way. A wheel turn or a key moves exactly one stop and is ignored while
  // a flight lasts (and until the wheel has been quiet for a moment, so a trackpad's long tail cannot start another).
  const heading = useRef(0);
  const flying = useRef(false);
  const frame = useRef(0);
  useEffect(() => {
    if (!flying.current) heading.current = active;
  }, [active]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      setFlight(false);
    },
    [],
  );
  const goTo = useCallback(
    (index: number) => {
      const i = Math.min(total - 1, Math.max(0, index));
      const el = document.getElementById(`s-${stops[i]!.id}`);
      if (!el) return;
      // The scene measures each section's middle and writes it here; without a scene the section's own middle is used.
      const station = Number(el.dataset.stationY);
      const top = Math.max(0, (Number.isFinite(station) && station > 0 ? station : el.getBoundingClientRect().top + window.scrollY + el.offsetHeight / 2) - window.innerHeight / 2);
      heading.current = i;
      cancelAnimationFrame(frame.current);
      const from = window.scrollY;
      // Without the city (or with reduced motion) the page scrolls the ordinary way.
      if (reduced() || document.documentElement.dataset.stage !== "3d") {
        flying.current = false;
        setFlight(false);
        window.scrollTo({ top, behavior: reduced() ? "auto" : "smooth" });
        return;
      }
      flying.current = true;
      // The scene reads this: during a flight the scroll position already carries the easing, so the camera follows it one to one.
      setFlight(true);
      const started = performance.now();
      const step = (now: number) => {
        const x = Math.min(1, (now - started) / FLIGHT_MS);
        window.scrollTo(0, from + (top - from) * ease(x));
        if (x < 1) frame.current = requestAnimationFrame(step);
        else {
          flying.current = false;
          setFlight(false);
        }
      };
      frame.current = requestAnimationFrame(step);
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
      // With the city running the home is a slide show: the arrows step one placa, as j and k do.
      const slides = document.documentElement.dataset.stage === "3d";
      const onControl = Boolean(target?.closest("button, a, summary, [role='button']"));
      const next = k === "j" || (slides && !onControl && (k === "arrowdown" || k === "arrowright" || k === "pagedown"));
      const prev = k === "k" || (slides && !onControl && (k === "arrowup" || k === "arrowleft" || k === "pageup"));
      // One stop per press: a press (or a held key) during a flight is swallowed.
      if (next || prev) {
        if (!flying.current) goTo(heading.current + (next ? 1 : -1));
      }
      else if (/^[1-9]$/.test(k) && Number(k) <= districts.length) goToDistrict(Number(k) - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  // A wheel turn moves one placa, never a free scroll: the city is a slide show.
  useEffect(() => {
    let lastWheel = 0;
    const onWheel = (event: WheelEvent) => {
      if (document.documentElement.dataset.stage !== "3d" || event.ctrlKey || Math.abs(event.deltaY) < 4) return;
      if (document.querySelector("dialog[open]")) return;
      // A card whose content scrolls on its own keeps its wheel.
      for (let el = event.target as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight + 2 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return;
      }
      event.preventDefault();
      const now = performance.now();
      const quiet = now - lastWheel > 160;
      lastWheel = now;
      if (flying.current || !quiet) return;
      goTo(heading.current + (event.deltaY > 0 ? 1 : -1));
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [goTo]);

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
