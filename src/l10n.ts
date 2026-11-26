/**
 * Text shown to the user, in VS Code's display language. Pure (no `vscode` import) so that the
 * modules the unit tests load can use it: the extension hands over VS Code's bundle at start
 * (`vscode.l10n.bundle`, from l10n/bundle.l10n.<language>.json), and without one the English
 * text is used as it is.
 *
 * Rules, checked by test/unit/l10n.test.ts:
 *  - `t` takes a string literal, in English: it is the key of the bundle. Values go in `{0}`, `{1}`…
 *  - A text kept in a constant before the extension starts is marked with `toTranslate`, and
 *    translated where it is shown with `translate(value)`.
 *  - Other braces, such as `{title}`, are text for the user and stay as they are.
 */

type Bundle = Record<string, unknown>;

let bundle: Bundle = {};

/** The translations to use from now on; none: English. */
export function useTranslations(next: Bundle | undefined): void {
  bundle = next ?? {};
}

/** A text in the display language, with `{0}`, `{1}`… replaced by the values given. */
export function translate(message: string, ...args: (string | number)[]): string {
  const entry = bundle[message];
  const text =
    typeof entry === "string"
      ? entry
      : typeof (entry as { message?: unknown } | undefined)?.message === "string"
        ? (entry as { message: string }).message
        : message;
  return text.replace(/\{(\d+)\}/g, (match, index: string) => (Number(index) < args.length ? String(args[Number(index)]) : match));
}

/** `translate` for a string literal: the form the bundle's keys are collected from. */
export const t = translate;

/** Marks a text to translate later, where it is shown. Returns it unchanged. */
export const toTranslate = (message: string): string => message;
