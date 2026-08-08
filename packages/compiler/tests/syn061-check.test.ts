/**
 * Tests for SYN061: primitive-literal .constructor.constructor(...) — two-hop
 * constructor chain reaches Function, bypassing SYN004–SYN060 (?bs 0.7+).
 *
 * SYN061 fires when a primitive literal token (string, number, template, array
 * literal `]`, or boolean `true`/`false`) is immediately followed by
 * `.constructor.constructor(` (each dot may be `?.`) inside a fn body.
 * `unsafe {}` blocks suppress the warning.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN061: primitive-literal .constructor.constructor bypass (0.7+)", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on [].constructor.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [].constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires on \"\".constructor.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      'fn run(code: string) -> any {\n' +
      '  return "".constructor.constructor(code)()\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires on (0).constructor.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (0).constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires on true.constructor.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return true.constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires on false.constructor.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return false.constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires on optional-chain variant []?.constructor?.constructor(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return []?.constructor?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires when result is assigned before call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  const f = "".constructor.constructor(code)\n' +
      "  return f()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires with non-empty array literal", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [1, 2, 3].constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  it("fires with template literal", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ``.constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(true);
  });

  // ── suppressed cases ─────────────────────────────────────────────────────

  it("does NOT fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "needed" { [].constructor.constructor(code)() }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(false);
  });

  it("does NOT fire for transform — must not throw", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [].constructor.constructor(code)()\n" +
      "}\n";
    expect(() => transform(src)).not.toThrow();
  });

  // ── non-firing cases ─────────────────────────────────────────────────────

  it("does NOT fire on obj.constructor.constructor (non-primitive receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(obj: any, code: string) -> any {\n" +
      "  return obj.constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(false);
  });

  it("does NOT fire on [].constructor alone (not a call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const c = [].constructor\n" +
      "  return c\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(false);
  });

  it("does NOT fire for [].constructor.constructor reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const F = [].constructor.constructor\n" +
      "  return F\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return [].constructor.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN061")).toBe(false);
  });
});
