import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import scenes from "./content/scenes.json";

const root = process.cwd();
const REQUIRED = ["id", "kind", "status", "proof", "trigger", "staticFrame", "reducedMotion", "mobile", "focus"] as const;

describe("scene contracts (the story gate)", () => {
  it("has a story and at least one scene", () => {
    expect(scenes.story.trim().length).toBeGreaterThan(20);
    expect(scenes.scenes.length).toBeGreaterThan(0);
  });

  it("every scene states a proof, a trigger, a static frame, a reduced-motion fallback, a mobile path and a focus order", () => {
    for (const scene of scenes.scenes as Record<string, unknown>[]) {
      for (const key of REQUIRED) {
        const value = scene[key];
        expect(value !== undefined && value !== null && (typeof value !== "string" || value.trim().length > 0), `${String(scene.id)}: missing ${key}`).toBe(true);
      }
    }
  });

  it("no scene exists only for effect: the proof names content", () => {
    const content = /project|card|index|metric|result|decision|diagram|run|step|button|status|budget|demo|contact|name/i;
    for (const scene of scenes.scenes) expect(content.test(scene.proof), `${scene.id}: the proof is not tied to content`).toBe(true);
  });

  it("a scroll scene has a scroll trigger, and ids are unique", () => {
    const ids = scenes.scenes.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const scene of scenes.scenes.filter((s) => s.kind === "scroll")) expect(scene.trigger.type, scene.id).toBe("scroll");
  });

  it("each built scene points at a static frame that exists in the repository", () => {
    for (const scene of scenes.scenes.filter((s) => s.status === "built")) {
      expect(existsSync(join(root, scene.staticFrame)), `${scene.id}: ${scene.staticFrame} is missing, run the e2e suite to create it`).toBe(true);
    }
  });

  it("the state table covers the failure and fallback situations of the demo and the background", () => {
    const text = scenes.states.map((s) => s.situation.toLowerCase()).join("|");
    for (const needed of ["asleep", "waking", "budget", "no webgl", "reduced motion", "javascript off", "no run"]) expect(text, needed).toContain(needed);
  });

  it("the shatter decision is recorded", () => {
    expect(readFileSync(join(root, "docs/cenas.md"), "utf8")).toMatch(/Shatter decision/);
  });
});
