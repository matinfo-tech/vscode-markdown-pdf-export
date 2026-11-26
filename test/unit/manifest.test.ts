import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { commandTitle } from "../../src/manifest.ts";

const manifest = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "..", "package.json"), "utf8")) as {
  activationEvents?: string[];
};

describe("package.json", () => {
  it("starts with the first Markdown file, so the status bar item, suggestions and Problems are there at once", () => {
    // Without it the extension waits for one of its commands, and nothing shows in a Markdown file.
    assert.ok(manifest.activationEvents?.includes("onLanguage:markdown"));
  });
});

describe("commandTitle", () => {
  const pkg = (title: unknown) => ({ contributes: { commands: [{ command: "x.export", title }] } });

  it("reads a plain title (no translation for the display language)", () => {
    assert.equal(commandTitle(pkg("Export to PDF"), "x.export"), "Export to PDF");
  });

  it("reads a translated title, which VS Code hands over as { value, original }", () => {
    assert.equal(commandTitle(pkg({ value: "Exporter en PDF", original: "Export to PDF" }), "x.export"), "Exporter en PDF");
    assert.equal(commandTitle(pkg({ original: "Export to PDF" }), "x.export"), "Export to PDF");
  });

  it("falls back to the command id, never to [object Object]", () => {
    assert.equal(commandTitle(pkg({}), "x.export"), "x.export");
    assert.equal(commandTitle(pkg("Export"), "x.other"), "x.other");
    assert.equal(commandTitle(undefined, "x.export"), "x.export");
  });
});
