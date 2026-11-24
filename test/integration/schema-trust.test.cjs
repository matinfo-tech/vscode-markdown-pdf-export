// A settings file written by Studio names its schema online ($schema). VS Code only downloads
// schemas from trusted places. The extension adds the documentation site to the user's trusted
// places when allowed, and VS Code's own trusted places must survive that.
const assert = require("node:assert/strict");
const vscode = require("vscode");

const ID = "matinfo-tech.markdown-pdf-export";
const SCHEMA = "https://markdown-pdf.matinfo.tech/schema/settings.schema.json";
const SETTING = "json.schemaDownload.trustedDomains";

/** Messages the JSON language server reports for a document, once it has checked $schema. */
async function untrustedWarning(text) {
  const doc = await vscode.workspace.openTextDocument({ language: "json", content: text });
  await vscode.window.showTextDocument(doc);
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const found = vscode.languages.getDiagnostics(doc.uri).filter((d) => /untrusted/i.test(d.message));
    if (found.length) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

suite("settings schema trust", () => {
  let api;
  suiteSetup(async () => {
    api = await vscode.extensions.getExtension(ID).activate();
  });
  suiteTeardown(async () => {
    await vscode.workspace.getConfiguration().update(SETTING, undefined, vscode.ConfigurationTarget.Global);
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("allowing the site keeps VS Code's own trusted places and silences the warning", async () => {
    assert.equal(api.schemaTrust.trusted(), false, "the test profile must start without the site trusted");
    assert.ok(await untrustedWarning(JSON.stringify({ $schema: SCHEMA })), "control: VS Code should warn before");

    await api.schemaTrust.trust();
    const domains = vscode.workspace.getConfiguration().get(SETTING);
    assert.equal(domains["https://markdown-pdf.matinfo.tech/schema/"], true);
    assert.equal(domains["https://json.schemastore.org/"], true, `VS Code's own list was lost: ${JSON.stringify(domains)}`);
    assert.equal(api.schemaTrust.trusted(), true);

    assert.equal(await untrustedWarning(JSON.stringify({ $schema: SCHEMA, page_format: "A4" })), false);
    assert.ok(await untrustedWarning(JSON.stringify({ $schema: "https://untrusted.invalid/schema.json" })), "another site must still warn");
  });
});
