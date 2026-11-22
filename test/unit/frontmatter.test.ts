import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import { contextAt, frontMatterEnd, PDF_KEYS, suggest, type Schema } from "../../src/frontmatter.ts";

// The real schema of the pinned exporter: an update that renames a key must fail here.
const schema = JSON.parse(fs.readFileSync("node_modules/markdown-pdf-export/schema/settings.schema.json", "utf8")) as Schema;
const labels = (lines: string[], line: number, character: number) =>
  suggest(schema, contextAt(lines, line, character)).map((s) => s.label);

describe("frontMatterEnd", () => {
  it("finds the closing line, or -1", () => {
    assert.equal(frontMatterEnd(["---", "a: 1", "---", "text"]), 2);
    assert.equal(frontMatterEnd(["---", "a: 1", "..."]), 2);
    assert.equal(frontMatterEnd(["# Title", "---", "a", "---"]), -1);
    assert.equal(frontMatterEnd(["---", "a: 1"]), -1);
    assert.equal(frontMatterEnd([]), -1);
  });
});

describe("contextAt", () => {
  it("is nothing outside the front matter", () => {
    assert.equal(contextAt(["---", "a: 1", "---", "pdf:"], 3, 4).kind, "none");
    assert.equal(contextAt(["# Title", "pdf:"], 1, 2).kind, "none");
    assert.equal(contextAt(["---", "a: 1", "---"], 0, 3).kind, "none");
    assert.equal(contextAt(["---", "a: 1", "---"], 2, 3).kind, "none");
  });

  it("is a root key at the top level, and a pdf key under pdf:", () => {
    assert.deepEqual(contextAt(["---", "", "---"], 1, 0), { kind: "key", path: [], indent: 0 });
    assert.deepEqual(contextAt(["---", "pdf:", "  ", "---"], 2, 2), { kind: "key", path: ["pdf"], indent: 2 });
    assert.deepEqual(contextAt(["---", "pdf:", "  header:", "    ", "---"], 3, 4), { kind: "key", path: ["pdf", "header"], indent: 4 });
  });

  it("is a value after 'key: '", () => {
    assert.deepEqual(contextAt(["---", "pdf:", "  orientation: ", "---"], 2, 15), { kind: "value", path: ["pdf"], key: "orientation" });
    assert.deepEqual(contextAt(["---", "pdf:", "  orientation: la", "---"], 2, 17), { kind: "value", path: ["pdf"], key: "orientation" });
  });

  it("works while the block is still unclosed, and skips comments and blank lines above", () => {
    assert.deepEqual(contextAt(["---", "pdf:", "  # note", "", "  "], 4, 2), { kind: "key", path: ["pdf"], indent: 2 });
  });

  it("is nothing under other keys or inside lists", () => {
    assert.equal(contextAt(["---", "tags:", "  ", "---"], 2, 2).kind, "none");
    assert.equal(contextAt(["---", "pdf:", "  header:", "    - a", "    ", "---"], 4, 4).kind, "none");
  });
});

describe("suggest", () => {
  it("offers title, author and pdf at the top", () => {
    assert.deepEqual(labels(["---", "", "---"], 1, 0), ["title", "author", "pdf"]);
  });

  it("offers exactly the keys that work in front matter under pdf:", () => {
    const got = labels(["---", "pdf:", "  ", "---"], 2, 2);
    assert.deepEqual([...got].sort(), [...PDF_KEYS].sort());
    for (const preset of ["look", "font", "template", "stylesheet_path", "output_directory", "assets_directory"]) {
      assert.ok(!got.includes(preset), preset);
    }
  });

  it("opens a block for object keys, with the right indent", () => {
    const header = suggest(schema, contextAt(["---", "pdf:", "  ", "---"], 2, 2)).find((s) => s.label === "header")!;
    assert.equal(header.insert, "header:\n    ");
    assert.ok(header.documentation);
    const scale = suggest(schema, contextAt(["---", "pdf:", "  ", "---"], 2, 2)).find((s) => s.label === "scale")!;
    assert.equal(scale.insert, "scale: ");
  });

  it("offers the header and footer zones, and margin sides", () => {
    const header = labels(["---", "pdf:", "  header:", "    ", "---"], 3, 4);
    for (const key of ["height", "left_text", "center_text", "right_text"]) assert.ok(header.includes(key), key);
    assert.deepEqual(labels(["---", "pdf:", "  margin:", "    ", "---"], 3, 4).sort(), ["bottom", "left", "right", "top"]);
  });

  it("offers enum and boolean values", () => {
    assert.deepEqual(labels(["---", "pdf:", "  orientation: ", "---"], 2, 15).sort(), ["landscape", "portrait"]);
    assert.deepEqual(labels(["---", "pdf:", "  toc: ", "---"], 2, 7), ["true", "false"]);
    assert.ok(labels(["---", "pdf:", "  page_format: ", "---"], 2, 15).includes("A4"));
    assert.deepEqual(labels(["---", "pdf:", "  scale: ", "---"], 2, 9), []);
  });

  it("offers nothing for a key that is not allowed or not known", () => {
    assert.deepEqual(labels(["---", "pdf:", "  look: ", "---"], 2, 8), []);
    assert.deepEqual(labels(["---", "pdf:", "  nope:", "    ", "---"], 3, 4), []);
  });
});
