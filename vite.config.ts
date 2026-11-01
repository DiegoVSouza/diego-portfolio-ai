import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The shipped build runs on Preact's compatibility layer. With React 19 the home page hydration was one 1.3 s task under
// a 4x CPU slowdown and the first-load JavaScript was 96 KB gzip; with Preact it is 38 KB (docs/harness/decisions.md).
// Unit tests and the dev server stay on React. The e2e suite runs against the shipped build, so it is what proves the
// Preact output. REACT_BUILD=1 builds with React, for comparison.
const preactAlias: Record<string, string> = {
  "react-dom/client": "preact/compat/client",
  "react-dom/server": "preact/compat/server",
  "react-dom": "preact/compat",
  "react/jsx-runtime": "preact/jsx-runtime",
  "react/jsx-dev-runtime": "preact/jsx-runtime",
  react: "preact/compat",
};

export default defineConfig(({ command }) => {
  const swap = command === "build" && !process.env.VITEST && process.env.REACT_BUILD !== "1";
  return {
    plugins: [react()],
    resolve: { alias: swap ? preactAlias : {} },
    ssr: { noExternal: swap ? ["colagem-ui"] : [] },
    build: { sourcemap: false, manifest: true, target: "es2022" },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.tsx", "src/**/*.test.ts", "functions/**/*.test.ts", "worker/**/*.test.ts"],
      setupFiles: ["src/test/setup.ts"],
      restoreMocks: true,
    },
  };
});
