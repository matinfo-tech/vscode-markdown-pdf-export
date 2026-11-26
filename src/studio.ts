/**
 * The PDF panel: the real PDF of the Markdown file in front, drawn again as you type, with the
 * exporter's page-design controls (Studio) one click away.
 * A hidden `cli.mjs studio --embedded` process does the work; the panel reaches it only through
 * this file, which also decides which document each preview draws.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { readOptions, toEnv } from "./config.ts";
import { designScope } from "./design-scope.ts";
import { releaseProblems, showProblems } from "./diagnostics.ts";
import {
  allowedStudioRequest,
  cliPath,
  errorMessage,
  parseStudioUrl,
  studioArgs,
  withPreviewSource,
  type PreviewSource,
  type StudioLink,
} from "./engine.ts";
import { t } from "./l10n.ts";
import { parseReportHeader } from "./problems.ts";
import { killTree, spawnCli } from "./process.ts";
import { studioPanelHtml } from "./studio-html.ts";

const START_TIMEOUT_MS = 20_000;
/** Pause in typing before the preview is asked for (Studio then waits a little more itself). */
const TYPING_PAUSE_MS = 300;

interface Server extends StudioLink {
  /** What it was started for: a different key needs another server. */
  key: string;
  stop(): void;
}

export interface StudioContext {
  extensionUri: vscode.Uri;
  output: vscode.OutputChannel;
}

/** For the integration tests: what the open panel last drew. */
export interface StudioEvents {
  onRendered: vscode.Event<number>;
  onError: vscode.Event<string>;
  /** Everything written to the output channel since the panel opened (tests print it on failure). */
  log(): string;
  /** The Markdown file the panel shows. */
  previewed(): vscode.Uri | undefined;
  /** Which settings file the panel edits: "user", or "project <folder>" (plus " restricted"). */
  scope(): string | undefined;
}

const rendered = new vscode.EventEmitter<number>();
const failed = new vscode.EventEmitter<string>();
const notes: string[] = [];

/** The panel's recent log, which the integration tests print when no preview arrives. */
function remember(text: string): void {
  notes.push(text);
  if (notes.length > 200) notes.shift();
}

function note(ctx: StudioContext, text: string): void {
  remember(text);
  ctx.output.appendLine(text);
}

let panel: vscode.WebviewPanel | undefined;
let server: Server | undefined;
/** The Markdown file the open panel previews; the exporter's sample document when there is none. */
let previewed: vscode.Uri | undefined;
/** Version of that document's text in the last preview asked for. */
let drawnVersion: number | undefined;
let typingTimer: NodeJS.Timeout | undefined;
/** For re-opening the panel on another design when the file in front changes. */
let lastCtx: StudioContext | undefined;
/** The PDF alone, or with the design controls, as the panel shows it now. */
let currentMode: OpenStudioOptions["mode"] = "preview";
/** The panel was opened with "Design Pages for This Folder Only". */
let askedForProject = false;

export const studioEvents: StudioEvents = {
  onRendered: rendered.event,
  onError: failed.event,
  log: () => notes.join("\n"),
  previewed: () => previewed,
  scope: () => server?.key,
};

const same = (a: vscode.Uri | undefined, b: vscode.Uri | undefined) => a?.toString() === b?.toString();
const openDocument = (uri: vscode.Uri) => vscode.workspace.textDocuments.find((d) => same(d.uri, uri));
/** A Markdown file on a disk the exporter can read. */
const previewable = (doc: vscode.TextDocument | undefined): doc is vscode.TextDocument =>
  doc?.languageId === "markdown" && (doc.uri.scheme === "file" || doc.uri.scheme === "vscode-remote");

function refresh(): void {
  clearTimeout(typingTimer);
  void panel?.webview.postMessage({ type: "refresh" });
}

function setTitle(): void {
  if (panel) panel.title = previewed ? t("PDF: {0}", path.basename(previewed.fsPath)) : t("PDF: sample document");
}

/**
 * The server a document needs: the settings file its design comes from, and the panel's trust.
 * In Restricted Mode folder files do not apply to the PDF, so the panel edits the user's settings.
 */
function serverFor(ctx: StudioContext, file: vscode.Uri | undefined, project: boolean) {
  const folder = (file && vscode.workspace.getWorkspaceFolder(file)) ?? vscode.workspace.workspaceFolders?.[0];
  const restricted = !vscode.workspace.isTrusted;
  const scope = designScope({ file: file?.fsPath, askedForProject: project, workspaceDir: folder?.uri.fsPath, trusted: !restricted });
  const cwd = scope.dir ?? ctx.extensionUri.fsPath;
  const key = `${scope.project ? `project ${cwd}` : "user"}${restricted ? " restricted" : ""}`;
  return { scope, restricted, cwd, key };
}

/** Show another document in the open panel. */
function follow(uri: vscode.Uri): void {
  if (same(uri, previewed)) return;
  // Its design comes from another settings file: the panel edits that one instead.
  if (lastCtx && server && serverFor(lastCtx, uri, askedForProject).key !== server.key) {
    void openStudio(lastCtx, { file: uri, project: askedForProject, mode: currentMode });
    return;
  }
  if (previewed) releaseProblems(previewed);
  previewed = uri;
  drawnVersion = undefined;
  setTitle();
  refresh();
}

/** Keep the open panel on the Markdown file in front, and on its text as it is typed. */
export function watchDocuments(): vscode.Disposable {
  const live = () => vscode.workspace.getConfiguration("markdownPdfExport").get<string>("preview.refresh", "onType") !== "onSave";
  return vscode.Disposable.from(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (panel && previewable(editor?.document)) follow(editor.document.uri);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (!panel || !same(event.document.uri, previewed) || event.contentChanges.length === 0 || !live()) return;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(refresh, TYPING_PAUSE_MS);
    }),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      // Nothing to do when the saved text is the one already drawn.
      if (panel && same(doc.uri, previewed) && doc.version !== drawnVersion) refresh();
    }),
    { dispose: () => clearTimeout(typingTimer) },
  );
}

function startServer(ctx: StudioContext, key: string, args: string[], cwd: string): Promise<Server> {
  const cfg = vscode.workspace.getConfiguration("markdownPdfExport");
  const env = toEnv(readOptions((key, fallback) => cfg.get(key, fallback)));
  return new Promise((resolve, reject) => {
    const child = spawnCli(cliPath(ctx.extensionUri.fsPath), args, { cwd, env });
    const stop = () => killTree(child.pid);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      stop();
      finish(new Error(t("The PDF engine took too long to start.")));
    }, START_TIMEOUT_MS);
    const finish = (error: Error | null, link?: StudioLink) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error || !link) reject(error ?? new Error(t("The PDF engine did not start.")));
      else resolve({ ...link, key, stop });
    };
    child.stdout.on("data", (d: string) => {
      stdout += d;
      const link = parseStudioUrl(stdout);
      if (link) finish(null, link);
    });
    child.stderr.on("data", (d: string) => {
      stderr += d;
      ctx.output.append(d);
      remember(`PDF engine: ${String(d).trimEnd()}`);
    });
    child.on("error", (error) => finish(error));
    child.on("close", () => {
      finish(new Error(errorMessage(stderr)));
      // It stopped by itself later on: the next use of the panel starts a new one.
      if (server?.stop === stop) server = undefined;
    });
  });
}

interface PanelRequest {
  path: string;
  method: string;
  contentType?: string;
  body?: ArrayBuffer | Uint8Array | null;
}

/** Forward one request of the panel to the Studio server, adding the token it never sees. */
async function forward(target: Server, message: PanelRequest) {
  const headers: Record<string, string> = { "x-studio-token": target.token };
  if (message.contentType) headers["content-type"] = message.contentType;
  const res = await fetch(`http://127.0.0.1:${target.port}${message.path}`, {
    method: message.method,
    headers,
    body: message.body ? new Uint8Array(message.body) : undefined,
  });
  const keep: Record<string, string> = {};
  for (const name of ["content-type", "x-render-ms", "x-preview-name"]) {
    const value = res.headers.get(name);
    if (value) keep[name] = value;
  }
  return {
    status: res.status,
    headers: keep,
    body: new Uint8Array(await res.arrayBuffer()),
    report: parseReportHeader(res.headers.get("x-preview-report")),
  };
}

/** A preview request: this file says which document is drawn, and reports what the PDF left out. */
async function forwardPreview(target: Server, message: PanelRequest) {
  const uri = previewed;
  const doc = uri && openDocument(uri);
  const text = doc?.getText();
  const source: PreviewSource | undefined = uri && { file: uri.fsPath, ...(doc?.isDirty ? { text } : {}) };
  drawnVersion = doc?.version;
  const body = withPreviewSource(message.body ? new Uint8Array(message.body) : null, source);
  const { report, ...answer } = await forward(target, { ...message, body });
  if (uri && report && answer.status === 200 && same(uri, previewed)) {
    let drawn = text;
    try {
      drawn ??= fs.readFileSync(uri.fsPath, "utf8");
    } catch {
      drawn = "";
    }
    showProblems(uri, drawn, report, true);
  }
  return answer;
}

function close(): void {
  server?.stop();
  server = undefined;
}

export interface OpenStudioOptions {
  /** Markdown file to preview. */
  file?: vscode.Uri;
  /**
   * Design this folder's .markdown-pdf.json instead of the user's settings. Without it the panel
   * still edits a folder's design when one applies to the document: that is what its PDF uses.
   */
  project?: boolean;
  /** Show the PDF alone, or with the design controls. */
  mode: "preview" | "design";
}

export async function openStudio(ctx: StudioContext, options: OpenStudioOptions): Promise<void> {
  const asked = options.file?.scheme === "file" || options.file?.scheme === "vscode-remote" ? options.file : undefined;
  const file = asked ?? previewed;
  const { scope, restricted, cwd, key } = serverFor(ctx, file, Boolean(options.project));
  if (options.project && !scope.project) {
    void vscode.window.showWarningMessage(t("Open a folder first: a project design is saved in that folder."));
    return;
  }
  lastCtx = ctx;
  askedForProject = Boolean(options.project);
  currentMode = options.mode;

  let reload = !panel;
  if (server?.key !== key) {
    close();
    try {
      server = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Window, title: t("Starting the PDF preview…") },
        () => startServer(ctx, key, studioArgs({ project: scope.project, restricted }), cwd),
      );
    } catch (error) {
      void vscode.window.showErrorMessage(t("The PDF preview could not start: {0}", error instanceof Error ? error.message : String(error)));
      return;
    }
    reload = true;
  }

  const studioDir = vscode.Uri.joinPath(ctx.extensionUri, "node_modules", "markdown-pdf-export", "studio");
  const distDir = vscode.Uri.joinPath(ctx.extensionUri, "dist");
  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      "markdownPdfExport.studio",
      "PDF",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [studioDir, distDir] },
    );
    panel.onDidDispose(() => {
      if (previewed) releaseProblems(previewed);
      panel = undefined;
      previewed = undefined;
      clearTimeout(typingTimer);
      close();
    });
    panel.webview.onDidReceiveMessage(async (message: { type?: string; id?: number; path?: unknown; method?: unknown; contentType?: string; body?: ArrayBuffer | null; pages?: number; message?: string; mode?: string }) => {
      if (message.type === "rendered") return rendered.fire(message.pages ?? 0);
      if (message.type === "ready") return note(ctx, "PDF panel loaded.");
      if (message.type === "mode") return void (currentMode = message.mode === "design" ? "design" : "preview");
      if (message.type === "panel-error") return note(ctx, `PDF panel: ${message.message}`);
      if (message.type === "render-error") {
        note(ctx, `PDF preview: ${message.message}`);
        return failed.fire(message.message ?? "");
      }
      if (message.type === "export") return void vscode.commands.executeCommand("markdownPdfExport.export", previewed);
      // A list of topics, opened by the extension: the panel never names the address to open.
      if (message.type === "docs") return void vscode.commands.executeCommand("markdownPdfExport.openDocs");
      if (message.type !== "request" || !panel) return;
      note(ctx, `PDF panel → ${String(message.method)} ${String(message.path)}`);
      const reply = (answer: object) => void panel?.webview.postMessage({ type: "response", id: message.id, ...answer });
      if (!server || !allowedStudioRequest(message.path, message.method)) {
        return reply({ status: 403, headers: { "content-type": "application/json" }, body: new TextEncoder().encode(JSON.stringify({ error: t("Not available in VS Code.") })) });
      }
      const request = { path: message.path, method: message.method as string, contentType: message.contentType, body: message.body };
      try {
        const preview = message.path === "/api/preview" && message.method === "POST";
        reply(await (preview ? forwardPreview(server, request) : forward(server, request)));
      } catch (error) {
        reply({ error: error instanceof Error ? error.message : String(error) });
      }
    });
  } else {
    panel.reveal(undefined, true);
  }

  const before = previewed;
  if (before && !same(before, file)) releaseProblems(before);
  previewed = file;
  setTitle();
  if (!reload) {
    void panel.webview.postMessage({ type: "mode", mode: options.mode });
    if (!same(before, file)) {
      drawnVersion = undefined;
      refresh();
    }
    return;
  }
  drawnVersion = undefined;
  const index = fs.readFileSync(path.join(studioDir.fsPath, "index.html"), "utf8");
  // A new nonce each time also makes VS Code load the page again for the new server.
  panel.webview.html = studioPanelHtml(index, {
    studio: panel.webview.asWebviewUri(studioDir).toString(),
    host: panel.webview.asWebviewUri(vscode.Uri.joinPath(distDir, "studio-host.js")).toString(),
    app: panel.webview.asWebviewUri(vscode.Uri.joinPath(distDir, "studio-app.js")).toString(),
    worker: panel.webview.asWebviewUri(vscode.Uri.joinPath(distDir, "pdf.worker.min.js")).toString(),
    cspSource: panel.webview.cspSource,
    nonce: randomBytes(16).toString("hex"),
    mode: options.mode,
  });
}

export function disposeStudio(): void {
  panel?.dispose();
  close();
}
