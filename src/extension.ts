import * as vscode from "vscode";
import { exportCommand, installBrowser, type Context } from "./commands/export.ts";
import { disposeStudio, openStudio, studioEvents, watchSaves, type StudioEvents } from "./studio.ts";

/** Returned by `activate` for the integration tests. */
export interface Api {
  studio: StudioEvents;
}

const markdownUri = (arg: unknown): vscode.Uri | undefined => {
  if (arg instanceof vscode.Uri) return arg;
  const doc = vscode.window.activeTextEditor?.document;
  return doc?.languageId === "markdown" ? doc.uri : undefined;
};

export function activate(context: vscode.ExtensionContext): Api {
  const output = vscode.window.createOutputChannel("Markdown PDF Export");
  const ctx: Context = { extensionPath: context.extensionPath, output };
  const studio = { extensionUri: context.extensionUri, output };
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("markdownPdfExport.export", (clicked?: vscode.Uri, selected?: vscode.Uri[]) =>
      exportCommand(ctx, clicked instanceof vscode.Uri ? clicked : undefined, Array.isArray(selected) ? selected : undefined),
    ),
    vscode.commands.registerCommand("markdownPdfExport.openStudio", (arg?: unknown) => openStudio(studio, { file: markdownUri(arg) })),
    vscode.commands.registerCommand("markdownPdfExport.openProjectStudio", (arg?: unknown) =>
      openStudio(studio, { file: markdownUri(arg), project: true }),
    ),
    vscode.commands.registerCommand("markdownPdfExport.installBrowser", () => installBrowser(ctx)),
    vscode.commands.registerCommand("markdownPdfExport.showOutput", () => output.show()),
    watchSaves(),
    { dispose: disposeStudio },
  );
  return { studio: studioEvents };
}

export function deactivate(): void {
  disposeStudio();
}
