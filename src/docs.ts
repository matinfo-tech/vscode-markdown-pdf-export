/** The exporter's documentation site: the pages the extension points to, in one place. */
import { toTranslate } from "./l10n.ts";

export const DOCS_SITE = "https://markdown-pdf.matinfo.tech";

export interface DocsTopic {
  id: string;
  label: string;
  detail: string;
  path: string;
}

/**
 * In the order they are offered. Whole pages only: headings on the site may move.
 * `label` and `detail` are in English: show them with `translate()`.
 */
export const DOCS_TOPICS: readonly DocsTopic[] = [
  { id: "studio", label: toTranslate("Design Pages (Studio)"), detail: toTranslate("page style, fonts, paper, header, footer, logo"), path: "/studio" },
  { id: "per-document", label: toTranslate("One Document, Its Own Design"), detail: toTranslate("the pdf: block in a document's front matter"), path: "/advanced/per-document" },
  { id: "header-footer", label: toTranslate("Header and Footer"), detail: toTranslate("zones, logos, page numbers and dates"), path: "/advanced/header-footer" },
  { id: "header-footer-reference", label: toTranslate("Header and Footer Reference"), detail: toTranslate("every option, placeholder and image setting"), path: "/reference/header-footer" },
  { id: "placeholders", label: toTranslate("Placeholders"), detail: toTranslate("{page}, {pages}, {title}, {author}, {date}…"), path: "/reference/placeholders" },
  { id: "settings-file", label: toTranslate("Settings File"), detail: toTranslate("where it lives and how files are combined"), path: "/advanced/settings-file" },
  { id: "settings", label: toTranslate("All Settings"), detail: toTranslate("every key of the settings file"), path: "/reference/settings" },
  { id: "styling", label: toTranslate("Styling"), detail: toTranslate("your own CSS, fonts and code colours"), path: "/advanced/styling" },
  { id: "content", label: toTranslate("Content"), detail: toTranslate("maths, contents list, images and page breaks"), path: "/advanced/content" },
  { id: "help", label: toTranslate("Something Not Working?"), detail: toTranslate("common problems and their fixes"), path: "/help" },
];

/** The page of a topic; the site's home page for an unknown one. */
export function docsUrl(id?: string): string {
  const topic = DOCS_TOPICS.find((t) => t.id === id);
  return `${DOCS_SITE}${topic?.path ?? "/"}`;
}

/** `[label](url)` for a completion item or hover. */
export const docsLink = (id: string, label: string): string => `[${label}](${docsUrl(id)})`;
