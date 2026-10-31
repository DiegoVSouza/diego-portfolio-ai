import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { glyphFor } from "./App";

const root = process.cwd();

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
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

describe("status glyphs (DS-003)", () => {
  it("a failing status keeps the fail glyph; others follow their state", () => {
    expect(glyphFor({ state: "open", status: "FAIL_PROVISIONAL; PENDING" })).toBe("fail");
    expect(glyphFor({ state: "verified", status: "PASS" })).toBe("full");
    expect(glyphFor({ state: "partial", status: "PASS; INCOMPLETE" })).toBe("partial");
    expect(glyphFor({ state: "claimed", status: "passes: true" })).toBe("warn");
    expect(glyphFor({ state: "open", status: "PENDING" })).toBe("none");
  });
});
