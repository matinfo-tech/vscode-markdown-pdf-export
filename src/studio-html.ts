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
  /** What the panel shows first: the PDF alone, or the PDF with the design controls. */
  mode: "preview" | "design";
}

/** Styles for what the panel changes. */
const PANEL_CSS = `
/* Studio's colours, taken from the VS Code theme in use (light or dark). */
body.vscode-light { color-scheme: light; }
body {
  --bg: var(--vscode-editor-background);
  --desk: var(--vscode-editorGroupHeader-tabsBackground, var(--vscode-sideBar-background));
  --surface: var(--vscode-input-background);
  --raised: var(--vscode-button-secondaryBackground);
  --rule: var(--vscode-widget-border, var(--vscode-editorWidget-border, rgba(128, 128, 128, .35)));
  --text: var(--vscode-foreground);
  --quiet: var(--vscode-descriptionForeground);
  --accent: var(--vscode-button-background);
  --accent-ink: var(--vscode-button-foreground);
  --ok: var(--vscode-testing-iconPassed, #8fcf9f);
  --error: var(--vscode-errorForeground);
  --ui: var(--vscode-font-family);
  --display: var(--vscode-font-family);
  --mono: var(--vscode-editor-font-family);
  font-size: var(--vscode-font-size);
  padding: 0;
}
.status { background: var(--desk); }
/* Paper needs an edge on a light theme. */
.thumb, .sheet { box-shadow: 0 0 0 1px var(--rule), 0 1px 3px rgba(0, 0, 0, .15); }
.looks { grid-template-columns: repeat(5, minmax(56px, 96px)); }
/* The PDF: a scrolling column of pages drawn by pdf.js. */
#pdf-pages { position: absolute; inset: 0; overflow: hidden auto; scrollbar-gutter: stable; background: var(--desk); padding: 12px; }
#pdf-pages canvas { display: block; margin: 0 auto 12px; max-width: 100%; background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, .25); }
/* Two buttons at the end of the status line, clear of the page. */
#mpe-bar { position: absolute; right: 10px; bottom: 4px; z-index: 2; display: flex; gap: 6px; }
#mpe-bar .btn { padding: 3px 9px; font-size: 12px; }
.status { min-height: 34px; padding-right: 210px; box-sizing: border-box; }
/* A panel beside the Markdown is narrow: keep the PDF in view on top, the controls scroll below it. */
@media (max-width: 860px) {
  .app { display: flex; flex-direction: column; height: 100vh; }
  .desk { order: -1; flex: none; height: 46vh; border-bottom: 1px solid var(--rule); }
  .rail { flex: 1; min-height: 0; grid-template-rows: 1fr auto; }
  .rail-head { display: none; }
  .rail-body { overflow: hidden auto; }
  .rail-foot { position: static; }
}
/* The PDF alone, beside the Markdown. */
body.mpe-preview .app { display: block; }
body.mpe-preview .rail { display: none; }
body.mpe-preview .desk { height: 100vh; border: 0; }
`;

const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** Replace exactly one occurrence, or fail loudly: the Studio page is not what we expect. */
function swap(html: string, find: string | RegExp, replacement: string, what: string): string {
  const count = typeof find === "string" ? html.split(find).length - 1 : (html.match(new RegExp(find, "g")) ?? []).length;
  if (count !== 1) throw new Error(`Studio page: expected one ${what}, found ${count}.`);
  return html.replace(find, () => replacement);
}

export function studioPanelHtml(indexHtml: string, uris: StudioPageUris): string {
  const { studio, host, app, worker, cspSource, nonce, mode } = uris;
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
  html = swap(html, "<body>", `<body class="${mode === "preview" ? "mpe-preview" : ""}">`, "body tag");
  // Studio's two viewer frames give way to one element, filled through its showPdf hook.
  html = swap(
    html,
    /<div class="frames">\s*<iframe\b[^>]*><\/iframe>\s*<iframe\b[^>]*><\/iframe>\s*<\/div>/,
    '<div class="frames"><div id="pdf-pages" tabindex="0" role="document" aria-label="PDF preview"></div></div>',
    "pair of preview frames",
  );
  if (/<iframe\b/i.test(html)) throw new Error("Studio page: a viewer frame is left that the panel cannot show.");
  if (/(?:src|href)="\//.test(html)) throw new Error("Studio page: a file is still loaded from the server root.");
  return html;
}
