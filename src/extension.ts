import * as vscode from "vscode";
import { exportCommand, installBrowser, type Context } from "./commands/export.ts";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("Markdown PDF Export");
  const ctx: Context = { extensionPath: context.extensionPath, output };
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand("markdownPdfExport.export", (clicked?: vscode.Uri, selected?: vscode.Uri[]) =>
      exportCommand(ctx, clicked instanceof vscode.Uri ? clicked : undefined, Array.isArray(selected) ? selected : undefined),
    ),
    vscode.commands.registerCommand("markdownPdfExport.installBrowser", () => installBrowser(ctx)),
    vscode.commands.registerCommand("markdownPdfExport.showOutput", () => output.show()),
  );
}

export function deactivate(): void {}
