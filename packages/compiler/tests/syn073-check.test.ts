/**
 * Tests for SYN073: inline array find()/findLast() bypass (?bs 0.7+).
 *
 * SYN073 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) appears
 * as any element of an inline array literal that is immediately searched via `.find(callback)`
 * or `.findLast(callback)`, and the result is called.
 *
 * Examples: `[eval].find(Boolean)(code)`, `[fetch].find(x => x)(url)`,
 *           `[eval].findLast(Boolean)(code)`, `[x, eval].find(Boolean)(code)`.
 *
 * SYN069 closes `[N]` bracket access; SYN070 closes `.at(N)`; SYN071 closes `.pop()`/`.shift()`.
 * `.find()`/`.findLast()` are higher-order methods where a truthiness predicate trivially
 * returns the dangerous global. SYN073 closes this remaining gap.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN073: inline array find()/findLast() bypass (?bs 0.7+)", () => {
  // ── fires cases: .find() ─────────────────────────────────────────────────

  it("fires on [eval].find(Boolean)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].find(Boolean)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  it("fires on [fetch].find(Boolean)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch].find(Boolean)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  it("fires on [Function].find(Boolean)(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return [Function].find(Boolean)(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  it("fires on [eval].find(x => x)(code) — identity arrow predicate", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].find(x => x)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  it("fires on [x, eval].find(Boolean)(code) — guarded global at any position", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [something, eval].find(Boolean)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  it("fires on [WebSocket].find(Boolean)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return [WebSocket].find(Boolean)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  // ── fires cases: .findLast() ─────────────────────────────────────────────

  it("fires on [eval].findLast(Boolean)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].findLast(Boolean)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  it("fires on [fetch].findLast(x => x)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return [fetch].findLast(x => x)(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  it("fires on paren-wrapped ([eval]).find(Boolean)(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ([eval]).find(Boolean)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(true);
  });

  // ── no-fire cases ────────────────────────────────────────────────────────

  it("does NOT fire when no call follows — [eval].find(Boolean) as expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const x = [eval].find(Boolean)\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(false);
  });

  it("does NOT fire when suppressed by unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "intentional bypass for sandboxed eval" { [eval].find(Boolean)(code) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(false);
  });

  it("does NOT fire on non-guarded globals — [JSON].find(Boolean).stringify(x)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> string {\n" +
      "  return [JSON].find(Boolean).stringify(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].find(Boolean)(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(false);
  });

  it("does NOT fire when find() has no arguments — [eval].find()(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].find()(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN073")).toBe(false);
  });

  // ── message content ──────────────────────────────────────────────────────

  it("message names the guarded global and method for .find()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].find(Boolean)(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN073");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("find");
  });

  it("message names the guarded global and method for .findLast()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].findLast(Boolean)(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN073");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("findLast");
  });

  // ── SYN069/SYN070/SYN071 not fired (different pattern) ───────────────────

  it("does NOT fire SYN069/SYN070/SYN071 when the pattern is .find() form (SYN073 fires)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [eval].find(Boolean)(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN069")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN070")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN071")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN073")).toBe(true);
  });
});
