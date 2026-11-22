/**
 * What an export or a preview had to change, and where that is in the Markdown text.
 * Pure (no `vscode` import): the extension turns the result into entries of the Problems panel.
 */

/** As printed by `cli.mjs <file> --json` and sent in Studio's X-Preview-Report header. */
export interface Report {
  /** Raw HTML left out for safety: "<script>", "onclick", "javascript: URL"... */
  removed_html: string[];
  /** "Diagram 2: <why>": Mermaid diagrams printed as code. */
  diagram_errors: string[];
}

export interface Problem {
  /** Zero-based line and columns in the Markdown text. */
  line: number;
  start: number;
  end: number;
  message: string;
}

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

export function toReport(value: unknown): Report {
  const o = (value ?? {}) as Record<string, unknown>;
  return { removed_html: strings(o.removed_html), diagram_errors: strings(o.diagram_errors) };
}

/** The X-Preview-Report header: URL-encoded JSON. Null when missing or unreadable. */
export function parseReportHeader(header: string | null | undefined): Report | null {
  if (!header) return null;
  try {
    return toReport(JSON.parse(decodeURIComponent(header)));
  } catch {
    return null;
  }
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** How one entry of `removed_html` looks in the text. */
function pattern(label: string): RegExp | null {
  const tag = /^<([a-z][a-z0-9-]*)>$/i.exec(label);
  if (tag) return new RegExp(`<${escapeRegExp(tag[1]!)}\\b[^>]*>?`, "gi");
  const url = /^([a-z][a-z0-9+.-]*): URL$/i.exec(label);
  if (url) return new RegExp(`${escapeRegExp(url[1]!)}\\s*:`, "gi");
  if (/^[a-z][a-z0-9_:.-]*$/i.test(label)) return new RegExp(`\\b${escapeRegExp(label)}\\s*=`, "gi");
  return null;
}

/**
 * Find each reported item in the text. Text inside fenced code blocks is not raw HTML, so it is
 * skipped; something that cannot be found is reported on the first line rather than lost.
 */
export function findProblems(text: string, report: Report): Problem[] {
  const lines = text.split(/\r?\n/);
  const prose: number[] = []; // lines outside fenced code blocks
  const diagrams: number[] = []; // opening line of each ```mermaid block
  let fence: { char: string; size: number } | null = null;
  for (const [n, line] of lines.entries()) {
    const mark = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (mark && mark[1]![0] === fence.char && mark[1]!.length >= fence.size && mark[2]!.trim() === "") fence = null;
      continue;
    }
    if (mark) {
      fence = { char: mark[1]![0]!, size: mark[1]!.length };
      if (/^\s*mermaid\b/i.test(mark[2]!)) diagrams.push(n);
      continue;
    }
    prose.push(n);
  }

  const problems: Problem[] = [];
  const firstLine = (message: string) => problems.push({ line: 0, start: 0, end: lines[0]?.length ?? 0, message });

  for (const label of report.removed_html) {
    const message = `${label} is left out of the PDF: raw HTML is made safe.`;
    const find = pattern(label);
    let found = false;
    for (const n of find ? prose : []) {
      for (const match of lines[n]!.matchAll(find!)) {
        problems.push({ line: n, start: match.index, end: match.index + match[0].length, message });
        found = true;
      }
    }
    if (!found) firstLine(message);
  }

  for (const error of report.diagram_errors) {
    const numbered = /^Diagram (\d+): ([\s\S]*)$/.exec(error);
    const message = `This diagram is printed as code in the PDF: ${(numbered?.[2] ?? error).trim()}`;
    const line = numbered ? diagrams[Number(numbered[1]) - 1] : undefined;
    if (line === undefined) firstLine(message);
    else problems.push({ line, start: 0, end: lines[line]!.length, message });
  }
  return problems.sort((a, b) => a.line - b.line || a.start - b.start);
}
