/** Entries of the Problems panel: what the PDF leaves out of a Markdown file, or could not draw. */
import * as vscode from "vscode";
import { findProblems, type Report } from "./problems.ts";

let collection: vscode.DiagnosticCollection | undefined;
/** Files whose entries describe an earlier state of the text: dropped at the next edit. */
const untilEdited = new Set<string>();

export function registerDiagnostics(): vscode.Disposable {
  collection = vscode.languages.createDiagnosticCollection("markdownPdfExport");
  const onEdit = vscode.workspace.onDidChangeTextDocument((event) => {
    const key = event.document.uri.toString();
    if (event.contentChanges.length === 0 || !untilEdited.delete(key)) return;
    collection?.delete(event.document.uri);
  });
  return vscode.Disposable.from(collection, onEdit, { dispose: () => untilEdited.clear() });
}

/**
 * Show what an export or a preview reported about `text`.
 * @param live  a preview keeps this file up to date: the entries stay while typing and are
 *   replaced by the next preview. Otherwise they are dropped at the next edit.
 */
export function showProblems(uri: vscode.Uri, text: string, report: Report, live: boolean): void {
  if (!collection) return;
  const diagnostics = findProblems(text, report).map((problem) => {
    const range = new vscode.Range(problem.line, problem.start, problem.line, problem.end);
    const diagnostic = new vscode.Diagnostic(range, problem.message, vscode.DiagnosticSeverity.Warning);
    diagnostic.source = "Markdown PDF";
    return diagnostic;
  });
  collection.set(uri, diagnostics);
  if (live || diagnostics.length === 0) untilEdited.delete(uri.toString());
  else untilEdited.add(uri.toString());
}

/** The preview no longer follows this file: its entries go at the next edit. */
export function releaseProblems(uri: vscode.Uri): void {
  if (collection?.has(uri)) untilEdited.add(uri.toString());
}

/** For the integration tests. */
export function problemsOf(uri: vscode.Uri): readonly vscode.Diagnostic[] {
  return collection?.get(uri) ?? [];
}
