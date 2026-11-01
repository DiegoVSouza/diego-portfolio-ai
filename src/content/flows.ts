import type { Flow, FlowLabels, FlowLayout, Lang } from "colagem-ui";
import { wrapLayout } from "./wrapLayout";
import generated from "../data/flows.generated.json";
import { strings } from "./ui";

/**
 * Each flow and its layout is its own chunk (PERF-001). The page's preload step calls loadFlows before rendering,
 * so getFlow and getLayout are synchronous for the server and for hydration.
 */
const flowFiles: Record<string, () => Promise<unknown>> = {
  system: () => import("./flows/system.json"),
  supportops: () => import("./flows/supportops.json"),
  foundation: () => import("./flows/foundation.json"),
  agents: () => import("./flows/agents.json"),
  toolkit: () => import("./flows/toolkit.json"),
  observability: () => import("./flows/observability.json"),
  async: () => import("./flows/async.json"),
  "design-system": () => import("./flows/design-system.json"),
  harness: () => import("./flows/harness.json"),
};
const layoutFiles: Record<string, () => Promise<unknown>> = Object.fromEntries(
  Object.keys(flowFiles).map((id) => [id, () => import(`../data/flow-layouts/${id}.json`)]),
);

const flowCache = new Map<string, Flow>();
const layoutCache = new Map<string, FlowLayout>();

export async function loadFlows(ids: string[]): Promise<void> {
  for (const id of ids) {
    if (flowCache.has(id)) continue;
    const [flow, layout] = await Promise.all([flowFiles[id]!(), layoutFiles[id]!()]);
    flowCache.set(id, (flow as { default: Flow }).default);
    layoutCache.set(id, wrapLayout((layout as { default: FlowLayout }).default));
  }
}

export const getFlow = (id: string): Flow => {
  const flow = flowCache.get(id);
  if (!flow) throw new Error(`flow ${id} is not loaded`);
  return flow;
};
export const getLayout = (id: string): FlowLayout => {
  const layout = layoutCache.get(id);
  if (!layout) throw new Error(`layout ${id} is not loaded`);
  return layout;
};

const data = generated as unknown as { pins: Record<string, string>; pinDates: Record<string, string> };

export const flowLabels = (lang: Lang): FlowLabels => {
  const f = strings[lang].flowLabels;
  return { ...f, step: (n, total) => `${f.step} ${n}/${total}` };
};

export const OWNER = "https://github.com/DiegoVSouza";
export const REPO_NAMES: Record<string, string> = {
  p00: "supportops-foundation",
  p01: "supportops-agents",
  p02: "supportops-ai-toolkit",
  p03: "supportops-observability",
  p04: "supportops-async",
  p05: "supportops-platform",
  p06: "supportops-console",
  p07: "diego-portfolio-ai",
  p08: "colagem-ui",
  lab: "ai-engineer-lab",
};

/** A link to a file at the exact commit the flows were checked against (LINK-001). */
export function pinnedLink(repoKey: string, path: string): string {
  const pin = data.pins[repoKey];
  const name = REPO_NAMES[repoKey];
  if (!pin || !name) return `${OWNER}/${name ?? repoKey}`;
  return `${OWNER}/${name}/blob/${pin}/${path}`;
}

export const pins = data.pins;
export const pinDates = data.pinDates;
