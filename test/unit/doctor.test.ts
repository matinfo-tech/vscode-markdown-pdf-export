import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDoctor, summarize, userSettingsFile, type DoctorReport } from "../../src/doctor.ts";

const base: DoctorReport = {
  version: "2.6.0",
  browser: { available: true, version: "150.0", launch_options: { channel: "chrome" } },
  settings_sources: [{ kind: "user", path: "/home/u/.config/markdown-pdf-export/settings.json", loaded: true, error: null }],
};

describe("parseDoctor", () => {
  it("reads a report and refuses anything else", () => {
    assert.equal(parseDoctor(JSON.stringify(base))?.version, "2.6.0");
    assert.equal(parseDoctor("not json"), null);
    assert.equal(parseDoctor('{"version":1}'), null);
    assert.equal(parseDoctor(""), null);
  });
});

describe("userSettingsFile", () => {
  it("is the user's file, never a project file", () => {
    const report = {
      ...base,
      settings_sources: [{ kind: "project", path: "/p/.markdown-pdf.json", loaded: true, error: null }, ...base.settings_sources],
    };
    assert.equal(userSettingsFile(report)?.kind, "user");
    assert.equal(userSettingsFile({ ...base, settings_sources: [] }), null);
  });
});

describe("summarize", () => {
  it("says ready when a browser starts and the settings load", () => {
    const s = summarize(base);
    assert.equal(s.ok, true);
    assert.equal(s.headline, "Ready to export.");
    assert.ok(s.lines.some((l) => l.includes("chrome 150.0")));
  });

  it("is still fine with no settings file yet", () => {
    const s = summarize({ ...base, settings_sources: [{ kind: "user", path: "/s.json", loaded: false, error: null }] });
    assert.equal(s.ok, true);
    assert.ok(s.lines.some((l) => l.includes("none yet")));
  });

  it("puts the missing browser first", () => {
    const s = summarize({ ...base, browser: { available: false, error: "No usable browser" } });
    assert.equal(s.ok, false);
    assert.match(s.headline, /No browser/);
  });

  it("names a settings file that has a mistake", () => {
    const s = summarize({
      ...base,
      settings_sources: [{ kind: "project", path: "/p/.markdown-pdf.json", loaded: false, error: "Unexpected token" }],
    });
    assert.equal(s.ok, false);
    assert.match(s.headline, /\/p\/\.markdown-pdf\.json/);
  });
});
