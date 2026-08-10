/**
 * Tests for SYN071: inline array pop()/shift() bypass (?bs 0.7+).
 *
 * SYN071 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) appears
 * as the last element of an inline array literal that is immediately mutated via `.pop()`
 * and called, or as the first element mutated via `.shift()` and called.
 *
 * Examples: `[eval].pop()(code)`, `[eval].shift()(code)`, `[x, fetch].pop()(url)`,
 *           `[fetch, x].shift()(url)`.
 *
 * SYN069 closes `[N]` bracket access; SYN070 closes `.at(N)`; `.pop()` and `.shift()` are
 * zero-argument mutation methods that bypass both. SYN071 closes this remaining gap.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN071: inline array pop()/shift() bypass (?bs 0.7+)", () => {
  // ── fires cases: .pop() ──────────────────────────────────────────────────

  it("fires on [eval].pop()(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].pop()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  it("fires on [fetch].pop()(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch].pop()(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  it("fires on [Function].pop()(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return [Function].pop()(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  it("fires on [x, eval].pop()(code) — guarded global at last position", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [something, eval].pop()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  it("fires on [WebSocket].pop()(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return [WebSocket].pop()(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  // ── fires cases: .shift() ────────────────────────────────────────────────

  it("fires on [eval].shift()(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].shift()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  it("fires on [fetch].shift()(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch].shift()(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  it("fires on [fetch, x].shift()(url) — guarded global at first position", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch, something].shift()(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  it("fires on paren-wrapped ([eval]).pop()(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ([eval]).pop()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(true);
  });

  // ── no-fire cases ────────────────────────────────────────────────────────

  it("does NOT fire when guarded global is NOT last element for .pop() — [eval, x].pop()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval, something].pop()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(false);
  });

  it("does NOT fire when guarded global is NOT first element for .shift() — [x, eval].shift()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [something, eval].shift()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(false);
  });

  it("does NOT fire when no call follows — [eval].pop() as expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const x = [eval].pop()\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(false);
  });

  it("does NOT fire when suppressed by unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "intentional bypass for sandboxed eval" { [eval].pop()(code) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(false);
  });

  it("does NOT fire on non-guarded globals — [JSON].pop().stringify(x)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> string {\n" +
      "  return [JSON].pop().stringify(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].pop()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(false);
  });

  it("does NOT fire when pop() has arguments — [eval].pop(1)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].pop(1)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN071")).toBe(false);
  });

  // ── message content ──────────────────────────────────────────────────────

  it("message names the guarded global and method for .pop()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].pop()(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN071");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("pop");
    expect(w!.message).toContain("last");
  });

  it("message names the guarded global and method for .shift()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].shift()(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN071");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("shift");
    expect(w!.message).toContain("first");
  });

  // ── SYN069/SYN070 not fired (different pattern) ──────────────────────────

  it("does NOT fire SYN069 or SYN070 when the pattern is .pop() form (SYN071 fires)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].pop()(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN069")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN070")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN071")).toBe(true);
  });
});
