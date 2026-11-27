# Recording the demo shots by script

These scripts record the five shots of the [shot list](../README.md#shot-list) without touching
the keyboard or mouse. They drive VS Code through its debug port, move the real pointer with
`cliclick`, and record the screen with `ffmpeg`. Each shot ends up as an MP4 and a GIF in
`../recordings/` (not committed). A GIF the extension's README shows
(`media/recordings/shot-N.gif`) is also copied there, so the README always shows the latest take.

## Once

1. Tools: `brew install ffmpeg gifski cliclick`, and Node 22 or later.
2. `npm install` in this folder.
3. The extension, installed in the throwaway profile's extensions folder
   (`/tmp/vsc-fresh-ext`; see `lib.mjs`):
   `code --extensions-dir /tmp/vsc-fresh-ext --install-extension matinfo-tech.markdown-pdf-export`
4. macOS permissions for the app you run the scripts from (Terminal, iTerm, Zed...), in
   **System Settings → Privacy & Security**:
   - **Screen Recording** (for `ffmpeg`). Restart that app after turning it on.
   - **Accessibility** (for `cliclick` and placing the window).

## Each time

```sh
node start-vscode.mjs     # demo folder in the throwaway profile, with the debug port
node record.mjs test      # 3 s of the window: check the crop and the speed
node record.mjs 1         # one shot; or several: node record.mjs 2 3; or: node record.mjs all
```

From the repo root, the same through npm (arguments after `--`):

```sh
npm run demo:install      # once: npm install in this folder
npm run demo:start
npm run demo:record -- 1  # or: -- 2 3, -- all, -- test
npm run demo:rehearse -- 2 --frames
```

While a shot records, keep your hands off the Mac and turn on Do Not Disturb: the pointer is
the real one, and anything that pops up over the window ends up in the clip. Close the VS Code
window at the end: an open debug port lets any program on the Mac control it.

To try a change without recording, rehearse a shot with the debug port's own mouse (no
permission needed):

```sh
node run.mjs 2 --frames   # screenshots in .work/ before, after, and after each click
node run.mjs 3 --burst    # a screenshot every 400 ms
node run.mjs 1 --save     # saves the typed file, to compare; then: git restore live-typing.md
```

## Files

| File | What it holds |
|---|---|
| `shots.mjs` | The five shots: what is clicked and typed, and the pauses. Change a shot here. |
| `record.mjs` | Places the window at 1280 × 800, records the screen, converts. |
| `convert.mjs` | Raw clip to MP4 and GIF (12 fps, 1200 px, quality 90), and the GIF copy to `media/recordings/`. Over 8 MB: lower the width or fps there. |
| `run.mjs` | Rehearsal without recording. |
| `pointer.mjs` | Moves and clicks: the debug port's mouse, or the real pointer. |
| `lib.mjs` | Folders, profile, port, and helpers to open files and run commands. |
| `start-vscode.mjs` | Opens VS Code with the settings the shots need. |

## Good to know

- **Never empty the header's top right spot in shot 2.** An empty spot falls back to your own
  settings file, and your own logo appears in the PDF. The script selects the text and lets
  **Page 1 of 9** replace it.
- **The shots run in the throwaway profile on purpose**: your own theme, extensions and name
  stay out of the clips. `start-vscode.mjs` turns off Git blame (it shows a real name) and
  Markdown auto-indent and auto-closing (shot 1 must type the text exactly).
- **Shot 4 opens the exported PDF in Preview.** Afterwards the script closes only that window
  and deletes `quarterly-report.pdf`.
- **Shot 1 leaves `live-typing.md` unsaved in the editor.** The next shot reverts it; the file on
  disk is never changed.
- A command title in `shots.mjs` that VS Code does not offer stops the script, instead of
  running a similar command by mistake.
