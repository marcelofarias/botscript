/**
 * Tests for SYN035: new Proxy() / Proxy() construction detection (?bs 0.7+).
 *
 * SYN035 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN035: new Proxy() / Proxy() construction detection", () => {
  it("fires on new Proxy(target, handler) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return new Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires on bare Proxy(target, handler) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires on TypeScript generic form new Proxy<object>(target, handler)", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return new Proxy<object>(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires on Proxy?.(target, handler) optional call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return Proxy?.(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return new Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      '  return unsafe "uses Proxy for transparent forwarding" { new Proxy(obj, {}) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "proxy factory" fn wrap(obj: object) -> object {\n' +
      "  return new Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on obj.Proxy(...) — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: any, target: object) -> object {\n" +
      "  return obj.Proxy(target, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on bare Proxy reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getConstructor() -> any {\n" +
      "  return Proxy\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on object method shorthands named Proxy", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeObj(obj: object) -> any {\n" +
      "  return { Proxy(t: object, h: object) { return t } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on fn Proxy(...) botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn Proxy(target: object, handler: object) -> object {\n" +
      "  return target\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on JS function Proxy() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(obj: object) -> object {\n" +
      "  function Proxy(t: object, h: object) { return t }\n" +
      "  return obj\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature: type T = { Proxy(t: object): object }", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  type T = { Proxy(t: object): object }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("fires in ternary consequent — not suppressed by trailing ':'", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean, a: object, b: object) -> object {\n" +
      "  return cond ? new Proxy(a, {}) : new Proxy(b, {})\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN035");
    expect(codes.length).toBe(2);
  });

  it("message says 'constructs new Proxy' for new Proxy form", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return new Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w?.message).toContain("constructs new Proxy()");
  });

  it("message says 'calls Proxy' for bare Proxy(target, handler) form", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w?.message).toContain("calls Proxy()");
  });

  it("message preserves ?. for Proxy?.() optional call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return Proxy?.(obj, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w?.message).toContain("calls Proxy?.()");
  });

  it("severity is warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return new Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT false-fire on Proxy < x > (y) comparison expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn compare(Proxy: number, x: number, y: number) -> boolean {\n" +
      "  return Proxy < x > (y)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on function* Proxy() generator declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  function* Proxy(t: object, h: object) { yield t }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("message mentions capability model and uses {}  wrap suggestion", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrap(obj: object) -> object {\n" +
      "  return new Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w?.message).toContain("capability model");
    expect(w?.message).toContain("unsafe");
  });
});
