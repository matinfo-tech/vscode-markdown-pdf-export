import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DOCS_SITE, DOCS_TOPICS, docsLink, docsUrl } from "../../src/docs.ts";

describe("documentation topics", () => {
  it("each topic has its own id and a page of the documentation site", () => {
    assert.equal(new Set(DOCS_TOPICS.map((t) => t.id)).size, DOCS_TOPICS.length);
    for (const topic of DOCS_TOPICS) {
      assert.match(topic.path, /^\/[a-z-]+(?:\/[a-z-]+)?$/, topic.id);
      assert.equal(new URL(docsUrl(topic.id)).origin, DOCS_SITE);
    }
  });

  it("names the pages a user asks for most", () => {
    assert.equal(docsUrl("per-document"), `${DOCS_SITE}/advanced/per-document`);
    assert.equal(docsUrl("header-footer-reference"), `${DOCS_SITE}/reference/header-footer`);
  });

  it("falls back to the home page for an unknown topic", () => {
    assert.equal(docsUrl("nope"), `${DOCS_SITE}/`);
    assert.equal(docsUrl(), `${DOCS_SITE}/`);
  });

  it("writes a Markdown link", () => {
    assert.equal(docsLink("settings", "All settings"), `[All settings](${DOCS_SITE}/reference/settings)`);
  });
});
