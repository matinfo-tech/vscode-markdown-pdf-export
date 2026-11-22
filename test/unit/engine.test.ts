import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { cliPath, errorMessage, exportArgs, isNoBrowserError, parseExportStdout, parseStudioUrl } from "../../src/engine.ts";

describe("cliPath", () => {
  it("points at the exporter shipped inside the extension", () => {
    assert.equal(cliPath("/ext"), path.join("/ext", "node_modules", "markdown-pdf-export", "cli.mjs"));
  });
});

describe("exportArgs", () => {
  it("passes only the file in a trusted local window", () => {
    assert.deepEqual(exportArgs("/a b/doc.md", { restricted: false, remote: false }), ["/a b/doc.md"]);
  });

  it("ignores project settings and forces safe HTML in Restricted Mode", () => {
    assert.deepEqual(exportArgs("d.md", { restricted: true, remote: false }), [
      "d.md",
      "--no-project-settings",
      "--sanitize",
      "safe",
      "--open-after-export=false",
    ]);
  });

  it("never opens the PDF on a remote host", () => {
    assert.deepEqual(exportArgs("d.md", { restricted: false, remote: true }), ["d.md", "--open-after-export=false"]);
  });
});

describe("parseExportStdout", () => {
  it("reads the PDF path", () => {
    assert.equal(parseExportStdout("/tmp/a b/doc.pdf\n"), "/tmp/a b/doc.pdf");
    assert.equal(parseExportStdout("C:\\docs\\doc.PDF\r\n"), "C:\\docs\\doc.PDF");
  });

  it("gives null when nothing was exported", () => {
    assert.equal(parseExportStdout(""), null);
    assert.equal(parseExportStdout("Usage: markdown-pdf-export ...\n"), null);
  });
});

describe("isNoBrowserError", () => {
  it("spots the exporter's no-browser message", () => {
    assert.ok(isNoBrowserError("markdown-pdf-export: No usable Chrome/Chromium browser found.\nTried:\n"));
    assert.ok(!isNoBrowserError("markdown-pdf-export: Markdown input not found: x.md"));
  });
});

describe("parseStudioUrl", () => {
  it("finds the private link", () => {
    assert.equal(parseStudioUrl("http://127.0.0.1:51234/#0a1b2c\n"), "http://127.0.0.1:51234/#0a1b2c");
  });

  it("refuses anything that is not the local Studio link", () => {
    assert.equal(parseStudioUrl("http://evil.example/#abc\n"), null);
    assert.equal(parseStudioUrl("see http://127.0.0.1:1/#abc for details\n"), null);
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
