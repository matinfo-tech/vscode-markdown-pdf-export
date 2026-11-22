import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", ".vscode-test/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] } },
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
