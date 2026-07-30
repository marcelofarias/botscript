/**
 * Tests for SYN028 — new Proxy() / Proxy() call that wraps an object and
 * launders its capability surface from static analysis (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN028 — Proxy capability laundering (?bs 0.7+)", () => {
  it("fires SYN028 on new Proxy(target, handler)", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeClient(cap: any) -> object {\n" +
      "  return new Proxy({}, { get: (_, k) => cap[k] })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires SYN028 on bare Proxy(target, handler) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapIt(obj: any) -> object {\n" +
      "  return Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires SYN028 on Proxy?.(target, handler) optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapIt(obj: any) -> object {\n" +
      "  return Proxy?.(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires SYN028 on new Proxy<T>(target, handler) generic form", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapIt<T>(obj: T) -> T {\n" +
      "  return new Proxy<T>(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("SYN028 message contains fn name and 'Proxy'", () => {
    const src =
      "?bs 0.7\n" +
      "fn myWrapper(cap: any) -> object {\n" +
      "  return new Proxy(cap, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w).toBeDefined();
    expect(w!.message).toContain("myWrapper");
    expect(w!.message).toContain("Proxy");
  });

  it("SYN028 message mentions 'laundered' or 'invisible'", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(x: any) -> object {\n" +
      "  return new Proxy(x, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/laundered|invisible/i);
  });

  it("does NOT fire SYN028 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapCap(cap: any) -> object {\n" +
      "  return unsafe \"proxies capability for transparent delegation\" { new Proxy(cap, {}) }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire SYN028 on obj.Proxy(...) member call", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(lib: any) -> object {\n" +
      "  return lib.Proxy(target, handler)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire SYN028 on fn declaration named Proxy", () => {
    const src =
      "?bs 0.7\n" +
      "fn Proxy(target: any, handler: any) -> any {\n" +
      "  return target\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire SYN028 on bare Proxy reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  return Proxy\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire SYN028 in unsafe 'reason' fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"proxies capability for delegation\" fn wrapCap(cap: any) -> object {\n" +
      "  return new Proxy(cap, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire SYN028 below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn f(obj: any) -> object {\n" +
      "  return new Proxy(obj, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("fires SYN028 on new Proxy wrapping a capability-like object", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapCap(cap: any) -> object {\n" +
      "  return new Proxy(cap, { get: (t: any, k: string) => t[k] })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires SYN028 in nested fn (non-unsafe)", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  fn inner(cap: any) -> object {\n" +
      "    return new Proxy(cap, {})\n" +
      "  }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("does NOT fire SYN028 on method shorthand named Proxy in object literal", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> object {\n" +
      "  return { Proxy(target: any, handler: any) { return target } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });
});
