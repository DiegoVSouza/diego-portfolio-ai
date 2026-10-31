import { renderToString } from "react-dom/server";
import { App } from "./App";
import { preload } from "./site/pages";
import { caseCards } from "./content/caseIndex";
import { allPaths, hrefFor, parsePath } from "./site/router";
import { strings } from "./content/ui";
import { profile } from "./content/profile";
import { resolve } from "./content/evidence";

export { allPaths };
export const route = parsePath;
export { llmsTxt, resumeMd } from "./content/textfiles";

export async function render(url: string): Promise<string> {
  await preload(parsePath(url));
  return renderToString(<App url={url} />);
}

/** Title, description and alternates for one prerendered path (SEO-001, I18N-001). */
export function head(url: string): { title: string; description: string; lang: string; alternates: { en: string; pt: string } } {
  const route = parsePath(url);
  const t = strings[route.lang];
  const c = route.page === "case" ? caseCards.find((x) => x.slug === route.slug) : undefined;
  const titles: Record<string, string> = {
    home: `${profile.name} · ${profile.title}`,
    demo: `${t.demoTitle} · ${profile.name}`,
    evidence: `${t.evidenceTitle} · ${profile.name}`,
    method: `${t.methodTitle} · ${profile.name}`,
    experience: `${t.experienceTitle} · ${profile.name}`,
    "design-system": `${t.dsTitle} · ${profile.name}`,
    "not-found": t.notFound,
  };
  const title = c ? `${c.name[route.lang]} · ${profile.name}` : (titles[route.page] ?? profile.name);
  const description = c ? resolve(c.outcome[route.lang]) : route.page === "home" ? t.heroLead : route.page === "demo" ? t.demoLead : route.page === "evidence" ? t.evidenceLead : route.page === "method" ? t.methodLead : route.page === "experience" ? t.experienceLead : t.dsLead;
  const key = { page: route.page, slug: route.slug };
  return { title, description, lang: route.lang === "pt" ? "pt-BR" : "en", alternates: { en: hrefFor(key, "en"), pt: hrefFor(key, "pt") } };
}
