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
];
