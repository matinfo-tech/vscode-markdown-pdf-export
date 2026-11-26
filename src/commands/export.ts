import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import { readOptions, toEnv } from "../config.ts";
import { problemsOf, showProblems } from "../diagnostics.ts";
import { cliPath, errorMessage, exportArgs, isNoBrowserError, parseExportResult } from "../engine.ts";
import { t } from "../l10n.ts";
import { runCli } from "../process.ts";
import { studioEvents } from "../studio.ts";

const EXPORT_TIMEOUT_MS = 120_000;

export interface Context {
  extensionPath: string;
  output: vscode.OutputChannel;
  /** The extension's package.json as VS Code gives it (command titles in the display language). */
  packageJSON?: unknown;
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
    void vscode.window.showWarningMessage(t("Save the file first, then export it."));
    return false;
  }
  if (uri.scheme !== "file" && uri.scheme !== "vscode-remote") {
    void vscode.window.showWarningMessage(t("Cannot export {0}: it is not a file on disk.", uri.toString()));
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
  const showProblems = t("Show Problems");
  const open = t("Open PDF");
  const reveal = t("Show in Folder");
  const choice = problems
    ? await vscode.window.showWarningMessage(
        problems === 1
          ? t("PDF ready: {0}. One thing was left out or not drawn.", name)
          : t("PDF ready: {0}. {1} things were left out or not drawn.", name, problems),
        showProblems,
        open,
        reveal,
      )
    : await vscode.window.showInformationMessage(t("PDF ready: {0}", name), open, reveal);
  if (choice === showProblems) await vscode.commands.executeCommand("workbench.actions.view.problems");
  if (choice === open) await openPdf(pdf);
  if (choice === reveal) await vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(pdf));
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
    { location: vscode.ProgressLocation.Notification, title: t("Downloading the PDF browser (about 200 MB)"), cancellable: true },
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
        void vscode.window.showInformationMessage(t("PDF browser installed."));
        return true;
      }
      if (!result.cancelled) void vscode.window.showErrorMessage(t("Browser download failed: {0}", errorMessage(result.stderr)));
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
    void vscode.window.showInformationMessage(t("Open a Markdown file to export it."));
    return;
  }
  const flags = { restricted: !vscode.workspace.isTrusted, remote: Boolean(vscode.env.remoteName) };
  const done: string[] = [];
  let problems = 0;
  let noBrowser = false;

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: t("Exporting to PDF"), cancellable: true },
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
        const why = result.timedOut ? t("It took more than 2 minutes and was stopped.") : errorMessage(result.stderr);
        const pick = await vscode.window.showErrorMessage(t("Could not export {0}: {1}", path.basename(file), why), t("Show Output"));
        if (pick) ctx.output.show(true);
      }
    },
  );

  if (noBrowser) {
    const download = t("Download Browser");
    const showOutput = t("Show Output");
    const pick = await vscode.window.showErrorMessage(
      t("No Chrome or Edge found to draw the PDF. Install one, or download a private browser for this extension (about 200 MB, once)."),
      download,
      showOutput,
    );
    if (pick === showOutput) ctx.output.show(true);
    if (pick === download && (await installBrowser(ctx))) await exportCommand(ctx, clicked, selected);
    return;
  }
  if (done.length === 1 && done[0]) await showDone(done[0], problems);
  else if (done.length > 1) {
    const showProblems = t("Show Problems");
    const pick = problems
      ? await vscode.window.showWarningMessage(t("{0} PDFs ready. Some things were left out or not drawn.", done.length), showProblems)
      : await vscode.window.showInformationMessage(t("{0} PDFs ready.", done.length));
    if (pick === showProblems) await vscode.commands.executeCommand("workbench.actions.view.problems");
  }
}
