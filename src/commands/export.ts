import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import { readOptions, toEnv } from "../config.ts";
import { problemsOf, showProblems } from "../diagnostics.ts";
import { cliPath, errorMessage, exportArgs, isNoBrowserError, parseExportResult } from "../engine.ts";
import { runCli } from "../process.ts";
import { studioEvents } from "../studio.ts";

const EXPORT_TIMEOUT_MS = 120_000;

export interface Context {
  extensionPath: string;
  output: vscode.OutputChannel;
}

/** Markdown files to export: the explorer selection, the clicked file, or the active editor. */
function targets(clicked?: vscode.Uri, selected?: vscode.Uri[]): vscode.Uri[] {
  const list = selected?.length ? selected : clicked ? [clicked] : [];
  if (list.length === 0 && vscode.window.activeTextEditor) list.push(vscode.window.activeTextEditor.document.uri);
  const seen = new Set<string>();
  return list.filter((u) => !seen.has(u.toString()) && seen.add(u.toString()));
}

/** Save the document if it has unsaved edits; false when it cannot be exported. */
async function ready(uri: vscode.Uri): Promise<boolean> {
  if (uri.scheme === "untitled") {
    void vscode.window.showWarningMessage("Save the file first, then export it.");
    return false;
  }
  if (uri.scheme !== "file" && uri.scheme !== "vscode-remote") {
    void vscode.window.showWarningMessage(`Cannot export ${uri.toString()}: it is not a file on disk.`);
    return false;
  }
  const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
  if (doc?.isDirty) return doc.save();
  return true;
}

async function openPdf(pdf: string): Promise<void> {
  const uri = vscode.Uri.file(pdf);
  if (vscode.env.remoteName) await vscode.commands.executeCommand("vscode.open", uri);
  else await vscode.env.openExternal(uri);
}

async function showDone(pdf: string, problems: number): Promise<void> {
  const name = path.basename(pdf);
  const choice = problems
    ? await vscode.window.showWarningMessage(
        `PDF ready: ${name}. ${problems === 1 ? "One thing was" : `${problems} things were`} left out or not drawn.`,
        "Show Problems",
        "Open PDF",
        "Show in Folder",
      )
    : await vscode.window.showInformationMessage(`PDF ready: ${name}`, "Open PDF", "Show in Folder");
  if (choice === "Show Problems") await vscode.commands.executeCommand("workbench.actions.view.problems");
  if (choice === "Open PDF") await openPdf(pdf);
  if (choice === "Show in Folder") await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(pdf));
}

/** The text that was just exported: the file is saved, so the editor and the disk agree. */
function exportedText(uri: vscode.Uri): string {
  const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
  if (doc) return doc.getText();
  try {
    return fs.readFileSync(uri.fsPath, "utf8");
  } catch {
    return "";
  }
}

export async function installBrowser(ctx: Context): Promise<boolean> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Downloading the PDF browser (about 200 MB)", cancellable: true },
    async (_progress, token) => {
      const abort = new AbortController();
      token.onCancellationRequested(() => abort.abort());
      ctx.output.appendLine("$ install-browser");
      const result = await runCli(cliPath(ctx.extensionPath), ["install-browser"], {
        cwd: ctx.extensionPath,
        env: toEnv(readOptions(getter())),
        signal: abort.signal,
        onStderr: (d) => ctx.output.append(d),
      });
      if (result.code === 0) {
        void vscode.window.showInformationMessage("PDF browser installed.");
        return true;
      }
      if (!result.cancelled) void vscode.window.showErrorMessage(`Browser download failed: ${errorMessage(result.stderr)}`);
      return false;
    },
  );
}

function getter() {
  const cfg = vscode.workspace.getConfiguration("markdownPdfExport");
  return <T>(key: string, fallback: T): T => cfg.get<T>(key, fallback);
}

export async function exportCommand(ctx: Context, clicked?: vscode.Uri, selected?: vscode.Uri[]): Promise<void> {
  const files = targets(clicked, selected);
  if (files.length === 0) {
    void vscode.window.showInformationMessage("Open a Markdown file to export it.");
    return;
  }
  const flags = { restricted: !vscode.workspace.isTrusted, remote: Boolean(vscode.env.remoteName) };
  const done: string[] = [];
  let problems = 0;
  let noBrowser = false;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Exporting to PDF", cancellable: true },
    async (progress, token) => {
      const abort = new AbortController();
      token.onCancellationRequested(() => abort.abort());
      for (const [i, uri] of files.entries()) {
        if (abort.signal.aborted) break;
        if (!(await ready(uri))) continue;
        const file = uri.fsPath;
        progress.report({ message: files.length > 1 ? `${i + 1}/${files.length} ${path.basename(file)}` : path.basename(file) });
        const cwd = vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath ?? path.dirname(file);
        ctx.output.appendLine(`$ export ${file}`);
        const result = await runCli(cliPath(ctx.extensionPath), exportArgs(file, flags), {
          cwd,
          env: toEnv(readOptions(getter())),
          signal: abort.signal,
          timeoutMs: EXPORT_TIMEOUT_MS,
          onStderr: (d) => ctx.output.append(d),
        });
        if (result.cancelled) break;
        const exported = result.code === 0 ? parseExportResult(result.stdout) : null;
        if (exported) {
          ctx.output.appendLine(`→ ${exported.pdf}`);
          done.push(exported.pdf);
          // The open preview already keeps the file it shows up to date.
          const live = studioEvents.previewed()?.toString() === uri.toString();
          showProblems(uri, exportedText(uri), exported.report, live);
          problems += problemsOf(uri).length;
          continue;
        }
        if (isNoBrowserError(result.stderr)) {
          noBrowser = true;
          break;
        }
        const why = result.timedOut ? "It took more than 2 minutes and was stopped." : errorMessage(result.stderr);
        const pick = await vscode.window.showErrorMessage(`Could not export ${path.basename(file)}: ${why}`, "Show Output");
        if (pick) ctx.output.show(true);
      }
    },
  );

  if (noBrowser) {
    const pick = await vscode.window.showErrorMessage(
      "No Chrome or Edge found to draw the PDF. Install one, or download a private browser for this extension (about 200 MB, once).",
      "Download browser",
      "Show Output",
    );
    if (pick === "Show Output") ctx.output.show(true);
    if (pick === "Download browser" && (await installBrowser(ctx))) await exportCommand(ctx, clicked, selected);
    return;
  }
  if (done.length === 1 && done[0]) await showDone(done[0], problems);
  else if (done.length > 1) {
    const pick = problems
      ? await vscode.window.showWarningMessage(`${done.length} PDFs ready. Some things were left out or not drawn.`, "Show Problems")
      : await vscode.window.showInformationMessage(`${done.length} PDFs ready.`);
    if (pick === "Show Problems") await vscode.commands.executeCommand("workbench.actions.view.problems");
  }
}
