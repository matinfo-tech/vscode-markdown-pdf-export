// Completion of the pdf: block in a Markdown file's front matter, asked the way the editor does.
const assert = require("node:assert/strict");
const vscode = require("vscode");

const ID = "matinfo-tech/markdown-pdf-export".replace("/", ".");

async function complete(text, line, character) {
  const doc = await vscode.workspace.openTextDocument({ language: "markdown", content: text });
  const list = await vscode.commands.executeCommand("vscode.executeCompletionItemProvider", doc.uri, new vscode.Position(line, character));
  // VS Code adds its own word-based suggestions; this extension's items are numbered by sortText.
  return list.items.filter((i) => /^\d{3}$/.test(i.sortText ?? "")).map((i) => (typeof i.label === "string" ? i.label : i.label.label));
}

suite("front matter completion", () => {
  suiteSetup(() => vscode.extensions.getExtension(ID).activate());
  suiteTeardown(() => vscode.commands.executeCommand("workbench.action.closeAllEditors"));

  test("offers the pdf: keys of one document", async () => {
    const labels = await complete("---\ntitle: T\npdf:\n  \n---\n\n# T\n", 3, 2);
    for (const key of ["orientation", "header", "footer", "margin", "toc"]) assert.ok(labels.includes(key), `${key} in ${labels.join(",")}`);
    assert.ok(!labels.includes("look"), "presets are not allowed in front matter");
  });

  test("offers the header zones and the values of a setting", async () => {
    const zones = await complete("---\npdf:\n  footer:\n    \n---\n", 3, 4);
    assert.ok(zones.includes("center_text"), zones.join(","));
    const values = await complete("---\npdf:\n  orientation: \n---\n", 2, 15);
    assert.ok(values.includes("landscape") && values.includes("portrait"), values.join(","));
  });

  test("offers nothing in the text of the document", async () => {
    const labels = await complete("---\npdf:\n  toc: true\n---\n\npdf:\n  ", 6, 2);
    assert.deepEqual(labels, []);
  });
});
