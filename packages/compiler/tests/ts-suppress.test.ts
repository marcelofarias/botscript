/**
 * Tests for UNS006: `// @ts-ignore` / `// @ts-expect-error` suppression comments (?bs 0.5+).
 *
 * Fires when either TypeScript suppression pragma appears in a comment token
 * (line or block comment). The check is exact — the pragma must be inside a
 * comment, not a string literal.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// Basic firing cases
// ---------------------------------------------------------------------------

describe("UNS006: fires on // @ts-ignore", () => {
  it("fires on line comment with @ts-ignore", () => {
    const src =
      "?bs 0.5\n" +
      "// @ts-ignore\n" +
      "const x = foo as string;\n";
    expect(() => compile(src)).toThrow("UNS006");
    expect(() => compile(src)).toThrow(/@ts-ignore/);
  });

  it("fires on // @ts-ignore with trailing text", () => {
    const src =
      "?bs 0.5\n" +
      "// @ts-ignore some reason here\n" +
      "const x = foo();\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

describe("UNS006: fires on // @ts-expect-error", () => {
  it("fires on line comment with @ts-expect-error", () => {
    const src =
      "?bs 0.5\n" +
      "// @ts-expect-error\n" +
      "const y = bar as number;\n";
    expect(() => compile(src)).toThrow("UNS006");
    expect(() => compile(src)).toThrow(/@ts-expect-error/);
  });

  it("fires on @ts-expect-error inside a fn body", () => {
    const src =
      "?bs 0.5\n" +
      "fn run(x: string) -> string {\n" +
      "  // @ts-expect-error\n" +
      "  x\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

describe("UNS006: fires on block comment form", () => {
  it("fires on /* @ts-ignore */ block comment", () => {
    const src = "?bs 0.5\n/* @ts-ignore */\nconst z = baz;\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("fires on /* @ts-expect-error */ block comment", () => {
    const src = "?bs 0.5\n/* @ts-expect-error */\nconst w = qux;\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Does NOT fire
// ---------------------------------------------------------------------------

describe("UNS006: does not fire on normal content", () => {
  it("does not fire on regular line comments", () => {
    const src =
      "?bs 0.5\n" +
      "// this is a regular comment\n" +
      "fn greet(name: string) -> string { name }\n";
    expect(() => compile(src)).not.toThrow("UNS006");
  });

  it("does not fire when pragma text is inside a string literal", () => {
    const src =
      "?bs 0.5\n" +
      'const msg = "use // @ts-ignore only as a last resort";\n';
    expect(() => compile(src)).not.toThrow("UNS006");
  });

  it("does not fire on files with no suppression comments", () => {
    const src =
      "?bs 0.5\n" +
      "fn add(a: number, b: number) -> number { a + b }\n";
    expect(() => compile(src)).not.toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Version gate
// ---------------------------------------------------------------------------

describe("UNS006: version gate", () => {
  it("does not fire below ?bs 0.5", () => {
    const src =
      "?bs 0.4\n" +
      "// @ts-ignore\n" +
      "const x = foo;\n";
    expect(() => compile(src)).not.toThrow("UNS006");
  });

  it("fires at exactly ?bs 0.5", () => {
    const src =
      "?bs 0.5\n" +
      "// @ts-ignore\n" +
      "const x = foo;\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("fires at ?bs 0.9", () => {
    const src =
      "?bs 0.9\n" +
      "// @ts-expect-error\n" +
      "const x = foo;\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Multiple occurrences
// ---------------------------------------------------------------------------

describe("UNS006: multiple occurrences", () => {
  it("reports the first suppression pragma in a file with multiple", () => {
    const src =
      "?bs 0.5\n" +
      "// @ts-ignore\n" +
      "const a = foo;\n" +
      "// @ts-expect-error\n" +
      "const b = bar;\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});
