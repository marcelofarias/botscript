/**
 * Tests for SYN036: Reflect.apply() / Reflect.construct() call detection (?bs 0.7+).
 *
 * SYN036 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN036: Reflect.apply / Reflect.construct capability bypass detection", () => {
  it("fires on Reflect.apply() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> Promise<Response> {\n" +
      "  return Reflect.apply(fetch, null, [url])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires on Reflect.construct() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn openSocket(url: string) -> WebSocket {\n" +
      "  return Reflect.construct(WebSocket, [url])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires on Reflect.apply() with any callable first arg", () => {
    const src =
      "?bs 0.7\n" +
      "fn invoke(fn: any, args: any[]) -> any {\n" +
      "  return Reflect.apply(fn, null, args)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires on optional-chain Reflect?.apply()", () => {
    const src =
      "?bs 0.7\n" +
      "fn maybeInvoke(target: any, args: any[]) -> any {\n" +
      "  return Reflect?.apply(target, null, args)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires on optional-call Reflect.apply?.()", () => {
    const src =
      "?bs 0.7\n" +
      "fn maybeInvoke(target: any, args: any[]) -> any {\n" +
      "  return Reflect.apply?.(target, null, args)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("produces a warning-severity diagnostic", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(fn: any) -> any {\n" +
      "  return Reflect.apply(fn, null, [])\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN036");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("is suppressed by an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(fn: any) -> any {\n" +
      '  return unsafe "Reflect.apply for meta-testing harness" { Reflect.apply(fn, null, []) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("is suppressed by an unsafe fn declaration", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "Reflect.apply for testing harness" fn run(fn: any) -> any {\n' +
      "  return Reflect.apply(fn, null, [])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(fn: any) -> any {\n" +
      "  return Reflect.apply(fn, null, [])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire on obj.Reflect.apply() (member access on a local binding)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(ctx: any, fn: any) -> any {\n" +
      "  return ctx.Reflect.apply(fn, null, [])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire on bare Reflect reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> any {\n" +
      "  return Reflect\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire on Reflect.ownKeys() or other Reflect methods", () => {
    const src =
      "?bs 0.7\n" +
      "fn getKeys(obj: any) -> any {\n" +
      "  return Reflect.ownKeys(obj)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire on fn declaration named Reflect", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  fn Reflect(target: any, args: any[]) -> void {}\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("fires twice for two Reflect calls in the same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn dispatch(a: any, b: any, args: any[]) -> void {\n" +
      "  Reflect.apply(a, null, args)\n" +
      "  Reflect.construct(b, args)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN036").length).toBe(2);
  });

  it("does NOT fire on Reflect.apply inside a nested fn body (nested fn is excluded by nesting skip)", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  fn inner(fn: any) -> any {\n" +
      "    return Reflect.apply(fn, null, [])\n" +
      "  }\n" +
      "  return inner\n" +
      "}\n";
    const result = compile(src);
    // SYN036 fires in inner's own fn body pass, not in outer's pass
    const syn036Warnings = result.warnings.filter((w) => w.code === "SYN036");
    expect(syn036Warnings.length).toBe(1);
  });
});
