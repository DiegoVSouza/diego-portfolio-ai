import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { caseCards } from "./content/caseIndex";
import { caseSlugs, loadCase, caseBySlug } from "./content/cases";
import { TOKEN, ev, evidence, modeLabel, resolve } from "./content/evidence";
import { loadFlows, getFlow } from "./content/flows";
import { strings } from "./content/ui";
import { parsePath, allPaths, hrefFor } from "./site/router";

const root = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Every string leaf in a value, with its path. */
function leaves(value: unknown, path = ""): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => leaves(v, `${path}[${i}]`));
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => leaves(v, `${path}.${k}`));
  return [];
}

describe("design system adoption (DS-001)", () => {
  it("no color literal in this repository's own sources", () => {
    const files = walk(join(root, "src")).filter((f) => /\.(css|tsx?)$/.test(f) && !/\.test\./.test(f));
    for (const f of files) {
      const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/href="#[^"]*"/g, "");
      expect(/#[0-9a-fA-F]{3,8}\b/.test(text), `${f} has a color literal`).toBe(false);
      expect(/\b(rgb|rgba|hsl|hsla)\(/.test(text), `${f} uses a color function`).toBe(false);
      expect(/border-radius/.test(text), `${f} rounds a corner`).toBe(false);
    }
  });

  it("the vendored colagem-ui tarball matches the pinned SHA-256", () => {
    const lock = JSON.parse(readFileSync(join(root, "docs/harness/sources.lock.json"), "utf8"))["colagem-ui"];
    const sha = createHash("sha256").update(readFileSync(join(root, lock.tarball))).digest("hex");
    expect(sha).toBe(lock.sha256);
  });
});

describe("numbers need evidence (EV-001, EV-003)", () => {
  // Project ids are labels, not claims. Dates in a code path or a version in a command are not results either.
  // Product names with a version (PostgreSQL 16) and 2D/3D are names, not results.
  const ALLOWED = /\bP0\d\b|\b[23]D\b|\bD2\b|\bPostgreSQL 16\b/g;

  it("no digit in case text outside an evidence token", async () => {
    for (const slug of caseSlugs) {
      await loadCase(slug);
      const c = caseBySlug(slug)!;
      const { validate, ...texts } = c as unknown as Record<string, unknown>;
      void validate;
      for (const [path, text] of leaves({ ...texts, expected: c.validate.expected })) {
        if (/^\.(slug|n|ids|repo|repoKey|next|stack)$/.test(path) || /\.stack$/.test(path) || path.startsWith(".measured[")) continue; // identifiers, ids and technology names
        if (/\.(code\.repo|code\.path)$/.test(path)) continue;
        const stripped = text.replace(TOKEN, "").replace(ALLOWED, "");
        expect(/\d/.test(stripped), `${slug}${path} has a digit with no evidence behind it: "${text.slice(0, 80)}"`).toBe(false);
      }
    }
  });

  it("no digit in the interface strings or the flows", async () => {
    for (const [lang, table] of Object.entries(strings)) {
      for (const [path, text] of leaves(table)) expect(/\d/.test(text.replace(ALLOWED, "")), `${lang}${path}: "${text}"`).toBe(false);
    }
    await loadFlows(["system", "supportops", "foundation", "agents", "toolkit", "observability", "async", "design-system", "harness"]);
    for (const id of ["system", "supportops", "foundation", "agents", "toolkit", "observability", "async", "design-system", "harness"]) {
      const flow = getFlow(id);
      const texts = leaves({ title: flow.title, nodes: flow.nodes.map((n) => ({ l: n.label, d: n.detail })), edges: flow.edges.map((e) => e.label), scenes: flow.scenes.map((s) => s.caption), scenarios: flow.scenarios?.map((s) => s.label) });
      for (const [path, text] of texts) expect(/\d/.test(text.replace(ALLOWED, "")), `${id}${path}: "${text}"`).toBe(false);
    }
  });

  it("every token names a real record, and every measured id exists", async () => {
    for (const slug of caseSlugs) {
      await loadCase(slug);
      const c = caseBySlug(slug)!;
      for (const id of c.measured) expect(() => ev(id)).not.toThrow();
      for (const [, text] of leaves(c)) for (const m of text.matchAll(TOKEN)) expect(() => ev(m[1]!), `${slug}: ${m[0]}`).not.toThrow();
    }
    expect(() => resolve("{ev:nope}")).toThrow();
  });

  it("each record has what the spec requires: commit, path, command, exit code, mode and a date", () => {
    for (const e of evidence) {
      expect(e.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(e.path.length).toBeGreaterThan(0);
      expect(e.command.length).toBeGreaterThan(0);
      expect(Number.isInteger(e.exitCode)).toBe(true);
      expect(["fake", "replay", "live", "service"]).toContain(e.mode);
      expect(e.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.value.length).toBeGreaterThan(0);
    }
  });

  it("a fake record is never described as model quality", () => {
    for (const e of evidence.filter((x) => x.mode === "fake")) {
      for (const lang of ["en", "pt"] as const) {
        const words = `${modeLabel(e.mode, lang)} ${e.label[lang]}`.toLowerCase();
        expect(/model quality|qualidade (do|de) modelo|accuracy|acurácia/.test(words), e.id).toBe(false);
      }
    }
    expect(modeLabel("fake", "en")).toContain("control logic");
  });

  it("each case has something not measured and at least one failure or limit (EV-004)", async () => {
    for (const slug of caseSlugs) {
      await loadCase(slug);
      const c = caseBySlug(slug)!;
      expect(c.notMeasured.length, slug).toBeGreaterThan(0);
      expect(c.failures.length, slug).toBeGreaterThan(0);
    }
  });

  it("the contact phone lives only in profile.ts, and the CV file is not in Git", () => {
    const files = [...walk(join(root, "src")), join(root, "index.html")].filter((f) => /\.(tsx?|json|html|css)$/.test(f) && !f.endsWith("profile.ts") && !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"));
    const phone = /\+?\d{2}\s*\(?\d{2}\)?\s*9?\d{4}-?\d{4}/;
    for (const f of files) expect(phone.test(readFileSync(f, "utf8").replace(/[0-9a-f]{40}/g, "")), f).toBe(false);
    expect(existsSync(join(root, "Diego_Souza_AI_Engineer_EVT_PT.docx"))).toBe(false);
  });
});

describe("two languages (I18N-001)", () => {
  it("English and Portuguese have the same keys and no empty value", () => {
    const keys = (v: unknown, p = ""): string[] =>
      Array.isArray(v) ? v.flatMap((x, i) => keys(x, `${p}[${i}]`)) : v && typeof v === "object" ? Object.entries(v).flatMap(([k, x]) => keys(x, `${p}.${k}`)) : [p];
    expect(keys(strings.pt)).toEqual(keys(strings.en));
    for (const lang of ["en", "pt"] as const) for (const [path, text] of leaves(strings[lang])) expect(text.trim().length, `${lang}${path}`).toBeGreaterThan(0);
  });

  it("every case, decision, failure and flow text exists in both languages", async () => {
    await loadFlows(["system", "supportops"]);
    for (const slug of caseSlugs) {
      await loadCase(slug);
      const c = caseBySlug(slug)!;
      const pairs = leaves(c).filter(([p]) => /\.(en|pt)$/.test(p));
      for (const [path, text] of pairs) expect(text.trim().length, `${slug}${path}`).toBeGreaterThan(0);
      expect(pairs.filter(([p]) => p.endsWith(".en")).length).toBe(pairs.filter(([p]) => p.endsWith(".pt")).length);
    }
    for (const id of ["system", "supportops"]) for (const n of getFlow(id).nodes) expect(n.label.pt && n.detail.pt).toBeTruthy();
  });

  it("the card index equals the case files", async () => {
    expect(caseCards.map((c) => c.slug)).toEqual(caseSlugs);
    for (const card of caseCards) {
      await loadCase(card.slug);
      expect(caseBySlug(card.slug)!.slug).toBe(card.slug);
    }
  });
});

describe("routes (SEO-001)", () => {
  it("every path parses back to itself, in both languages", () => {
    for (const path of allPaths()) {
      const route = parsePath(path);
      expect(route.page, path).not.toBe("not-found");
      expect(hrefFor(route, route.lang)).toBe(path);
    }
    expect(allPaths()).toHaveLength(2 * (6 + caseCards.length));
  });
  it("unknown paths are not found", () => {
    expect(parsePath("/projects/nope/").page).toBe("not-found");
    expect(parsePath("/pt/whatever/").page).toBe("not-found");
  });
});
