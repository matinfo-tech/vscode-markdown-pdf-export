# Changelog

All notable changes to the Markdown PDF Export extension for VS Code. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- More French: with VS Code in French, messages and their buttons, Check Setup, the Problems
  entries, the help of `pdf:` suggestions, the list of documentation pages and the buttons over
  the PDF are in French too. The design controls inside the PDF panel and messages from the PDF
  engine are still in English.

## [0.1.3] - 2026-11-26

### Added

- Privacy Policy, Terms of Use, EULA and third-party licenses, shipped with the extension. The
  README's Privacy section now says when the extension goes online: what a document loads from
  the web, and a browser download or the settings schema when you ask for them.
- French. With VS Code in French, the commands, settings and Get Started walkthrough are in
  French, and so is the status bar's **PDF** menu. Messages and the PDF panel are still in English.
- **Markdown PDF: Get Started**, also in the status bar's **PDF** menu, opens the Get Started
  walkthrough. Before, it could only be found from VS Code's Welcome page.

### Fixed

- The **PDF** item in the status bar, the `pdf:` suggestions and the Problems entries now appear as
  soon as a Markdown file is open. Before, they waited until one of the extension's commands had run.

## [0.1.2] - 2026-11-26

### Fixed

- Maths prints in KaTeX's own fonts: `\mathbb{R}`, `\mathcal` letters and large brackets were
  drawn in a fallback font (exporter
  [markdown-pdf-export](https://markdown-pdf.matinfo.tech) 2.9.1).
- **Design pages** edits the design the PDF uses. In a folder with its own `.markdown-pdf.json`
  (the nearest one, as for export), it used to edit your settings file instead, which that folder
  file overrides: choices made in the panel did not show on the PDF. The panel switches when the
  file in front comes under another design, and keeps showing or hiding the design controls.
  Restricted Mode, where folder files do not apply, still edits your settings file.

## [0.1.1] - 2026-11-25

### Changed

- Easier to find on the Marketplace and Open VSX: more search keywords, and questions go to the
  GitHub issues.
- README: a "Coming from Markdown PDF?" table maps the settings of `yzane.markdown-pdf` to this
  extension's settings file.

## [0.1.0] - 2026-11-25

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
  matter link to their page, and the walkthrough and README point to the right pages. In
  **Design Pages**, each section has a **Help** link, and a *Going further* section lists the
  per-document, header and footer, and settings pages.
- No Node.js needed: the exporter ([markdown-pdf-export](https://markdown-pdf.matinfo.tech) 2.9.0)
  ships inside the extension and runs with VS Code's own runtime.
- Small download (about 9 MB): parts of the exporter's dependencies that are never loaded (other
  languages' dates, trace viewer pages, type files) are left out, and a test unpacks the package
  and exports a document from it.
- When no Chrome or Edge is installed, the extension offers to download a private browser.
- Settings `markdownPdfExport.preview.refresh`, `markdownPdfExport.settingsFile`,
  `markdownPdfExport.browser`, `markdownPdfExport.debug`.
- In Restricted Mode, project settings files are ignored and raw HTML is always made safe.
