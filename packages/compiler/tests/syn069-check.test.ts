/**
 * Tests for SYN069: inline array-element bracket-access bypass (?bs 0.7+).
 *
 * SYN069 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) appears
 * at index N in an inline array literal that is immediately bracket-accessed with the
 * numeric literal N and called in a fn body.
 *
 * Example: `[eval][0](code)`, `[x, fetch][1](url)`.
 *
 * Per-ident SYN checks (SYN004, SYN007, …) fire on the guarded ident in call position
 * (followed by `(` or `?.(`). Inside `[eval]`, the guarded ident is followed by `]` —
 * no call-position match. Alias-binding checks (SYN044–SYN068) track binding
 * declarations; this pattern involves no binding declaration.
 *
 * SYN069 closes the gap by correlating the guarded global's position in the inline
 * array with the numeric index used in the bracket-access call.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN069: inline array-element bracket-access bypass (?bs 0.7+)", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on [eval][0](code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval][0](code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(true);
  });

  it("fires on [fetch][0](url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch][0](url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(true);
  });

  it("fires on [Function][0](body)", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return [Function][0](body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(true);
  });

  it("fires on [x, fetch][1](url) — guarded global at index 1", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [something, fetch][1](url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(true);
  });

  it("fires on [a, b, eval][2](code) — guarded global at index 2", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [a, b, eval][2](code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(true);
  });

  it("fires on [WebSocket][0](url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return [WebSocket][0](url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(true);
  });

  it("fires on paren-wrapped ([eval])[0](code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ([eval])[0](code)\n" +
      "}\n";
    // The outer parens don't change the semantics — eval is still at [0].
    // SYN069 fires on the eval token inside the array.
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(true);
  });

  // ── no-fire cases ────────────────────────────────────────────────────────

  it("does NOT fire when index mismatches — [eval][1]", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval][1](code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(false);
  });

  it("does NOT fire when index mismatches — [x, fetch][0]", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [something, fetch][0](url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(false);
  });

  it("does NOT fire when index is not a numeric literal — [eval][n]", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string, n: number) -> any {\n" +
      "  return [eval][n](code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(false);
  });

  it("does NOT fire when no call follows — [eval][0] as expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const x = [eval][0]\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(false);
  });

  it("does NOT fire when suppressed by unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "intentional bypass for sandboxed eval" { [eval][0](code) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(false);
  });

  it("does NOT fire on non-guarded globals in array — [JSON][0].stringify(x)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> string {\n" +
      "  return [JSON][0].stringify(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval][0](code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN069")).toBe(false);
  });

  // ── message content ──────────────────────────────────────────────────────

  it("message names the guarded global and index", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval][0](code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN069");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("0");
  });
});
