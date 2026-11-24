/**
 * Settings files written by Studio name their schema online ("$schema": the documentation site).
 * VS Code downloads schemas only from trusted places and otherwise shows "Location ... is
 * untrusted". When such a file is opened, offer once to add the site to the user's trusted places
 * (json.schemaDownload.trustedDomains). The user setting is merged with VS Code's own list, so
 * nothing VS Code trusts by itself is lost.
 */
import * as vscode from "vscode";

export const SCHEMA_SITE = "https://markdown-pdf.matinfo.tech/schema/";
const SETTING = "json.schemaDownload.trustedDomains";
const DONT_ASK = "markdownPdfExport.schemaTrust.dontAsk";

const namesOurSchema = (doc: vscode.TextDocument) =>
  (doc.languageId === "json" || doc.languageId === "jsonc") && doc.getText().includes(SCHEMA_SITE);

/** True when VS Code already downloads schemas from the site (or schema downloads are off). */
export function siteTrusted(): boolean {
  const json = vscode.workspace.getConfiguration();
  if (json.get<boolean>("json.schemaDownload.enable", true) === false) return true;
  const domains = json.get<Record<string, boolean>>(SETTING, {});
  return Object.entries(domains).some(([prefix, on]) => on && (prefix === "*" || SCHEMA_SITE.startsWith(prefix)));
}

/** Add the site to the user's trusted places, keeping whatever the user set there before. */
export async function trustSite(): Promise<void> {
  const config = vscode.workspace.getConfiguration();
  const mine = config.inspect<Record<string, boolean>>(SETTING)?.globalValue ?? {};
  await config.update(SETTING, { ...mine, [SCHEMA_SITE]: true }, vscode.ConfigurationTarget.Global);
}

export function watchSchemaTrust(state: vscode.Memento): vscode.Disposable {
  let asking = false;
  const check = async (doc: vscode.TextDocument) => {
    if (asking || !namesOurSchema(doc) || siteTrusted() || state.get(DONT_ASK)) return;
    asking = true;
    try {
      const pick = await vscode.window.showInformationMessage(
        "This Markdown PDF settings file takes its completion and checks from markdown-pdf.matinfo.tech. Let VS Code load that schema?",
        "Allow",
        "Don't Ask Again",
      );
      if (pick === "Allow") await trustSite();
      if (pick === "Don't Ask Again") await state.update(DONT_ASK, true);
    } finally {
      asking = false;
    }
  };
  for (const doc of vscode.workspace.textDocuments) void check(doc);
  return vscode.workspace.onDidOpenTextDocument((doc) => void check(doc));
}
