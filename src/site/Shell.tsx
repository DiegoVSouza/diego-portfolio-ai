import { SceneHost } from "../scene/SceneHost";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { AppFooter, AppHeader, Hud, Layers, SkipLink, useBackgroundMode, type Lang } from "colagem-ui";
import { MetroLine } from "./MetroLine";
import { caseCards } from "../content/caseIndex";
import { strings, type Strings } from "../content/ui";
import { Link, hrefFor, useRoute, type Route } from "./router";

import { setSimple, useSimple } from "./simple";

const Palette = lazy(() => import("./Palette").then((m) => ({ default: m.Palette })));

/** The palette is an enhancement. It loads after hydration, in its own chunk, so it never counts toward first load. */
function LazyPalette() {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on ? (
    <Suspense fallback={null}>
      <Palette />
    </Suspense>
  ) : null;
}

export function useLang(): { lang: Lang; t: Strings } {
  const { route } = useRoute();
  return { lang: route.lang, t: strings[route.lang] };
}

/** Same page in the other language. */
function otherLanguage(route: Route, target: Lang): string {
  return hrefFor({ page: route.page, slug: route.slug }, target);
}

function Header() {
  const { route } = useRoute();
  const simple = useSimple();
  const { lang, t } = useLang();
  return (
    <AppHeader
      brand={t.brand}
      brandHref={hrefFor({ page: "home" }, lang)}
      navLabel={t.nav}
      nav={<Link to={`${hrefFor({ page: "case", slug: caseCards[0]!.slug }, lang)}#demo`} aria-current={route.page === "case" || route.page === "demo" ? "page" : undefined}>{t.navTour}</Link>}
    >
      <button type="button" className="tg simple-toggle" aria-pressed={simple} onClick={() => setSimple(!simple)}>
        {t.simpleVersion}
      </button>
      <nav aria-label={t.language} className="langs">
        <Link to={otherLanguage(route, "en")} className="tg" hrefLang="en" lang="en" aria-current={lang === "en" ? "true" : undefined}>EN</Link>
        <Link to={otherLanguage(route, "pt")} className="tg" hrefLang="pt-BR" lang="pt-BR" aria-current={lang === "pt" ? "true" : undefined}>PT</Link>
      </nav>
    </AppHeader>
  );
}

export function Shell({ children, hud, ghost }: { children: ReactNode; hud?: string; ghost?: string }) {
  const { route } = useRoute();
  const { lang, t } = useLang();
  const mode = useBackgroundMode();
  useEffect(() => {
    if (typeof window === "undefined") return;
    // A link with a hash (Back to the surface, the next stop of the trail, an old #numbers link) lands on its target;
    // any other change starts at the top.
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ block: route.page === "home" ? "center" : "start" });
    else window.scrollTo(0, 0);
  }, [route.page, route.slug]);
  return (
    <>
      <Layers ghost={ghost ?? "07"} />
      <div className="screen-dots" aria-hidden="true" />
      <div className="wipe" id="wipe" aria-hidden="true"><i /><i /><i /><i /></div>
      {(route.page === "home" || route.page === "demo" || route.page === "case") && <SceneHost mode={mode} slugs={caseCards.map((c) => c.slug)} focusSlug={route.page === "case" ? route.slug : undefined} />}
      <SkipLink>{t.skip}</SkipLink>
      <Header />
      <MetroLine />
      {hud && <Hud>{hud}</Hud>}
      <main id="main" className="wrap" tabIndex={-1} data-page={route.page}>{children}</main>
      <AppFooter credits={t.credits}>
        <p>
          <Link to={hrefFor({ page: "demo" }, lang)}>{t.navDemo}</Link> · <Link to={hrefFor({ page: "evidence" }, lang)}>{t.navEvidence}</Link> · <Link to={hrefFor({ page: "method" }, lang)}>{t.navMethod}</Link> · <Link to={hrefFor({ page: "experience" }, lang)}>{t.navExperience}</Link> · <Link to={hrefFor({ page: "design-system" }, lang)}>{t.navDesign}</Link> · <a href="/llms.txt">llms.txt</a> · <a href="/resume.md">{t.resume}</a>
        </p>
        <p><LazyPalette /></p>
      </AppFooter>
    </>
  );
}
