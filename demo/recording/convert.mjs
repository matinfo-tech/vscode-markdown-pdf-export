// Raw clip to a small MP4 and a GIF in recordings/.  node convert.mjs <raw clip> <name>
// A GIF the extension's README shows is also copied to media/recordings/.
import { execFile } from "node:child_process";
import { copyFile, mkdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { README_GIFS_DIR, RECORDINGS_DIR as OUT_DIR, REPO_DIR, WORK_DIR } from "./lib.mjs";

const run = promisify(execFile);
// The demo README's GIF settings. Over 8 MB: lower width to 960 or fps to 10.
const GIF = { fps: 12, width: 1200, quality: 90 };

/** Copies `<name>.gif` to media/recordings/ when the extension's README shows it there. */
async function copyToReadme(name) {
  const readme = await readFile(path.join(REPO_DIR, "README.md"), "utf8");
  if (!readme.includes(`media/recordings/${name}.gif`)) return;
  await copyFile(`${OUT_DIR}/${name}.gif`, `${README_GIFS_DIR}/${name}.gif`);
  console.log(`${name}.gif: copied to media/recordings/ for the README`);
}

/**
 * Raw clip to a small MP4 and a GIF in `outDir`, with the demo README's GIF settings. Clips
 * written to the recordings folder also refresh the README's copy of the GIF.
 */
export async function convert(raw, name, outDir = OUT_DIR) {
  const mp4 = `${outDir}/${name}.mp4`;
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
  const frames = `${WORK_DIR}/${name}-frames`;
  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });
  await run("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", raw, "-vf", `fps=${GIF.fps},scale=${GIF.width}:-1:flags=lanczos`, `${frames}/%04d.png`]);
  await run("sh", ["-c", `gifski --fps ${GIF.fps} --width ${GIF.width} --quality ${GIF.quality} -o "${outDir}/${name}.gif" "${frames}"/*.png`]);
  await rm(frames, { recursive: true, force: true });
  for (const extension of ["mp4", "gif"]) {
    const { size } = await stat(`${outDir}/${name}.${extension}`);
    console.log(`${name}.${extension}: ${(size / 1e6).toFixed(2)} MB`);
  }
  if (outDir === OUT_DIR) await copyToReadme(name);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [raw, name] = process.argv.slice(2);
  if (!raw || !name) throw new Error("Usage: node convert.mjs <raw clip> <name>");
  await mkdir(OUT_DIR, { recursive: true });
  await convert(raw, name);
}
