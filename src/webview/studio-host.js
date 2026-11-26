// Runs inside the VS Code panel, before Studio's own script (the exporter's studio/app.mjs).
// Studio was written for a browser tab talking to its local server. Here:
//  - its calls to /api/... go to the extension, which forwards them to that server
//    (the server's token never enters the panel);
//  - its PDF preview is drawn with pdf.js through Studio's `window.studioHost.showPdf` hook,
//    because a VS Code panel has no built-in PDF viewer;
//  - buttons over the preview: show or hide the design controls, export, and help.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.min.mjs";

const vscode = acquireVsCodeApi();
const realFetch = window.fetch.bind(window);

// The buttons' text in VS Code's display language, given by the extension (src/studio-html.ts).
let words = {};
try {
  words = JSON.parse(document.querySelector('meta[name="mpe-text"]')?.content ?? "{}");
} catch {
  // English, then.
}
const say = (english) => words[english] ?? english;

// Problems inside the panel are invisible otherwise: send them to the extension's output.
const report = (message) => vscode.postMessage({ type: "panel-error", message: String(message) });
window.addEventListener(
  "error",
  (e) => {
    // A file that failed to load fires on its element and is only seen while capturing.
    const file = e.target?.src ?? e.target?.href;
    report(file ? `Could not load ${file}` : e.message || e.error);
  },
  true,
);
window.addEventListener("unhandledrejection", (e) => report(e.reason?.message ?? e.reason));
document.addEventListener("securitypolicyviolation", (e) => report(`Blocked by the panel's security policy: ${e.violatedDirective} ${e.blockedURI}`));
vscode.postMessage({ type: "ready" });

// ── preview only, or preview and design ─────────────────────────────────────
const modeButton = document.createElement("button");
modeButton.type = "button";
modeButton.className = "btn small";

function setMode(mode) {
  const preview = mode === "preview";
  document.body.classList.toggle("mpe-preview", preview);
  modeButton.textContent = preview ? say("Design pages") : say("Hide design");
  modeButton.title = preview ? say("Choose the page style, fonts, header and footer") : say("Show the PDF only");
}
modeButton.addEventListener("click", () => {
  const mode = document.body.classList.contains("mpe-preview") ? "design" : "preview";
  setMode(mode);
  // The extension keeps it when the panel is reloaded for another document.
  vscode.postMessage({ type: "mode", mode });
});
setMode(document.body.classList.contains("mpe-preview") ? "preview" : "design");

const exportButton = document.createElement("button");
exportButton.type = "button";
exportButton.className = "btn small";
exportButton.textContent = say("Export PDF");
exportButton.title = say("Save the file and write its PDF");
exportButton.addEventListener("click", () => vscode.postMessage({ type: "export" }));

const docsButton = document.createElement("button");
docsButton.type = "button";
docsButton.className = "btn small";
docsButton.textContent = say("Help");
docsButton.title = say("Open the documentation: header, footer, one document's own design, all settings");
docsButton.addEventListener("click", () => vscode.postMessage({ type: "docs" }));

const bar = document.createElement("div");
bar.id = "mpe-bar";
bar.append(modeButton, exportButton, docsButton);
document.querySelector(".desk").append(bar);
// Keep the status text clear of the buttons, whatever the language makes their width.
const status = document.querySelector(".status");
if (status) new ResizeObserver(() => (status.style.paddingRight = `${bar.offsetWidth + 24}px`)).observe(bar);

// ── /api bridge ─────────────────────────────────────────────────────────────
const waiting = new Map();
let lastId = 0;

window.addEventListener("message", (event) => {
  const message = event.data;
  // The document changed, or another one is in front: Studio draws its preview again.
  if (message?.type === "refresh") return void window.dispatchEvent(new Event("studio:refresh"));
  if (message?.type === "mode") return void setMode(message.mode);
  if (message?.type !== "response") return;
  waiting.get(message.id)?.(message);
  waiting.delete(message.id);
});

window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith("/api/")) return realFetch(input, init);

  // Request does the work of turning any body (JSON text, a File...) into bytes.
  const request = new Request(`http://studio.invalid${url}`, init);
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const id = ++lastId;
  const reply = new Promise((resolve) => waiting.set(id, resolve));
  vscode.postMessage({
    type: "request",
    id,
    path: url,
    method: request.method,
    contentType: request.headers.get("content-type") ?? "",
    body: hasBody ? await request.arrayBuffer() : null,
  });
  const answer = await reply;
  if (answer.error) throw new TypeError(answer.error);
  const empty = answer.status === 204 || answer.status === 304;
  return new Response(empty ? null : answer.body, { status: answer.status, headers: answer.headers });
};

// ── PDF pages ───────────────────────────────────────────────────────────────
const box = document.getElementById("pdf-pages");
const GAP = 12; // px around and between pages, as in the panel's stylesheet

let worker = null;
/** pdf.js parses in a worker; a panel may only start one from a blob: URL. */
async function ensureWorker() {
  if (worker) return;
  const src = document.querySelector('meta[name="mpe-pdf-worker"]').content;
  const code = await (await realFetch(src)).blob();
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  worker = new Worker(url, { type: "module" });
  pdfjs.GlobalWorkerOptions.workerPort = worker;
}

let runs = 0;
/** The document on screen: one slot per page, painted when it comes near the visible part. */
let shown = null;
let lastBlob = null;
let lastWidth = 0;

const pageWidth = () => Math.max(200, box.clientWidth - 2 * GAP);
const near = (slot, margin) => slot.top + slot.height > box.scrollTop - margin && slot.top < box.scrollTop + box.clientHeight + margin;

async function paint(slot) {
  if (slot.painted) return;
  slot.painted = true;
  const ratio = window.devicePixelRatio || 1;
  const viewport = slot.page.getViewport({ scale: slot.scale * ratio });
  slot.canvas.width = Math.floor(viewport.width);
  slot.canvas.height = Math.floor(viewport.height);
  await slot.page.render({ canvas: slot.canvas, canvasContext: slot.canvas.getContext("2d"), viewport }).promise;
}

let painting = false;
let paintAgain = false;
/** Paint the pages on screen and one screen around them; a long document is never painted whole. */
async function paintNear() {
  if (painting) return void (paintAgain = true);
  painting = true;
  let current = shown;
  try {
    do {
      paintAgain = false;
      current = shown;
      for (const slot of current?.slots ?? []) {
        if (shown !== current) break;
        if (near(slot, box.clientHeight)) await paint(slot);
      }
    } while (paintAgain || shown !== current);
  } catch (error) {
    // A document replaced while one of its pages was being painted is not a failure.
    if (shown === current) vscode.postMessage({ type: "render-error", message: String(error?.message ?? error) });
  } finally {
    painting = false;
  }
}
box.addEventListener("scroll", () => void paintNear(), { passive: true });

/**
 * @param {Blob} blob  the PDF
 * @param {boolean} fresh  a new PDF (not the same one laid out again for another panel width)
 */
async function draw(blob, fresh) {
  const run = ++runs;
  await ensureWorker();
  const task = pdfjs.getDocument({ data: await blob.arrayBuffer() });
  const doc = await task.promise;
  const width = pageWidth();
  const slots = [];
  let top = GAP;
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = width / base.width;
    const height = Math.floor(base.height * scale);
    const canvas = document.createElement("canvas");
    canvas.style.width = `${Math.floor(width)}px`;
    canvas.style.height = `${height}px`;
    slots.push({ page, canvas, scale, top, height, painted: false });
    top += height + GAP;
  }
  // Paint what will be on screen before showing it: no blank page while typing.
  for (const slot of slots) {
    if (run !== runs) break;
    if (near(slot, 0)) await paint(slot);
  }
  if (run !== runs) return void task.destroy();
  const keep = box.scrollTop; // the reading position
  box.replaceChildren(...slots.map((slot) => slot.canvas));
  box.scrollTop = keep;
  void shown?.task.destroy();
  shown = { task, slots };
  lastWidth = width;
  if (fresh) vscode.postMessage({ type: "rendered", pages: doc.numPages });
  void paintNear();
}

window.studioHost = {
  /** Called by Studio with each new preview. */
  async showPdf(blob) {
    lastBlob = blob;
    try {
      await draw(blob, true);
    } catch (error) {
      vscode.postMessage({ type: "render-error", message: String(error?.message ?? error) });
      throw error;
    }
  },
};

// A wider or narrower panel: lay the same PDF out again.
let resizeTimer = null;
new ResizeObserver(() => {
  if (!lastBlob || box.clientWidth === 0 || Math.abs(pageWidth() - lastWidth) < 8) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => draw(lastBlob, false).catch((error) => report(error?.message ?? error)), 150);
}).observe(box);
