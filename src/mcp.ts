/**
 * The exporter's MCP server, offered to VS Code's agent mode (Copilot Chat): the assistant can
 * export a file, open Studio, check the setup. Fixed definition, nothing to ask the user:
 * VS Code only passes such servers on to its newer agent runtimes.
 */
import * as vscode from "vscode";
import { readOptions, toEnv } from "./config.ts";
import { cliPath } from "./engine.ts";
import { nodeRuntime } from "./runtime.ts";

export const MCP_PROVIDER_ID = "markdownPdfExport.mcp";

export interface McpLaunch {
  command: string;
  args: string[];
  env: Record<string, string>;
}

export function mcpLaunch(extensionPath: string): McpLaunch {
  const cfg = vscode.workspace.getConfiguration("markdownPdfExport");
  const runtime = nodeRuntime();
  return {
    command: runtime.command,
    args: [cliPath(extensionPath), "mcp"],
    env: { ...runtime.env, ...toEnv(readOptions((key, fallback) => cfg.get(key, fallback))) },
  };
}

export function registerMcp(context: vscode.ExtensionContext, exporterVersion: string): vscode.Disposable {
  // Older editors built on VS Code (and some forks) lack this API: the rest still works.
  if (typeof vscode.lm?.registerMcpServerDefinitionProvider !== "function") return { dispose() {} };
  const changed = new vscode.EventEmitter<void>();
  const provider = vscode.lm.registerMcpServerDefinitionProvider(MCP_PROVIDER_ID, {
    onDidChangeMcpServerDefinitions: changed.event,
    provideMcpServerDefinitions() {
      // An untrusted folder gets no tools that read its files.
      if (!vscode.workspace.isTrusted) return [];
      const launch = mcpLaunch(context.extensionPath);
      const server = new vscode.McpStdioServerDefinition("Markdown PDF Export", launch.command, launch.args, launch.env, exporterVersion);
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (folder) server.cwd = folder.uri;
      return [server];
    },
  });
  return vscode.Disposable.from(
    provider,
    changed,
    vscode.workspace.onDidGrantWorkspaceTrust(() => changed.fire()),
    vscode.workspace.onDidChangeConfiguration((e) => e.affectsConfiguration("markdownPdfExport") && changed.fire()),
  );
}
