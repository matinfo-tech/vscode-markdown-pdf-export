import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readOptions, toEnv, type Getter } from "../../src/config.ts";

const from = (values: Record<string, unknown>): Getter => (key, fallback) =>
  (key in values ? values[key] : fallback) as typeof fallback;

describe("readOptions", () => {
  it("defaults to nothing set", () => {
    assert.deepEqual(readOptions(from({})), { settingsFile: "", browser: "", debug: false });
  });

  it("trims and treats blanks as unset", () => {
    const o = readOptions(from({ settingsFile: "  /s.json ", browser: "   ", debug: true }));
    assert.deepEqual(o, { settingsFile: "/s.json", browser: "", debug: true });
  });
});

describe("toEnv", () => {
  it("sets only what the user set", () => {
    assert.deepEqual(toEnv({ settingsFile: "", browser: "", debug: false }), {});
    assert.deepEqual(toEnv({ settingsFile: "/s.json", browser: "msedge", debug: true }), {
      MARKDOWN_PDF_SETTINGS: "/s.json",
      MARKDOWN_PDF_BROWSER: "msedge",
      MARKDOWN_PDF_DEBUG: "1",
    });
  });
});
