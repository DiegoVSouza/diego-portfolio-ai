import { useCallback, useEffect, useRef, useState } from "react";
import { caseCards } from "../content/caseIndex";
import { Link, hrefFor, useRoute } from "./router";
import { useLang } from "./Shell";

/**
 * The metro line: one station per project, on a vertical line beside the page on a wide screen and as a bar at the
 * bottom of a narrow one. On a case it marks the open project; on the home it marks the project whose card is crossing
 * the middle of the screen. "Next" and "Previous", and the j and k keys, move one station. The same component announces
 * the current station, so it works with and without the 3D scene.
 */
export function MetroLine() {
  const { route, go } = useRoute();
  const { lang, t } = useLang();
  const [homeActive, setHomeActive] = useState(-1);
  const [announcement, setAnnouncement] = useState("");
  const last = useRef(-2);
  const onHome = false; // the home has its own menu (DistrictMenu)
  const onCase = route.page === "case";
  const active = onCase ? caseCards.findIndex((c) => c.slug === route.slug) : homeActive;
  const total = caseCards.length;

  // On the home, the active station follows the card that crosses the middle of the screen. No layout reads on scroll.
  useEffect(() => {
    if (!onHome || typeof IntersectionObserver === "undefined") return undefined;
    setHomeActive(-1);
    const seen = new Map<number, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(Number((entry.target as HTMLElement).dataset.metro), entry.isIntersecting);
        const open = [...seen.entries()].filter(([, on]) => on).map(([i]) => i);
        if (open.length) setHomeActive(Math.min(...open));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    caseCards.forEach((c, i) => {
      const el = document.getElementById(`project-${c.slug}`);
      if (el) {
        el.dataset.metro = String(i);
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [onHome, route.lang]);

  useEffect(() => {
    if (active < 0 || active === last.current) return;
    last.current = active;
    const card = caseCards[active]!;
    setAnnouncement(t.sceneAnnounce.replace("{n}", String(active + 1)).replace("{total}", String(total)).replace("{name}", card.name[lang]));
  }, [active, lang, t, total]);

  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  const goTo = useCallback(
    (index: number) => {
      const i = Math.min(total - 1, Math.max(0, index));
      const card = caseCards[i]!;
      if (onHome) {
        const el = document.getElementById(`project-${card.slug}`);
        // The scene's station for this card; cards in one row have stations a little apart, so centring the card is not enough.
        const station = Number(el?.dataset.stationY);
        if (Number.isFinite(station)) window.scrollTo({ top: station - window.innerHeight / 2, behavior: reduced() ? "auto" : "smooth" });
        else el?.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
      }
      else go(hrefFor({ page: "case", slug: card.slug }, lang));
    },
    [go, lang, onHome, total],
  );

  // j and k move one station, the keys the original scene used. They never fire while typing or with a modifier.
  useEffect(() => {
    if (!onHome && !onCase) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      if (document.querySelector("dialog[open]")) return;
      const k = event.key.toLowerCase();
      if (k === "j") goTo((active < 0 ? -1 : active) + 1);
      else if (k === "k") goTo((active < 0 ? 1 : active) - 1);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onHome, onCase, goTo, active]);

  if (!onCase) return null;
  const current = active >= 0 ? caseCards[active]! : null;
  return (
    <nav className="metro" aria-label={t.metroLabel} data-ready="true">
      <span className="sr" role="status" aria-live="polite">{announcement}</span>
      <ol className="metro-stations">
        {caseCards.map((c, i) => {
          const href = onCase ? hrefFor({ page: "case", slug: c.slug }, lang) : `#project-${c.slug}`;
          const body = (
            <>
              <span className="metro-dot" aria-hidden="true">{i === active ? "●" : "○"}</span>
              <span className="metro-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="metro-name">{c.name[lang]}</span>
            </>
          );
          return (
            <li key={c.slug} className={i === active ? "metro-on" : undefined}>
              {onCase ? (
                <Link to={href} aria-current={i === active ? "page" : undefined}>{body}</Link>
              ) : (
                <a
                  href={href}
                  aria-current={i === active ? "location" : undefined}
                  onClick={(event) => {
                    // Centre the card, as the scene does, so the station and the object agree.
                    event.preventDefault();
                    goTo(i);
                  }}
                >
                  {body}
                </a>
              )}
            </li>
          );
        })}
      </ol>
      <div className="metro-bar">
        <button type="button" className="tg" onClick={() => goTo((active < 0 ? 1 : active) - 1)} disabled={active <= 0} aria-label={t.metroPrev}>
          ◂
        </button>
        <span className="metro-now">{current ? `${String(active + 1).padStart(2, "0")} · ${current.name[lang]}` : t.projectsTitle}</span>
        <button type="button" className="tg" onClick={() => goTo((active < 0 ? -1 : active) + 1)} disabled={active >= total - 1} aria-label={t.metroNext}>
          ▸
        </button>
      </div>
    </nav>
  );
}
