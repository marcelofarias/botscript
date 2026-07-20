/**
 * Tests for UNS006: `@ts-ignore` / `@ts-expect-error` suppression comment (?bs 0.5+).
 *
 * TypeScript pragma comments that suppress type errors on the following line
 * are forbidden in botscript source files. A model reaching for these is
 * suppressing an error rather than fixing it — defeating the safety net.
 *
 * Detection: comment tokens from the lexer that contain the pragma string.
 * Gated at ?bs 0.5 (when UNS004 bare-as enforcement was added).
 *
 * Suppression: none. Fix the underlying type error or use
 * `unsafe "<reason>" { ... }` as the explicit escape hatch.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// Basic firing cases
// ---------------------------------------------------------------------------

describe("UNS006: basic firing", () => {
  it("fires on // @ts-ignore in a fn body", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "fn cast(val: unknown) -> string {\n" +
      "  // @ts-ignore\n" +
      "  return val\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("fires on // @ts-expect-error in a fn body", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "fn getCount(arr: string[]) -> number {\n" +
      "  // @ts-expect-error\n" +
      "  return arr.count\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
    expect(() => compile(src)).toThrow(/@ts-expect-error/);
  });

  it("fires on // @ts-ignore with trailing text", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "fn foo() -> string {\n" +
      "  // @ts-ignore Property does not exist\n" +
      "  return null\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("fires on /* @ts-ignore */ block comment", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "fn bar() -> string {\n" +
      "  /* @ts-ignore */\n" +
      "  return null\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("fires on /* @ts-expect-error */ block comment", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "fn baz() -> string {\n" +
      "  /* @ts-expect-error some type mismatch */\n" +
      "  return null\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("fires on @ts-ignore at the top level (outside a fn)", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "// @ts-ignore\n" +
      "const x: string = 42\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Version gate — below 0.5 the check does not fire
// ---------------------------------------------------------------------------

describe("UNS006: version gate", () => {
  it("does not fire at ?bs 0.4 (below enforcement floor)", () => {
    const src =
      "?bs 0.4\n" +
      "\n" +
      "fn cast(val: unknown): string {\n" +
      "  // @ts-ignore\n" +
      "  return val as string\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow(/UNS006/);
  });

  it("does not fire at ?bs 0.3", () => {
    const src =
      "?bs 0.3\n" +
      "\n" +
      "// @ts-ignore\n" +
      "const x = 1\n";
    expect(() => compile(src)).not.toThrow(/UNS006/);
  });

  it("fires at ?bs 0.5", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "// @ts-ignore\n" +
      "const x: string = 42\n";
    expect(() => compile(src)).toThrow("UNS006");
  });

  it("fires at ?bs 0.9", () => {
    const src =
      "?bs 0.9\n" +
      "\n" +
      "// @ts-expect-error\n" +
      "const x: string = 42\n";
    expect(() => compile(src)).toThrow("UNS006");
  });
});

// ---------------------------------------------------------------------------
// Should NOT fire — clean code
// ---------------------------------------------------------------------------

describe("UNS006: should not fire", () => {
  it("does not fire on a regular comment", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "fn greet(name: string) -> string {\n" +
      "  // return the greeting\n" +
      "  return `Hello, ${name}`\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire on a comment mentioning ts-ignore as prose", () => {
    const src =
      "?bs 0.5\n" +
      "\n" +
      "fn explain() -> string {\n" +
      "  // do not use ts-ignore here\n" +
      "  return \"ok\"\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow(/UNS006/);
  });

  it("does not fire on an empty file at 0.5", () => {
    const src = "?bs 0.5\n\nfn main() -> void {}\n";
    expect(() => compile(src)).not.toThrow(/UNS006/);
  });
});
