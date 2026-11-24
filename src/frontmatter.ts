/**
 * Completion inside a Markdown file's front matter, for the `pdf:` block that changes one
 * document's page design. Pure (no `vscode` import): the extension calls it from a provider.
 * The keys, values and descriptions come from the settings schema shipped with the exporter.
 */

/** The part of JSON Schema the settings schema uses. */
export interface SchemaNode {
  type?: string;
  description?: string;
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, SchemaNode>;
  $ref?: string;
}

export interface Schema extends SchemaNode {
  definitions?: Record<string, SchemaNode>;
}

/**
 * Keys that work in front matter. The presets (`look`, `font`, `template`) and the file paths
 * work in a settings file only, so they are not offered here.
 */
export const PDF_KEYS = [
  "page_format",
  "orientation",
  "margin",
  "scale",
  "page_ranges",
  "print_background",
  "font_family",
  "heading_font_family",
  "include_default_styles",
  "breaks",
  "emoji",
  "highlight",
  "highlight_style",
  "math",
  "math_options",
  "heading_anchors",
  "toc",
  "toc_options",
  "header",
  "footer",
  "display_header_footer",
];

/** Keys of the front matter that the exporter reads outside `pdf:`. */
const ROOT_KEYS: Record<string, string> = {
  title: "Document title: printed by {title} in a header or footer.",
  author: "Author printed by {author}. Replaces the author of your settings file; `none` prints no author in this document.",
  pdf: "Page design for this document only. It wins over your settings file.",
};

export type Context =
  | { kind: "none" }
  | { kind: "key"; path: string[]; indent: number }
  | { kind: "value"; path: string[]; key: string };

/** Line number of the closing `---` of a front matter block that starts on line 0, else -1. */
export function frontMatterEnd(lines: string[]): number {
  if (lines[0]?.trimEnd() !== "---") return -1;
  for (let n = 1; n < lines.length; n++) {
    const line = lines[n]!.trimEnd();
    if (line === "---" || line === "...") return n;
  }
  return -1;
}

const indentOf = (line: string) => line.length - line.trimStart().length;

/** What the cursor is typing: a key at some depth under `pdf:`, or the value of one. */
export function contextAt(lines: string[], line: number, character: number): Context {
  const end = frontMatterEnd(lines);
  // An unclosed block still counts while it is being typed: the end is then the last line.
  const last = end === -1 ? (lines[0]?.trimEnd() === "---" ? lines.length : -1) : end;
  if (last === -1 || line <= 0 || line >= last) return { kind: "none" };

  const text = lines[line]!.slice(0, character);
  const indent = indentOf(text);
  const value = /^(\s*)([A-Za-z_][\w-]*):\s+(\S*)$/.exec(text);

  // The keys above, each less indented than the one below: where this line sits.
  const path: string[] = [];
  let limit = value ? value[1]!.length : indent;
  for (let n = line - 1; n >= 1 && limit > 0; n--) {
    const above = lines[n]!;
    if (!above.trim() || above.trimStart().startsWith("#")) continue;
    const match = /^(\s*)([A-Za-z_][\w-]*):\s*(#.*)?$/.exec(above);
    const at = indentOf(above);
    if (at >= limit && above.trimStart().startsWith("-")) return { kind: "none" }; // inside a list
    if (at < limit) {
      if (!match) return { kind: "none" }; // a list item or a value in between: not a block of keys
      path.unshift(match[2]!);
      limit = at;
    }
  }
  if (path.length > 0 && path[0] !== "pdf") return { kind: "none" };

  if (value) return { kind: "value", path, key: value[2]! };
  if (/^\s*(-\s|[A-Za-z_][\w-]*:)/.test(text) && !/^\s*[A-Za-z_][\w-]*$/.test(text)) return { kind: "none" };
  return { kind: "key", path, indent };
}

export interface Suggestion {
  label: string;
  /** Text to insert in place of what was typed. */
  insert: string;
  detail?: string;
  documentation?: string;
}

function resolve(schema: Schema, node: SchemaNode | undefined): SchemaNode | undefined {
  let current = node;
  for (let depth = 0; current?.$ref && depth < 5; depth++) {
    const name = current.$ref.replace("#/definitions/", "");
    current = { ...schema.definitions?.[name], ...(current.description ? { description: current.description } : {}) };
  }
  return current;
}

/** The schema node of a key path under `pdf:` (path[0] is "pdf"). */
function nodeAt(schema: Schema, path: string[]): SchemaNode | undefined {
  let node: SchemaNode | undefined = schema;
  for (const [i, key] of path.slice(1).entries()) {
    if (i === 0 && !PDF_KEYS.includes(key)) return undefined;
    node = resolve(schema, resolve(schema, node)?.properties?.[key]);
    if (!node) return undefined;
  }
  return node;
}

const entryFor = (key: string, node: SchemaNode | undefined, indent: number, step: number): Suggestion => {
  const object = node?.type === "object" || node?.properties !== undefined;
  const pad = " ".repeat(indent + step);
  return {
    label: key,
    insert: object ? `${key}:\n${pad}` : `${key}: `,
    detail: object ? "block" : (node?.type ?? undefined),
    ...(node?.description ? { documentation: node.description } : {}),
  };
};

/** Keys or values to offer for a context. Empty when there is nothing to suggest. */
export function suggest(schema: Schema, context: Context, step = 2): Suggestion[] {
  if (context.kind === "none") return [];
  if (context.kind === "key") {
    if (context.path.length === 0) {
      return Object.entries(ROOT_KEYS).map(([key, documentation]) => ({
        label: key,
        insert: key === "pdf" ? `pdf:\n${" ".repeat(context.indent + step)}` : `${key}: `,
        documentation,
      }));
    }
    const parent = context.path.length === 1 ? undefined : nodeAt(schema, context.path);
    if (context.path.length > 1 && !parent) return [];
    const children: Record<string, SchemaNode> =
      context.path.length === 1
        ? Object.fromEntries(PDF_KEYS.flatMap((k) => (schema.properties?.[k] ? [[k, resolve(schema, schema.properties[k])!]] : [])))
        : (resolve(schema, parent)?.properties ?? {});
    return Object.entries(children).map(([key, node]) => entryFor(key, node, context.indent, step));
  }
  if (context.path.length === 0 || context.path[0] !== "pdf") return [];
  const node = nodeAt(schema, [...context.path, context.key]);
  if (!node) return [];
  const values: unknown[] = node.enum ?? (node.type === "boolean" ? [true, false] : []);
  return values.map((v) => ({ label: String(v), insert: String(v), ...(node.description ? { documentation: node.description } : {}) }));
}
