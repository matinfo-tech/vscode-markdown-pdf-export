import os from "node:os";
import path from "node:path";
import { defineConfig } from "@vscode/test-cli";

export default defineConfig({
  files: "test/integration/**/*.test.cjs",
  workspaceFolder: "test/fixtures/work space",
  mocha: { timeout: 120_000 },
  launchArgs: [
    // A clean profile: no other extensions, no user settings.
    "--disable-extensions",
    "--disable-workspace-trust",
    // VS Code opens a Unix socket in the profile folder; the default one inside the
    // checkout is longer than macOS allows for a socket path (103 characters) on CI.
    `--user-data-dir=${path.join(os.tmpdir(), "mpe-vsc")}`,
  ],
});
