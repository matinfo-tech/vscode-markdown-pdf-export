// Runs inside the VS Code panel, before Studio's own script (the exporter's studio/app.mjs).
// Studio was written for a browser tab talking to its local server. Here:
//  - its calls to /api/... go to the extension, which forwards them to that server
//    (the server's token never enters the panel);
//  - its PDF preview frames, <iframe>s in the browser, are <div>s drawn with pdf.js,
//    because a VS Code panel has no built-in PDF viewer.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.min.mjs";

const vscode = acquireVsCodeApi();
const realFetch = window.fetch.bind(window);

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

// ── /api bridge ─────────────────────────────────────────────────────────────
const waiting = new Map();
let lastId = 0;

window.addEventListener("message", (event) => {
  const message = event.data;
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

// ── PDF frames ──────────────────────────────────────────────────────────────
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

const GAP = 12; // px around and between pages

async function draw(frame, src) {
  const run = (frame.pdfRun = (frame.pdfRun ?? 0) + 1);
  try {
    await ensureWorker();
    const data = await (await realFetch(src.split("#")[0])).arrayBuffer();
    const doc = await pdfjs.getDocument({ data }).promise;
    const width = Math.max(200, (frame.clientWidth || frame.parentElement.clientWidth) - 2 * GAP);
    const ratio = window.devicePixelRatio || 1;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      if (run !== frame.pdfRun) return;
      const page = await doc.getPage(n);
      const scale = width / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale: scale * ratio });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
      canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
      await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport }).promise;
      pages.push(canvas);
    }
    if (run !== frame.pdfRun) return;
    // Keep the reading position: the frame on show is the other one until Studio swaps them.
    const shown = [...document.querySelectorAll("[data-pdf-frame]")].find((f) => f !== frame);
    frame.replaceChildren(...pages);
    frame.scrollTop = shown ? shown.scrollTop : 0;
    frame.dispatchEvent(new Event("load")); // Studio swaps the two frames on "load"
    vscode.postMessage({ type: "rendered", pages: doc.numPages });
    void doc.destroy();
  } catch (error) {
    vscode.postMessage({ type: "render-error", message: String(error?.message ?? error) });
  }
}

for (const frame of document.querySelectorAll("[data-pdf-frame]")) {
  let current = "";
  // Studio shows a PDF by setting the frame's `src`, as it would on an <iframe>.
  Object.defineProperty(frame, "src", {
    get: () => current,
    set(value) {
      current = String(value);
      void draw(frame, current);
    },
  });
}
