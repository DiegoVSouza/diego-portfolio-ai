import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist/", "artifacts/", "test-results/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { console: "readonly", process: "readonly", URL: "readonly" } },
  },
  {
    // Playwright evaluates the reader's callbacks in a browser, where document exists.
    files: ["scripts/a11y-reader.mjs"],
    languageOptions: { globals: { document: "readonly" } },
  },
];
