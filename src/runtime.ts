/**
 * How to run `cli.mjs` without a Node install: VS Code's own binary as Node.
 * In the extension host `process.execPath` is Electron (needs ELECTRON_RUN_AS_NODE=1)
 * on desktop and a plain `node` on a remote host (the variable is then harmless).
 */
export interface NodeRuntime {
  command: string;
  env: Record<string, string>;
}

export function nodeRuntime(execPath: string = process.execPath): NodeRuntime {
  return { command: execPath, env: { ELECTRON_RUN_AS_NODE: "1" } };
}
