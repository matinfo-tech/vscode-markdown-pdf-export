# Third-Party Licenses

Markdown PDF Export is released under the [MIT License](LICENSE). It includes open-source
software from other authors, listed below with their licenses. The copyright lines are taken from each component's own license file.

Each package under `node_modules/` inside the Extension also ships with its own license file, which is the authoritative text. Components bundled into a single file (pdf.js and Mermaid) have their notices here.

## Export engine

### markdown-pdf-export 2.9.1

- **License:** MIT
- **Copyright:** © 2026 Matinfo
- **Repository:** https://github.com/matinfo-tech/markdown-pdf-export
- **Note:** The engine behind the Extension: Markdown to PDF, Studio and the MCP server. Same author as the Extension.

## Dependencies of the export engine

Shipped in the Extension under `node_modules/`.

| Package | Version | License | Copyright | Repository |
|---|---|---|---|---|
| markdown-it | 15.0.3 | MIT | © 2014 Vitaly Puzrin, Alex Kocharin | https://github.com/markdown-it/markdown-it |
| markdown-it-anchor | 10.1.0 | Unlicense (public domain) | n/a | https://github.com/valeriangalliat/markdown-it-anchor |
| markdown-it-emoji | 3.1.0 | MIT | © 2014 Vitaly Puzrin | https://github.com/markdown-it/markdown-it-emoji |
| markdown-it-footnote | 4.0.0 | MIT | © 2014-2015 Vitaly Puzrin, Alex Kocharin | https://github.com/markdown-it/markdown-it-footnote |
| markdown-it-task-lists | 2.1.1 | ISC | © 2016 Revin Guillen | https://github.com/revin/markdown-it-task-lists |
| markdown-it-toc-done-right | 4.2.0 | MIT | © 2018 Fabio Zendhi Nagao | https://github.com/nagaozen/markdown-it-toc-done-right |
| argparse | 3.0.4 | PSF-2.0 | © 2001-2019 Python Software Foundation | https://github.com/nodeca/argparse |
| entities | 8.1.0 | BSD-2-Clause | © Felix Böhm | https://github.com/fb55/entities |
| linkify-it | 6.1.0 | MIT | © 2015 Vitaly Puzrin | https://github.com/markdown-it/linkify-it |
| mdurl | 2.1.0 | MIT | © 2015 Vitaly Puzrin, Alex Kocharin | https://github.com/markdown-it/mdurl |
| punycode.js | 2.3.1 | MIT | © Mathias Bynens | https://github.com/mathiasbynens/punycode.js |
| uc.micro | 3.0.0 | MIT | © Mathias Bynens | https://github.com/markdown-it/uc.micro |
| @vscode/markdown-it-katex | 1.1.2 | MIT | © Microsoft Corporation | https://github.com/microsoft/vscode-markdown-it-katex |
| katex | 0.19.1, 0.16.47 | MIT | © 2013-2020 Khan Academy and other contributors | https://github.com/KaTeX/KaTeX |
| commander | 15.1.0, 8.3.0 | MIT | © 2011 TJ Holowaychuk | https://github.com/tj/commander.js |
| highlight.js | 11.12.0 | BSD-3-Clause | © 2006 Ivan Sagalaev | https://github.com/highlightjs/highlight.js |
| date-fns | 4.4.0 | MIT | © 2021 Sasha Koss and Lesha Koss | https://github.com/date-fns/date-fns |
| jsonc-parser | 3.3.1 | MIT | © Microsoft | https://github.com/microsoft/node-jsonc-parser |
| yaml | 2.9.1 | ISC | © Eemeli Aro | https://github.com/eemeli/yaml |
| playwright-core | 1.65.1 | Apache-2.0 | © Microsoft Corporation | https://github.com/microsoft/playwright |

KaTeX includes its fonts (`katex/dist/fonts`), under the same MIT License. Playwright contains code derived from Puppeteer (Apache-2.0); see `node_modules/playwright-core/NOTICE`.

## Bundled into the Extension's files

### pdf.js 6.5.438 (`dist/studio-host.js`, `dist/pdf.worker.min.js`)

- **License:** Apache-2.0 (full text below)
- **Copyright:** © 2024 Mozilla Foundation
- **Repository:** https://github.com/mozilla/pdf.js
- **Note:** Draws the PDF pages in the preview panel.

### Mermaid 12.3.0 (`node_modules/markdown-pdf-export/vendor/mermaid.min.js`)

- **License:** MIT
- **Copyright:** © 2014-2022 Knut Sveidqvist
- **Repository:** https://github.com/mermaid-js/mermaid
- **License:** full text below
- **Note:** Draws diagrams. Mermaid's single-file build includes the libraries it depends on, each under its own license, among them: d3 (ISC), d3-sankey (BSD-3-Clause), DOMPurify (MPL-2.0 or Apache-2.0), elkjs (EPL-2.0 or GPL-3.0-or-later), chevrotain (Apache-2.0), cytoscape, cytoscape-cose-bilkent, cytoscape-fcose, dagre-d3-es, dayjs, KaTeX, khroma, marked, roughjs, stylis, es-toolkit, @braintree/sanitize-url, @iconify/utils, @upsetjs/venn.js and ts-dedent (MIT). Their source and license texts are available from each project and from Mermaid's repository.

## Not included

- **The browser** (Chrome, Edge or Chromium) that draws the PDFs is not part of the Extension. It is either already on your computer or downloaded when you ask, and comes with its own license.
- **Development tools** (TypeScript, esbuild, ESLint, the VS Code test tools and others) are used to build and test the Extension and are not shipped in it.
