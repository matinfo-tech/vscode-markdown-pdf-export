/**
 * Studio inside VS Code: the exporter's page-design UI in a panel, with the real PDF beside it.
 * A hidden `cli.mjs studio` process does the work; the panel reaches it only through this file.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { readOptions, toEnv } from "./config.ts";
import { allowedStudioRequest, cliPath, errorMessage, parseStudioUrl, studioArgs, type StudioLink } from "./engine.ts";
import { killTree, spawnCli } from "./process.ts";
import { studioPanelHtml } from "./studio-html.ts";

const START_TIMEOUT_MS = 20_000;

interface Server extends StudioLink {
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
}

const rendered = new vscode.EventEmitter<number>();
const failed = new vscode.EventEmitter<string>();
const notes: string[] = [];
export const studioEvents: StudioEvents = { onRendered: rendered.event, onError: failed.event, log: () => notes.join("\n") };

function note(ctx: StudioContext, text: string): void {
  notes.push(text);
  if (notes.length > 200) notes.shift();
  ctx.output.appendLine(text);
}

let panel: vscode.WebviewPanel | undefined;
let server: Server | undefined;

function startServer(ctx: StudioContext, args: string[], cwd: string): Promise<Server> {
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
      finish(new Error("Studio took too long to start."));
    }, START_TIMEOUT_MS);
    const finish = (error: Error | null, link?: StudioLink) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error || !link) reject(error ?? new Error("Studio did not start."));
      else resolve({ ...link, stop });
    };
    child.stdout.on("data", (d: string) => {
      stdout += d;
      const link = parseStudioUrl(stdout);
      if (link) finish(null, link);
    });
    child.stderr.on("data", (d: string) => {
      stderr += d;
      ctx.output.append(d);
    });
    child.on("error", (error) => finish(error));
    child.on("close", () => finish(new Error(errorMessage(stderr))));
  });
}

/** Forward one request of the panel to the Studio server, adding the token it never sees. */
async function forward(target: Server, message: { path: string; method: string; contentType?: string; body?: ArrayBuffer | null }) {
  const headers: Record<string, string> = { "x-studio-token": target.token };
  if (message.contentType) headers["content-type"] = message.contentType;
  const res = await fetch(`http://127.0.0.1:${target.port}${message.path}`, {
    method: message.method,
    headers,
    body: message.body ? new Uint8Array(message.body) : undefined,
  });
  const keep: Record<string, string> = {};
  for (const name of ["content-type", "x-render-ms"]) {
    const value = res.headers.get(name);
    if (value) keep[name] = value;
  }
  return { status: res.status, headers: keep, body: new Uint8Array(await res.arrayBuffer()) };
}

function close(): void {
  server?.stop();
  server = undefined;
}

export interface OpenStudioOptions {
  /** Markdown file to preview. */
  file?: vscode.Uri;
  /** Design this folder's .markdown-pdf.json instead of the user's settings. */
  project?: boolean;
}

export async function openStudio(ctx: StudioContext, options: OpenStudioOptions = {}): Promise<void> {
  const file = options.file?.scheme === "file" || options.file?.scheme === "vscode-remote" ? options.file : undefined;
  const folder = (file && vscode.workspace.getWorkspaceFolder(file)) ?? vscode.workspace.workspaceFolders?.[0];
  if (options.project && !folder) {
    void vscode.window.showWarningMessage("Open a folder first: a project design is saved in that folder.");
    return;
  }
  const cwd = folder?.uri.fsPath ?? (file ? path.dirname(file.fsPath) : ctx.extensionUri.fsPath);
  const args = studioArgs({ file: file?.fsPath, project: Boolean(options.project), restricted: !vscode.workspace.isTrusted });

  close();
  let started: Server;
  try {
    started = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: "Starting Studio…" },
      () => startServer(ctx, args, cwd),
    );
  } catch (error) {
    void vscode.window.showErrorMessage(`Studio could not start: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  server = started;

  const studioDir = vscode.Uri.joinPath(ctx.extensionUri, "node_modules", "markdown-pdf-export", "studio");
  const distDir = vscode.Uri.joinPath(ctx.extensionUri, "dist");
  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      "markdownPdfExport.studio",
      "Design PDF Pages",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [studioDir, distDir] },
    );
    panel.onDidDispose(() => {
      panel = undefined;
      close();
    });
    panel.webview.onDidReceiveMessage(async (message: { type?: string; id?: number; path?: unknown; method?: unknown; contentType?: string; body?: ArrayBuffer | null; pages?: number; message?: string }) => {
      if (message.type === "rendered") return rendered.fire(message.pages ?? 0);
      if (message.type === "ready") return note(ctx, "Studio panel loaded.");
      if (message.type === "panel-error") return note(ctx, `Studio panel: ${message.message}`);
      if (message.type === "render-error") {
        note(ctx, `Studio preview: ${message.message}`);
        return failed.fire(message.message ?? "");
      }
      if (message.type !== "request" || !panel) return;
      note(ctx, `Studio panel → ${String(message.method)} ${String(message.path)}`);
      const reply = (answer: object) => void panel?.webview.postMessage({ type: "response", id: message.id, ...answer });
      // The panel has no business with other editors' config files.
      if (message.path === "/api/editors" && message.method === "GET") {
        return reply({ status: 200, headers: { "content-type": "application/json" }, body: new TextEncoder().encode("[]") });
      }
      if (!server || !allowedStudioRequest(message.path, message.method)) {
        return reply({ status: 403, headers: { "content-type": "application/json" }, body: new TextEncoder().encode('{"error":"Not available in VS Code."}') });
      }
      try {
        reply(await forward(server, { path: message.path, method: message.method as string, contentType: message.contentType, body: message.body }));
      } catch (error) {
        reply({ error: error instanceof Error ? error.message : String(error) });
      }
    });
  } else {
    panel.reveal(vscode.ViewColumn.Beside);
  }

  panel.title = file ? `Design: ${path.basename(file.fsPath)}` : "Design PDF Pages";
  const index = fs.readFileSync(path.join(studioDir.fsPath, "index.html"), "utf8");
  // A new nonce each time also makes VS Code reload the page for the new server.
  panel.webview.html = studioPanelHtml(index, {
    studio: panel.webview.asWebviewUri(studioDir).toString(),
    host: panel.webview.asWebviewUri(vscode.Uri.joinPath(distDir, "studio-host.js")).toString(),
    app: panel.webview.asWebviewUri(vscode.Uri.joinPath(distDir, "studio-app.js")).toString(),
    worker: panel.webview.asWebviewUri(vscode.Uri.joinPath(distDir, "pdf.worker.min.js")).toString(),
    cspSource: panel.webview.cspSource,
    nonce: randomBytes(16).toString("hex"),
  });
}

export function disposeStudio(): void {
  panel?.dispose();
  close();
}
