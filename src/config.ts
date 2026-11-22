/** The three extension settings and the environment variables the exporter reads for them. */

export interface EngineOptions {
  /** Path of the central settings file (replaces the user file). */
  settingsFile: string;
  /** chrome | msedge | chromium | path of a browser. */
  browser: string;
  debug: boolean;
}

export type Getter = <T>(key: string, fallback: T) => T;

/** Read the options through `get` (the VS Code configuration getter); blanks count as unset. */
export function readOptions(get: Getter): EngineOptions {
  return {
    settingsFile: get<string>("settingsFile", "").trim(),
    browser: get<string>("browser", "").trim(),
    debug: get<boolean>("debug", false) === true,
  };
}

/** Environment for a child process: only what is set, so the exporter's own defaults stay. */
export function toEnv(options: EngineOptions): Record<string, string> {
  const env: Record<string, string> = {};
  if (options.settingsFile) env.MARKDOWN_PDF_SETTINGS = options.settingsFile;
  if (options.browser) env.MARKDOWN_PDF_BROWSER = options.browser;
  if (options.debug) env.MARKDOWN_PDF_DEBUG = "1";
  return env;
}
