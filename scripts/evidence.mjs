// Builds src/data/evidence.generated.json from sibling repositories (EV-002).
//   gen:   write the file. Fails if a source file is missing, uncommitted, or does not match its pattern.
//   check: rebuild and compare. Skipped, as the catalog is, when the siblings are absent (a hosted runner).
// A value is copied from the source exactly as the pattern captures it. Nothing is typed by hand here.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const sources = JSON.parse(readFileSync(join(root, "src/content/evidence.sources.json"), "utf8"));
const out = join(root, "src/data/evidence.generated.json");
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

const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8" }).trim();

function pick(object, dotted) {
  return dotted.split(".").reduce((value, key) => (value == null ? undefined : value[key]), object);
}

/** `{a.b}` copies a value; `{a.0:2}` rounds a number to two decimals. */
export function fromJson(text, template) {
  const data = JSON.parse(text);
  return template.replace(/\{([^}:]+)(?::(\d+))?\}/g, (_, key, digits) => {
    const value = pick(data, key);
    if (value === undefined) throw new Error(`json path not found: ${key}`);
    return digits ? Number(value).toFixed(Number(digits)) : String(value);
  });
}

export function fromRegex(text, pattern, template) {
  const match = new RegExp(pattern).exec(text);
  if (!match) throw new Error(`pattern did not match: ${pattern}`);
  return template.replace(/\$(\d)/g, (_, n) => match[Number(n)] ?? "");
}

function build() {
  const records = [];
  for (const source of sources) {
    const dir = join(root, "..", source.repo);
    if (!existsSync(join(dir, ".git"))) return null;
    const file = join(dir, source.path);
    if (!existsSync(file)) throw new Error(`${source.id}: ${source.repo}/${source.path} is missing`);
    const commit = git(dir, "log", "-1", "--format=%H", "--", source.path);
    if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`${source.id}: ${source.path} is not committed in ${source.repo}`);
    if (git(dir, "status", "--porcelain", "--", source.path) !== "") throw new Error(`${source.id}: ${source.path} has uncommitted changes`);
    const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const { kind, template, pattern } = source.extract;
    const value = kind === "json" ? fromJson(text, template) : fromRegex(text, pattern, template);
    records.push({
      id: source.id,
      project: source.project,
      label: source.label,
      value,
      mode: source.mode,
      command: source.command,
      exitCode: source.exitCode,
      commit,
      path: source.path,
      repo: `${OWNER}/${REPOS[source.repo]}`,
      recordedAt: git(dir, "log", "-1", "--format=%cs", "--", source.path),
      ...(source.caveat ? { caveat: source.caveat } : {}),
    });
  }
  return { records: records.sort((a, b) => a.id.localeCompare(b.id)) };
}

if (process.argv[1] && process.argv[1].endsWith("evidence.mjs")) {
  const mode = process.argv[2];
  const fresh = build();
  const text = fresh ? JSON.stringify(fresh, null, 2) + "\n" : null;
  if (mode === "gen") {
    if (!text) {
      console.error("evidence: sibling repositories not found next to p07; cannot generate");
      process.exit(1);
    }
    writeFileSync(out, text);
    console.log(`evidence: ${fresh.records.length} records written`);
  } else if (mode === "check") {
    if (!text) console.log("evidence: skipped (sibling repositories absent)");
    else if (!existsSync(out) || readFileSync(out, "utf8").replace(/\r\n/g, "\n") !== text) {
      console.error("evidence: src/data/evidence.generated.json drifted from its sources; run npm run evidence:gen and review the diff");
      process.exit(1);
    } else console.log(`evidence: PASS (${fresh.records.length} records)`);
  } else {
    console.error("usage: evidence.mjs gen|check");
    process.exit(1);
  }
}
