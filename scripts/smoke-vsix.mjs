// Package the extension, unpack the .vsix as VS Code would, and use what is inside:
// .vscodeignore leaves out parts of the dependencies, and this proves none of them is needed.
//   npm run smoke:vsix [-- --keep out.vsix]
// Needs `unzip` and a Chrome or Edge (GitHub's Ubuntu runners have both).
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/** A package this much larger than today's means something big slipped in. */
const MAX_VSIX_MB = 12;

const root = path.resolve(import.meta.dirname, "..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "mpe-vsix-"));
const vsix = path.join(work, "extension.vsix");
const keep = process.argv.includes("--keep") ? process.argv[process.argv.indexOf("--keep") + 1] : null;
const ok = (text) => console.log(`✓ ${text}`);

/** Run Node on a file of the unpacked extension. */
function node(cwd, args, options = {}) {
  return execFileSync(process.execPath, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...options });
}

try {
  execFileSync(process.execPath, [path.join(root, "node_modules", "@vscode", "vsce", "vsce"), "package", "--out", vsix], {
    cwd: root,
    stdio: ["ignore", "ignore", "inherit"],
  });
  const megabytes = fs.statSync(vsix).size / 1024 / 1024;
  assert.ok(megabytes < MAX_VSIX_MB, `the package is ${megabytes.toFixed(1)} MB, over ${MAX_VSIX_MB} MB`);
  execFileSync("unzip", ["-q", vsix, "-d", work]);
  const ext = path.join(work, "extension");
  const exporter = path.join(ext, "node_modules", "markdown-pdf-export");
  const cli = path.join(exporter, "cli.mjs");

  // ── what must be there, and what must not ─────────────────────────────────
  const all = fs.readdirSync(ext, { recursive: true }).map((f) => String(f).replaceAll("\\", "/"));
  for (const file of [
    "package.json",
    "README.md",
    "CHANGELOG.md",
    "LICENSE.txt",
    "dist/extension.cjs",
    "dist/studio-host.js",
    "dist/studio-app.js",
    "dist/pdf.worker.min.js",
    "node_modules/markdown-pdf-export/cli.mjs",
    "node_modules/markdown-pdf-export/studio/index.html",
    "node_modules/markdown-pdf-export/studio/style.css",
    "node_modules/markdown-pdf-export/studio/sample.md",
    "node_modules/markdown-pdf-export/schema/settings.schema.json",
  ]) {
    // vsce stores README, CHANGELOG and LICENSE in lower case or upper case depending on its mood.
    assert.ok(all.some((f) => f.toLowerCase() === file.toLowerCase()), `missing from the package: ${file}`);
  }
  const unwanted = all.filter((f) => /^(src|test|scripts|\.github|\.vscode-test)\/|^PLAN\.md$|\.map$|^node_modules\/(pdfjs-dist|typescript|esbuild|eslint)\//.test(f));
  assert.deepEqual(unwanted.slice(0, 5), [], "files that should not ship");
  const manifest = JSON.parse(fs.readFileSync(path.join(ext, "package.json"), "utf8"));
  const schema = manifest.contributes.jsonValidation[0].url;
  assert.ok(fs.existsSync(path.join(ext, schema)), `the settings schema ${schema} is not in the package`);
  ok(`package holds ${all.length} files, ${megabytes.toFixed(1)} MB`);

  // ── every module the exporter loads only when needed ──────────────────────
  node(exporter, [
    "--input-type=module",
    "-e",
    `import assert from "node:assert/strict";
     const hljs = (await import("highlight.js")).default;
     for (const lang of ["javascript", "python", "rust", "yaml", "bash", "sql"]) assert.ok(hljs.getLanguage(lang), lang);
     assert.match(hljs.highlight("const a = 1;", { language: "js" }).value, /hljs-keyword/);
     assert.match((await import("katex")).default.renderToString("x^2"), /katex/);
     assert.equal((await import("date-fns")).format(new Date(2026, 0, 5), "EEEE d MMMM yyyy"), "Monday 5 January 2026");
     assert.equal((await import("yaml")).parse("a: 1").a, 1);
     for (const name of ["@vscode/markdown-it-katex", "markdown-it", "markdown-it-anchor", "markdown-it-toc-done-right",
       "markdown-it-emoji", "markdown-it-footnote", "markdown-it-task-lists", "playwright-core", "jsonc-parser"]) await import(name);`,
  ]);
  ok("the exporter's modules load (code colours, maths, dates, Markdown extensions, browser driver)");

  // ── a real export ─────────────────────────────────────────────────────────
  const docs = path.join(work, "docs");
  fs.mkdirSync(docs);
  const md = path.join(docs, "smoke test.md");
  fs.writeFileSync(
    md,
    [
      "---",
      "title: Smoke test",
      "pdf:",
      "  math: true",
      "  toc: true",
      "---",
      "# Smoke test :rocket:",
      "## Maths",
      "$$e^{i\\pi} + 1 = 0$$",
      "## Code",
      "```js",
      "const answer = 42;",
      "```",
      "## Diagram",
      "```mermaid",
      "graph TD; A-->B;",
      "```",
      "- [x] a task[^1]",
      "",
      "[^1]: A footnote.",
      "",
    ].join("\n"),
  );
  const settings = JSON.stringify({
    look: "report",
    emoji: true,
    header: { height: "14mm", left_text: "{title}" },
    footer: { height: "12mm", left_text: "{date:EEEE d MMMM yyyy}", right_text: "{page}/{pages}" },
  });
  let stdout;
  try {
    stdout = node(docs, [cli, md, "--json", "--settings", settings, "--no-project-settings"]);
  } catch (error) {
    throw new Error(`the packaged exporter could not export:\n${error.stderr || error.message}`, { cause: error });
  }
  const result = JSON.parse(stdout);
  assert.deepEqual(result.diagram_errors, [], "the diagram was not drawn");
  assert.deepEqual(result.removed_html, []);
  const pdf = fs.readFileSync(result.output_path);
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 20_000, `the PDF is only ${pdf.length} bytes`);
  ok(`export from the package: ${path.basename(result.output_path)}, ${Math.round(pdf.length / 1024)} KB`);

  // ── the hidden server behind the PDF panel ────────────────────────────────
  // Its own settings folder: the test never reads or writes the real one.
  const env = { ...process.env, XDG_CONFIG_HOME: path.join(work, "config"), APPDATA: path.join(work, "config") };
  const child = spawn(process.execPath, [cli, "studio", "--embedded"], { cwd: docs, env, stdio: ["ignore", "pipe", "ignore"] });
  try {
    const link = await new Promise((resolve, reject) => {
      let out = "";
      child.stdout.setEncoding("utf8").on("data", (chunk) => {
        out += chunk;
        const match = /^http:\/\/127\.0\.0\.1:(\d+)\/#([0-9a-f]+)$/m.exec(out);
        if (match) resolve({ port: match[1], token: match[2] });
      });
      child.on("close", () => reject(new Error("studio stopped before printing its link")));
      setTimeout(() => reject(new Error("studio printed no link in 20 s")), 20_000);
    });
    const res = await fetch(`http://127.0.0.1:${link.port}/api/preview`, {
      method: "POST",
      headers: { "x-studio-token": link.token, "content-type": "application/json" },
      body: JSON.stringify({ settings: JSON.parse(settings), source: { file: md, text: "# Unsaved\n\n<script>1</script>\n" } }),
    });
    assert.equal(res.status, 200, await res.clone().text());
    assert.deepEqual(JSON.parse(decodeURIComponent(res.headers.get("x-preview-report"))).removed_html, ["<script>"]);
    assert.equal(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    ok("preview of unsaved text through the packaged Studio server");
  } finally {
    child.kill();
  }

  if (keep) {
    fs.copyFileSync(vsix, path.resolve(keep));
    ok(`kept ${keep}`);
  }
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}
