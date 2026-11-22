/** Reading the exporter's `doctor --json` report (pure, no `vscode` import). */

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

export function summarize(report: DoctorReport): DoctorSummary {
  const lines = [`Exporter: markdown-pdf-export ${report.version}`];
  const { browser } = report;
  if (browser.available) {
    const which = browser.launch_options?.executablePath ?? browser.launch_options?.channel ?? "Chromium";
    lines.push(`Browser: ${which}${browser.version ? ` ${browser.version}` : ""}`);
  } else {
    lines.push("Browser: none found. Install Chrome or Edge, or run “Markdown PDF: Download PDF Browser”.");
  }
  const broken: string[] = [];
  for (const source of report.settings_sources) {
    const label = source.kind === "project" ? "Folder settings" : "Your settings";
    if (source.error) {
      lines.push(`${label}: ${source.path} — not used: ${source.error}`);
      broken.push(source.path ?? label);
    } else if (source.loaded) lines.push(`${label}: ${source.path}`);
    else lines.push(`${label}: none yet (${source.path}). Defaults are used.`);
  }
  const ok = browser.available && broken.length === 0;
  const headline = !browser.available
    ? "No browser found to draw PDFs."
    : broken.length
      ? `A settings file has a mistake and is not used: ${broken.join(", ")}`
      : "Ready to export.";
  return { ok, headline, lines };
}
