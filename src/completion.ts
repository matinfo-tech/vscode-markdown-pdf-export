/** Completion of the `pdf:` block in a Markdown file's front matter. */
import fs from "node:fs";
import path from "node:path";
import * as vscode from "vscode";
import { contextAt, suggest, type Schema } from "./frontmatter.ts";

function loadSchema(extensionPath: string): Schema | undefined {
  try {
    const file = path.join(extensionPath, "node_modules", "markdown-pdf-export", "schema", "settings.schema.json");
    return JSON.parse(fs.readFileSync(file, "utf8")) as Schema;
  } catch {
    return undefined;
  }
}

export function registerFrontMatterCompletion(extensionPath: string): vscode.Disposable {
  let schema: Schema | undefined;
  return vscode.languages.registerCompletionItemProvider(
    { language: "markdown" },
    {
      provideCompletionItems(doc, position) {
        const lines = doc.getText().split(/\r?\n/);
        const context = contextAt(lines, position.line, position.character);
        if (context.kind === "none") return undefined;
        schema ??= loadSchema(extensionPath);
        if (!schema) return undefined;
        const tabSize = Number(vscode.workspace.getConfiguration("editor", doc).get("tabSize", 2));
        const typed = lines[position.line]!.slice(0, position.character);
        const word = /[\w-]*$/.exec(typed)![0];
        const range = new vscode.Range(position.line, position.character - word.length, position.line, position.character);
        return suggest(schema, context, Math.min(tabSize, 4)).map((s, i) => {
          const item = new vscode.CompletionItem(s.label, context.kind === "value" ? vscode.CompletionItemKind.Value : vscode.CompletionItemKind.Property);
          item.insertText = s.insert;
          item.range = range;
          item.sortText = String(i).padStart(3, "0");
          if (s.detail) item.detail = s.detail;
          if (s.documentation) item.documentation = new vscode.MarkdownString(s.documentation);
          // A key that opens a block: offer its own keys right away.
          if (/\n\s+$/.test(s.insert)) item.command = { command: "editor.action.triggerSuggest", title: "Suggest" };
          return item;
        });
      },
    },
    ":", // typed after a key
  );
}
