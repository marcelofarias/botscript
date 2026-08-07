/**
 * Tests for SYN058: eval.constructor(...) or Function.constructor(...) bypasses SYN004 (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN058: eval/Function .constructor(...) bypass (0.7+)", () => {
  // ── eval.constructor(...) ─────────────────────────────────────────────────

  it("fires on eval.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
  });

  it("fires on eval.constructor(code) assigned to a variable", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const f = eval.constructor(code)\n" +
      "  return f()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
  });

  it("fires on eval?.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
  });

  // ── Function.constructor(...) ─────────────────────────────────────────────

  it("fires on Function.constructor(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> any {\n" +
      "  return Function.constructor(body)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
  });

  it("fires on Function?.constructor(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> any {\n" +
      "  return Function?.constructor(body)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
  });

  // ── suppression ───────────────────────────────────────────────────────────

  it("does not fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "legacy eval" { eval.constructor(code)() }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });

  it("does not fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "calls eval" fn run(code: string) -> any {\n' +
      "  return eval.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });

  // ── non-firing cases ──────────────────────────────────────────────────────

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn run(code) {\n" +
      "  return eval.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });

  it("does not fire on obj.eval.constructor (member eval, not bare)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(sandbox: any, code: string) -> any {\n" +
      "  return sandbox.eval.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });

  it("does not fire on eval.constructor without a call (property access only)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const Fn = eval.constructor\n" +
      "  return Fn\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });

  it("does not fire on eval.name or eval.length (other members)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> string {\n" +
      "  return eval.name\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });

  // ── SYN004 still fires for the normal call form ────────────────────────────

  it("SYN004 still fires on eval(code) (not SYN058)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });

  it("SYN057 still fires on eval`code` (not SYN058)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(false);
  });
});
