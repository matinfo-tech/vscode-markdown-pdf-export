import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "test/integration/**/*.test.cjs",
  workspaceFolder: "test/fixtures/work space",
  mocha: { timeout: 120_000 },
  // A clean profile: no other extensions, no user settings.
  launchArgs: ["--disable-extensions", "--disable-workspace-trust"],
});
