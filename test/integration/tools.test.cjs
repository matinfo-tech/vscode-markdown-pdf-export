// The AI tools: start the server exactly the way the extension tells VS Code to start it
// (VS Code's own binary as Node) and talk MCP to it.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const vscode = require("vscode");

const ID = "matinfo-tech.markdown-pdf-export";

/** Send JSON-RPC lines, collect answers by id. */
function talk(child) {
  let buffer = "";
  const waiting = new Map();
  child.stdout.setEncoding("utf8").on("data", (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      waiting.get(message.id)?.(message);
    }
  });
  let id = 0;
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const mine = ++id;
      waiting.set(mine, resolve);
      setTimeout(() => reject(new Error(`no answer to ${method}`)), 20_000);
      child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id: mine, method, params })}\n`);
    });
}

suite("commands and AI tools", () => {
  test("every contributed command is registered", async () => {
    const ext = vscode.extensions.getExtension(ID);
    await ext.activate();
    const have = new Set(await vscode.commands.getCommands(true));
    for (const { command } of ext.packageJSON.contributes.commands) assert.ok(have.has(command), `${command} is not registered`);
  });

  test("the AI tools server starts with VS Code's own runtime and lists its tools", async () => {
    const api = await vscode.extensions.getExtension(ID).activate();
    const launch = api.mcpLaunch();
    assert.equal(launch.command, process.execPath);
    const child = spawn(launch.command, launch.args, { env: { ...process.env, ...launch.env }, stdio: ["pipe", "pipe", "ignore"] });
    try {
      const call = talk(child);
      const hello = await call("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "0" },
      });
      assert.equal(hello.result.serverInfo.name, "markdown-pdf");
      const tools = (await call("tools/list")).result.tools.map((t) => t.name).sort();
      assert.deepEqual(tools, [
        "doctor_markdown_pdf",
        "export_markdown_pdf",
        "install_browser_markdown_pdf",
        "open_studio_markdown_pdf",
      ]);
    } finally {
      child.kill();
    }
  });
});
