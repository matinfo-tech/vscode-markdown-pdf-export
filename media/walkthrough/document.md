# One document, its own design

Put a block at the very top of a Markdown file to change only that document:

```yaml
---
title: Quarterly report
author: Jane Smith
pdf:
  orientation: landscape
  footer:
    center_text: "Draft, page {page}"
---
```

While you type inside the `pdf:` block, VS Code suggests the keys and their values. The preview shows the result as you go.

`author` is what `{author}` prints. Set a default once in your settings file (`"author": "Jane Smith"`); a document's own `author:` replaces it, and `author: none` prints no author.

Every key of the `pdf:` block, with examples: [One document, its own design](https://markdown-pdf.matinfo.tech/advanced/per-document).
