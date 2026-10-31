import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import raw from "./data/catalog.generated.json";
import { projects } from "./data/projects";
import { LangProvider } from "./i18n";
import { parseHash } from "./useRoute";

function mount(hash: string) {
  window.location.hash = hash;
  return render(<LangProvider><App /></LangProvider>);
}

async function violations(container: HTMLElement) {
  const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => v.id);
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = "";
});

describe("data (DATA-001)", () => {
  it("lists seven projects", () => {
    expect(projects.map((p) => p.id)).toEqual(["p00", "p01", "p02", "p03", "p04", "p05", "p06"]);
  });

  it("every project exposes an open, partial or claimed item, or a documented limit", () => {
    for (const p of projects) {
      expect(p.features.some((f) => f.state !== "verified") || p.limits.length > 0, p.id).toBe(true);
    }
  });

  it("keeps the project's own status strings untouched", () => {
    for (const p of projects) {
      const source = (raw.projects as Record<string, { id: string; status: string }[]>)[p.id] ?? [];
      expect(p.features.map((f) => f.status).sort()).toEqual(source.map((f) => f.status).sort());
    }
  });

  it("sorts unresolved items before verified ones", () => {
    for (const p of projects) {
      const firstVerified = p.features.findIndex((f) => f.state === "verified");
      if (firstVerified >= 0) expect(p.features.slice(firstVerified).every((f) => f.state === "verified"), p.id).toBe(true);
    }
  });
});

describe("routing", () => {
  it("parses only well-formed hashes", () => {
    expect(parseHash("#/p05")).toBe("p05");
    expect(parseHash("#/p05/x")).toBeNull();
    expect(parseHash("")).toBeNull();
  });
});

describe("home", () => {
  it("renders a card per project and the method", async () => {
    const { container } = mount("");
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(7);
    expect(screen.getByRole("heading", { name: "Method" })).toBeTruthy();
    expect(await violations(container)).toEqual([]);
  });

  it("switches language and remembers it", async () => {
    mount("");
    await userEvent.click(screen.getByRole("button", { name: "PT" }));
    expect(screen.getByRole("heading", { name: "Projetos" })).toBeTruthy();
    expect(localStorage.getItem("p07-lang")).toBe("pt");
    expect(document.documentElement.lang).toBe("pt-BR");
  });
});

describe("project page", () => {
  it.each(projects.map((p) => p.id))("%s has no axe violations and lists its features", async (id) => {
    const { container } = mount(`#/${id}`);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    expect(rows.length).toBe(projects.find((p) => p.id === id)!.features.length + 1);
    expect(await violations(container)).toEqual([]);
  });

  it("shows PENDING-like statuses without rewriting them", () => {
    mount("#/p02");
    expect(screen.getAllByText("PENDING").length).toBeGreaterThan(0);
  });

  it("external links are safe", () => {
    mount("#/p05");
    const link = screen.getByRole("link", { name: /supportops-platform/ });
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("handles unknown project", () => {
    mount("#/zzz");
    expect(screen.getByRole("heading", { name: "Project not found." })).toBeTruthy();
  });
});
