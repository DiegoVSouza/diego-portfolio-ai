import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import catalog from "./data/catalog.generated.json";
import { caseCards } from "./content/caseIndex";
import { CARD_PROJECTS, axesOf, describeAxis, sealFor, type Catalog } from "./content/seal";

const data = catalog as unknown as Catalog;

describe("status truth (STAT-001 to STAT-006)", () => {
  it("STAT-002: the catalog covers every project and the lab, each with a version or a repository", () => {
    for (const id of ["p00", "p01", "p02", "p03", "p04", "p05", "p06", "p07", "p08", "lab"]) {
      expect(data.projects[id], id).toBeDefined();
      expect(data.projects[id]!.length, id).toBeGreaterThan(0);
      expect(data.meta[id]?.repo, id).toMatch(/^https:\/\/github\.com\/DiegoVSouza\//);
    }
  });

  it("STAT-001: every card has a seal derived from catalog records, and every project it names exists", () => {
    for (const card of caseCards) {
      const ids = CARD_PROJECTS[card.slug];
      expect(ids, card.slug).toBeDefined();
      for (const id of ids!) expect(data.projects[id], `${card.slug}:${id}`).toBeDefined();
      expect(card.seal).toEqual(sealFor(ids!, data));
    }
  });

  it("STAT-001: a seal says full only when every feature is verified, and fail only when a record fails", () => {
    for (const [slug, ids] of Object.entries(CARD_PROJECTS)) {
      const features = ids.flatMap((id) => data.projects[id]!);
      const seal = sealFor(ids, data);
      const allVerified = features.every((f) => f.state === "verified");
      expect(seal.kind === "full", slug).toBe(allVerified);
      expect(seal.kind === "fail", slug).toBe(features.some((f) => /FAIL/.test(f.status)));
    }
  });

  it("STAT-001: the counts in a seal are the catalog counts, in both languages", () => {
    for (const [slug, ids] of Object.entries(CARD_PROJECTS)) {
      const features = ids.flatMap((id) => data.projects[id]!);
      const verified = features.filter((f) => f.state === "verified").length;
      const seal = sealFor(ids, data);
      expect(seal.label.en, slug).toContain(`${verified} of ${features.length}`);
      expect(seal.label.pt, slug).toContain(`${verified} de ${features.length}`);
    }
  });

  it("STAT-003: a seal never hides an open item and never invents one", () => {
    for (const [slug, ids] of Object.entries(CARD_PROJECTS)) {
      const features = ids.flatMap((id) => data.projects[id]!);
      const axes = axesOf(features);
      const seal = sealFor(ids, data);
      const unverified = features.some((f) => f.state !== "verified");
      expect(axes.length > 0, slug).toBe(unverified);
      if (axes.length) expect(seal.label.en, slug).toContain("open:");
      else expect(seal.label.en, slug).not.toContain("open:");
    }
  });

  it("STAT-006: every open axis in the catalog has words in both languages, so no seal shows a raw token", () => {
    const unknown: string[] = [];
    for (const ids of Object.values(CARD_PROJECTS)) {
      for (const axis of axesOf(ids.flatMap((id) => data.projects[id]!))) if (!describeAxis(axis).known) unknown.push(axis);
    }
    expect([...new Set(unknown)]).toEqual([]);
    for (const ids of Object.values(CARD_PROJECTS)) {
      const label = sealFor(ids, data).label;
      expect(label.pt).not.toMatch(/\b(quality|metrics|evaluation|review|checklists|identity|provider|frame|phone)\b/i);
    }
  });

  it("STAT-003: nothing in a seal says published or live; the site, not the seal, shows deploy records", () => {
    for (const card of caseCards) expect(JSON.stringify(card.seal.label)).not.toMatch(/publish|publicad|no ar|\blive\b/i);
  });

  it("STAT-004: a bare passes flag without evidence stays claimed and is not counted as verified", () => {
    const features = [
      { id: "a", description: "", status: "passes: true", evidence: "", state: "claimed" },
      { id: "b", description: "", status: "PASS_LOCAL", evidence: "x", state: "verified" },
    ];
    const seal = sealFor(["t"], { meta: {}, projects: { t: features } } as unknown as Catalog);
    expect(seal.kind).toBe("partial");
    expect(seal.label.en).toContain("1 of 2");
  });

  it("STAT-005: a verified project feature of this repository cites evidence files that exist", () => {
    const own = data.projects.p07!.filter((f) => f.state === "verified");
    expect(own.length).toBeGreaterThan(0);
    for (const f of own) {
      const paths = f.evidence.split(";").map((p) => p.trim().split(" ")[0]!).filter((p) => /^(artifacts|\.planning|docs|src)\//.test(p));
      expect(paths.length, f.id).toBeGreaterThan(0);
      for (const p of paths) expect(existsSync(join(process.cwd(), p)), `${f.id}: ${p}`).toBe(true);
    }
  });

  it("STAT-006: the hand-written seal text is gone from the card index", () => {
    const source = readFileSync(join(process.cwd(), "src/content/caseIndex.ts"), "utf8");
    expect(source).not.toMatch(/seal:\s*\{\s*kind:\s*"(full|partial|warn|none|fail)",\s*label:\s*t\(/);
  });
});
