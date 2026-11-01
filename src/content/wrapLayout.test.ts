import { describe, expect, it } from "vitest";
import agents from "../data/flow-layouts/agents.json";
import harness from "../data/flow-layouts/harness.json";
import supportops from "../data/flow-layouts/supportops.json";
import system from "../data/flow-layouts/system.json";
import type { FlowLayout } from "colagem-ui";
import { wrapLayout, wrapRows } from "./wrapLayout";

const layouts = { agents, harness, supportops, system } as unknown as Record<string, FlowLayout>;

describe("wrapRows (wide diagrams are folded into rows so they read at the page width)", () => {
  it("keeps every node and every edge, and makes a wide layout narrower and taller", () => {
    for (const [name, layout] of Object.entries(layouts)) {
      const wrapped = wrapLayout(layout).horizontal;
      expect(wrapped.nodes.map((n) => n.id), name).toEqual(layout.horizontal.nodes.map((n) => n.id));
      expect(wrapped.edges.map((e) => e.key), name).toEqual(layout.horizontal.edges.map((e) => e.key));
      if (layout.horizontal.width > 1100) {
        expect(wrapped.width, name).toBeLessThan(layout.horizontal.width);
        expect(wrapped.height, name).toBeGreaterThan(layout.horizontal.height);
      }
    }
  });

  it("keeps every node inside the picture and every edge point inside it too", () => {
    for (const [name, layout] of Object.entries(layouts)) {
      const w = wrapLayout(layout).horizontal;
      for (const n of w.nodes) {
        expect(n.x, `${name} ${n.id}`).toBeGreaterThanOrEqual(0);
        expect(n.x + n.w, `${name} ${n.id}`).toBeLessThanOrEqual(w.width);
        expect(n.y + n.h, `${name} ${n.id}`).toBeLessThanOrEqual(w.height);
      }
      for (const e of w.edges) for (const [x, y] of e.points) {
        expect(x, `${name} ${e.key}`).toBeGreaterThanOrEqual(0);
        expect(x, `${name} ${e.key}`).toBeLessThanOrEqual(w.width);
        expect(y, `${name} ${e.key}`).toBeGreaterThanOrEqual(0);
        expect(y, `${name} ${e.key}`).toBeLessThanOrEqual(w.height);
      }
    }
  });

  it("leaves a narrow layout alone and does not change its input", () => {
    const narrow = layouts.harness!.horizontal;
    expect(wrapRows(narrow)).toBe(narrow);
    const before = JSON.stringify(layouts.agents);
    wrapLayout(layouts.agents!);
    expect(JSON.stringify(layouts.agents)).toBe(before);
  });
});
