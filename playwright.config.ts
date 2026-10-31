import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  reporter: [["list"]],
  outputDir: "test-results",
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:44173",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: { baseURL: "http://localhost:44173", channel: "chrome", trace: "off" },
});
