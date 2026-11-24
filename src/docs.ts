/** The exporter's documentation site: the pages the extension points to, in one place. */
export const DOCS_SITE = "https://markdown-pdf.matinfo.tech";

export interface DocsTopic {
  id: string;
  label: string;
  detail: string;
  path: string;
}

/** In the order they are offered. Whole pages only: headings on the site may move. */
export const DOCS_TOPICS: readonly DocsTopic[] = [
  { id: "studio", label: "Design Pages (Studio)", detail: "page style, fonts, paper, header, footer, logo", path: "/studio" },
  { id: "per-document", label: "One Document, Its Own Design", detail: "the pdf: block in a document's front matter", path: "/advanced/per-document" },
  { id: "header-footer", label: "Header and Footer", detail: "zones, logos, page numbers and dates", path: "/advanced/header-footer" },
  { id: "header-footer-reference", label: "Header and Footer Reference", detail: "every option, placeholder and image setting", path: "/reference/header-footer" },
  { id: "placeholders", label: "Placeholders", detail: "{page}, {pages}, {title}, {author}, {date}…", path: "/reference/placeholders" },
  { id: "settings-file", label: "Settings File", detail: "where it lives and how files are combined", path: "/advanced/settings-file" },
  { id: "settings", label: "All Settings", detail: "every key of the settings file", path: "/reference/settings" },
  { id: "styling", label: "Styling", detail: "your own CSS, fonts and code colours", path: "/advanced/styling" },
  { id: "content", label: "Content", detail: "maths, contents list, images and page breaks", path: "/advanced/content" },
  { id: "help", label: "Something Not Working?", detail: "common problems and their fixes", path: "/help" },
];

/** The page of a topic; the site's home page for an unknown one. */
export function docsUrl(id?: string): string {
  const topic = DOCS_TOPICS.find((t) => t.id === id);
  return `${DOCS_SITE}${topic?.path ?? "/"}`;
}

/** `[label](url)` for a completion item or hover. */
export const docsLink = (id: string, label: string): string => `[${label}](${docsUrl(id)})`;
