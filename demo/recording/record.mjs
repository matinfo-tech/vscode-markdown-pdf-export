// Records shots as real screen recordings.  node record.mjs <1-5 ...|all|test>
//
// For each shot: places the VS Code window at 1280 x 800, prepares the shot, starts ffmpeg on
// the screen (cropped to the window, real pointer included), plays the shot with the real
// pointer, stops ffmpeg, writes recordings/shot-N.mp4 and shot-N.gif, then cleans up.
// "test" records 3 seconds of the window, to check the crop and the speed.
import { execFile, spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { promisify } from "node:util";
import { convert } from "./convert.mjs";
import { connect, sleep, PROFILE_DIR, RECORDINGS_DIR, WORK_DIR } from "./lib.mjs";
import { realPointer } from "./pointer.mjs";
import { shots } from "./shots.mjs";

const run = promisify(execFile);
const WINDOW = { left: 120, top: 90, width: 1280, height: 800 };

/** Moves and sizes the demo VS Code window. Needs Accessibility. */
async function placeWindow() {
  const { stdout } = await run("pgrep", ["-f", `MacOS/Code .*--user-data-dir ${PROFILE_DIR}`]);
  const pid = stdout.trim().split("\n")[0];
  const script = `tell application "System Events" to tell (first process whose unix id is ${pid})
    set frontmost to true
    set position of window 1 to {${WINDOW.left}, ${WINDOW.top}}
    set size of window 1 to {${WINDOW.width}, ${WINDOW.height}}
  end tell`;
  await run("osascript", ["-e", script]);
  await sleep(800);
}

/** The ffmpeg avfoundation index of the main screen: it moves when cameras come and go. */
async function screenDevice() {
  const listing = await run("ffmpeg", ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""]).catch((error) => error);
  const match = /\[(\d+)\] Capture screen 0/.exec(listing.stderr ?? "");
  if (!match) throw new Error("ffmpeg lists no screen to capture.");
  return match[1];
}

/** Starts ffmpeg on the window's rectangle; resolves once frames are being written. */
async function startRecording(page, file) {
  const box = await page.evaluate(() => ({
    x: window.screenX,
    y: window.screenY,
    width: window.outerWidth,
    height: window.outerHeight,
    scale: window.devicePixelRatio,
  }));
  const crop = [box.width, box.height, box.x, box.y].map((value) => Math.round(value * box.scale)).join(":");
  const ffmpeg = spawn(
    "ffmpeg",
    ["-hide_banner", "-y", "-f", "avfoundation", "-capture_cursor", "1", "-framerate", "30", "-i", `${await screenDevice()}:none`,
      "-vf", `crop=${crop}`, "-c:v", "libx264", "-preset", "ultrafast", "-crf", "12", "-pix_fmt", "yuv420p", file],
    { stdio: ["pipe", "ignore", "pipe"] },
  );
  let log = "";
  await new Promise((resolve, reject) => {
    ffmpeg.stderr.on("data", (chunk) => {
      log += chunk;
      if (/frame=\s*\d+/.test(log)) resolve();
    });
    ffmpeg.on("exit", (code) => reject(new Error(`ffmpeg stopped early (${code}):\n${log.slice(-800)}`)));
  });
  return {
    async stop() {
      const done = new Promise((resolve) => ffmpeg.once("exit", resolve));
      ffmpeg.stdin.write("q");
      await done;
    },
  };
}

let numbers = process.argv.slice(2);
if (numbers.length === 0) throw new Error('Usage: node record.mjs <1-5 ...|all|test>');
if (numbers.includes("all")) numbers = Object.keys(shots);
for (const number of numbers) {
  if (!shots[number] && number !== "test") throw new Error(`Unknown shot "${number}". Use 1 to 5, all, or test.`);
}

await mkdir(WORK_DIR, { recursive: true });
await mkdir(RECORDINGS_DIR, { recursive: true });
const { browser, page } = await connect();

for (const number of numbers) {
  const shot = shots[number];
  const name = number === "test" ? "test" : `shot-${number}`;
  const raw = `${WORK_DIR}/${name}-raw.mp4`;

  await placeWindow();
  if (shot) await shot.prepare(page);

  const recording = await startRecording(page, raw);
  const started = Date.now();
  if (shot) await shot.play(page, realPointer(page), { openPdf: true });
  else await sleep(3000);
  await recording.stop();
  console.log(`${name}: recorded ${((Date.now() - started) / 1000).toFixed(1)} s`);

  // The test clip stays in .work/: only real shots go to recordings/.
  await convert(raw, name, shot ? undefined : WORK_DIR);
  if (shot?.cleanUp) await shot.cleanUp(page);
}
await browser.close();
