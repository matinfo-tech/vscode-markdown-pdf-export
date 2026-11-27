// Opens the demo folder in a throwaway VS Code profile, with the debug port the scripts drive.
//   node start-vscode.mjs
//
// The profile (PROFILE_DIR) is kept between runs. Its settings get the entries below, which
// the recordings need; other settings in it are left alone.
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { DEBUG_PORT, DEMO_DIR, EXTENSIONS_DIR, PROFILE_DIR, sleep } from "./lib.mjs";

const run = promisify(execFile);

const RECORDING_SETTINGS = {
  "workbench.colorTheme": "Visual Studio Dark",
  "workbench.startupEditor": "none",
  "chat.disableAIFeatures": true,
  // Git blame shows a real name in the status bar.
  "git.blame.statusBarItem.enabled": false,
  "git.blame.editorDecoration.enabled": false,
  // The demo folder sits inside the extension repo: keep its changes out of the Source Control badge.
  "git.openRepositoryInParentFolders": "never",
  // Shot 1 types Markdown: the text must land exactly as typed.
  "[markdown]": {
    "editor.autoIndent": "none",
    "editor.autoClosingBrackets": "never",
    "editor.autoClosingQuotes": "never",
    "editor.autoSurround": "never",
  },
};

async function debugPortAnswers() {
  try {
    const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

if (await debugPortAnswers()) {
  console.log(`Something already answers on port ${DEBUG_PORT}: nothing to start.`);
  process.exit(0);
}

const settingsFile = path.join(PROFILE_DIR, "User", "settings.json");
await mkdir(path.dirname(settingsFile), { recursive: true });
const current = await readFile(settingsFile, "utf8").catch(() => "{}");
let settings;
try {
  settings = JSON.parse(current);
} catch {
  throw new Error(`${settingsFile} is not plain JSON (comments?). Fix or delete it, then run again.`);
}
await writeFile(settingsFile, `${JSON.stringify({ ...settings, ...RECORDING_SETTINGS }, null, 4)}\n`);

await run("code", [
  "--user-data-dir", PROFILE_DIR,
  "--extensions-dir", EXTENSIONS_DIR,
  `--remote-debugging-port=${DEBUG_PORT}`,
  DEMO_DIR,
]);

for (let second = 0; second < 20; second++) {
  if (await debugPortAnswers()) {
    console.log(`VS Code is up, debug port ${DEBUG_PORT}. Close that window when you are done.`);
    process.exit(0);
  }
  await sleep(1000);
}
throw new Error(`VS Code did not open port ${DEBUG_PORT}. Is a window with this profile already open without it? Close it and run again.`);
