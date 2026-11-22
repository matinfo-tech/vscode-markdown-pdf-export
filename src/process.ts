import { spawn } from "node:child_process";
import { nodeRuntime } from "./runtime.ts";

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  cancelled: boolean;
  timedOut: boolean;
}

export interface RunOptions {
  cwd: string;
  /** Extra environment (settings file, browser...). */
  env?: Record<string, string>;
  onStderr?: (chunk: string) => void;
  /** Aborting kills the process tree. */
  signal?: AbortSignal;
  timeoutMs?: number;
}

/** Stop a child and the browser it started: SIGTERM, then SIGKILL after 3 s; taskkill on Windows. */
export function killTree(pid: number | undefined): void {
  if (!pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" }).on("error", () => {});
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    return;
  }
  setTimeout(() => {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }, 3000).unref();
}

/** Run `cli.mjs <args>` as a child process (never in-process: the exporter keeps global state). */
export function runCli(cli: string, args: string[], options: RunOptions): Promise<RunResult> {
  const runtime = nodeRuntime();
  return new Promise((resolve) => {
    const child = spawn(runtime.command, [cli, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...runtime.env, ...options.env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let cancelled = false;
    let timedOut = false;
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => {
      stderr += d;
      options.onStderr?.(d);
    });
    const stop = () => killTree(child.pid);
    const onAbort = () => {
      cancelled = true;
      stop();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          stop();
        }, options.timeoutMs)
      : undefined;
    const done = (code: number | null) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      resolve({ code, stdout, stderr, cancelled, timedOut });
    };
    child.on("error", (error) => {
      stderr += `${error.message}\n`;
      done(null);
    });
    child.on("close", done);
  });
}
