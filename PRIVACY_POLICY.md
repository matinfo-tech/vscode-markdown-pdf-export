# Privacy Policy

**Last Updated:** November 26, 2026

## Introduction

Matinfo ("we", "our" or "us") makes the Markdown PDF Export extension ("Extension") for Visual Studio Code and editors built on it (such as VSCodium). This policy explains what happens to your information when you use the Extension.

**In short:** the Extension has no account, no analytics and no telemetry. We never receive your documents, your settings or anything about you. The few network connections it can make are listed below, and most of them happen only when you ask for them.

## What we collect

**Nothing.** The Extension does not collect, send or store any personal information or usage data, and we have no server that receives data from it.

## What stays on your computer

Everything the Extension does runs on your computer:

- Reading your Markdown files and the images they use from your disk
- Drawing the PDF preview and exporting the PDF, with a browser (Chrome, Edge or Chromium) running
  on your computer in the background
- Drawing Mermaid diagrams and maths, with code shipped inside the Extension
- Studio and the **Design pages** panel, served from a small server that listens on `127.0.0.1` only (it cannot be reached from another computer) and answers only the panel that started it

### Files the Extension writes

The Extension writes only files you ask for:

- The PDF files you export
- Your settings files, when you save a design in Studio or **Design pages**:
  - the user settings file (`~/.config/markdown-pdf-export/settings.json`, or
    `%APPDATA%\markdown-pdf-export\settings.json` on Windows), or another file you chose with the
    `markdownPdfExport.settingsFile` setting
  - a project settings file (`.markdown-pdf.json`) in a folder you chose
- Logo images you add in Studio, copied into an `assets` folder beside the settings file
- When an AI assistant opens Studio in your web browser, Studio can also offer to set up other editors (for example Zed). It changes their configuration files only for the steps you click

The Extension does not change your Markdown files.

### Settings kept by VS Code

Your VS Code settings for the Extension (for example `markdownPdfExport.browser` and
`markdownPdfExport.settingsFile`) and a few remembered answers (such as "don't ask again") are stored by VS Code on your computer, like any other extension's settings. We do not receive them.

## Network connections

The Extension itself contacts no server of ours. Connections can happen in these cases:

### Content of your own documents

When a document, its stylesheet or its settings refer to anything on the web (for example an image such as `![logo](https://example.com/logo.png)`, or a font or image in your own CSS), the browser that draws the PDF downloads it from that server, as any web browser would. That server sees the request (your IP address and the address requested), but not your document. The Extension's built-in page styles use nothing from the web, so a document that refers only to local files makes no connection.

### Browser download (only when you or your AI assistant ask)

If no Chrome, Edge or Chromium is found, the Extension offers to download one. When you accept (**Download browser**), or when an AI assistant you use calls the Extension's install-browser tool, Chromium (about 200 MB) is downloaded from Playwright's download servers. Nothing about you or your documents is sent.

### Settings schema (only when you allow it)

A settings file saved by **Design pages** names its schema on `markdown-pdf.matinfo.tech`. The first time you open such a file, the Extension asks whether VS Code may load that schema. If you choose **Allow**, the Extension adds `https://markdown-pdf.matinfo.tech/schema/` to VS Code's `json.schemaDownload.trustedDomains` setting, and VS Code downloads the schema from there. As with any website, the server can see the request (your IP address and the file requested), but nothing from your documents. A settings file without `$schema` uses the copy inside the Extension.

### Documentation links

**Open Documentation**, **Help** and the documentation links open pages of
`markdown-pdf.matinfo.tech` in your web browser, only when you click them.

## Third-party services

These services are not run by us and follow their own privacy policies:

- **Visual Studio Marketplace** (Microsoft) and **Open VSX** (Eclipse Foundation), when you
  install or update the Extension
- **VS Code**, which has its own telemetry settings; the Extension does not send anything
  through them
- **AI assistants** (such as GitHub Copilot in agent mode): the Extension offers them tools to
  export a file, open Studio or check the setup. When you ask an assistant to use them, what the
  assistant reads and sends to its provider is covered by that assistant's terms and privacy
  policy, not by us
- **Websites your documents link to** (see "Content of your own documents" above)

## Data security

Since we do not collect or receive your data, there is nothing for us to lose or leak. The Studio server listens on your computer only and requires a random token for each session. In VS Code's Restricted Mode, project settings files are ignored and raw HTML in documents is always made safe.

## Children

The Extension does not collect information from anyone, children included.

## Your rights

Data protection laws (such as the GDPR) give you rights over personal data held about you. We hold none through the Extension, so there is nothing to see, correct or delete. You can still contact us with any question.

## Changes to this policy

If this policy changes, we will update the "Last Updated" date above and publish the new version in the [repository](https://github.com/matinfo-tech/vscode-markdown-pdf-export) and with the next release of the Extension.

## Contact us

**Email:** dev@matinfo.tech  
**Website:** https://markdown-pdf.matinfo.tech  
**Issues:** https://github.com/matinfo-tech/vscode-markdown-pdf-export/issues

## Open source

The Extension is open source under the MIT License. You can check everything this policy says in the source code: https://github.com/matinfo-tech/vscode-markdown-pdf-export

---

© 2026 Matinfo. The Extension is released under the [MIT License](LICENSE).
