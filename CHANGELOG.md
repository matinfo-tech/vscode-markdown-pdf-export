# Changelog

All notable changes to the Markdown PDF Export extension for VS Code. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **PDF preview beside your Markdown**: the real PDF, with its pages, header, footer and page
  numbers. It is drawn again shortly after you stop typing, without saving
  (`markdownPdfExport.preview.refresh`: `onType` or `onSave`), and follows the Markdown file in
  front. Long documents stay quick: only the pages on screen are painted.
- **Design Pages** in the same panel: page style, fonts, paper, header, footer and logos, each
  choice shown on the PDF at once. Saves to the one settings file shared with the command line
  and other editors. Also **Design Pages for This Folder Only** (`.markdown-pdf.json`). The panel
  follows your VS Code colour theme.
- **One document, its own design**: inside the `pdf:` block of a Markdown file's front matter, VS Code
  suggests the keys (page, margins, header, footer, code, maths, contents) and their values, taken
  from the exporter's schema. The preview shows the result as you type.
- A **walkthrough** (Welcome page, or *Help: Open Walkthrough*) in five steps: preview, design,
  one document, export, check setup.
- **Default author**: `"author"` in your settings file is printed by `{author}` in documents
  that set none; `author: none` in a document leaves it out there. Completion offers both.
- **Problems panel**: raw HTML left out for safety and diagrams that could not be drawn are
  listed on the line that caused them, after a preview or an export.
- **Export to PDF** command for Markdown files: Command Palette, the button in the editor title,
  right-click in the editor or the Explorer (several files at once), and Cmd+K Cmd+E (Ctrl+K Ctrl+E
  on Windows and Linux). Unsaved edits are saved first.
- **AI tools**: in Copilot Chat's agent mode, ask *Export this file to PDF* or *Open Studio*. The
  extension offers the exporter's tools to VS Code itself; nothing to configure.
- Completion and checking while you edit a settings file (`.markdown-pdf.json` or your own
  `settings.json`). A file without `$schema` uses the schema inside the extension. For a file
  that names the online schema (Studio writes it), the extension offers once to let VS Code load
  it from markdown-pdf.matinfo.tech, adding that site to your trusted schema places and keeping
  VS Code's own.
- **Open Settings File**, **Open This Folder's Settings File** and **Check Setup** (browser and
  settings files) commands, and a **PDF** item in the status bar that lists everything.
- **Open Documentation**: pick a page of the documentation (header and footer, its reference, one
  document's own design, all settings...) and it opens in the browser. Also in the status bar
  menu and as **Help** in the PDF panel. The `pdf:`, `header:` and `footer:` suggestions in front
  matter link to their page, and the walkthrough and README point to the right pages.
- No Node.js needed: the exporter ([markdown-pdf-export](https://markdown-pdf.matinfo.tech) 2.8.0)
  ships inside the extension and runs with VS Code's own runtime.
- Small download (about 9 MB): parts of the exporter's dependencies that are never loaded (other
  languages' dates, trace viewer pages, type files) are left out, and a test unpacks the package
  and exports a document from it.
- When no Chrome or Edge is installed, the extension offers to download a private browser.
- Settings `markdownPdfExport.preview.refresh`, `markdownPdfExport.settingsFile`,
  `markdownPdfExport.browser`, `markdownPdfExport.debug`.
- In Restricted Mode, project settings files are ignored and raw HTML is always made safe.
