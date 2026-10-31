import { defineConfig } from "@playwright/test";

// Runs the same e2e file against the deployed site. PUBLIC_URL is the origin, e.g. https://diego-portfolio-ai.pages.dev
export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  use: { baseURL: process.env.PUBLIC_URL, channel: "chrome", trace: "off" },
});
