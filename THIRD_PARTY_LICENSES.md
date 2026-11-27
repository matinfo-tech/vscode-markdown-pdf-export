# Third-Party Licenses

Markdown PDF Export is released under the [MIT License](LICENSE) and includes open-source
software from other authors, listed below by license.

## Packages in `node_modules/`

Each ships inside the Extension with its own license file, which is the authoritative text.

- **MIT:** markdown-pdf-export (the export engine, same author as the Extension), markdown-it,
  markdown-it-emoji, markdown-it-footnote, markdown-it-toc-done-right, linkify-it, mdurl,
  punycode.js, uc.micro, @vscode/markdown-it-katex, KaTeX (with its fonts), commander, date-fns,
  jsonc-parser
- **ISC:** markdown-it-task-lists, yaml
- **BSD:** entities (BSD-2-Clause), highlight.js (BSD-3-Clause)
- **Apache-2.0:** playwright-core (includes code derived from Puppeteer, see its `NOTICE`)
- **PSF-2.0:** argparse
- **Unlicense (public domain):** markdown-it-anchor

## Bundled into single files

- **pdf.js**: Apache-2.0, © Mozilla Foundation. Draws the PDF in the preview panel
  (`dist/studio-host.js`, `dist/pdf.worker.min.js`).
- **Mermaid**: MIT, © 2014-2022 Knut Sveidqvist. Draws diagrams
  (`node_modules/markdown-pdf-export/vendor/mermaid.min.js`). Its build also contains libraries
  under their own licenses: d3 (ISC), d3-sankey (BSD-3-Clause), DOMPurify (MPL-2.0 or
  Apache-2.0), elkjs (EPL-2.0 or GPL-3.0-or-later), chevrotain (Apache-2.0), and MIT libraries
  such as cytoscape, dagre-d3-es, dayjs, KaTeX, marked and roughjs.

Full license texts: [Apache-2.0](licenses/Apache-2.0.txt) (pdf.js, also Playwright, chevrotain
and one of DOMPurify's two options) and [MIT, Mermaid](licenses/mermaid-MIT.txt).

## Not included

- **The browser** (Chrome, Edge or Chromium) that draws the PDFs is not part of the Extension. It is either already on your computer or downloaded when you ask, and comes with its own license.
- **Development tools** (TypeScript, esbuild, ESLint, the VS Code test tools and others) are used to build and test the Extension and are not shipped in it.
