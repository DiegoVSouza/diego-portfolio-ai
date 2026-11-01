import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import type { Lang } from "colagem-ui";
import { caseCards } from "../content/caseIndex";
import { preload } from "./pages";
import { descend } from "./wipe";

/** Real paths, prerendered: EN at the root, pt-BR under /pt/. */
export type Page = "home" | "demo" | "case" | "evidence" | "method" | "experience" | "design-system" | "not-found";
export interface Route {
  lang: Lang;
  page: Page;
  slug?: string;
}

const STATIC: Record<string, Page> = { "": "home", demo: "demo", evidence: "evidence", method: "method", experience: "experience", "design-system": "design-system" };

export function parsePath(pathname: string): Route {
  // A hash or a query string is not part of the route: /projects/agents/#numbers is the agents case.
  const parts = (pathname.split(/[?#]/)[0] ?? "").split("/").filter(Boolean);
  const lang: Lang = parts[0] === "pt" ? "pt" : "en";
  const rest = lang === "pt" ? parts.slice(1) : parts;
  if (rest.length === 0) return { lang, page: "home" };
  if (rest.length === 1 && STATIC[rest[0]!]) return { lang, page: STATIC[rest[0]!]! };
  if (rest.length === 2 && rest[0] === "projects" && caseCards.some((c) => c.slug === rest[1])) return { lang, page: "case", slug: rest[1]! };
  return { lang, page: "not-found" };
}

/** Pages that hold the live demo and may load Turnstile: they carry the looser policy (scripts/prerender.mjs). */
export const needsChallenge = (path: string): boolean => /^(\/pt)?\/(demo|projects\/supportops)\/?$/.test((path.split(/[?#]/)[0] ?? ""));

export function hrefFor(route: Pick<Route, "page" | "slug">, lang: Lang): string {
  const prefix = lang === "pt" ? "/pt" : "";
  switch (route.page) {
    case "home": return `${prefix}/`;
    case "case": return `${prefix}/projects/${route.slug}/`;
    case "not-found": return `${prefix}/`;
    default: return `${prefix}/${route.page}/`;
  }
}

export const allPaths = (): string[] => {
  const pages: Route["page"][] = ["home", "demo", "evidence", "method", "experience", "design-system"];
  const out: string[] = [];
  for (const lang of ["en", "pt"] as Lang[]) {
    for (const page of pages) out.push(hrefFor({ page }, lang));
    for (const c of caseCards) out.push(hrefFor({ page: "case", slug: c.slug }, lang));
  }
  return out;
};

interface Ctx {
  route: Route;
  go: (path: string) => void;
}
const RouterContext = createContext<Ctx | null>(null);

export function RouterProvider({ initial, children }: { initial: string; children: ReactNode }) {
  const [path, setPath] = useState(initial);
  useEffect(() => {
    const onPop = () => void preload(parsePath(window.location.pathname)).then(() => setPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = useCallback((to: string) => {
    // The Content-Security-Policy is a <meta> in the document that was loaded first, and navigating in place does not
    // replace it. A page that needs the Turnstile origin must therefore be loaded as a document, or the script is
    // blocked and the widget never appears (found in production, 2026-11-01).
    if (needsChallenge(to) && !needsChallenge(window.location.pathname)) {
      // A full load cannot be avoided, but the stripes still cover it so opening a project always feels the same.
      descend(() => window.location.assign(to));
      return;
    }
    // Load the page's chunk first, then switch, so the old page stays up instead of a blank one.
    const target = parsePath(to);
    void preload(target).then(() => {
      const change = () => {
        window.history.pushState({}, "", to);
        setPath(to);
      };
      // Opening a project is the descent: the stripes cover the change. Everything else changes at once.
      if (target.page === "case") descend(change);
      else change();
    });
  }, []);
  const route = parsePath(path);
  useEffect(() => {
    document.documentElement.lang = route.lang === "pt" ? "pt-BR" : "en";
  }, [route.lang]);
  return <RouterContext.Provider value={{ route, go }}>{children}</RouterContext.Provider>;
}

export function useRoute(): Ctx {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("useRoute needs RouterProvider");
  return ctx;
}

/** A real anchor. A plain click navigates in place; modified clicks and other targets behave like links. */
export function Link({ to, children, ...rest }: { to: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const { go } = useRoute();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (/^(https?:)?\/\//.test(to)) return;
    event.preventDefault();
    go(to);
  };
  return (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  );
}
