# One document, its own design

Put a block at the very top of a Markdown file to change only that document:

```yaml
---
title: Quarterly report
pdf:
  orientation: landscape
  footer:
    center_text: "Draft, page {page}"
---
```

While you type inside the `pdf:` block, VS Code suggests the keys and their values. The preview shows the result as you go.
