/**
 * Tests for SYN004: eval(), Function(), and new Function() call detection (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN004: eval(), Function(), and new Function() checks (0.7+)", () => {
  it("fires on eval() call in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> string {\n" +
      "  return eval(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on eval() with a string literal", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> number {\n" +
      "  return eval('1 + 2')\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on new Function() call", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> Function {\n" +
      "  return new Function(body)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on new Function() with multiple args", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(a: string, body: string) -> Function {\n" +
      "  return new Function(a, body)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn run(code) {\n" +
      "  return eval(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire when eval is inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> string {\n" +
      '  return unsafe "evaluates user script in sandbox" { eval(code) }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire when new Function is inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> Function {\n" +
      '  return unsafe "trusted function factory" { new Function(body) }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire when eval is inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "runs untrusted user scripts" fn sandbox(code: string) -> string {\n' +
      "  return eval(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on .eval() — method call on a local object", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(vm: { eval: (s: string) -> string }) -> string {\n" +
      "  return vm.eval('code')\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on Function.prototype.call — not new Function()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(f: Function) -> void {\n" +
      "  Function.prototype.call(f)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("fires on bare Function() call without new — equivalent runtime bypass", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> unknown {\n" +
      "  return Function(body)()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on Function?.() optional call form in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> unknown {\n" +
      "  return Function?.(body)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("does not fire on bare Function reference — not called", () => {
    const src =
      "?bs 0.7\n" +
      "fn check(f: unknown) -> boolean {\n" +
      "  return typeof Function !== 'undefined'\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on function declaration named eval — declaration not a call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> string {\n" +
      "  function eval(src: string) { return src }\n" +
      "  return eval(code)\n" +
      "}\n";
    const result = transform(src);
    // Only one SYN004: the call `eval(code)`, not the declaration `function eval(src) {...}`
    const warnings = result.warnings.filter((w) => w.code === "SYN004");
    expect(warnings.length).toBe(1);
  });

  it("does not fire on method shorthand named Function — declaration not a call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> unknown {\n" +
      "  const obj = { Function(body: string) { return body } }\n" +
      "  return obj\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on function declaration named eval with return-type annotation", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> string {\n" +
      "  function eval(src: string): string { return src }\n" +
      "  return code\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on method shorthand named eval with return-type annotation", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> unknown {\n" +
      "  const obj = { eval(src: string): string { return src } }\n" +
      "  return obj\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on method shorthand named Function with return-type annotation", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> unknown {\n" +
      "  const obj = { Function(body: string): Function { return () => body } }\n" +
      "  return obj\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("fires on eval() in a ternary then-branch — not confused with a method signature", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(flag: boolean, code: string) -> string {\n" +
      "  return flag ? eval(code) : code\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on Function() in a ternary else-branch — not confused with a method signature", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(flag: boolean, body: string) -> unknown {\n" +
      "  return flag ? body : Function(body)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on Function() in a ternary then-branch — not suppressed by ternary colon", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(flag: boolean, body: string) -> unknown {\n" +
      "  return flag ? Function(body) : body\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("has severity 'warning' (non-blocking — transform must not throw)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> string {\n" +
      "  return eval(code)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN004");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("fires on eval<any>() TypeScript instantiation form", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> unknown {\n" +
      "  return eval<any>(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on new Function<any>() TypeScript instantiation form", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> unknown {\n" +
      "  return new Function<any>(body)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on Function<string>() bare instantiation form", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(body: string) -> unknown {\n" +
      "  return Function<string>(body)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });
});
