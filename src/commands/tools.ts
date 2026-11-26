import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import { readOptions, toEnv } from "../config.ts";
import { parseDoctor, summarize, userSettingsFile, type DoctorReport } from "../doctor.ts";
import { DOCS_TOPICS, docsUrl } from "../docs.ts";
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

/** A page of the documentation site in the browser: the one named, or one picked from a list. */
export async function openDocs(topic?: unknown): Promise<void> {
  let id = DOCS_TOPICS.some((t) => t.id === topic) ? (topic as string) : undefined;
  if (!id) {
    const pick = await vscode.window.showQuickPick(
      DOCS_TOPICS.map((t) => ({ label: t.label, description: t.detail, id: t.id })),
      { placeHolder: "Markdown PDF Export documentation", matchOnDescription: true },
    );
    if (!pick) return;
    id = pick.id;
  }
  await vscode.env.openExternal(vscode.Uri.parse(docsUrl(id)));
}

/** Everything the extension does, in one list (status bar item, or the command). */
export async function showMenu(extension: vscode.Extension<unknown>): Promise<void> {
  // The labels are the command titles VS Code has already put in the display language
  // (package.nls.*.json), so the menu and the Command Palette always say the same thing.
  const commands = (extension.packageJSON as { contributes?: { commands?: { command: string; title: string }[] } })
    .contributes?.commands ?? [];
  const title = (command: string) => commands.find((c) => c.command === command)?.title ?? command;
  const entries: { icon: string; command: string; description?: string }[] = [
    { icon: "file-pdf", command: "markdownPdfExport.export" },
    { icon: "open-preview", command: "markdownPdfExport.openPreview", description: vscode.l10n.t("the real PDF, as you type") },
    { icon: "paintcan", command: "markdownPdfExport.openStudio", description: vscode.l10n.t("style, fonts, header, footer, logo") },
    { icon: "folder", command: "markdownPdfExport.openProjectStudio" },
    { icon: "json", command: "markdownPdfExport.openSettingsFile" },
    { icon: "json", command: "markdownPdfExport.openFolderSettingsFile" },
    { icon: "pulse", command: "markdownPdfExport.runDoctor", description: vscode.l10n.t("browser and settings files") },
    { icon: "output", command: "markdownPdfExport.showOutput" },
    { icon: "rocket", command: "markdownPdfExport.openWalkthrough", description: vscode.l10n.t("a short tour: preview, design, export") },
    { icon: "book", command: "markdownPdfExport.openDocs", description: vscode.l10n.t("header, footer, one document's own design, all settings") },
  ];
  const items = entries.map((e) => ({ label: `$(${e.icon}) ${title(e.command)}`, description: e.description, command: e.command }));
  const pick = await vscode.window.showQuickPick(items, { placeHolder: "Markdown PDF Export", matchOnDescription: true });
  if (pick) await vscode.commands.executeCommand(pick.command);
}

/** "PDF" in the status bar while a Markdown file is in front. */
export function statusBarItem(): vscode.Disposable {
  const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 90);
  item.text = "$(file-pdf) PDF";
  item.tooltip = vscode.l10n.t("Markdown PDF Export: export, preview, design pages, settings");
  item.command = "markdownPdfExport.showMenu";
  const update = () => (vscode.window.activeTextEditor?.document.languageId === "markdown" ? item.show() : item.hide());
  update();
  return vscode.Disposable.from(item, vscode.window.onDidChangeActiveTextEditor(update));
}
