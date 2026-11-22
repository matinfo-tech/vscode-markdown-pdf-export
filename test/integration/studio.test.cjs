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
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });
});
