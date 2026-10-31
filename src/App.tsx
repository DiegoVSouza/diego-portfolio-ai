import { caseCards } from "./content/caseIndex";
import { strings } from "./content/ui";
import { pageFor } from "./site/pages";
import { RouterProvider, useRoute, parsePath, type Route } from "./site/router";
import { Shell } from "./site/Shell";

function Page({ route }: { route: Route }) {
  const Component = pageFor(route);
  return Component ? <Component slug={route.slug} /> : null;
}

function hudFor(route: Route): string | undefined {
  const t = strings[route.lang];
  if (route.page === "case") {
    const index = caseCards.findIndex((c) => c.slug === route.slug);
    const c = caseCards[index];
    return c ? `${String(index + 1).padStart(2, "0")}/${String(caseCards.length).padStart(2, "0")} · ${c.group[route.lang]} · ${c.slug}` : undefined;
  }
  if (route.page === "demo") return t.navDemo;
  return undefined;
}

function Routes() {
  const { route } = useRoute();
  const c = route.page === "case" ? caseCards.find((x) => x.slug === route.slug) : undefined;
  return (
    <Shell hud={hudFor(route)} ghost={c?.n}>
      <Page route={route} />
    </Shell>
  );
}

export function App({ url }: { url: string }) {
  return (
    <RouterProvider initial={url}>
      <Routes />
    </RouterProvider>
  );
}

export { parsePath };
