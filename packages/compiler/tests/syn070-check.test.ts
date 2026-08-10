/**
 * Tests for SYN070: inline array-element .at(N) bypass (?bs 0.7+).
 *
 * SYN070 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) appears
 * at index N in an inline array literal that is immediately accessed via `.at(N)` and
 * called in a fn body.
 *
 * Example: `[eval].at(0)(code)`, `[x, fetch].at(1)(url)`.
 *
 * SYN069 closes the bracket-notation gap (`[eval][0](...)`). `Array.prototype.at()` is
 * the modern equivalent and bypasses SYN069: the token sequence after `]` is `.at(N)(`
 * rather than `[N](`. SYN070 closes this remaining gap.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN070: inline array-element .at(N) bypass (?bs 0.7+)", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on [eval].at(0)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].at(0)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(true);
  });

  it("fires on [fetch].at(0)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch].at(0)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(true);
  });

  it("fires on [Function].at(0)(body)", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return [Function].at(0)(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(true);
  });

  it("fires on [x, fetch].at(1)(url) — guarded global at index 1", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [something, fetch].at(1)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(true);
  });

  it("fires on [a, b, eval].at(2)(code) — guarded global at index 2", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [a, b, eval].at(2)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(true);
  });

  it("fires on [WebSocket].at(0)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return [WebSocket].at(0)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(true);
  });

  it("fires on paren-wrapped ([eval]).at(0)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ([eval]).at(0)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(true);
  });

  // ── no-fire cases ────────────────────────────────────────────────────────

  it("does NOT fire when index mismatches — [eval].at(1)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].at(1)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  it("does NOT fire when index mismatches — [x, fetch].at(0)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [something, fetch].at(0)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  it("does NOT fire when index is not a numeric literal — [eval].at(n)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string, n: number) -> any {\n" +
      "  return [eval].at(n)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  it("does NOT fire on negative index — [eval].at(-1)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].at(-1)(code)\n" +
      "}\n";
    // Negative indices are not tracked (would require knowing array length).
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  it("does NOT fire when no call follows — [eval].at(0) as expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const x = [eval].at(0)\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  it("does NOT fire when suppressed by unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "intentional bypass for sandboxed eval" { [eval].at(0)(code) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  it("does NOT fire on non-guarded globals — [JSON].at(0).stringify(x)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> string {\n" +
      "  return [JSON].at(0).stringify(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].at(0)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN070")).toBe(false);
  });

  // ── message content ──────────────────────────────────────────────────────

  it("message names the guarded global and index", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].at(0)(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN070");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("0");
  });

  // ── SYN069 not fired (different pattern) ────────────────────────────────

  it("does NOT fire SYN069 when the pattern is .at() form (SYN070 fires instead)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].at(0)(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN069")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN070")).toBe(true);
  });
});
