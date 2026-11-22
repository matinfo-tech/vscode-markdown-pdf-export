# Markdown PDF Export for VS Code

Export Markdown to PDF with your header, footer, page numbers and logo.

> **In development.** Not on the Marketplace yet.

## Use

Open a Markdown file, then any of:

- press **Cmd+K Cmd+E** (Mac) or **Ctrl+K Ctrl+E** (Windows, Linux);
- click the PDF button at the top right of the editor;
- right-click the file (in the editor or the Explorer) → **Export to PDF**;
- Command Palette → **Markdown PDF: Export to PDF**.

The PDF is written next to the Markdown file.

## Requirements

- Google Chrome or Microsoft Edge. If neither is installed, the extension offers to download a
  browser for itself (about 200 MB, once).
- Nothing else: no Node.js, no terminal. The exporter,
  [markdown-pdf-export](https://markdown-pdf.matinfo.tech), ships inside the extension.

## Page design

Run **Markdown PDF: Design Pages (Studio)** (also in the editor title bar and the right-click
menu). A panel opens beside your Markdown: the real PDF of your file on top, and under it the page
style, fonts, paper, header, footer and logos. Press **Save** to keep the design.

Page style, fonts, header, footer and logos live in one settings file, shared with the
`markdown-pdf-export` command line and the other editors:
`~/.config/markdown-pdf-export/settings.json` (`%APPDATA%\markdown-pdf-export\settings.json` on
Windows). A `.markdown-pdf.json` file in a folder changes them for that folder only.
See [the documentation](https://markdown-pdf.matinfo.tech).

## Privacy

The export runs on your computer and sends nothing anywhere.

## Development

```sh
npm ci
npm run ci                 # typecheck, lint, unit tests, build
npm run test:integration   # runs the export inside a real VS Code
```

To try the extension in a new VS Code window: `npm run build && code --extensionDevelopmentPath="$PWD"`.

## License

MIT
