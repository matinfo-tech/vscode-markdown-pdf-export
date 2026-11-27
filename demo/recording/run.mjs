// Rehearses one shot without recording.  node run.mjs <1-5> [flags]
//   (no flag)  dry run: synthetic mouse, no permission needed
//   --real     real pointer through cliclick (needs Accessibility)
//   --frames   save a screenshot of the window before and after play(), for checking
//   --burst    save a screenshot every 400 ms while the shot plays
//   --save     save the active file after play() (then compare, then `git restore`)
import { mkdir } from "node:fs/promises";
import { connect, sleep, WORK_DIR as OUT_DIR } from "./lib.mjs";
import { dryPointer, realPointer } from "./pointer.mjs";
import { shots } from "./shots.mjs";

const [number, ...flags] = process.argv.slice(2);
const shot = shots[number];
if (!shot) throw new Error(`Unknown shot "${number}". Use 1 to 5.`);
const real = flags.includes("--real");

await mkdir(OUT_DIR, { recursive: true });
const { browser, page } = await connect();
const pointer = real ? realPointer(page) : dryPointer(page);

// With --frames, also keep a picture of the window 1.5 s after every click.
const pending = [];
if (flags.includes("--frames")) {
  const click = pointer.click.bind(pointer);
  let step = 0;
  pointer.click = async (locator) => {
    await click(locator);
    const path = `${OUT_DIR}/shot-${number}-step-${++step}.png`;
    pending.push(sleep(1500).then(() => page.screenshot({ path })).catch(() => {}));
  };
}

await shot.prepare(page);
if (flags.includes("--frames")) await page.screenshot({ path: `${OUT_DIR}/shot-${number}-before.png` });

// With --burst, keep a picture of the window every 400 ms while the shot plays.
let bursting = flags.includes("--burst");
const burst = (async () => {
  for (let index = 1; bursting; index++) {
    await page.screenshot({ path: `${OUT_DIR}/shot-${number}-burst-${String(index).padStart(2, "0")}.png` }).catch(() => {});
    await sleep(400);
  }
})();

const started = Date.now();
await shot.play(page, pointer, { openPdf: real });
bursting = false;
await burst;
console.log(`shot ${number}: play took ${((Date.now() - started) / 1000).toFixed(1)} s (target about ${shot.seconds} s)`);

if (flags.includes("--frames")) await page.screenshot({ path: `${OUT_DIR}/shot-${number}-after.png` });
// --save writes the active file to disk, to compare what was typed with what was meant.
if (flags.includes("--save")) {
  await page.keyboard.press("Meta+1");
  await page.keyboard.press("Meta+S");
  await sleep(800);
}
await Promise.all(pending);
await browser.close();
