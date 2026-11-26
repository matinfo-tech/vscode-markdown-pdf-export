import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = path.join(import.meta.dirname, "..", "..");
const read = (file: string): string => fs.readFileSync(path.join(root, file), "utf8");
const json = (file: string): Record<string, string> => JSON.parse(read(file)) as Record<string, string>;

const LANGUAGES = ["fr"];
const english = json("package.nls.json");
const placeholders = [...read("package.json").matchAll(/"%([\w.]+)%"/g)].map((m) => m[1]);
const commandLinks = (text: string): string[] => [...text.matchAll(/\(command:[^)]+\)/g)].map((m) => m[0]).sort();
const walkthroughPages = fs.readdirSync(path.join(root, "media/walkthrough")).filter((f) => /^[a-z]+\.md$/.test(f));

describe("translations of package.json", () => {
  it("every %key% of package.json is in package.nls.json, and no key is left unused", () => {
    assert.deepEqual([...new Set(placeholders)].sort(), Object.keys(english).sort());
  });

  for (const lang of LANGUAGES) {
    const translated = json(`package.nls.${lang}.json`);

    it(`package.nls.${lang}.json has exactly the English keys`, () => {
      assert.deepEqual(Object.keys(translated).sort(), Object.keys(english).sort());
      for (const [key, text] of Object.entries(translated)) assert.ok(text.trim(), `${lang}: ${key} is empty`);
    });

    it(`package.nls.${lang}.json keeps every command link and code span`, () => {
      for (const [key, text] of Object.entries(english)) {
        const other = translated[key] ?? "";
        assert.deepEqual(commandLinks(other), commandLinks(text), `${lang}: ${key}`);
        assert.deepEqual(other.match(/`[^`]+`/g) ?? [], text.match(/`[^`]+`/g) ?? [], `${lang}: ${key}`);
      }
    });

    it(`each walkthrough page has a ${lang} copy with the same command links`, () => {
      for (const page of walkthroughPages) {
        const copy = page.replace(/\.md$/, `.nls.${lang}.md`);
        assert.ok(fs.existsSync(path.join(root, "media/walkthrough", copy)), `missing media/walkthrough/${copy}`);
        assert.deepEqual(commandLinks(read(`media/walkthrough/${copy}`)), commandLinks(read(`media/walkthrough/${page}`)), copy);
      }
    });
  }
});
