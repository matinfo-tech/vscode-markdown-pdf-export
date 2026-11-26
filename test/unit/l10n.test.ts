import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { DOCS_TOPICS } from "../../src/docs.ts";
import { summarize, type DoctorReport } from "../../src/doctor.ts";
import { errorMessage } from "../../src/engine.ts";
import { contextAt, suggest, type Schema } from "../../src/frontmatter.ts";
import { translate, useTranslations } from "../../src/l10n.ts";
import { findProblems } from "../../src/problems.ts";
import { panelText, studioPanelHtml } from "../../src/studio-html.ts";

const root = path.join(import.meta.dirname, "..", "..");
const read = (file: string): string => fs.readFileSync(path.join(root, file), "utf8");
const json = (file: string): Record<string, string> => JSON.parse(read(file)) as Record<string, string>;

const LANGUAGES = ["fr"];
const english = json("package.nls.json");
const placeholders = [...read("package.json").matchAll(/"%([\w.]+)%"/g)].map((m) => m[1]);
const commandLinks = (text: string): string[] => [...text.matchAll(/\(command:[^)]+\)/g)].map((m) => m[0]).sort();
const walkthroughPages = fs.readdirSync(path.join(root, "media/walkthrough")).filter((f) => /^[a-z]+\.md$/.test(f));

// The source files, without their comments (which may show how `t` is called).
const sources = fs
  .readdirSync(path.join(root, "src"), { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".ts"))
  .map((f) => ({ file: f, code: read(`src/${f}`).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "") }));
const lineOf = (code: string, index: number) => code.slice(0, index).split("\n").length;
const STRING = String.raw`"(?:[^"\\]|\\.)*"`;

/** Every `t("…")` and `toTranslate("…")` text of src/: the keys of l10n/bundle.l10n.<lang>.json. */
const runtimeStrings = [
  ...new Set(
    sources.flatMap(({ code }) =>
      [...code.matchAll(new RegExp(String.raw`(?<![\w.$])(?:t|toTranslate)\(\s*(${STRING})`, "g"))].map((m) => JSON.parse(m[1]!) as string),
    ),
  ),
].sort();

/** `{0}`, `{title}`… : what a translation must keep, the same number of times. */
const tokens = (text: string): string[] => (text.match(/\{[^{}\s]+\}/g) ?? []).sort();

describe("translations", () => {
  it("every %key% of package.json is in package.nls.json, and no key is left unused", () => {
    assert.deepEqual([...new Set(placeholders)].sort(), Object.keys(english).sort());
  });

  it("t() and toTranslate() are only called with a string literal, so their text can be collected", () => {
    const found = sources.flatMap(({ file, code }) =>
      [...code.matchAll(/(?<![\w.$])(?:t|toTranslate)\((?!\s*")/g)].map((m) => `src/${file}:${lineOf(code, m.index)}`),
    );
    assert.deepEqual(found, []);
  });

  it("no message or button is shown in English only, and buttons are compared with their translated text", () => {
    const found = sources.flatMap(({ file, code }) =>
      [...code.matchAll(/show(?:Information|Warning|Error)Message\(\s*[`"']|\b(?:pick|choice) === [`"']|location: [^,]+, title: [`"']/g)].map(
        (m) => `src/${file}:${lineOf(code, m.index)}: ${m[0]}`,
      ),
    );
    assert.deepEqual(found, []);
  });

  it("the panel's buttons take each of their texts from panelText()", () => {
    const host = read("src/webview/studio-host.js");
    const said = [...host.matchAll(new RegExp(String.raw`\bsay\((${STRING})\)`, "g"))].map((m) => JSON.parse(m[1]!) as string);
    assert.ok(said.length > 0, "no say() call in studio-host.js");
    const table = panelText();
    assert.deepEqual([...new Set(said)].sort(), Object.keys(table).sort());
    for (const [key, text] of Object.entries(table)) assert.equal(text, key, "without translations the English text is shown");
  });

  for (const lang of LANGUAGES) {
    const translated = json(`package.nls.${lang}.json`);
    const bundle = json(`l10n/bundle.l10n.${lang}.json`);

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

    it(`l10n/bundle.l10n.${lang}.json translates exactly the texts of src/`, () => {
      assert.ok(runtimeStrings.length > 50, `only ${runtimeStrings.length} texts found in src/`);
      assert.deepEqual(Object.keys(bundle).sort(), runtimeStrings);
      for (const [key, text] of Object.entries(bundle)) assert.ok(text.trim(), `${lang}: ${key} is empty`);
    });

    it(`l10n/bundle.l10n.${lang}.json keeps every {0} and {placeholder}, and every code span`, () => {
      for (const [key, text] of Object.entries(bundle)) {
        assert.deepEqual(tokens(text), tokens(key), `${lang}: ${key}`);
        assert.deepEqual(text.match(/`[^`]+`/g) ?? [], key.match(/`[^`]+`/g) ?? [], `${lang}: ${key}`);
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

describe("the pure modules in French", () => {
  // As the extension does at start with VS Code in French.
  before(() => useTranslations(json("l10n/bundle.l10n.fr.json")));
  after(() => useTranslations(undefined));

  it("translate() fills in the values and leaves the user's {placeholders} alone", () => {
    assert.equal(translate("PDF ready: {0}. {1} things were left out or not drawn.", "a.pdf", 3), "PDF prêt : a.pdf. 3 éléments ont été omis ou n'ont pas pu être dessinés.");
    assert.equal(translate("{page}, {pages}, {title}, {author}, {date}…"), "{page}, {pages}, {title}, {author}, {date}…");
    assert.equal(translate("not in the bundle {0}", "x"), "not in the bundle x");
  });

  it("Check Setup", () => {
    const report: DoctorReport = {
      version: "2.9.1",
      browser: { available: false },
      settings_sources: [
        { kind: "user", path: "/u/settings.json", loaded: false, error: null },
        { kind: "project", path: "/p/.markdown-pdf.json", loaded: false, error: "Unexpected token" },
      ],
    };
    const summary = summarize(report, "Markdown PDF: Télécharger le navigateur PDF");
    assert.equal(summary.headline, "Aucun navigateur trouvé pour dessiner les PDF.");
    assert.deepEqual(summary.lines, [
      "Moteur d'export : markdown-pdf-export 2.9.1",
      "Navigateur : aucun trouvé. Installez Chrome ou Edge, ou lancez « Markdown PDF: Télécharger le navigateur PDF ».",
      "Vos paramètres : aucun pour l'instant (/u/settings.json). Les valeurs par défaut sont utilisées.",
      "Paramètres du dossier : /p/.markdown-pdf.json — non utilisé : Unexpected token",
    ]);
  });

  it("Problems entries", () => {
    const problems = findProblems("<script>x</script>\n\n```mermaid\nnope\n```\n", { removed_html: ["<script>"], diagram_errors: ["Diagram 1: Parse error"] });
    assert.deepEqual(
      problems.map((p) => p.message),
      ["<script> est retiré du PDF : le HTML brut est rendu sûr.", "Ce diagramme est imprimé comme du code dans le PDF : Parse error"],
    );
  });

  it("suggestions in front matter: the help of title, author and pdf, and the header link", () => {
    const schema = JSON.parse(read("node_modules/markdown-pdf-export/schema/settings.schema.json")) as Schema;
    const top = suggest(schema, contextAt(["---", "", "---"], 1, 0));
    assert.match(top.find((s) => s.label === "title")?.documentation ?? "", /^Titre du document : imprimé par \{title\}/);
    assert.match(top.find((s) => s.label === "pdf")?.documentation ?? "", /\[Un document, sa propre conception\]\(https:/);
    const keys = suggest(schema, contextAt(["---", "pdf:", "  ", "---"], 2, 2));
    assert.match(keys.find((s) => s.label === "header")?.documentation ?? "", /\[Référence de l'en-tête et du pied de page\]/);
    assert.equal(keys.find((s) => s.label === "header")?.detail, "bloc");
  });

  it("the documentation topics, translated where they are shown", () => {
    const bundle = json("l10n/bundle.l10n.fr.json");
    for (const topic of DOCS_TOPICS) {
      assert.ok(topic.label in bundle, topic.label);
      assert.ok(topic.detail in bundle, topic.detail);
    }
    assert.equal(translate(DOCS_TOPICS[0]!.label), "Concevoir les pages (Studio)");
  });

  it("the panel's buttons and the export's last-resort error", () => {
    assert.equal(panelText()["Design pages"], "Concevoir les pages");
    assert.equal(panelText()["Help"], "Aide");
    const html = studioPanelHtml(read("node_modules/markdown-pdf-export/studio/index.html"), {
      studio: "s",
      host: "h",
      app: "a",
      worker: "w",
      cspSource: "c",
      nonce: "n",
      mode: "preview",
    });
    assert.match(html, /aria-label="Aperçu PDF"/);
    assert.match(html, /<meta name="mpe-text" content="[^"]*Concevoir les pages/);
    assert.equal(errorMessage(""), "L'export a échoué.");
  });
});
