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
// THEME="Default Light Modern" picks the colour theme; INSPECT=1 prints what overflows in the panel;
// SCROLL=1 scrolls the controls to their end; COMMAND="..." runs another command from the palette.
const theme = process.env.THEME ?? "Default Dark Modern";

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

const profile = path.join(os.tmpdir(), "mpe-shot-profile");
fs.mkdirSync(path.join(profile, "User"), { recursive: true });
fs.writeFileSync(
  path.join(profile, "User", "settings.json"),
  JSON.stringify({ "workbench.colorTheme": theme, "workbench.secondarySideBar.defaultVisibility": "hidden" }),
);

const app = await electron.launch({
  executablePath: exe,
  args: [
    `--extensionDevelopmentPath=${root}`,
    `--user-data-dir=${profile}`,
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
  await window.keyboard.type(process.env.COMMAND ?? "Markdown PDF: Design Pages (Studio)");
  await window.waitForTimeout(800);
  await window.keyboard.press("Enter");
  await window.waitForTimeout(wait);
  const panel = window.frames().find((f) => f.name() === "active-frame" || f.url().includes("fake.html"));
  // SCROLL=1 shows the end of the controls (header and footer).
  if (process.env.SCROLL) {
    await panel?.evaluate(() => document.querySelector(".rail-body").scrollTo(0, 1e6));
    await window.waitForTimeout(500);
  }
  await window.screenshot({ path: out });
  if (process.env.INSPECT) {
    const found = await panel?.evaluate(() =>
      [...document.querySelectorAll("*")]
        .filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== "visible")
        .map((e) => `${e.tagName.toLowerCase()}#${e.id}.${e.className} ${e.clientWidth} < ${e.scrollWidth}`)
        .concat([`viewport ${innerWidth}x${innerHeight}`]),
    );
    console.log(found ? found.join("\n") : `panel frame not found: ${window.frames().map((f) => f.url().slice(0, 60)).join(" | ")}`);
  }
  console.log(out);
} finally {
  await app.close();
  fs.rmSync(work, { recursive: true, force: true });
}
