# Third-Party Licenses

Markdown PDF Export is released under the [MIT License](LICENSE). It includes open-source
software from other authors, listed below with their licenses. The copyright lines are taken from
each component's own license file.

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

KaTeX includes its fonts (`katex/dist/fonts`), under the same MIT License. Playwright contains
code derived from Puppeteer (Apache-2.0); see `node_modules/playwright-core/NOTICE`.

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
- **Note:** Draws diagrams. Mermaid's single-file build includes the libraries it depends on,
  each under its own license, among them: d3 (ISC), d3-sankey (BSD-3-Clause), DOMPurify
  (MPL-2.0 or Apache-2.0), elkjs (EPL-2.0 or GPL-3.0-or-later), chevrotain (Apache-2.0),
  cytoscape, cytoscape-cose-bilkent, cytoscape-fcose, dagre-d3-es, dayjs, KaTeX, khroma, marked,
  roughjs, stylis, es-toolkit, @braintree/sanitize-url, @iconify/utils, @upsetjs/venn.js and
  ts-dedent (MIT). Their source and license texts are available from each project and from
  Mermaid's repository.

## Not included

- **The browser** (Chrome, Edge or Chromium) that draws the PDFs is not part of the Extension. It
  is either already on your computer or downloaded when you ask, and comes with its own license.
- **Development tools** (TypeScript, esbuild, ESLint, the VS Code test tools and others) are used
  to build and test the Extension and are not shipped in it.

---

## MIT License (Mermaid)

```text
The MIT License (MIT)

Copyright (c) 2014 - 2022 Knut Sveidqvist

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Apache License 2.0 (pdf.js; also the license of Playwright, chevrotain and one of DOMPurify's two options)

```text

                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS
```
