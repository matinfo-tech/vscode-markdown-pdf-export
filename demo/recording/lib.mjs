// Shared helpers for driving the demo VS Code through its debug port (127.0.0.1:9222).
import path from "node:path";
import { chromium } from "playwright-core";

/** The demo folder: the one VS Code opens and the shots use. */
export const DEMO_DIR = path.resolve(import.meta.dirname, "..");
/** Finished clips (MP4 and GIF). Not committed: the README's GIFs are copied to README_GIFS_DIR. */
export const RECORDINGS_DIR = path.join(DEMO_DIR, "recordings");
/** The extension repo, whose README shows some of the GIFs. */
export const REPO_DIR = path.resolve(DEMO_DIR, "..");
/** Where the extension's README reads its GIFs from. */
export const README_GIFS_DIR = path.join(REPO_DIR, "media", "recordings");
/** Raw clips and check screenshots. Not committed. */
export const WORK_DIR = path.join(import.meta.dirname, ".work");

/** Throwaway VS Code profile, so recordings never show your own settings or extensions. */
export const PROFILE_DIR = "/tmp/vsc-fresh";
export const EXTENSIONS_DIR = "/tmp/vsc-fresh-ext";
export const DEBUG_PORT = 9222;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Connects to the running demo VS Code and returns its workbench window. */
export async function connect() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const pages = browser.contexts().flatMap((context) => context.pages());
  const page = pages.find((candidate) => candidate.url().startsWith("vscode-file://"));
  if (!page) throw new Error(`No VS Code window among ${pages.length} pages.`);
  return { browser, page };
}

/**
 * Runs a command by its exact title through the command palette. The palette falls back to a
 * similar command when the title is not on offer, so the highlighted row is checked first.
 */
export async function runCommand(page, title) {
  await page.keyboard.press("F1");
  const input = page.locator(".quick-input-widget input.input");
  await input.waitFor({ state: "visible" });
  await input.fill(`>${title}`);
  await sleep(400);
  const focused = await page
    .locator(".quick-input-widget .quick-input-list .monaco-list-row.focused")
    .first()
    .getAttribute("aria-label")
    .catch(() => null);
  if (focused !== title && !focused?.startsWith(`${title},`)) {
    await page.keyboard.press("Escape");
    throw new Error(`Command palette offers "${focused}" instead of "${title}".`);
  }
  await page.keyboard.press("Enter");
  await sleep(300);
}

/** Closes the primary and the secondary side bar when they are open. */
export async function closeSideBars(page) {
  const toggles = [
    ["Toggle Primary Side Bar", "Meta+B"],
    ["Toggle Secondary Side Bar", "Alt+Meta+B"],
  ];
  for (const [label, keys] of toggles) {
    const open = await page.locator(`a.action-label.checked[aria-label^="${label}"]`).count();
    if (open > 0) await page.keyboard.press(keys);
    await sleep(300);
  }
}

/** Opens a workspace file through Quick Open. */
export async function openFile(page, name) {
  await page.keyboard.press("Meta+P");
  const input = page.locator(".quick-input-widget input.input");
  await input.waitFor({ state: "visible" });
  await input.fill(name);
  await sleep(500);
  await page.keyboard.press("Enter");
  await sleep(600);
}

/** The webview frame that holds the PDF preview (the one with #pdf-pages), or undefined. */
export async function previewFrame(page) {
  for (const frame of page.frames()) {
    if (frame === page.mainFrame()) continue;
    const found = await frame.locator("#pdf-pages").count().catch(() => 0);
    if (found > 0) return frame;
  }
  return undefined;
}

/** Waits until the preview frame exists and has drawn at least one PDF page. */
export async function waitForPreview(page, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const frame = await previewFrame(page);
    if (frame && (await frame.locator("#pdf-pages canvas").count()) > 0) return frame;
    await sleep(300);
  }
  throw new Error("The PDF preview did not draw a page in time.");
}
