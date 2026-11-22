import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  allowedStudioRequest,
  cliPath,
  errorMessage,
  exportArgs,
  isNoBrowserError,
  parseExportResult,
  parseStudioUrl,
  studioArgs,
  withPreviewSource,
} from "../../src/engine.ts";

describe("cliPath", () => {
  it("points at the exporter shipped inside the extension", () => {
    assert.equal(cliPath("/ext"), path.join("/ext", "node_modules", "markdown-pdf-export", "cli.mjs"));
  });
});

describe("exportArgs", () => {
  it("passes the file and asks for a JSON result in a trusted local window", () => {
    assert.deepEqual(exportArgs("/a b/doc.md", { restricted: false, remote: false }), ["/a b/doc.md", "--json"]);
  });

  it("ignores project settings and forces safe HTML in Restricted Mode", () => {
    assert.deepEqual(exportArgs("d.md", { restricted: true, remote: false }), [
      "d.md",
      "--json",
      "--no-project-settings",
      "--sanitize",
      "safe",
      "--open-after-export=false",
    ]);
  });

  it("never opens the PDF on a remote host", () => {
    assert.deepEqual(exportArgs("d.md", { restricted: false, remote: true }), ["d.md", "--json", "--open-after-export=false"]);
  });
});

describe("parseExportResult", () => {
  it("reads the PDF path and what the export left out", () => {
    const stdout = JSON.stringify({ output_path: "/tmp/a b/doc.pdf", removed_html: ["<script>"], diagram_errors: ["Diagram 1: bad"], other: 1 }, null, 2);
    assert.deepEqual(parseExportResult(`${stdout}\n`), {
      pdf: "/tmp/a b/doc.pdf",
      report: { removed_html: ["<script>"], diagram_errors: ["Diagram 1: bad"] },
    });
    assert.deepEqual(parseExportResult('{"output_path":"C:\\\\docs\\\\doc.pdf"}')?.report, { removed_html: [], diagram_errors: [] });
  });

  it("gives null when nothing was exported", () => {
    for (const stdout of ["", "Usage: markdown-pdf-export ...\n", "/tmp/doc.pdf\n", "{}", '{"output_path":5}', "null"]) {
      assert.equal(parseExportResult(stdout), null, stdout);
    }
  });
});

describe("isNoBrowserError", () => {
  it("spots the exporter's no-browser message", () => {
    assert.ok(isNoBrowserError("markdown-pdf-export: No usable Chrome/Chromium browser found.\nTried:\n"));
    assert.ok(!isNoBrowserError("markdown-pdf-export: Markdown input not found: x.md"));
  });
});

describe("parseStudioUrl", () => {
  it("finds the private link, its port and its token", () => {
    assert.deepEqual(parseStudioUrl("http://127.0.0.1:51234/#0a1b2c\n"), {
      url: "http://127.0.0.1:51234/#0a1b2c",
      port: 51234,
      token: "0a1b2c",
    });
  });

  it("refuses anything that is not the local Studio link", () => {
    assert.equal(parseStudioUrl("http://evil.example/#abc\n"), null);
    assert.equal(parseStudioUrl("see http://127.0.0.1:1/#abc for details\n"), null);
  });
});

describe("studioArgs", () => {
  it("starts Studio for a panel: no browser, no file of its own", () => {
    assert.deepEqual(studioArgs({ project: false, restricted: false }), ["studio", "--embedded"]);
  });

  it("ignores the project file in Restricted Mode, except when designing that file", () => {
    assert.ok(studioArgs({ project: false, restricted: true }).includes("--no-project-settings"));
    const project = studioArgs({ project: true, restricted: true });
    assert.ok(project.includes("--project") && !project.includes("--no-project-settings"));
  });
});

describe("withPreviewSource", () => {
  const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
  const read = (body: Uint8Array) => JSON.parse(new TextDecoder().decode(body)) as unknown;

  it("adds the document the extension chose, with its unsaved text", () => {
    assert.deepEqual(read(withPreviewSource(bytes({ settings: { look: "report" } }), { file: "/w/d.md", text: "# é" })), {
      settings: { look: "report" },
      source: { file: "/w/d.md", text: "# é" },
    });
  });

  it("never lets the panel choose the file", () => {
    const fromPanel = bytes({ settings: {}, source: { file: "/etc/passwd" } });
    assert.deepEqual(read(withPreviewSource(fromPanel, { file: "/w/d.md" })), { settings: {}, source: { file: "/w/d.md" } });
    assert.deepEqual(read(withPreviewSource(fromPanel, undefined)), { settings: {} });
  });

  it("refuses a body that is not a JSON object", () => {
    for (const body of [null, new Uint8Array(), new TextEncoder().encode("[1]"), new TextEncoder().encode("not json")]) {
      assert.throws(() => withPreviewSource(body, { file: "/w/d.md" }), /not valid/);
    }
  });
});

describe("allowedStudioRequest", () => {
  it("lets the design API through", () => {
    for (const path of ["/api/state", "/api/preview", "/api/save", "/api/logo?name=a.png", "/api/logo?name=logo%20(1)!.png", "/api/ping", "/api/check"]) {
      assert.ok(allowedStudioRequest(path, "POST"), path);
    }
  });

  it("refuses other editors' setup and anything that is not an API path", () => {
    for (const path of ["/api/editors", "/api/editors/apply", "/app.mjs", "http://x/api/state", "/api/../x", "//evil/api/x", 5]) {
      assert.ok(!allowedStudioRequest(path, "GET"), String(path));
    }
  });
});

describe("errorMessage", () => {
  it("keeps the exporter's own message, without its prefix", () => {
    const stderr = "[markdown-pdf] note\nmarkdown-pdf-export: Markdown input not found: x.md\n";
    assert.equal(errorMessage(stderr), "Markdown input not found: x.md");
  });

  it("falls back to the raw text, then to a generic message", () => {
    assert.equal(errorMessage("spawn ENOENT\n"), "spawn ENOENT");
    assert.equal(errorMessage(""), "The export failed.");
  });
});
