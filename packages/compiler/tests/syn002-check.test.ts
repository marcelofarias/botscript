/**
 * Tests for SYN002 (?bs 0.7+).
 *
 * SYN002: fires as a non-blocking warning when a fn body contains a native
 * `throw` statement. Native throws bypass the Result-based error contract —
 * callers relying on `?` unwrap or match on Result will not observe them.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN002: native throw statement (?bs 0.7+)", () => {
  it("fires when fn body contains throw new ErrorType()", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("fires when fn body contains a bare throw expression", () => {
    const src =
      "?bs 0.9\n" +
      "fn fail(msg: string) -> void {\n" +
      "  throw new Error(msg)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("has severity 'warning' (non-blocking)", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN002");
    expect(w?.severity).toBe("warning");
    expect(() => transform(src)).not.toThrow();
  });

  it("message mentions Result as the alternative", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN002");
    expect(w?.message).toContain("Result");
    expect(w?.message).toContain("err");
  });

  it("does NOT fire at ?bs 0.6 (below 0.7 gate)", () => {
    const src =
      "?bs 0.6\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when there is no throw in the body", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> Result<string, ParseError> {\n" +
      "  if (!s) { const e = new ParseError(\"empty\"); return err(e) }\n" +
      "  return ok(s)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire for throw inside a nested fn (nested fn gets its own SYN002)", () => {
    // The outer fn 'outer' has no throw at its body level;
    // 'inner' has the throw and should get the SYN002.
    const src =
      "?bs 0.9\n" +
      "fn outer(s: string) -> string {\n" +
      "  fn inner() -> void { throw new Error(\"x\") }\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    const warnings = result.warnings.filter((w) => w.code === "SYN002");
    // inner is a nested fn — it gets its own SYN002
    expect(warnings.length).toBe(1);
  });

  it("fires on ?bs 0.7", () => {
    const src =
      "?bs 0.7\n" +
      "fn fail() -> void {\n" +
      "  throw new Error(\"x\")\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("fires on ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn fail() -> void {\n" +
      "  throw new Error(\"x\")\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("fires when fn body contains a parenthesized throw expression", () => {
    const src =
      "?bs 0.9\n" +
      "fn fail(msg: string) -> void {\n" +
      "  throw (new Error(msg))\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("does NOT fire when 'throw' is an object literal property key: { throw: 1 }", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { throw: 1 }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is an object literal property key after comma: { a: 1, throw: 2 }", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { a: 1, throw: 2 }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is a method shorthand in an object literal", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { throw() { return 1 } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is a method shorthand in an expression-bodied fn's object literal", () => {
    // Expression-bodied fn: the first `{` is an object literal at braceDepth=1.
    // `throw()` here is a method shorthand, not a throw statement.
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any = ({ throw() { return 1 } })\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("fires when throw (expr) appears inside an inline arrow function body", () => {
    const src =
      "?bs 0.9\n" +
      "fn setup() -> void {\n" +
      "  const handler = () => { throw (new Error(\"x\")) }\n" +
      "  handler()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("does NOT fire when 'throw' is a getter accessor name: { get throw() {} }", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { get throw() { return 1 } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is a setter accessor name: { set throw(v) {} }", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { set throw(v: number) { } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("fires when fn body uses = pure { ... } wrapper and contains a throw statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn compute(x: number) -> number = pure {\n" +
      "  throw (new Error(\"bad\"))\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("fires when throw appears in a catch block with optional catch binding: catch { throw ... }", () => {
    const src =
      "?bs 0.9\n" +
      "fn run() -> void {\n" +
      "  try { doSomething() } catch { throw new Error(\"rethrowing\") }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("fires when fn body uses = io { ... } wrapper and contains a throw statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn run() -> void = io {\n" +
      "  throw (new Error(\"fail\"))\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("does NOT fire when 'throw' is a method shorthand with a return type annotation: { throw(): T {} }", () => {
    // TypeScript method definitions can include return type annotations: `throw(): T { ... }`
    // The `:` after the `)` must be recognised as a method context, not a throw statement.
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { throw(): number { return 1 } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is a method signature in a type literal: { throw(): T; }", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o: { throw(): number } = { throw(): number { return 1 } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is a class field assignment: class X { throw = 1 }", () => {
    // `throw` is a valid IdentifierName in TypeScript — class field assignments
    // like `throw = 1` should not be confused with a native throw statement.
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  class X { throw = 1 }\n" +
      "  return new X()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is a type-literal member with no return type: type T = { throw() }", () => {
    // `throw()` with empty parens cannot be a throw statement (empty grouping `()` is
    // invalid JS/TS); it must be a method signature. A type-alias declaration like
    // `type T = { throw() }` inside a fn body should not trigger SYN002.
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  type T = { throw() }\n" +
      "  const o: T = { throw() { return 1 } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is an optional method signature in a type literal: throw?(): T", () => {
    // Optional method signatures like `throw?(): T` use `?` directly after the
    // method name, which is not valid syntax for a throw statement. SYN002 must
    // not fire for this pattern.
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  type T = { throw?(): number }\n" +
      "  return null\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire for definite-assignment assertion: class X { throw!: T }", () => {
    // `throw!: T` is a TypeScript definite-assignment assertion (`!` non-null
    // assertion after the field name). It is not a native throw statement.
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  class X { throw!: number }\n" +
      "  return new X()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire for generic method name: { throw<T>(): number {} }", () => {
    // `throw<T>()` is a generic method shorthand — `throw` is the method name,
    // not a native throw statement. SYN002 must skip the `<T>` generic list and
    // recognise the trailing `(` as a method-signature marker.
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { throw<T>(x: T): T { return x } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });
});
