import type { ComponentType } from "react";
import { caseSlugs, loadCase } from "../content/cases";
import { loadFlows } from "../content/flows";
import type { Page, Route } from "./router";

/**
 * Each page is its own chunk (PERF-001). The prerendered HTML names the chunk for its route in a modulepreload link,
 * and the client waits for it before hydrating, so the server markup is never replaced by an empty fallback.
 */
type Loader = () => Promise<ComponentType<{ slug?: string }>>;

const loaders: Record<Page, Loader> = {
  home: () => import("../pages/Home").then((m) => m.Home),
  demo: () => import("../pages/Demo").then((m) => m.DemoPage),
  case: () => import("../pages/Case").then((m) => m.CasePage as ComponentType<{ slug?: string }>),
  evidence: () => import("../pages/Evidence").then((m) => m.EvidencePage),
  method: () => import("../pages/Method").then((m) => m.MethodPage),
  experience: () => import("../pages/Experience").then((m) => m.ExperiencePage),
  "design-system": () => import("../pages/DesignSystem").then((m) => m.DesignSystemPage),
  "not-found": () => import("../pages/NotFound").then((m) => m.NotFound),
};

const loaded = new Map<Page, ComponentType<{ slug?: string }>>();

/** Flows a page draws. */
const flowsFor = (route: Pick<Route, "page" | "slug">): string[] =>
  route.page === "home" || route.page === "demo" ? ["system"] : route.page === "method" ? ["harness"] : route.page === "case" && route.slug ? [route.slug] : [];

/** Load everything a route needs before it renders: its page chunk, its case text and its flows. */
export async function preload(route: Pick<Route, "page" | "slug">): Promise<void> {
  if (!loaded.has(route.page)) loaded.set(route.page, await loaders[route.page]());
  if (route.page === "case" && route.slug && caseSlugs.includes(route.slug)) await loadCase(route.slug);
  await loadFlows(flowsFor(route));
}

export function pageFor(route: Pick<Route, "page">): ComponentType<{ slug?: string }> | null {
  return loaded.get(route.page) ?? null;
}
