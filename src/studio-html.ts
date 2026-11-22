/**
 * Turn the exporter's Studio page (studio/index.html) into the page shown in a VS Code panel.
 * Pure: the unit tests run it on the real file of the pinned exporter, so an exporter update
 * that changes the page breaks a test, not the panel.
 */
export interface StudioPageUris {
  /** Folder of the exporter's studio/ files, as a panel URI (no trailing slash). */
  studio: string;
  /** dist/studio-host.js */
  host: string;
  /** dist/studio-app.js: the exporter's studio/app.mjs, bundled */
  app: string;
  /** dist/pdf.worker.min.js */
  worker: string;
  /** `webview.cspSource` */
  cspSource: string;
  nonce: string;
}

/** Styles for what the panel changes: PDF frames are scrolling <div>s of pages. */
const PANEL_CSS = `
.frames [data-pdf-frame] { position: absolute; inset: 0; overflow: auto; background: var(--desk); padding: 12px; text-align: center; }
.frames [data-pdf-frame].back { opacity: 0; pointer-events: none; }
.frames [data-pdf-frame] canvas { display: block; margin: 0 auto 12px; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, .25); }
#editors-open { display: none; }
/* A panel beside the Markdown is narrow: keep the PDF in view on top, the controls scroll below it. */
@media (max-width: 860px) {
  .app { display: flex; flex-direction: column; height: 100vh; }
  .desk { order: -1; flex: none; height: 46vh; border-bottom: 1px solid var(--rule); }
  .rail { flex: 1; min-height: 0; grid-template-rows: 1fr auto; }
  .rail-head { display: none; }
  .rail-body { overflow-y: auto; }
  .rail-foot { position: static; }
}
`;

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** Replace exactly one occurrence, or fail loudly: the Studio page is not what we expect. */
function swap(html: string, find: string | RegExp, replacement: string, what: string): string {
  const count = typeof find === "string" ? html.split(find).length - 1 : (html.match(new RegExp(find, "g")) ?? []).length;
  if (count !== 1) throw new Error(`Studio page: expected one ${what}, found ${count}.`);
  return html.replace(find, () => replacement);
}

export function studioPanelHtml(indexHtml: string, uris: StudioPageUris): string {
  const { studio, host, app, worker, cspSource, nonce } = uris;
  const csp = [
    "default-src 'none'",
    `style-src ${cspSource} 'nonce-${nonce}'`,
    `script-src ${cspSource}`,
    `img-src ${cspSource} blob: data:`,
    `font-src ${cspSource}`,
    `connect-src ${cspSource} blob:`,
    "worker-src blob:",
  ].join("; ");

  let html = indexHtml;
  html = swap(
    html,
    '<meta charset="utf-8">',
    `<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="${escapeAttr(csp)}">\n<meta name="mpe-pdf-worker" content="${escapeAttr(worker)}">`,
    "charset meta",
  );
  html = swap(
    html,
    '<link rel="stylesheet" href="/style.css">',
    `<link rel="stylesheet" href="${escapeAttr(studio)}/style.css">\n<style nonce="${nonce}">${PANEL_CSS}</style>`,
    "stylesheet link",
  );
  html = swap(
    html,
    '<script type="module" src="/app.mjs"></script>',
    `<script type="module" src="${escapeAttr(host)}"></script>\n<script type="module" src="${escapeAttr(app)}"></script>`,
    "app script",
  );
  const frames = html.match(/<iframe\b[^>]*><\/iframe>/g) ?? [];
  if (frames.length !== 2) throw new Error(`Studio page: expected two preview frames, found ${frames.length}.`);
  html = html.replace(/<iframe\b([^>]*)><\/iframe>/g, "<div$1 data-pdf-frame></div>");
  if (/(?:src|href)="\//.test(html)) throw new Error("Studio page: a file is still loaded from the server root.");
  return html;
}
