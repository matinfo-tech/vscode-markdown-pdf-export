import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".vscode-test/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] } },
  { files: ["*.mjs"], languageOptions: { globals: globals.node } },
  // Dev scripts and the demo recording scripts also hold code that Playwright runs inside the page.
  { files: ["scripts/**/*.mjs", "demo/recording/*.mjs"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  {
    // The Studio panel's script runs in a VS Code webview (a browser page).
    files: ["src/webview/**/*.js"],
    languageOptions: { globals: { ...globals.browser, acquireVsCodeApi: "readonly" } },
  },
  {
    // Integration tests run inside VS Code's extension host, which loads CommonJS.
    files: ["test/integration/**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node, ...globals.mocha } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
