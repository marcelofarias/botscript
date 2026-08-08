/**
 * Tests for SYN059: eval.prototype.constructor(...) or Function.prototype.constructor(...)
 * bypasses SYN058 (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN059: eval/Function .prototype.constructor(...) two-hop bypass (0.7+)", () => {
  // ── Function.prototype.constructor(...) ──────────────────────────────────

  it("fires on Function.prototype.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function.prototype.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(true);
  });

  it("fires on Function.prototype.constructor(body) assigned to a variable", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(body: string) -> any {\n" +
      "  const f = Function.prototype.constructor(body)\n" +
      "  return f()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(true);
  });

  it("fires on Function?.prototype.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function?.prototype.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(true);
  });

  it("fires on Function.prototype?.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function.prototype?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(true);
  });

  it("fires on Function?.prototype?.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function?.prototype?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(true);
  });

  // ── eval.prototype.constructor(...) ──────────────────────────────────────

  it("fires on eval.prototype.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval.prototype.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(true);
  });

  it("fires on eval?.prototype?.constructor(code)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval?.prototype?.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(true);
  });

  // ── unsafe block suppression ─────────────────────────────────────────────

  it("does NOT fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "prototype-constructor intentional" { Function.prototype.constructor(code)() }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(false);
  });

  it("does NOT fire inside unsafe fn", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "prototype-constructor intentional" fn run(code: string) -> any {\n' +
      "  return Function.prototype.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(false);
  });

  // ── non-firing cases ─────────────────────────────────────────────────────

  it("does NOT fire on obj.Function.prototype.constructor (member receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(obj: any, code: string) -> any {\n" +
      "  return obj.Function.prototype.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(false);
  });

  it("does NOT fire on someObj.prototype.constructor (non-guarded receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> any {\n" +
      "  return x.prototype.constructor(42)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(false);
  });

  it("SYN058 still fires on eval.constructor (direct, no prototype hop)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(false);
  });

  it("SYN058 still fires on Function.constructor (direct, no prototype hop)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(body: string) -> any {\n" +
      "  return Function.constructor(body)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN058")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(false);
  });

  it("does NOT fire on pre-0.7 code", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function.prototype.constructor(code)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN059")).toBe(false);
  });
});
