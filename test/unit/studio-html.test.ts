import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { studioPanelHtml } from "../../src/studio-html.ts";

// The real page of the pinned exporter: an exporter update that changes it must fail here.
const index = fs.readFileSync("node_modules/markdown-pdf-export/studio/index.html", "utf8");
const uris = {
  studio: "https://file+.vscode-resource.vscode-cdn.net/ext/node_modules/markdown-pdf-export/studio",
  host: "https://file+.vscode-resource.vscode-cdn.net/ext/dist/studio-host.js",
  app: "https://file+.vscode-resource.vscode-cdn.net/ext/dist/studio-app.js",
  worker: "https://file+.vscode-resource.vscode-cdn.net/ext/dist/pdf.worker.min.js",
  cspSource: "https://*.vscode-cdn.net",
  nonce: "abc123",
  mode: "design" as const,
};

describe("studioPanelHtml", () => {
  const html = studioPanelHtml(index, uris);

  it("loads Studio's files from the extension, the host script first", () => {
    assert.ok(html.includes(`href="${uris.studio}/style.css"`));
    const host = html.indexOf(`src="${uris.host}"`);
    const app = html.indexOf(`src="${uris.app}"`);
    assert.ok(host > 0 && app > host);
    assert.doesNotMatch(html, /(?:src|href)="\//);
    assert.doesNotMatch(html, /\.mjs"/, "a VS Code panel cannot load .mjs files");
  });

  it("replaces the two viewer frames by one element the host script draws in", () => {
    assert.doesNotMatch(html, /<iframe/);
    assert.equal(html.split('id="pdf-pages"').length - 1, 1);
    assert.match(html, /<div class="frames"><div id="pdf-pages"[^>]*><\/div><\/div>/);
  });

  it("opens on the PDF alone when asked", () => {
    assert.match(studioPanelHtml(index, { ...uris, mode: "preview" }), /<body class="mpe-preview">/);
    assert.match(html, /<body class="">/);
  });

  it("locks the page down: no inline script, nothing from the network", () => {
    const csp = /Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? "";
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /script-src https:\/\/\*\.vscode-cdn\.net(;|$)/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|http:/);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)/);
  });

  it("fails loudly when the Studio page is not the one it knows", () => {
    assert.throws(() => studioPanelHtml("<html></html>", uris), /Studio page/);
    assert.throws(() => studioPanelHtml(index.replace(/<iframe id="frame-b"[^>]*><\/iframe>/, ""), uris), /pair of preview frames/);
    assert.throws(() => studioPanelHtml(index.replace("</body>", "<iframe></iframe></body>"), uris), /viewer frame is left/);
  });
});
