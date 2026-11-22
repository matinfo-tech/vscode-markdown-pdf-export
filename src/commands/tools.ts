import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import { readOptions, toEnv } from "../config.ts";
import { parseDoctor, summarize, userSettingsFile, type DoctorReport } from "../doctor.ts";
import { cliPath, errorMessage } from "../engine.ts";
import { runCli } from "../process.ts";
import type { Context } from "./export.ts";

function env(): Record<string, string> {
  const cfg = vscode.workspace.getConfiguration("markdownPdfExport");
  return toEnv(readOptions((key, fallback) => cfg.get(key, fallback)));
}

const activeMarkdown = (): vscode.Uri | undefined => {
  const doc = vscode.window.activeTextEditor?.document;
  return doc?.languageId === "markdown" && doc.uri.scheme !== "untitled" ? doc.uri : undefined;
};

async function doctor(ctx: Context, file?: vscode.Uri): Promise<DoctorReport | null> {
  const args = ["doctor", "--json"];
  if (file) args.splice(1, 0, file.fsPath);
  if (!vscode.workspace.isTrusted) args.push("--no-project-settings");
  const cwd = (file && vscode.workspace.getWorkspaceFolder(file)?.uri.fsPath) ?? ctx.extensionPath;
  const result = await runCli(cliPath(ctx.extensionPath), args, { cwd, env: env(), timeoutMs: 60_000 });
  const report = parseDoctor(result.stdout);
  if (!report) void vscode.window.showErrorMessage(`The check could not run: ${errorMessage(result.stderr)}`);
  return report;
}

/** Check the browser and the settings files, and say what was found. */
export async function runDoctor(ctx: Context): Promise<void> {
  const report = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: "Checking Markdown PDF Export…" },
    () => doctor(ctx, activeMarkdown()),
  );
  if (!report) return;
  const summary = summarize(report);
  ctx.output.appendLine("");
  for (const line of summary.lines) ctx.output.appendLine(line);
  const actions = report.browser.available ? ["Show Details"] : ["Download Browser", "Show Details"];
  const show = summary.ok ? vscode.window.showInformationMessage : vscode.window.showWarningMessage;
  const pick = await show(summary.headline, ...actions);
  if (pick === "Show Details") ctx.output.show(true);
  if (pick === "Download Browser") await vscode.commands.executeCommand("markdownPdfExport.installBrowser");
}

/** Open the file that holds the page design; offer to make it when there is none yet. */
export async function openSettingsFile(ctx: Context): Promise<void> {
  const report = await doctor(ctx);
  const source = report && userSettingsFile(report);
  if (!source?.path) return;
  if (!fs.existsSync(source.path)) {
    const pick = await vscode.window.showInformationMessage(
      `You have no settings file yet (${source.path}). Design your pages and press Save to create it.`,
      "Design Pages",
      "Create Empty File",
    );
    if (pick === "Design Pages") return void vscode.commands.executeCommand("markdownPdfExport.openStudio");
    if (pick !== "Create Empty File") return;
    const made = await runCli(cliPath(ctx.extensionPath), ["init"], { cwd: ctx.extensionPath, env: env(), timeoutMs: 30_000 });
    if (made.code !== 0) return void vscode.window.showErrorMessage(`Could not create the file: ${errorMessage(made.stderr)}`);
  }
  await vscode.window.showTextDocument(vscode.Uri.file(source.path));
}

/** Open this folder's .markdown-pdf.json, or design one when there is none. */
export async function openFolderSettingsFile(): Promise<void> {
  const active = vscode.window.activeTextEditor?.document.uri;
  const folder = (active && vscode.workspace.getWorkspaceFolder(active)) ?? vscode.workspace.workspaceFolders?.[0];
  if (!folder) return void vscode.window.showWarningMessage("Open a folder first.");
  const file = path.join(folder.uri.fsPath, ".markdown-pdf.json");
  if (fs.existsSync(file)) return void vscode.window.showTextDocument(vscode.Uri.file(file));
  const pick = await vscode.window.showInformationMessage(
    `${folder.name} has no design of its own yet. It uses your settings.`,
    "Design Pages for This Folder",
  );
  if (pick) await vscode.commands.executeCommand("markdownPdfExport.openProjectStudio");
}

/** Everything the extension does, in one list (status bar item, or the command). */
export async function showMenu(): Promise<void> {
  const items: (vscode.QuickPickItem & { command: string })[] = [
    { label: "$(file-pdf) Export to PDF", command: "markdownPdfExport.export" },
    { label: "$(paintcan) Design Pages (Studio)", description: "style, fonts, header, footer, logo", command: "markdownPdfExport.openStudio" },
    { label: "$(folder) Design Pages for This Folder Only", command: "markdownPdfExport.openProjectStudio" },
    { label: "$(json) Open Settings File", command: "markdownPdfExport.openSettingsFile" },
    { label: "$(json) Open This Folder's Settings File", command: "markdownPdfExport.openFolderSettingsFile" },
    { label: "$(pulse) Check Setup", description: "browser and settings files", command: "markdownPdfExport.runDoctor" },
    { label: "$(output) Show Output", command: "markdownPdfExport.showOutput" },
  ];
  const pick = await vscode.window.showQuickPick(items, { placeHolder: "Markdown PDF Export" });
  if (pick) await vscode.commands.executeCommand(pick.command);
}

/** "PDF" in the status bar while a Markdown file is in front. */
export function statusBarItem(): vscode.Disposable {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  item.text = "$(file-pdf) PDF";
  item.tooltip = "Markdown PDF Export: export, design pages, settings";
  item.command = "markdownPdfExport.showMenu";
  const update = () => (vscode.window.activeTextEditor?.document.languageId === "markdown" ? item.show() : item.hide());
  update();
  return vscode.Disposable.from(item, vscode.window.onDidChangeActiveTextEditor(update));
}
