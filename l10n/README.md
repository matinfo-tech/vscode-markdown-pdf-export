# Translations

The extension is in English and French. Another language is welcome as a pull request.

| File | What it translates |
| --- | --- |
| `l10n/bundle.l10n.<locale>.json` | Messages, the **PDF** menu, the Problems entries, `pdf:` suggestions, and the PDF panel with its design controls. Each key is the English text: the `t("…")` and `toTranslate("…")` texts of `src/` and the texts of Studio |
| `package.nls.<locale>.json` (repo root) | Command names, setting descriptions and the Get Started walkthrough's titles. English: `package.nls.json` |
| `media/walkthrough/<page>.nls.<locale>.md` | The walkthrough pages. English: `media/walkthrough/<page>.md` |

There is no English bundle: without a translation, the English text in the code is shown.

## Adding a language

Use VS Code's locale id: `de`, `es`, `it`, `ja`, `ko`, `pl`, `pt-br`, `ru`, `tr`, `zh-cn`, `zh-tw`...

1. Copy `bundle.l10n.fr.json` to `bundle.l10n.<locale>.json` and replace each French value with
   your translation. Keep the keys exactly as they are.
2. Copy `../package.nls.json` to `../package.nls.<locale>.json` and translate the values.
3. Copy each `../media/walkthrough/<page>.md` to `<page>.nls.<locale>.md` and translate it.
4. Add the locale to `LANGUAGES` in `../test/unit/l10n.test.ts` and run `npm test`.
5. Open a pull request.

## Rules

`npm test` checks them all.

- Translate every entry, none left empty: a missing or extra key fails the test.
- Keep every `{0}`, `{1}` and `{title}`, `{page}`... as many times as in the English text. You
  may move them.
- Keep every code span (`` `…` ``) unchanged, in the same order, and every
  `(command:…)` link.
- Translate the panel's buttons (*Save*, *Help*, *Design pages*, *Export PDF*, *Hide design*), and
  name them by their translated label everywhere else.

## Status

| Locale | Language | State |
| --- | --- | --- |
| `fr` | French | Shipped |

Corrections are welcome as a pull request or an issue.
