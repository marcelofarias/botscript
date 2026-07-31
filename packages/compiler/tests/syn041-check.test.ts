/**
 * Tests for SYN041: globalThis / window / self receiver bypass of SYN capability checks (?bs 0.7+).
 *
 * Accessing a known-dangerous global via globalThis.X, window.X, or self.X
 * bypasses the bare-identifier detection of SYN004–SYN040.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN041 — globalThis/window/self receiver bypass (?bs 0.7+)", () => {
  it("fires SYN041 on globalThis.fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  globalThis.fetch(url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(true);
  });

  it("fires SYN041 on window.fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  window.fetch(url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(true);
  });

  it("fires SYN041 on self.fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  self.fetch(url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(true);
  });

  it("fires SYN041 on globalThis.setTimeout", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(fn: () => void) -> void {\n" +
      "  globalThis.setTimeout(fn, 100)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(true);
  });

  it("fires SYN041 on globalThis.eval", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> void {\n" +
      "  globalThis.eval(code)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(true);
  });

  it("fires SYN041 on window?.fetch (optional chain receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  window?.fetch(url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(true);
  });

  it("SYN041 message contains fn name, receiver, and member", () => {
    const src =
      "?bs 0.7\n" +
      "fn fetchViaGlobal(url: string) -> void {\n" +
      "  globalThis.fetch(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN041");
    expect(w).toBeDefined();
    expect(w!.message).toContain("fetchViaGlobal");
    expect(w!.message).toContain("globalThis");
    expect(w!.message).toContain("fetch");
  });

  it("SYN041 message mentions bypass", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void {\n" +
      "  window.fetch(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN041");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/bypass|route/i);
  });

  it("does NOT fire SYN041 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void {\n" +
      '  unsafe "uses fetch via globalThis for compat" {\n' +
      "    globalThis.fetch(url)\n" +
      "  }\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(false);
  });

  it("does NOT fire SYN041 on obj.globalThis.fetch (local binding receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(env: any, url: string) -> void {\n" +
      "  env.globalThis.fetch(url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(false);
  });

  it("does NOT fire SYN041 for ?bs < 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn f(url: string) -> void {\n" +
      "  globalThis.fetch(url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(false);
  });

  it("does NOT fire SYN041 on globalThis.nonDangerousMember", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  return globalThis.myCustomProp\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(false);
  });

  it("does NOT fire SYN041 inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "fetch shim" fn f(url: string) -> void {\n' +
      "  globalThis.fetch(url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN041")).toBe(false);
  });

  it("fires on multiple dangerous accesses in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string, fn: () => void) -> void {\n" +
      "  globalThis.fetch(url)\n" +
      "  window.setTimeout(fn, 0)\n" +
      "}\n";
    const syn041s = compile(src).warnings.filter((w) => w.code === "SYN041");
    expect(syn041s.length).toBeGreaterThanOrEqual(2);
  });

  it("reports correct line number", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void {\n" +
      "  globalThis.fetch(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN041");
    expect(w).toBeDefined();
    expect(w!.line).toBe(3);
  });
});
