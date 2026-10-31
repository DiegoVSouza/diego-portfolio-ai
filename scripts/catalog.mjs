// Builds src/data/catalog.generated.json from sibling projects' docs/harness/feature_list.json.
// gen: write the file. check: compare with a fresh build; skip when siblings are absent.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const out = join(root, "src/data/catalog.generated.json");
const ids = ["p00", "p01", "p02", "p03", "p04", "p05", "p06"];
// Public repository of each project. Pinned here because a clone's own origin is a local path, and the
// catalog must not change with where it was built.
const OWNER = "https://github.com/DiegoVSouza";
const REPOS = {
  p00: "supportops-foundation",
  p01: "supportops-agents",
  p02: "supportops-ai-toolkit",
  p03: "supportops-observability",
  p04: "supportops-async",
  p05: "supportops-platform",
  p06: "supportops-console",
};

// verified: only PASS/complete words. partial: PASS plus a PENDING/INCOMPLETE/FAIL token. open: no PASS.
export function classify(status) {
  if (!status) return "unrecorded";
  const text = String(status);
  const hasPass = /\bPASS|^complete/i.test(text);
  const hasOpen = /PENDING|INCOMPLETE|FAIL|incomplete/.test(text);
  if (hasPass && !hasOpen) return "verified";
  if (hasPass && hasOpen) return "partial";
  return "open";
}

function meta(id) {
  const dir = join(root, "..", id);
  let version = "";
  for (const [name, re] of [["pyproject.toml", /^version\s*=\s*"([^"]+)"/m], ["package.json", /"version":\s*"([^"]+)"/]]) {
    const file = join(dir, name);
    if (existsSync(file)) version = re.exec(readFileSync(file, "utf8"))?.[1] ?? version;
  }
  return { version, repo: `${OWNER}/${REPOS[id]}` };
}

function build() {
  const projects = {};
  const info = {};
  for (const id of ids) {
    const file = join(root, "..", id, "docs/harness/feature_list.json");
    if (!existsSync(file)) return null;
    info[id] = meta(id);
    const list = JSON.parse(readFileSync(file, "utf8")).features;
    projects[id] = list.map((f) => {
      const boolean = f.status == null && typeof f.passes === "boolean";
      const status = boolean ? `passes: ${f.passes}` : f.status == null ? "" : String(f.status);
      return {
        id: String(f.id),
        description: String(f.description ?? f.detail ?? ""),
        status,
        evidence: String(f.evidence ?? ""),
        // a bare passes flag with no evidence is the project's own claim, not verified here
        state: boolean ? (f.passes && !f.evidence ? "claimed" : f.passes ? "verified" : "open") : classify(f.status),
      };
    });
  }
  return { meta: info, projects };
}

const mode = process.argv[2];
const fresh = build();
if (mode === "gen") {
  if (!fresh) {
    console.error("catalog: sibling projects not found next to p07; cannot generate");
    process.exit(1);
  }
  writeFileSync(out, JSON.stringify(fresh, null, 2) + "\n");
  console.log("catalog: written");
} else if (mode === "check") {
  if (!fresh) {
    console.log("catalog: skipped (sibling projects absent)");
  } else if (!existsSync(out) || readFileSync(out, "utf8").replace(/\r\n/g, "\n") !== JSON.stringify(fresh, null, 2) + "\n") {
    console.error("catalog: src/data/catalog.generated.json is stale; run npm run catalog:gen");
    process.exit(1);
  } else {
    console.log("catalog: PASS");
  }
} else {
  console.error("usage: catalog.mjs gen|check");
  process.exit(1);
}
