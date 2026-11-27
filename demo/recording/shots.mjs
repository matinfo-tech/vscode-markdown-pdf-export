// The five shots of the demo folder's README, as functions.
//
// Each shot has two parts: prepare() puts VS Code in the starting state (not recorded) and
// play() is what the clip shows. Both get a `pointer`, so the same shot runs with the debug
// port's synthetic mouse (dry run) or with the real pointer (recording). An optional cleanUp()
// runs after a recording.
import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { closeSideBars, DEMO_DIR, openFile, runCommand, sleep, waitForPreview } from "./lib.mjs";

const run = promisify(execFile);

const TYPING_BLOCKS = [
  "## Decisions\n\n",
  "- Ship the **invoice** style in January\n- Price stays at **€ 12** per seat\n\n",
  "Growth target: $G = (1 + g)^4 - 1$\n\n",
  "```mermaid\nflowchart LR\n  Draft --> Review --> Ship\n```\n",
];

/** The text shot 1 types: the block in the demo README. */
export const TYPED_TEXT = TYPING_BLOCKS.join("");

const PREVIEW_COMMAND = "Markdown PDF: Open PDF Preview to the Side";

async function closeEverything(page) {
  await runCommand(page, "File: Revert File");
  await runCommand(page, "View: Close All Editors");
  await closeSideBars(page);
  await runCommand(page, "Notifications: Clear All Notifications");
  await sleep(400);
}

/** Opens `name` with its PDF preview, in preview-only mode, keyboard focus in the editor. */
async function openWithPreview(page, name) {
  await closeEverything(page);
  await openFile(page, name);
  await runCommand(page, PREVIEW_COMMAND);
  const frame = await waitForPreview(page);
  const hide = frame.getByRole("button", { name: "Hide design" });
  if (await hide.isVisible()) await hide.click();
  await page.keyboard.press("Meta+1");
  await sleep(1500);
  return frame;
}

/** Marks the pages now on screen, so the next drawing can be told apart from them. */
async function markPages(frame) {
  await frame.locator("#pdf-pages canvas").evaluateAll((pages) => {
    for (const page of pages) page.dataset.seen = "1";
  });
}

/** Waits for pages drawn after markPages(), then a moment more for the eye. */
async function waitForRedraw(frame, settleMs = 900, timeoutMs = 8000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((await frame.locator("#pdf-pages canvas:not([data-seen])").count()) > 0) break;
    await sleep(100);
  }
  await sleep(settleMs);
}

/** Scrolls the PDF smoothly from where it is to its end, over `durationMs`. */
async function scrollPdfToEnd(frame, durationMs) {
  await frame.locator("#pdf-pages").evaluate(
    (pages, { durationMs }) =>
      new Promise((resolve) => {
        let scroller = pages;
        while (scroller && scroller.scrollHeight <= scroller.clientHeight + 1) scroller = scroller.parentElement;
        scroller ??= document.scrollingElement;
        const from = scroller.scrollTop;
        const distance = scroller.scrollHeight - scroller.clientHeight - from;
        const start = performance.now();
        function step(now) {
          const progress = Math.min(1, (now - start) / durationMs);
          const eased = progress < 0.5 ? 2 * progress * progress : 1 - (-2 * progress + 2) ** 2 / 2;
          scroller.scrollTop = from + distance * eased;
          if (progress < 1) requestAnimationFrame(step);
          else resolve();
        }
        requestAnimationFrame(step);
      }),
    { durationMs },
  );
}

export const shots = {
  // 1. Live preview: open the preview, type, the PDF follows.
  1: {
    seconds: 20,
    async prepare(page) {
      await closeEverything(page);
      await openFile(page, "live-typing.md");
      await page.keyboard.press("Meta+ArrowDown");
      await sleep(500);
    },
    async play(page, pointer) {
      await sleep(600);
      await pointer.click(page.locator('.editor-group-container.active .title a[aria-label^="Open PDF Preview to the Side"]'));
      const frame = await waitForPreview(page);
      // Park the pointer in the empty lower part of the editor, away from the text being typed.
      await pointer.moveTo(page.locator(".editor-group-container.active .monaco-editor .overflow-guard").first(), { x: 60, y: 180 });
      await sleep(500);
      await page.keyboard.press("Meta+1");
      await page.keyboard.press("Meta+ArrowDown");
      for (const block of TYPING_BLOCKS) {
        for (const line of block.split(/(?<=\n)/)) {
          await page.keyboard.type(line.replace(/\n$/, ""), { delay: 36 });
          if (line.endsWith("\n")) await page.keyboard.press("Enter");
          await sleep(120);
        }
        await markPages(frame);
        await waitForRedraw(frame, 700, 5000);
      }
      await sleep(1200);
    },
  },

  // 2. Design pages: another page style, then the header's right spot, without saving.
  2: {
    seconds: 15,
    async prepare(page) {
      await openWithPreview(page, "quarterly-report.md");
    },
    async play(page, pointer) {
      const frame = await waitForPreview(page);
      await sleep(600);
      await pointer.click(frame.getByRole("button", { name: "Design pages" }));
      await sleep(1300);

      await markPages(frame);
      await pointer.click(frame.locator("button.look", { hasText: "Technical" }));
      await waitForRedraw(frame, 1000);

      await pointer.click(frame.locator("#band-header button.slot.right"));
      await sleep(900);
      // The spot already holds {client}. Select it so the next choice replaces it. Do not empty
      // it: an empty spot shows the header of the user's own settings file, with their own logo.
      await page.keyboard.press("Meta+A");
      await sleep(500);
      await markPages(frame);
      await pointer.click(frame.locator("button.chip", { hasText: "Page 1 of 9" }));
      await waitForRedraw(frame, 1200);

      await pointer.click(frame.getByRole("button", { name: "Hide design" }));
      await sleep(1800);
    },
  },

  // 3. Showcase scroll: cover, table, diagrams, maths, code.
  3: {
    seconds: 10,
    async prepare(page) {
      await openWithPreview(page, "quarterly-report.md");
    },
    async play(page, pointer) {
      const frame = await waitForPreview(page);
      await pointer.moveTo(frame.locator("#pdf-pages canvas").first());
      await sleep(800);
      await scrollPdfToEnd(frame, 8000);
      await sleep(900);
    },
  },

  // 4. Export: Cmd+K Cmd+E, the "PDF ready" notification, then Open PDF when recording.
  4: {
    seconds: 7,
    async prepare(page) {
      await openWithPreview(page, "quarterly-report.md");
    },
    async play(page, pointer, { openPdf }) {
      await sleep(700);
      await page.keyboard.press("Meta+K");
      await page.keyboard.press("Meta+E");
      const toast = page.locator(".notification-toast", { hasText: "PDF ready" });
      await toast.waitFor({ state: "visible", timeout: 30000 });
      await sleep(1000);
      if (openPdf) await pointer.click(toast.getByRole("button", { name: "Open PDF" }));
      await sleep(2500);
    },
    // Close only the exported PDF in Preview (other Preview windows stay), then delete it.
    async cleanUp() {
      const script = 'tell application "Preview" to close (every window whose name contains "quarterly-report")';
      await run("osascript", ["-e", script]).catch(() => {});
      await rm(path.join(DEMO_DIR, "quarterly-report.pdf"), { force: true });
    },
  },

  // 5. One document, its own design: landscape roadmap with its own footer.
  5: {
    seconds: 6,
    async prepare(page) {
      await closeEverything(page);
      await openFile(page, "roadmap.md");
      await sleep(500);
    },
    async play(page, pointer) {
      await sleep(700);
      await pointer.click(page.locator('.editor-group-container.active .title a[aria-label^="Open PDF Preview to the Side"]'));
      const frame = await waitForPreview(page);
      await sleep(600);
      await pointer.moveTo(frame.locator("#pdf-pages canvas").first());
      await sleep(3000);
    },
  },
};
