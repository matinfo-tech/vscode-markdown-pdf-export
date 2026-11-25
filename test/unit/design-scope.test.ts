import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { designScope, projectDesignDir } from "../../src/design-scope.ts";

// A tree in the temp folder:  root/  ws/ (workspace)  ws/sub/.markdown-pdf.json  ws/sub/deep/
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "mpe-scope-")));
const ws = path.join(root, "ws");
const sub = path.join(ws, "sub");
const deep = path.join(sub, "deep");
fs.mkdirSync(deep, { recursive: true });
fs.writeFileSync(path.join(sub, ".markdown-pdf.json"), "{}");
const doc = (dir: string) => path.join(dir, "doc.md");
after(() => fs.rmSync(root, { recursive: true, force: true }));

describe("projectDesignDir", () => {
  it("finds the nearest .markdown-pdf.json, walking up like the exporter", () => {
    assert.equal(projectDesignDir(doc(sub)), sub);
    assert.equal(projectDesignDir(doc(deep)), sub);
    assert.equal(projectDesignDir(doc(ws)), undefined);
  });

  it("ignores a folder named like the file", () => {
    const odd = path.join(ws, "odd");
    fs.mkdirSync(path.join(odd, ".markdown-pdf.json"), { recursive: true });
    assert.equal(projectDesignDir(doc(odd)), undefined);
  });
});

describe("designScope", () => {
  it("edits the folder design that applies to the document", () => {
    assert.deepEqual(designScope({ file: doc(deep), askedForProject: false, workspaceDir: ws, trusted: true }), { project: true, dir: sub });
  });

  it("edits the user's settings when no folder design applies", () => {
    assert.deepEqual(designScope({ file: doc(ws), askedForProject: false, workspaceDir: ws, trusted: true }), { project: false });
    assert.deepEqual(designScope({ askedForProject: false, workspaceDir: ws, trusted: true }), { project: false });
  });

  it("edits the user's settings in Restricted Mode, where folder files do not apply", () => {
    assert.deepEqual(designScope({ file: doc(deep), askedForProject: false, workspaceDir: ws, trusted: false }), { project: false });
  });

  it("for this folder only: the nearest design inside the workspace, else a new one at its root", () => {
    assert.deepEqual(designScope({ file: doc(deep), askedForProject: true, workspaceDir: ws, trusted: true }), { project: true, dir: sub });
    assert.deepEqual(designScope({ file: doc(ws), askedForProject: true, workspaceDir: ws, trusted: true }), { project: true, dir: ws });
  });

  it("for this folder only: a design above the workspace is not this folder's", () => {
    const inner = path.join(sub, "inner-ws");
    fs.mkdirSync(inner, { recursive: true });
    // sub/.markdown-pdf.json applies to inner-ws/doc.md, but sub is above the workspace inner-ws
    assert.deepEqual(designScope({ file: doc(inner), askedForProject: true, workspaceDir: inner, trusted: true }), { project: true, dir: inner });
    assert.deepEqual(designScope({ file: doc(inner), askedForProject: false, workspaceDir: inner, trusted: true }), { project: true, dir: sub });
  });

  it("for this folder only, without a folder: nothing to edit", () => {
    assert.deepEqual(designScope({ file: doc(ws), askedForProject: true, trusted: true }), { project: false });
  });
});
