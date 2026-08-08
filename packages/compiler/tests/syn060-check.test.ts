/**
 * Tests for SYN060: (fn-expr).constructor(...) — function-expression .constructor
 * bypasses SYN004–SYN059 (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN060: function-expression .constructor(...) bypass (0.7+)", () => {
  // ── Arrow function .constructor ──────────────────────────────────────────

  it("fires on (() => {}).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (() => {}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(true);
  });

  it("fires on (() => {}).constructor(body) assigned to a variable", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(body: string) -> any {\n" +
      "  const f = (() => {}).constructor(body)\n" +
      "  return f()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(true);
  });

  it("fires on (() => {})?.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (() => {})?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(true);
  });

  // ── Function expression .constructor ────────────────────────────────────

  it("fires on (function() {}).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (function() {}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(true);
  });

  it("fires on (function helper() {}).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (function helper() {}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(true);
  });

  // ── Async forms ──────────────────────────────────────────────────────────

  it("fires on (async () => {}).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (async () => {}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(true);
  });

  it("fires on (async function() {}).constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (async function() {}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(true);
  });

  // ── unsafe block suppression ─────────────────────────────────────────────

  it("does NOT fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "fn-constructor intentional" { (() => {}).constructor(code)() }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(false);
  });

  it("does NOT fire inside unsafe fn", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "fn-constructor intentional" fn run(code: string) -> any {\n' +
      "  return (() => {}).constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(false);
  });

  // ── non-firing cases ─────────────────────────────────────────────────────

  it("does NOT fire on (someObj).constructor (non-function paren group)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> any {\n" +
      "  return (x).constructor(42)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(false);
  });

  it("does NOT fire on [].constructor (array literal, not wrapped in parens)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return [].constructor(3)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(false);
  });

  it("SYN004 still fires on direct Function() call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(false);
  });

  it("SYN058 still fires on eval.constructor (named eval, not fn-expr)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN060")).toBe(false);
  });
});
