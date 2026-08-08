/**
 * Tests for SYN062: Object/Reflect.getPrototypeOf(expr).constructor(...) or
 * expr.__proto__.constructor(...) — prototype-navigation path reaches Function,
 * bypassing SYN004–SYN061 (?bs 0.7+).
 *
 * SYN062 fires when:
 *   - `Object.getPrototypeOf(...)` or `Reflect.getPrototypeOf(...)` is called
 *     and `.constructor(` is chained on the result, OR
 *   - `__proto__` is read and `.constructor(` is called on the result.
 * `unsafe {}` blocks suppress the warning.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN062: prototype-navigation .constructor bypass (0.7+)", () => {
  // ── fires: Object.getPrototypeOf ─────────────────────────────────────────

  it("fires on Object.getPrototypeOf(function(){}).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Object.getPrototypeOf(function(){}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  it("fires on Object.getPrototypeOf(someExpr).constructor(code)() with arbitrary arg", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(f: any, code: string) -> any {\n" +
      "  return Object.getPrototypeOf(f.method).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  it("fires on Object.getPrototypeOf(someVar).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(f: any, code: string) -> any {\n" +
      "  return Object.getPrototypeOf(f).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  // ── fires: Reflect.getPrototypeOf ────────────────────────────────────────

  it("fires on Reflect.getPrototypeOf(function(){}).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Reflect.getPrototypeOf(function(){}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  it("fires on Reflect.getPrototypeOf(f).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(f: any, code: string) -> any {\n" +
      "  return Reflect.getPrototypeOf(f).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  // ── fires: __proto__ read ─────────────────────────────────────────────────

  it("fires on x.__proto__.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any, code: string) -> any {\n" +
      "  return x.__proto__.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  it("fires on (function(){}).__proto__.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (function(){}).__proto__.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  // ── fires: optional-chain variants ───────────────────────────────────────

  it("fires on Object.getPrototypeOf(f)?.constructor(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(f: any, code: string) -> any {\n" +
      "  return Object.getPrototypeOf(f)?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  it("fires on x?.__proto__?.constructor(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any, code: string) -> any {\n" +
      "  return x?.__proto__?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(true);
  });

  // ── suppressed cases ──────────────────────────────────────────────────────

  it("does NOT fire inside unsafe block (getPrototypeOf)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "needed" { Object.getPrototypeOf(function(){}).constructor(code)() }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(false);
  });

  it("does NOT fire inside unsafe block (__proto__)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any, code: string) -> any {\n" +
      '  return unsafe "needed" { x.__proto__.constructor(code)() }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return Object.getPrototypeOf(function(){}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(false);
  });

  // ── non-firing cases ──────────────────────────────────────────────────────

  it("does NOT fire on Object.getPrototypeOf(f).constructor alone (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(f: any) -> any {\n" +
      "  const C = Object.getPrototypeOf(f).constructor\n" +
      "  return C\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(false);
  });

  it("does NOT fire on x.__proto__.constructor reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> any {\n" +
      "  const C = x.__proto__.constructor\n" +
      "  return C\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(false);
  });

  it("does NOT fire on someLib.getPrototypeOf(f).constructor (unknown namespace)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(f: any, code: string) -> any {\n" +
      "  return someLib.getPrototypeOf(f).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN062")).toBe(false);
  });

  it("does NOT throw on any of these inputs", () => {
    const cases = [
      "?bs 0.7\nfn run(code: string) -> any {\n  return Object.getPrototypeOf(function(){}).constructor(code)()\n}\n",
      "?bs 0.7\nfn run(x: any, code: string) -> any {\n  return x.__proto__.constructor(code)()\n}\n",
      "?bs 0.7\nfn run(f: any, code: string) -> any {\n  return Reflect.getPrototypeOf(f).constructor(code)()\n}\n",
    ];
    for (const src of cases) {
      expect(() => transform(src)).not.toThrow();
    }
  });
});
