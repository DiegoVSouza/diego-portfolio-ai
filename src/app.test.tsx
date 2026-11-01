import { render as mount, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { allPaths } from "./site/router";
import { preload } from "./site/pages";
import { parsePath } from "./site/router";
import { render as renderToHtml } from "./entry-server";

const wait = async (url: string) => preload(parsePath(url));

describe("prerendered HTML (SEO-001, SEC-001)", () => {
  it("every route renders a heading, real links and nothing a strict CSP would drop", async () => {
    for (const path of allPaths()) {
      const html = await renderToHtml(path);
      expect(html, path).toMatch(/<h1[ >]/);
      // style-src 'self' drops inline style attributes that arrive in markup, so none may be rendered.
      expect(/ style="/.test(html), `${path} has an inline style attribute`).toBe(false);
      expect(/<script/.test(html), `${path} has an inline script`).toBe(false);
      expect(/href="\/(pt\/)?(demo|evidence|method|experience)\/"/.test(html), path).toBe(true);
    }
  });

  it("the contact section has a WhatsApp button and a phone link, in both languages", async () => {
    for (const [path, label] of [["/", "Message me on WhatsApp"], ["/pt/", "Fale comigo no WhatsApp"]] as [string, string][]) {
      const html = await renderToHtml(path);
      expect(html, path).toContain("https://wa.me/");
      expect(html, path).toContain(label);
      expect(html, path).toContain("href=\"tel:+");
    }
  });

  it("a case page reads in the trail order, with a Rejected line per decision", async () => {
    const html = await renderToHtml("/projects/supportops/");
    // Three stops, each with its own headings: demo, flow, and the README (decisions, failures, numbers, what I would change).
    const order = ["tldr-h", "run-h", "how-h", "dec-h", "fail-h", "res-h", "diff-h"].map((id) => html.indexOf(`id="${id}"`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect((html.match(/class="rejected"/g) ?? []).length).toBeGreaterThanOrEqual(3);
    expect(html).toContain("Not measured, so not claimed");
  });

  it("the live demo is inside the first stop of the SupportOps case, not on another page (FLOW-001)", async () => {
    const html = await renderToHtml("/projects/supportops/");
    const demo = html.indexOf('<section id="demo"');
    const flow = html.indexOf('<section id="flow"');
    const status = html.indexOf('id="status-h"');
    expect(demo).toBeGreaterThan(0);
    expect(status).toBeGreaterThan(demo);
    expect(status).toBeLessThan(flow);
    expect(html).toContain("Stack status");
    expect(html).not.toContain('href="/demo/"');
    const other = await renderToHtml("/projects/agents/");
    expect(other).not.toContain('id="status-h"');
  });

  it("a case without a live backend offers the command to reproduce it, in the first stop", async () => {
    const html = await renderToHtml("/projects/agents/");
    const order = ["val-h", "how-h", "dec-h"].map((id) => html.indexOf(`id="${id}"`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain("Reproduce it");
    expect(html).not.toContain("Live demo</h2>");
  });

  it("the stops are stacked in the HTML with no tab bar, and the old anchors still exist (FLOW-002)", async () => {
    const html = await renderToHtml("/projects/supportops/");
    const stops = ["demo", "flow", "readme"].map((id) => html.indexOf(`<section id="${id}"`));
    expect(stops.every((i) => i > 0)).toBe(true);
    expect([...stops].sort((a, b) => a - b)).toEqual(stops);
    for (const legacy of ["architecture", "decisions", "numbers"]) expect(html).toContain(`id="${legacy}"`);
    expect(html).not.toContain('role="tablist"');
    expect(html).not.toMatch(/<section[^>]*shidden/);
    expect(html).toContain('href="#numbers"');
    expect(html).toContain("Project 1 of 8");
  });

  it("each stop ends with one next action, and the last project ends at contact (FLOW-004)", async () => {
    const first = await renderToHtml("/projects/supportops/");
    expect(first).toContain("Next: the interactive flow");
    expect(first).toContain("Next: the README, explained");
    expect(first).toMatch(/Next project: [^<]+/);
    const last = await renderToHtml("/projects/harness/");
    expect(last).toContain("Last stop: contact");
  });

  it("the home page opens with the flagship and projects, then About and contact (FLOW-001)", async () => {
    const html = await renderToHtml("/");
    const order = ["flag-h", "projects-h", "about-h", "contact-h"].map((id) => html.indexOf(`id="${id}"`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).not.toContain('id="map-h"');
  });

  it("the diagram and its text version are in the HTML without JavaScript (FLOW-005)", async () => {
    const html = await renderToHtml("/projects/supportops/");
    expect(html).toContain('class="flow-list"');
    expect(html).toContain("Tenant from token");
    expect(html).toContain("<svg");
  });

  it("Portuguese pages are in Portuguese and link back to English", async () => {
    const html = await renderToHtml("/pt/projects/supportops/");
    expect(html).toContain("Galeria de falhas");
    expect(html).toContain('hrefLang="en"');
    expect(html).toContain('href="/projects/supportops/"');
  });
});

describe("the demo page", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const reply = (body: unknown, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(body) });

  it("opening the page reads the status and wakes nothing (LIVE-004)", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("/api/status") ? reply({ state: "asleep", startAvailable: true, turnstileSiteKey: null }) : reply({ runs: [] })));
    await wait("/demo/");
    mount(<App url="/demo/" />);
    await waitFor(() => expect(screen.getByText(/Asleep/)).toBeTruthy());
    const calls = fetchMock.mock.calls as [string, RequestInit | undefined][];
    expect(calls.every(([, init]) => !init || !init.method || init.method === "GET")).toBe(true);
    expect(calls.some(([url]) => url.includes("/api/demo/start"))).toBe(false);
  });

  it("the start button stays disabled until the visitor passes the challenge, and says why", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("/api/status") ? reply({ state: "asleep", startAvailable: true, turnstileSiteKey: "site-key" }) : reply({ runs: [] })));
    await wait("/demo/");
    mount(<App url="/demo/" />);
    await waitFor(() => expect(screen.getByText(/Asleep/)).toBeTruthy());
    const button = screen.getByRole("button", { name: "Start live demo" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await userEvent.setup().click(button);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/api/demo/start"))).toBe(false);
  });

  it("with no run recorded it says so and shows no invented steps", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("/api/status") ? reply({ state: "unknown" }) : reply({ runs: [] })));
    await wait("/demo/");
    mount(<App url="/demo/" />);
    await waitFor(() => expect(screen.getByText(/No live run is recorded yet/)).toBeTruthy());
    expect(document.querySelector(".runlog")).toBeNull();
    expect(document.querySelectorAll(".flow-node.live")).toHaveLength(0);
  });

  it("when the status is unavailable it states that, without substituting anything (LIVE-003)", async () => {
    fetchMock.mockImplementation(() => Promise.reject(new Error("offline")));
    await wait("/demo/");
    mount(<App url="/demo/" />);
    await waitFor(() => expect(screen.getByText(/Status unavailable/)).toBeTruthy());
    expect(document.querySelector(".runlog")).toBeNull();
  });

  it("lights a diagram node only from a recorded run, and the log shows that run's numbers (FLOW-006)", async () => {
    const run = { id: "r1", at: "2026-10-31", steps: [{ id: "s1", agent: "classifier", project: "P01", model: "openai/gpt-oss-20b", latencyMs: 412, tokens: 960, costUsd: 0.000086 }] };
    fetchMock.mockImplementation((url: string) => (url.includes("/api/status") ? reply({ state: "awake" }) : reply({ runs: [run] })));
    await wait("/demo/");
    mount(<App url="/demo/" />);
    await waitFor(() => expect(document.querySelector(".runlog")).toBeTruthy());
    expect(screen.getAllByText("412 ms").length).toBeGreaterThan(0);
    expect(document.querySelector('.flow-h [data-node="agents"]')?.classList.contains("live")).toBe(true);
    expect(document.querySelector('.flow-h [data-node="queue"]')?.classList.contains("live")).toBe(false);
  });
});

describe("navigation", () => {
  it("a plain click on an internal link changes the page in place and keeps real hrefs", async () => {
    await wait("/");
    mount(<App url="/" />);
    const link = screen.getAllByRole("link", { name: "Evidence" })[0] as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("/evidence/");
    await userEvent.setup().click(link);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Evidence"));
    expect(window.location.pathname).toBe("/evidence/");
  });
});
