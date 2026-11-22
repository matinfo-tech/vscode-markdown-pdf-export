# Changelog

All notable changes to the Markdown PDF Export extension for VS Code. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Design Pages (Studio)** inside VS Code: page style, fonts, paper, header, footer and logos in
  a panel beside your Markdown, with the real PDF of that file drawn above the controls. Saves to
  the one settings file shared with the command line and other editors. Also
  **Design Pages for This Folder Only** (`.markdown-pdf.json`).
- **Export to PDF** command for Markdown files: Command Palette, the button in the editor title,
  right-click in the editor or the Explorer (several files at once), and Cmd+K Cmd+E (Ctrl+K Ctrl+E
  on Windows and Linux). Unsaved edits are saved first.
- No Node.js needed: the exporter ([markdown-pdf-export](https://markdown-pdf.matinfo.tech) 2.6.0)
  ships inside the extension and runs with VS Code's own runtime.
- When no Chrome or Edge is installed, the extension offers to download a private browser.
- Settings `markdownPdfExport.settingsFile`, `markdownPdfExport.browser`, `markdownPdfExport.debug`.
- In Restricted Mode, project settings files are ignored and raw HTML is always made safe.
