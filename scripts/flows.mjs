// Flow pipeline (FLOW-001, FLOW-002, FLOW-003).
//   gen:     lay out every flow with ELK at build time and pin the repositories' commits.
//   check:   structure, scenario evidence, layout drift, and (when siblings exist) that each code/docs path exists at the pin.
//   mermaid: write docs/flows/<id>.mmd from the same data, for READMEs.
// elkjs is imported here, in Node, through colagem-ui/layout. It is never imported by anything under src/.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { flowToMermaid } from "colagem-ui";
import { layoutFlow } from "colagem-ui/layout";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const flowDir = join(root, "src/content/flows");
const out = join(root, "src/data/flows.generated.json");
const layoutDir = join(root, "src/data/flow-layouts");
const slugs = JSON.parse(readFileSync(join(root, "src/content/slugs.json"), "utf8"));

const flows = Object.fromEntries(
  readdirSync(flowDir).filter((f) => f.endsWith(".json")).map((f) => [f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(flowDir, f), "utf8"))]),
);

const repoDir = (key) => (key === "lab" ? join(root, "..", "..") : key === "p07" ? root : join(root, "..", key));
const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();
const hasSiblings = () => ["p00", "p01", "p02", "p03", "p04", "p05", "p06", "p08"].every((k) => existsSync(join(repoDir(k), ".git")));
const repoKeys = () => [...new Set(Object.values(flows).flatMap((f) => f.nodes.map((n) => n.repo).filter(Boolean)))].sort();

function structure() {
  const errors = [];
  const evidence = new Set(JSON.parse(readFileSync(join(root, "src/data/evidence.generated.json"), "utf8")).records.map((r) => r.id));
  for (const slug of ["system", ...slugs]) if (!flows[slug]) errors.push(`FLOW-001: no flow for ${slug}`);
  for (const [id, flow] of Object.entries(flows)) {
    const nodes = new Set(flow.nodes.map((n) => n.id));
    const edges = new Set(flow.edges.map((e) => `${e.from}>${e.to}`));
    for (const e of flow.edges) if (!nodes.has(e.from) || !nodes.has(e.to)) errors.push(`${id}: edge ${e.from}>${e.to} names a missing node`);
    for (const s of flow.scenes) {
      for (const n of s.nodes) if (!nodes.has(n)) errors.push(`${id}/${s.id}: unknown node ${n}`);
      for (const e of s.edges) if (!edges.has(e)) errors.push(`${id}/${s.id}: unknown edge ${e}`);
    }
    const scenes = new Set(flow.scenes.map((s) => s.id));
    for (const sc of flow.scenarios ?? []) {
      for (const s of sc.scenes) if (!scenes.has(s)) errors.push(`${id}/${sc.id}: unknown scene ${s}`);
      if (!evidence.has(sc.evidence)) errors.push(`FLOW-002: scenario ${id}/${sc.id} cites evidence ${sc.evidence}, which has no record`);
    }
    for (const step of Object.values(flow.runStep ?? {})) if (!nodes.has(step)) errors.push(`${id}: runStep names missing node ${step}`);
  }
  return errors;
}

function pinsFor(keys) {
  return Object.fromEntries(keys.map((k) => [k, git(repoDir(k), "rev-parse", "HEAD")]));
}

// One layout per flow, sized for the longer of the two labels, so either language fits its box and the data is not doubled.
function widest(flow) {
  const longer = (label) => ({ en: label.en.length >= label.pt.length ? label.en : label.pt, pt: label.pt });
  return { ...flow, nodes: flow.nodes.map((n) => ({ ...n, label: longer(n.label) })) };
}

async function layouts() {
  const result = {};
  for (const [id, flow] of Object.entries(flows)) result[id] = await layoutFlow(widest(flow), "en");
  return result;
}

function pathErrors(pins) {
  const errors = [];
  for (const [id, flow] of Object.entries(flows)) {
    for (const n of flow.nodes) {
      for (const field of ["code", "docs"]) {
        if (!n[field]) continue;
        if (!n.repo || !pins[n.repo]) {
          errors.push(`${id}/${n.id}: ${field} is set but the node has no repo`);
          continue;
        }
        try {
          execFileSync("git", ["-C", repoDir(n.repo), "cat-file", "-e", `${pins[n.repo]}:${n[field]}`], { stdio: "ignore" });
        } catch {
          errors.push(`FLOW-002: ${id}/${n.id} ${field} ${n.repo}:${n[field]} does not exist at ${pins[n.repo].slice(0, 8)}`);
        }
      }
    }
  }
  return errors;
}

const mode = process.argv[2];
const stable = (value) => JSON.stringify(value, null, 2) + "\n";

if (mode === "gen") {
  const errors = structure();
  if (errors.length || !hasSiblings()) {
    console.error(errors.join("\n") || "flows: sibling repositories are required to pin commits");
    process.exit(1);
  }
  const pins = pinsFor(repoKeys());
  const bad = pathErrors(pins);
  if (bad.length && !process.env.FLOWS_BOOTSTRAP) {
    console.error(bad.join("\n"));
    process.exit(1);
  }
  if (bad.length) console.warn(`flows: bootstrap run, ${bad.length} path(s) not checked; commit those files and run flow:gen again`);
  const pinDates = Object.fromEntries(Object.entries(pins).map(([k, c]) => [k, git(repoDir(k), "log", "-1", "--format=%cs", c)]));
  writeFileSync(out, stable({ pins, pinDates }));
  mkdirSync(layoutDir, { recursive: true });
  for (const [id, layout] of Object.entries(await layouts())) writeFileSync(join(layoutDir, `${id}.json`), stable(layout));
  console.log(`flows: ${Object.keys(flows).length} flows laid out, ${Object.keys(pins).length} repositories pinned`);
} else if (mode === "check") {
  const errors = structure();
  const current = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : null;
  if (!current) errors.push("flows: src/data/flows.generated.json is missing; run npm run flow:gen");
  else {
    for (const [id, layout] of Object.entries(await layouts())) {
      const file = join(layoutDir, `${id}.json`);
      if (!existsSync(file) || readFileSync(file, "utf8").replace(/\r\n/g, "\n") !== stable(layout)) errors.push(`flows: layout of ${id} drifted from its source; run npm run flow:gen`);
    }
    if (hasSiblings()) errors.push(...pathErrors(current.pins));
  }
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exit(1);
  }
  console.log(`flows: PASS (${Object.keys(flows).length} flows${hasSiblings() ? ", paths checked at the pins" : ", paths skipped: siblings absent"})`);
} else if (mode === "mermaid") {
  const dest = join(root, "docs/flows");
  mkdirSync(dest, { recursive: true });
  for (const [id, flow] of Object.entries(flows)) writeFileSync(join(dest, `${id}.mmd`), flowToMermaid(flow, "en"));
  console.log("flows: mermaid written to docs/flows");
} else {
  console.error("usage: flows.mjs gen|check|mermaid");
  process.exit(1);
}
