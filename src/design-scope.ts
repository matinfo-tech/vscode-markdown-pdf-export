/**
 * Which settings file the design panel edits for a document: the one that applies to its PDF.
 * Pure (no `vscode` import), testable with node --test.
 */
import fs from "node:fs";
import path from "node:path";

export const PROJECT_SETTINGS_FILENAME = ".markdown-pdf.json";

/**
 * The folder of the nearest `.markdown-pdf.json`, walking up from the folder of `file`: the same
 * search as the exporter's, so it names the file that shapes this document's PDF.
 */
export function projectDesignDir(file: string): string | undefined {
  let dir = path.dirname(path.resolve(file));
  for (;;) {
    try {
      if (fs.statSync(path.join(dir, PROJECT_SETTINGS_FILENAME)).isFile()) return dir;
    } catch {
      // not here: keep walking
    }
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export interface DesignScope {
  /** Studio edits a folder's `.markdown-pdf.json`; otherwise the user's settings file. */
  project: boolean;
  /** That folder, when `project`. */
  dir?: string;
}

/**
 * What the panel edits for a document.
 * - Asked for a folder design: the nearest one inside `workspaceDir` if there is one, else a new one
 *   in `workspaceDir` (a design above the workspace, in the home folder for instance, is not "this
 *   folder's").
 * - Otherwise: a folder design that applies to the document wins over the user's settings in its
 *   PDF, so that is the one to edit; without one, the user's settings. In Restricted Mode folder
 *   files do not apply, so it is always the user's settings.
 */
export function designScope(opts: { file?: string; askedForProject: boolean; workspaceDir?: string; trusted: boolean }): DesignScope {
  const nearest = opts.file ? projectDesignDir(opts.file) : undefined;
  if (opts.askedForProject) {
    const inside = nearest && opts.workspaceDir && isInside(nearest, opts.workspaceDir) ? nearest : undefined;
    const dir = inside ?? opts.workspaceDir ?? nearest;
    return dir ? { project: true, dir } : { project: false };
  }
  if (opts.trusted && nearest) return { project: true, dir: nearest };
  return { project: false };
}

/** `dir` is `root` or a folder below it. */
function isInside(dir: string, root: string): boolean {
  const rel = path.relative(path.resolve(root), path.resolve(dir));
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
