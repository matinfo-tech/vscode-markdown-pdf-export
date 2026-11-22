import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findProblems, parseReportHeader, toReport } from "../../src/problems.ts";

describe("parseReportHeader", () => {
  it("reads the header Studio sends", () => {
    const header = encodeURIComponent(JSON.stringify({ removed_html: ["<script>"], diagram_errors: ["Diagram 1: é"] }));
    assert.deepEqual(parseReportHeader(header), { removed_html: ["<script>"], diagram_errors: ["Diagram 1: é"] });
  });

  it("gives null when the header is missing or broken, and drops what is not text", () => {
    assert.equal(parseReportHeader(null), null);
    assert.equal(parseReportHeader("%E0%A4%A"), null);
    assert.equal(parseReportHeader("not json"), null);
    assert.deepEqual(toReport({ removed_html: ["a", 5, null], diagram_errors: "x" }), { removed_html: ["a"], diagram_errors: [] });
  });
});

describe("findProblems", () => {
  const text = [
    "# Title", // 0
    "", // 1
    'Some <SCRIPT src="x.js"></script> here and <script>again</script>.', // 2
    "```html", // 3
    "<script>in code</script>", // 4
    "```", // 5
    '<a href="javascript:alert(1)" onclick="x()">link</a>', // 6
    "```mermaid", // 7
    "graph TD; A-->B", // 8
    "```", // 9
    "~~~mermaid", // 10
    "not a diagram", // 11
    "~~~", // 12
  ].join("\n");

  it("points at each piece of raw HTML that was left out, but not inside code blocks", () => {
    const problems = findProblems(text, { removed_html: ["<script>", "onclick", "javascript: URL"], diagram_errors: [] });
    assert.deepEqual(
      problems.map((p) => [p.line, text.split("\n")[p.line]!.slice(p.start, p.end)]),
      [
        [2, '<SCRIPT src="x.js">'],
        [2, "<script>"],
        [6, "javascript:"],
        [6, "onclick="],
      ],
    );
    assert.match(problems[0]!.message, /^<script> is left out of the PDF/);
  });

  it("points at the diagram that could not be drawn", () => {
    const problems = findProblems(text, { removed_html: [], diagram_errors: ["Diagram 2: Parse error on line 1"] });
    assert.deepEqual(problems, [
      { line: 10, start: 0, end: 10, message: "This diagram is printed as code in the PDF: Parse error on line 1" },
    ]);
  });

  it("reports on the first line what it cannot find", () => {
    const problems = findProblems("# Title\ntext", { removed_html: ["<iframe>", "?"], diagram_errors: ["Diagram 9: x", "odd"] });
    assert.deepEqual(problems.map((p) => [p.line, p.start, p.end]), [[0, 0, 7], [0, 0, 7], [0, 0, 7], [0, 0, 7]]);
    assert.match(problems[3]!.message, /odd$/);
  });

  it("handles Windows line endings and an empty text", () => {
    assert.deepEqual(findProblems("a\r\n<script>\r\n", { removed_html: ["<script>"], diagram_errors: [] })[0], {
      line: 1,
      start: 0,
      end: 8,
      message: "<script> is left out of the PDF: raw HTML is made safe.",
    });
    assert.equal(findProblems("", { removed_html: ["<b>"], diagram_errors: [] })[0]!.end, 0);
  });
});
