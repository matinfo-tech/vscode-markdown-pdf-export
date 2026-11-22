// Opens the PDF panel inside a real VS Code and waits until pdf.js has drawn the PDF the hidden
// Studio server made: page files load, the /api bridge works, the preview follows the editor.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

const ID = "matinfo-tech.markdown-pdf-export";

suite("PDF panel", () => {
  const folder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const md = vscode.Uri.file(path.join(folder, "my doc.md"));
  const other = vscode.Uri.file(path.join(folder, "other one.md"));
  let api;
  let original;

  /** The next preview drawn in the panel: its number of pages. */
  const nextPreview = (why) =>
    new Promise((resolve, reject) => {
      const done = [
        api.studio.onRendered((pages) => finish(resolve, pages)),
        api.studio.onError((message) => finish(reject, new Error(`preview failed (${why}): ${message}`))),
      ];
      const timer = setTimeout(() => finish(reject, new Error(`no preview after 30 s (${why}). Panel log:\n${api.studio.log()}`)), 30_000);
      const finish = (settle, value) => {
        clearTimeout(timer);
        for (const d of done) d.dispose();
        settle(value);
      };
    });

  suiteSetup(async () => {
    api = await vscode.extensions.getExtension(ID).activate();
    original = fs.readFileSync(md.fsPath, "utf8");
    fs.writeFileSync(other.fsPath, "# Other one\n\nSecond file.\n");
  });

  suiteTeardown(async () => {
    await vscode.commands.executeCommand("workbench.action.revertAndCloseActiveEditor");
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
    fs.writeFileSync(md.fsPath, original);
    fs.rmSync(other.fsPath, { force: true });
  });

  test("draws the real PDF of the Markdown file beside it", async () => {
    await vscode.window.showTextDocument(md, { viewColumn: vscode.ViewColumn.One });
    const first = nextPreview("opening the panel");
    await vscode.commands.executeCommand("markdownPdfExport.openPreview", md);
    assert.ok((await first) >= 1, "no page drawn");
    assert.equal(api.studio.previewed().toString(), md.toString());
  });

  test("follows the text as it is typed, without saving, and reports what the PDF leaves out", async () => {
    const doc = await vscode.workspace.openTextDocument(md);
    const line = doc.lineCount;
    const typed = nextPreview("typing");
    const edit = new vscode.WorkspaceEdit();
    edit.insert(md, new vscode.Position(line, 0), "\n<script>1</script>\n\n<div class=\"page-break\"></div>\n\nSecond page.\n");
    await vscode.workspace.applyEdit(edit);
    assert.equal(await typed, 2, "the unsaved page break did not reach the preview");
    assert.ok(doc.isDirty, "the preview must not save the file");
    assert.equal(fs.readFileSync(md.fsPath, "utf8"), original);

    const problems = api.problems(md);
    assert.equal(problems.length, 1, JSON.stringify(problems));
    assert.match(problems[0].message, /<script> is left out of the PDF/);
    assert.equal(doc.lineAt(problems[0].range.start.line).text, "<script>1</script>");
  });

  test("follows the Markdown file in front", async () => {
    const followed = nextPreview("another file in front");
    await vscode.window.showTextDocument(other, { viewColumn: vscode.ViewColumn.One });
    assert.equal(await followed, 1);
    assert.equal(api.studio.previewed().toString(), other.toString());
    assert.equal(api.problems(other).length, 0);
  });

  test("shows the design controls on request, on the same panel", async () => {
    // Same server, same page: no new preview is needed, the command must simply not fail.
    await vscode.commands.executeCommand("markdownPdfExport.openStudio", other);
    assert.equal(api.studio.previewed().toString(), other.toString());
  });
});
