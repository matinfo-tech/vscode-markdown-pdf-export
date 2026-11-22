// Dev tool: start the test copy of VS Code with this extension, open Studio on a sample
// document and save a screenshot of the window. Used to check the look and for the README.
//   npm run build && node scripts/screenshot.mjs out.png [wait-ms]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { _electron as electron } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const out = path.resolve(process.argv[2] ?? "studio.png");
const wait = Number(process.argv[3] ?? 9000);

const install = fs.readdirSync(path.join(root, ".vscode-test")).find((d) => d.startsWith("vscode-"));
if (!install) throw new Error("Run `npm run test:integration` once: it downloads the test copy of VS Code.");
const base = path.join(root, ".vscode-test", install);
const exe =
  process.platform === "darwin"
    ? path.join(base, "Visual Studio Code.app", "Contents", "MacOS", "Code")
    : path.join(base, process.platform === "win32" ? "Code.exe" : "code");

const work = fs.mkdtempSync(path.join(os.tmpdir(), "mpe-shot-"));
const doc = path.join(work, "report.md");
fs.copyFileSync(path.join(root, "node_modules", "markdown-pdf-export", "studio", "sample.md"), doc);

const app = await electron.launch({
  executablePath: exe,
  args: [
    `--extensionDevelopmentPath=${root}`,
    `--user-data-dir=${path.join(os.tmpdir(), "mpe-shot-profile")}`,
    "--disable-extensions",
    "--disable-workspace-trust",
    "--skip-welcome",
    "--skip-release-notes",
    work,
    doc,
  ],
});
try {
  const window = await app.firstWindow();
  await window.waitForTimeout(6000);
  await window.keyboard.press("F1");
  await window.waitForTimeout(600);
  await window.keyboard.type("Markdown PDF: Design Pages (Studio)");
  await window.waitForTimeout(800);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(wait);
  await window.screenshot({ path: out });
  console.log(out);
} finally {
  await app.close();
  fs.rmSync(work, { recursive: true, force: true });
}
