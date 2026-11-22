/** Pure helpers around the exporter's command line (no `vscode` import, testable with node --test). */
import path from "node:path";

/** Where `cli.mjs` lives inside the installed extension. */
export function cliPath(extensionPath: string): string {
  return path.join(extensionPath, "node_modules", "markdown-pdf-export", "cli.mjs");
}

export interface ExportFlags {
  /** Restricted Mode or an untrusted document: ignore project files, always sanitise. */
  restricted: boolean;
  /** Remote hosts have no desktop to open a PDF on. */
  remote: boolean;
}

/** Arguments for `cli.mjs` exporting one file. */
export function exportArgs(file: string, flags: ExportFlags): string[] {
  const args = [file];
  if (flags.restricted) args.push("--no-project-settings", "--sanitize", "safe");
  if (flags.restricted || flags.remote) args.push("--open-after-export=false");
  return args;
}

/** The CLI prints the absolute PDF path alone on stdout; warnings go to stderr. */
export function parseExportStdout(stdout: string): string | null {
  const lines = stdout.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines.at(-1);
  return last && last.toLowerCase().endsWith(".pdf") ? last : null;
}

/** True when the exporter says no Chrome, Edge or Chromium could be started. */
export function isNoBrowserError(stderr: string): boolean {
  return /No usable Chrome\/Chromium browser found/i.test(stderr);
}

/** Studio prints its private link alone on stdout. */
export function parseStudioUrl(stdout: string): string | null {
  const match = /^http:\/\/127\.0\.0\.1:\d+\/#[0-9a-f]+$/m.exec(stdout);
  return match ? match[0] : null;
}

/** The message the CLI wrote after its `markdown-pdf-export:` prefix, else the raw text. */
export function errorMessage(stderr: string): string {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const own = lines.filter((l) => l.startsWith("markdown-pdf-export:"));
  const text = (own.length ? own : lines).join("\n");
  return text.replace(/^markdown-pdf-export:\s*/gm, "") || "The export failed.";
}
