import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  allowedStudioRequest,
  cliPath,
  errorMessage,
  exportArgs,
  isNoBrowserError,
  parseExportStdout,
  parseStudioUrl,
  studioArgs,
} from "../../src/engine.ts";

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
  it("never opens a browser", () => {
    assert.deepEqual(studioArgs({ project: false, restricted: false }), ["studio", "--no-open"]);
  });

  it("previews the given file", () => {
    assert.deepEqual(studioArgs({ file: "/a b/d.md", project: false, restricted: false }), [
      "studio",
      "--no-open",
      "--file",
      "/a b/d.md",
    ]);
  });

  it("ignores the project file in Restricted Mode, except when designing that file", () => {
    assert.ok(studioArgs({ file: "d.md", project: false, restricted: true }).includes("--no-project-settings"));
    const project = studioArgs({ file: "d.md", project: true, restricted: true });
    assert.ok(project.includes("--project") && !project.includes("--no-project-settings"));
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
