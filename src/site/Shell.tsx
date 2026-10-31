import { SceneHost } from "../scene/SceneHost";
import { useEffect, type ReactNode } from "react";
import { AppFooter, AppHeader, Hud, Layers, SideIndex, SkipLink, useBackgroundMode, type Lang } from "colagem-ui";
import { caseCards } from "../content/caseIndex";
import { strings, type Strings } from "../content/ui";
import { Link, hrefFor, useRoute, type Route } from "./router";

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
  const { lang, t } = useLang();
  const link = (page: Route["page"], label: string) => (
    <Link to={hrefFor({ page }, lang)} aria-current={route.page === page ? "page" : undefined}>{label}</Link>
  );
  return (
    <AppHeader
      brand={t.brand}
      brandHref={hrefFor({ page: "home" }, lang)}
      navLabel={t.nav}
      nav={<>{link("demo", t.navDemo)}{link("evidence", t.navEvidence)}{link("method", t.navMethod)}{link("experience", t.navExperience)}</>}
    >
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
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, [route.page, route.slug]);
  return (
    <>
      <Layers ghost={ghost ?? "07"} />
      {route.page === "home" && <SceneHost mode={mode} slugs={caseCards.map((c) => c.slug)} />}
      <SkipLink>{t.skip}</SkipLink>
      <Header />
      {route.page === "case" && (
        <SideIndex
          label={t.projectsTitle}
          items={caseCards.map((c) => ({ id: c.slug, label: c.name[lang], href: hrefFor({ page: "case", slug: c.slug }, lang), active: c.slug === route.slug }))}
        />
      )}
      {hud && <Hud>{hud}</Hud>}
      <main id="main" className="wrap" tabIndex={-1}>{children}</main>
      <AppFooter credits={t.credits}>
        <p>
          <Link to={hrefFor({ page: "design-system" }, lang)}>{t.navDesign}</Link> · <a href="/llms.txt">llms.txt</a> · <a href="/resume.md">{t.resume}</a>
        </p>
      </AppFooter>
    </>
  );
}
