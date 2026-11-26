import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import { exportCommand, installBrowser, type Context } from "./commands/export.ts";
import { openDocs, openFolderSettingsFile, openSettingsFile, runDoctor, showMenu, statusBarItem } from "./commands/tools.ts";
import { mcpLaunch, registerMcp, type McpLaunch } from "./mcp.ts";
import { registerFrontMatterCompletion } from "./completion.ts";
import { siteTrusted, trustSite, watchSchemaTrust } from "./schema-trust.ts";
import { problemsOf, registerDiagnostics } from "./diagnostics.ts";
import { disposeStudio, openStudio, studioEvents, watchDocuments, type StudioEvents } from "./studio.ts";

/** Returned by `activate` for the integration tests. */
export interface Api {
  studio: StudioEvents;
  /** How the AI tools server is started. */
  mcpLaunch(): McpLaunch;
  /** The Problems panel entries of a Markdown file. */
  problems(uri: vscode.Uri): readonly vscode.Diagnostic[];
  schemaTrust: { trusted(): boolean; trust(): Promise<void> };
}

const markdownUri = (arg: unknown): vscode.Uri | undefined => {
  if (arg instanceof vscode.Uri) return arg;
  const doc = vscode.window.activeTextEditor?.document;
  return doc?.languageId === "markdown" ? doc.uri : undefined;
};

/** Version of the exporter inside the extension: VS Code refreshes the AI tools when it changes. */
function exporterVersion(extensionPath: string): string {
  try {
    const file = path.join(extensionPath, "node_modules", "markdown-pdf-export", "package.json");
    return String((JSON.parse(fs.readFileSync(file, "utf8")) as { version?: string }).version ?? "");
  } catch {
    return "";
  }
}

export function activate(context: vscode.ExtensionContext): Api {
  const output = vscode.window.createOutputChannel("Markdown PDF Export");
  const ctx: Context = { extensionPath: context.extensionPath, output };
  const studio = { extensionUri: context.extensionUri, output };
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("markdownPdfExport.export", (clicked?: vscode.Uri, selected?: vscode.Uri[]) =>
      exportCommand(ctx, clicked instanceof vscode.Uri ? clicked : undefined, Array.isArray(selected) ? selected : undefined),
    ),
    vscode.commands.registerCommand("markdownPdfExport.openPreview", (arg?: unknown) =>
      openStudio(studio, { file: markdownUri(arg), mode: "preview" }),
    ),
    vscode.commands.registerCommand("markdownPdfExport.openStudio", (arg?: unknown) =>
      openStudio(studio, { file: markdownUri(arg), mode: "design" }),
    ),
    vscode.commands.registerCommand("markdownPdfExport.openProjectStudio", (arg?: unknown) =>
      openStudio(studio, { file: markdownUri(arg), project: true, mode: "design" }),
    ),
    vscode.commands.registerCommand("markdownPdfExport.installBrowser", () => installBrowser(ctx)),
    vscode.commands.registerCommand("markdownPdfExport.showOutput", () => output.show()),
    vscode.commands.registerCommand("markdownPdfExport.runDoctor", () => runDoctor(ctx)),
    vscode.commands.registerCommand("markdownPdfExport.openSettingsFile", () => openSettingsFile(ctx)),
    vscode.commands.registerCommand("markdownPdfExport.openFolderSettingsFile", () => openFolderSettingsFile()),
    vscode.commands.registerCommand("markdownPdfExport.showMenu", () => showMenu()),
    vscode.commands.registerCommand("markdownPdfExport.openDocs", (topic?: unknown) => openDocs(topic)),
    vscode.commands.registerCommand("markdownPdfExport.openWalkthrough", () =>
      vscode.commands.executeCommand("workbench.action.openWalkthrough", `${context.extension.id}#markdownPdfExport.start`, false),
    ),
    statusBarItem(),
    registerMcp(context, exporterVersion(context.extensionPath)),
    registerDiagnostics(),
    registerFrontMatterCompletion(context.extensionPath),
    watchSchemaTrust(context.globalState),
    watchDocuments(),
    { dispose: disposeStudio },
  );
  return { studio: studioEvents, mcpLaunch: () => mcpLaunch(context.extensionPath), problems: problemsOf, schemaTrust: { trusted: siteTrusted, trust: trustSite } };
}

export function deactivate(): void {
  disposeStudio();
}
