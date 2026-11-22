import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { runCli } from "../../src/process.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mpe-vscode-"));
const script = (name: string, body: string) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, body);
  return file;
};
after(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("runCli", () => {
  it("collects stdout, stderr and the exit code; passes args with spaces and env", async () => {
    const cli = script(
      "echo.mjs",
      'console.log(process.argv[2] + "|" + process.env.MPE_X); console.error("warn"); process.exit(3);',
    );
    const seen: string[] = [];
    const r = await runCli(cli, ["a b.md"], { cwd: dir, env: { MPE_X: "y" }, onStderr: (d) => seen.push(d) });
    assert.equal(r.code, 3);
    assert.equal(r.stdout.trim(), "a b.md|y");
    assert.equal(r.stderr.trim(), "warn");
    assert.equal(seen.join("").trim(), "warn");
    assert.equal(r.cancelled, false);
  });

  it("stops the process when cancelled", async () => {
    const cli = script("wait.mjs", "setInterval(() => {}, 1000);");
    const abort = new AbortController();
    setTimeout(() => abort.abort(), 200);
    const r = await runCli(cli, [], { cwd: dir, signal: abort.signal });
    assert.equal(r.cancelled, true);
    assert.notEqual(r.code, 0);
  });

  it("stops the process after the timeout", async () => {
    const cli = script("hang.mjs", "setInterval(() => {}, 1000);");
    const r = await runCli(cli, [], { cwd: dir, timeoutMs: 200 });
    assert.equal(r.timedOut, true);
  });
});
