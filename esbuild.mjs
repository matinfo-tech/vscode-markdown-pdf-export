// Builds three files into dist/:
//  - extension.cjs: the extension itself. The exporter stays in node_modules (it reads its own
//    files relative to itself), so it is never bundled.
//  - studio-host.js: the script of the Studio panel, with pdf.js inside. pdf.js's worker is
//    copied next to it.
//  - studio-app.js: the exporter's Studio page script (see below).
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import esbuild from "esbuild";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");
const common = { bundle: true, sourcemap: !production, minify: production, logLevel: "info" };

/** Studio imports its files from the root of its own server ("/model.mjs"). */
const studioRoot = {
  name: "studio-root",
  setup(build) {
    build.onResolve({ filter: /^\/[\w.-]+\.mjs$/ }, (args) => ({
      path: path.resolve("node_modules/markdown-pdf-export/studio", `.${args.path}`),
    }));
  },
};

const builds = [
  {
    ...common,
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.cjs",
    platform: "node",
    format: "cjs",
    target: "node22",
    external: ["vscode"],
  },
  {
    ...common,
    entryPoints: ["src/webview/studio-host.js"],
    outfile: "dist/studio-host.js",
    platform: "browser",
    format: "esm",
    target: "chrome134", // VS Code 1.101
  },
  {
    // Studio's own script, from the pinned exporter. A VS Code panel does not load .mjs files
    // (they are served with the wrong type), so it is bundled into a .js file.
    ...common,
    entryPoints: ["node_modules/markdown-pdf-export/studio/app.mjs"],
    outfile: "dist/studio-app.js",
    plugins: [studioRoot],
    platform: "browser",
    format: "esm",
    target: "chrome134",
  },
];

fs.mkdirSync("dist", { recursive: true });
fs.copyFileSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", "dist/pdf.worker.min.js");

if (watch) {
  for (const options of builds) await (await esbuild.context(options)).watch();
} else {
  for (const options of builds) await esbuild.build(options);
}
