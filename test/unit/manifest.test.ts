import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const manifest = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "..", "package.json"), "utf8")) as {
  activationEvents?: string[];
};

describe("package.json", () => {
  it("starts with the first Markdown file, so the status bar item, suggestions and Problems are there at once", () => {
    // Without it the extension waits for one of its commands, and nothing shows in a Markdown file.
    assert.ok(manifest.activationEvents?.includes("onLanguage:markdown"));
  });
});
