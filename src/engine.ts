/** Pure helpers around the exporter's command line (no `vscode` import, testable with node --test). */
import path from "node:path";
import { t } from "./l10n.ts";
import { toReport, type Report } from "./problems.ts";

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

/** Arguments for `cli.mjs` exporting one file; the result is printed as JSON. */
export function exportArgs(file: string, flags: ExportFlags): string[] {
  const args = [file, "--json"];
  if (flags.restricted) args.push("--no-project-settings", "--sanitize", "safe");
  if (flags.restricted || flags.remote) args.push("--open-after-export=false");
  return args;
}

export interface ExportResult {
  /** Absolute path of the PDF. */
  pdf: string;
  /** What the export left out or could not draw. */
  report: Report;
}

/** With --json the CLI prints one JSON object on stdout. Null when it is not there. */
export function parseExportResult(stdout: string): ExportResult | null {
  try {
    const result: unknown = JSON.parse(stdout);
    const pdf = (result as { output_path?: unknown } | null)?.output_path;
    return typeof pdf === "string" && pdf ? { pdf, report: toReport(result) } : null;
  } catch {
    return null;
  }
}

/** True when the exporter says no Chrome, Edge or Chromium could be started. */
export function isNoBrowserError(stderr: string): boolean {
  return /No usable Chrome\/Chromium browser found/i.test(stderr);
}

export interface StudioLink {
  url: string;
  port: number;
  token: string;
}

/** Studio prints its private link (`http://127.0.0.1:<port>/#<token>`) alone on stdout. */
export function parseStudioUrl(stdout: string): StudioLink | null {
  const match = /^http:\/\/127\.0\.0\.1:(\d+)\/#([0-9a-f]+)$/m.exec(stdout);
  return match ? { url: match[0], port: Number(match[1]), token: match[2]! } : null;
}

export interface StudioFlags {
  /** Edit this folder's .markdown-pdf.json instead of the user's settings file. */
  project: boolean;
  /** Restricted Mode: previews ignore the project file near the document. */
  restricted: boolean;
}

/**
 * Arguments for `cli.mjs studio` when the page lives in a VS Code panel: no browser is opened,
 * and each preview request says which document to draw (see `withPreviewSource`).
 */
export function studioArgs(flags: StudioFlags): string[] {
  const args = ["studio", "--embedded"];
  if (flags.project) args.push("--project");
  if (flags.restricted && !flags.project) args.push("--no-project-settings");
  return args;
}

export interface PreviewSource {
  /** Absolute path of the Markdown file. */
  file: string;
  /** Its text when the editor holds changes not saved yet. */
  text?: string;
}

/**
 * Body of a preview request, with the document to draw set by the extension. Whatever the panel
 * put there is dropped: the panel never chooses which file is read.
 */
export function withPreviewSource(body: Uint8Array | null | undefined, source: PreviewSource | undefined): Uint8Array {
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(body ?? new Uint8Array()));
  } catch {
    parsed = null;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(t("The preview request is not valid."));
  const rest = { ...(parsed as Record<string, unknown>) };
  delete rest.source;
  return new TextEncoder().encode(JSON.stringify(source ? { ...rest, source } : rest));
}

/** What the panel may ask the Studio server: its API, minus changing other editors' files. */
export function allowedStudioRequest(path: unknown, method: unknown): path is string {
  if (typeof path !== "string" || typeof method !== "string") return false;
  if (!/^\/api\/[a-z]+(\/[a-z]+)*(\?[^\s#]*)?$/.test(path)) return false;
  return !path.startsWith("/api/editors");
}

/** The message the CLI wrote after its `markdown-pdf-export:` prefix, else the raw text. */
export function errorMessage(stderr: string): string {
  const lines = stderr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const own = lines.filter((l) => l.startsWith("markdown-pdf-export:"));
  const text = (own.length ? own : lines).join("\n");
  return text.replace(/^markdown-pdf-export:\s*/gm, "") || t("The export failed.");
}
