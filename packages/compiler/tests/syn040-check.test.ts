/**
 * Tests for SYN040: Object.setPrototypeOf() / __proto__ assignment detection (?bs 0.7+).
 *
 * SYN040 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN040: Object.setPrototypeOf() / __proto__ assignment (?bs 0.7+)", () => {
  // ── Object.setPrototypeOf() ────────────────────────────────────────────────

  it("fires on Object.setPrototypeOf() in a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn patchGlobal(proto: object) -> void {\n" +
      "  Object.setPrototypeOf(globalThis, proto)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(true);
  });

  it("fires on Object?.setPrototypeOf() optional-chain form", () => {
    const src =
      "?bs 0.7\n" +
      "fn shimProto(target: object, proto: object) -> void {\n" +
      "  Object?.setPrototypeOf(target, proto)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(true);
  });

  it("fires on Object.setPrototypeOf?.() optional-call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn shimProto(target: object, proto: object) -> void {\n" +
      "  Object.setPrototypeOf?.(target, proto)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(true);
  });

  it("does not fire on obj.Object.setPrototypeOf (property access, not global)", () => {
    const src =
      "?bs 0.7\n" +
      "fn shimProto(ns: { Object: typeof Object }, target: object, proto: object) -> void {\n" +
      "  ns.Object.setPrototypeOf(target, proto)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire on fn named Object", () => {
    const src =
      "?bs 0.7\n" +
      "fn Object(x: any) -> any {\n" +
      "  return x\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire on Object.keys() — other Object methods are fine", () => {
    const src =
      "?bs 0.7\n" +
      "fn getKeys(obj: object) -> string[] {\n" +
      "  return Object.keys(obj)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire when inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn patchGlobal(proto: object) -> void {\n" +
      '  unsafe "mutates prototype for legacy compat" {\n' +
      "    Object.setPrototypeOf(globalThis, proto)\n" +
      "  }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn patchGlobal(proto: object) -> void {\n" +
      "  Object.setPrototypeOf(globalThis, proto)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  // ── __proto__ assignment ───────────────────────────────────────────────────

  it("fires on __proto__ assignment", () => {
    const src =
      "?bs 0.7\n" +
      "fn shimProto(obj: object, proto: object) -> void {\n" +
      "  obj.__proto__ = proto\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(true);
  });

  it("fires on globalThis.__proto__ assignment", () => {
    const src =
      "?bs 0.7\n" +
      "fn shimGlobal(proto: object) -> void {\n" +
      "  globalThis.__proto__ = proto\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(true);
  });

  it("does not fire on __proto__ read (not an assignment)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getProto(obj: object) -> object {\n" +
      "  return obj.__proto__\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire on __proto__ equality check", () => {
    const src =
      "?bs 0.7\n" +
      "fn checkProto(obj: object, proto: object) -> boolean {\n" +
      "  return obj.__proto__ === proto\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire on __proto__ in object literal shorthand (not a member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeObj(proto: object) -> object {\n" +
      "  return { __proto__: proto, value: 1 }\n" +
      "}\n";
    const result = transform(src);
    // object literal { __proto__: proto } is an object initializer key, not a member write
    // The key is not preceded by `.` or `?.`, so SYN040 should NOT fire.
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire on __proto__ assignment inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn shimProto(obj: object, proto: object) -> void {\n" +
      '  unsafe "mutates prototype for legacy compat" {\n' +
      "    obj.__proto__ = proto\n" +
      "  }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  it("does not fire on __proto__ assignment below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn shimProto(obj: object, proto: object) -> void {\n" +
      "  obj.__proto__ = proto\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN040")).toBe(false);
  });

  // ── Combined ───────────────────────────────────────────────────────────────

  it("fires once per call — two calls produce two warnings", () => {
    const src =
      "?bs 0.7\n" +
      "fn doubleShim(a: object, b: object, proto: object) -> void {\n" +
      "  Object.setPrototypeOf(a, proto)\n" +
      "  b.__proto__ = proto\n" +
      "}\n";
    const result = transform(src);
    const syn040 = result.warnings.filter((w) => w.code === "SYN040");
    expect(syn040.length).toBe(2);
  });

  it("reports correct line numbers", () => {
    const src =
      "?bs 0.7\n" +
      "fn patchGlobal(proto: object) -> void {\n" +
      "  Object.setPrototypeOf(globalThis, proto)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN040");
    expect(w).toBeDefined();
    expect(w!.line).toBe(3);
  });
});
