// Reads the extension's own package.json as VS Code hands it over (extension.packageJSON).

/**
 * A translated string of package.json: a plain string with no translation for the display
 * language, or `{ value, original }` (the translation, and the English) with one.
 */
type Localized = string | { value?: unknown; original?: unknown };

/** The title of one of the extension's commands, in the display language; the id if none. */
export function commandTitle(packageJSON: unknown, command: string): string {
  const commands = (packageJSON as { contributes?: { commands?: { command?: string; title?: Localized }[] } } | undefined)
    ?.contributes?.commands;
  const title = commands?.find((c) => c.command === command)?.title;
  if (typeof title === "string") return title;
  if (typeof title?.value === "string") return title.value;
  if (typeof title?.original === "string") return title.original;
  return command;
}
