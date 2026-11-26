// Runs inside a real VS Code (the extension host), so this proves the whole chain:
// command → VS Code's own binary as Node → exporter → browser → PDF on disk.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vscode = require("vscode");

const ID = "matinfo-tech.markdown-pdf-export";

suite("export command", () => {
  const folder = vscode.workspace.workspaceFolders[0].uri.fsPath;
  const md = path.join(folder, "my doc.md");
  const pdf = path.join(folder, "my doc.pdf");

  setup(() => fs.rmSync(pdf, { force: true }));
  teardown(() => fs.rmSync(pdf, { force: true }));

  test("the extension is there and contributes the command", async () => {
    const ext = vscode.extensions.getExtension(ID);
    assert.ok(ext, "extension not found");
    await ext.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes("markdownPdfExport.export"));
  });

  test("its titles come from package.nls.json, not raw %keys%", () => {
    const manifest = vscode.extensions.getExtension(ID).packageJSON;
    const exportCommand = manifest.contributes.commands.find((c) => c.command === "markdownPdfExport.export");
    assert.equal(exportCommand.title, "Export to PDF");
    assert.doesNotMatch(JSON.stringify(manifest.contributes), /"%[\w.]+%"/);
  });

  test("Get Started opens the extension's walkthrough", async () => {
    await vscode.commands.executeCommand("markdownPdfExport.openWalkthrough");
    const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
    assert.ok(tab, "no tab opened");
    console.log(`walkthrough tab: ${tab.label}`);
    assert.match(tab.label, /Welcome|Walkthrough|Get started|Markdown PDF/i, `opened: ${tab.label}`);
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  });

  test("exports a file whose path has spaces to a real PDF", async () => {
    // The success notification waits for a click; do not wait for it.
    void vscode.commands.executeCommand("markdownPdfExport.export", vscode.Uri.file(md));
    const deadline = Date.now() + 90_000;
    while (!fs.existsSync(pdf) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 250));
    assert.ok(fs.existsSync(pdf), "no PDF was written");
    // The file appears before it is complete: wait until its size stops changing.
    let size = -1;
    while (size !== fs.statSync(pdf).size) {
      size = fs.statSync(pdf).size;
      await new Promise((r) => setTimeout(r, 300));
    }
    assert.equal(fs.readFileSync(pdf).subarray(0, 5).toString(), "%PDF-");
    assert.ok(size > 1000, `PDF too small: ${size} bytes`);
  });
});
