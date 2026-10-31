import { createContext, useCallback, useContext, useEffect, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import type { Lang } from "colagem-ui";
import { caseCards } from "../content/caseIndex";
import { preload } from "./pages";

/** Real paths, prerendered: EN at the root, pt-BR under /pt/. */
export type Page = "home" | "demo" | "case" | "evidence" | "method" | "experience" | "design-system" | "not-found";
export interface Route {
  lang: Lang;
  page: Page;
  slug?: string;
}

const STATIC: Record<string, Page> = { "": "home", demo: "demo", evidence: "evidence", method: "method", experience: "experience", "design-system": "design-system" };

export function parsePath(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean);
  const lang: Lang = parts[0] === "pt" ? "pt" : "en";
  const rest = lang === "pt" ? parts.slice(1) : parts;
  if (rest.length === 0) return { lang, page: "home" };
  if (rest.length === 1 && STATIC[rest[0]!]) return { lang, page: STATIC[rest[0]!]! };
  if (rest.length === 2 && rest[0] === "projects" && caseCards.some((c) => c.slug === rest[1])) return { lang, page: "case", slug: rest[1]! };
  return { lang, page: "not-found" };
}

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
    // Load the page's chunk first, then switch, so the old page stays up instead of a blank one.
    void preload(parsePath(to)).then(() => {
      window.history.pushState({}, "", to);
      setPath(to);
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
