/** Reading the exporter's `doctor --json` report (pure, no `vscode` import). */
import { t } from "./l10n.ts";

export interface SettingsSource {
  kind: string;
  path: string | null;
  loaded: boolean;
  error: string | null;
}

export interface DoctorReport {
  version: string;
  browser: { available: boolean; version?: string; launch_options?: { channel?: string; executablePath?: string }; error?: string };
  settings_sources: SettingsSource[];
}

/** `doctor --json` prints the report even when it exits 1 (no browser). */
export function parseDoctor(stdout: string): DoctorReport | null {
  try {
    const report = JSON.parse(stdout) as DoctorReport;
    return report && typeof report.version === "string" && Array.isArray(report.settings_sources) ? report : null;
  } catch {
    return null;
  }
}

/** The settings file that holds the user's page design (not a project file). */
export function userSettingsFile(report: DoctorReport): SettingsSource | null {
  return report.settings_sources.find((s) => s.kind !== "project" && s.path) ?? null;
}

export interface DoctorSummary {
  ok: boolean;
  headline: string;
  lines: string[];
}

/**
 * @param downloadCommand  the name of the command that downloads a browser, as the Command
 *   Palette shows it in the display language.
 */
export function summarize(report: DoctorReport, downloadCommand = "Markdown PDF: Download PDF Browser"): DoctorSummary {
  const lines = [t("Exporter: markdown-pdf-export {0}", report.version)];
  const { browser } = report;
  if (browser.available) {
    const which = browser.launch_options?.executablePath ?? browser.launch_options?.channel ?? "Chromium";
    lines.push(t("Browser: {0}", `${which}${browser.version ? ` ${browser.version}` : ""}`));
  } else {
    lines.push(t("Browser: none found. Install Chrome or Edge, or run “{0}”.", downloadCommand));
  }
  const broken: string[] = [];
  for (const source of report.settings_sources) {
    const label = source.kind === "project" ? t("Folder settings") : t("Your settings");
    if (source.error) {
      lines.push(t("{0}: {1} — not used: {2}", label, source.path ?? "", source.error));
      broken.push(source.path ?? label);
    } else if (source.loaded) lines.push(t("{0}: {1}", label, source.path ?? ""));
    else lines.push(t("{0}: none yet ({1}). Defaults are used.", label, source.path ?? ""));
  }
  const ok = browser.available && broken.length === 0;
  const headline = !browser.available
    ? t("No browser found to draw PDFs.")
    : broken.length
      ? t("A settings file has a mistake and is not used: {0}", broken.join(", "))
      : t("Ready to export.");
  return { ok, headline, lines };
}
