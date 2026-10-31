import type { Text } from "colagem-ui";
import { cardBySlug, type CaseCard } from "./caseIndex";

/**
 * Case text. Every digit that states a result must come through an `{ev:id}` token (EV-001).
 * Starting copy for outcome, summary and hook is the spec's "Project copy"; the rest is written from each repository's own record.
 */

export interface Decision {
  title: Text;
  body: Text;
  /** Where in the repository the decision lives. Turned into a permalink at the pinned commit. */
  code?: { repo: string; path: string };
  rejected: Text;
}

export interface Failure {
  what: Text;
  cause: Text;
  change: Text;
}

export interface CaseDetail {
  slug: string;
  summary: Text;
  tldr: { problem: Text; role: Text; stack: string; result: Text };
  decisions: Decision[];
  measured: string[];
  notMeasured: Text[];
  failures: Failure[];
  validate: { command: string; expected: Text };
  differently: Text;
  next: string;
}

const loaders: Record<string, () => Promise<CaseDetail>> = {
  "supportops": () => import("./cases/supportops").then((m) => m.detail),
  "foundation": () => import("./cases/foundation").then((m) => m.detail),
  "agents": () => import("./cases/agents").then((m) => m.detail),
  "toolkit": () => import("./cases/toolkit").then((m) => m.detail),
  "observability": () => import("./cases/observability").then((m) => m.detail),
  "async": () => import("./cases/async").then((m) => m.detail),
  "design-system": () => import("./cases/design-system").then((m) => m.detail),
  "harness": () => import("./cases/harness").then((m) => m.detail),
};

const loaded = new Map<string, CaseDetail>();

/** Case text is one chunk per case (PERF-001). The page's preload step loads it before the page renders. */
export async function loadCase(slug: string): Promise<void> {
  const load = loaders[slug];
  if (load && !loaded.has(slug)) loaded.set(slug, await load());
}

export const caseSlugs = Object.keys(loaders);

export type Case = CaseCard & CaseDetail;

/** Card and detail together, for the case page. Needs loadCase(slug) first. */
export const caseBySlug = (slug: string): Case | undefined => {
  const card = cardBySlug(slug);
  const detail = loaded.get(slug);
  return card && detail ? { ...card, ...detail } : undefined;
};
