// Opens the Studio panel inside a real VS Code and waits until pdf.js has drawn the PDF
// the hidden Studio server made: page files load, the /api bridge works, the preview shows.
const assert = require("node:assert/strict");
const path = require("node:path");
const vscode = require("vscode");

const ID = "matinfo-tech.markdown-pdf-export";

suite("Studio panel", () => {
  test("draws the real PDF of the Markdown file in the panel", async () => {
    const api = await vscode.extensions.getExtension(ID).activate();
    const md = vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, "my doc.md"));
    const pages = new Promise((resolve, reject) => {
      api.studio.onRendered(resolve);
      api.studio.onError((message) => reject(new Error(`preview failed: ${message}`)));
      setTimeout(() => reject(new Error(`no preview after 30 s. Panel log:\n${api.studio.log()}`)), 30_000);
    });
    await vscode.commands.executeCommand("markdownPdfExport.openStudio", md);
    assert.ok((await pages) >= 1, "no page drawn");

    // Saving the Markdown draws the preview again, with the new text.
    const again = new Promise((resolve, reject) => {
      api.studio.onRendered(resolve);
      setTimeout(() => reject(new Error(`no new preview after saving. Panel log:\n${api.studio.log()}`)), 30_000);
    });
    const doc = await vscode.workspace.openTextDocument(md);
    const original = doc.getText();
    const edit = new vscode.WorkspaceEdit();
    edit.insert(md, new vscode.Position(doc.lineCount, 0), "\nOne more line.\n");
    await vscode.workspace.applyEdit(edit);
    await doc.save();
    try {
      assert.ok((await again) >= 1);
    } finally {
      require("node:fs").writeFileSync(md.fsPath, original);
    }
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });
});
