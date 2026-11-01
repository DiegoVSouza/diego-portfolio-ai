import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Same suite, run in Microsoft Edge (Chromium) when Google Chrome is not installed.
export default defineConfig({ ...base, use: { ...base.use, channel: "msedge" } });
