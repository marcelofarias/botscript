/**
 * Tests for SYN074: inline array reduce()/reduceRight() bypass (?bs 0.7+).
 *
 * SYN074 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) appears
 * as any element of an inline array literal that is immediately reduced via `.reduce(callback)`
 * or `.reduceRight(callback)`, and the result is called.
 *
 * Examples: `[eval].reduce(fn => fn)(code)`, `[fetch].reduceRight(fn => fn)(url)`,
 *           `[x, eval].reduce((a, fn) => fn)(code)`.
 *
 * SYN069 closes `[N]` bracket access; SYN070 closes `.at(N)`; SYN071 closes `.pop()`/`.shift()`;
 * SYN073 closes `.find()`/`.findLast()`. `.reduce()`/`.reduceRight()` add two extraction paths:
 * (1) single-element with no initial value returns the element without calling the callback;
 * (2) pass-through callback extracts any element. SYN074 closes this remaining gap.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN074: inline array reduce()/reduceRight() bypass (?bs 0.7+)", () => {
  // ── fires cases: .reduce() ───────────────────────────────────────────────

  it("fires on [eval].reduce(fn => fn)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].reduce(fn => fn)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  it("fires on [fetch].reduce(fn => fn)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch].reduce(fn => fn)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  it("fires on [Function].reduce(fn => fn)(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return [Function].reduce(fn => fn)(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  it("fires on [x, eval].reduce((a, fn) => fn)(code) — guarded global at any position", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [something, eval].reduce((a, fn) => fn)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  it("fires on [WebSocket].reduce(fn => fn)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return [WebSocket].reduce(fn => fn)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  // ── fires cases: .reduceRight() ──────────────────────────────────────────

  it("fires on [eval].reduceRight(fn => fn)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].reduceRight(fn => fn)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  it("fires on [fetch].reduceRight(fn => fn)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch].reduceRight(fn => fn)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  it("fires on paren-wrapped ([eval]).reduce(fn => fn)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ([eval]).reduce(fn => fn)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(true);
  });

  // ── no-fire cases ────────────────────────────────────────────────────────

  it("does NOT fire when no call follows — [eval].reduce(fn => fn) as expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const x = [eval].reduce(fn => fn)\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(false);
  });

  it("does NOT fire when suppressed by unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "intentional bypass for sandboxed eval" { [eval].reduce(fn => fn)(code) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(false);
  });

  it("does NOT fire on non-guarded globals — [JSON].reduce(fn => fn).stringify", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> string {\n" +
      "  return [JSON].reduce(fn => fn).stringify(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].reduce(fn => fn)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(false);
  });

  it("does NOT fire when reduce() has no arguments — [eval].reduce()(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].reduce()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN074")).toBe(false);
  });

  // ── message content ──────────────────────────────────────────────────────

  it("message names the guarded global and method for .reduce()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].reduce(fn => fn)(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN074");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("reduce");
  });

  it("message names the guarded global and method for .reduceRight()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].reduceRight(fn => fn)(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN074");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("reduceRight");
  });

  // ── SYN069/SYN070/SYN071/SYN073 not fired (different pattern) ───────────

  it("does NOT fire SYN069/SYN070/SYN071/SYN073 when the pattern is .reduce() form (SYN074 fires)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].reduce(fn => fn)(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN069")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN070")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN071")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN073")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN074")).toBe(true);
  });
});
