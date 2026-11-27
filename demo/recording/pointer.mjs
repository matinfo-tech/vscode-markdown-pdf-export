// Two ways to move and click: through the debug port (dry run) or with the real pointer.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sleep } from "./lib.mjs";

const run = promisify(execFile);

/**
 * Scrolls the element into view and returns its centre in window coordinates, moved by
 * `offset` (CSS pixels) to point beside the element instead of at it.
 */
async function centreOf(locator, offset = { x: 0, y: 0 }) {
  await locator.waitFor({ state: "visible", timeout: 15000 });
  await locator.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "smooth" }));
  await sleep(500);
  const box = await locator.boundingBox();
  if (!box) throw new Error("Nothing to point at: the element has no box.");
  return { x: box.x + box.width / 2 + offset.x, y: box.y + box.height / 2 + offset.y };
}

/** Synthetic mouse of the debug port. No pointer is drawn on screen. */
export function dryPointer(page) {
  return {
    async moveTo(locator, offset) {
      const point = await centreOf(locator, offset);
      await page.mouse.move(point.x, point.y, { steps: 20 });
      return point;
    },
    async click(locator) {
      const point = await this.moveTo(locator);
      await sleep(200);
      await page.mouse.click(point.x, point.y);
    },
  };
}

/**
 * The real macOS pointer, moved by `cliclick`. Needs Accessibility for the app that starts
 * this script (Terminal, iTerm, Zed...).
 *
 * Window coordinates become screen coordinates by adding the window's position. VS Code draws
 * its own title bar, so the page starts at the window's top left corner.
 */
export function realPointer(page) {
  return {
    async moveTo(locator, offset) {
      const point = await centreOf(locator, offset);
      const origin = await page.evaluate(() => ({ x: window.screenX, y: window.screenY }));
      const target = `${Math.round(origin.x + point.x)},${Math.round(origin.y + point.y)}`;
      await run("cliclick", ["-e", "500", `m:${target}`]);
      return target;
    },
    async click(locator) {
      const target = await this.moveTo(locator);
      await sleep(250);
      await run("cliclick", [`c:${target}`]);
    },
  };
}
