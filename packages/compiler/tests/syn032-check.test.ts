/**
 * Tests for SYN032 — WebAssembly.* call bypasses the capability model.
 *
 * Covers: WebAssembly.instantiate, WebAssembly.instantiateStreaming,
 *         WebAssembly.compile, WebAssembly.compileStreaming,
 *         new WebAssembly.Module, new WebAssembly.Instance.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

// ---------------------------------------------------------------------------
// Detection — call forms
// ---------------------------------------------------------------------------

describe("SYN032 — WebAssembly.* capability bypass (?bs 0.7+)", () => {
  it("fires SYN032 on WebAssembly.instantiate(buf, imports)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadWasm(buf: ArrayBuffer) -> any {\n" +
      "  return WebAssembly.instantiate(buf, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on WebAssembly.instantiateStreaming(fetch(url), imports)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadWasm(url: string) -> any {\n" +
      "  return WebAssembly.instantiateStreaming(fetch(url), {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on WebAssembly.compile(buf)", () => {
    const src =
      "?bs 0.7\n" +
      "fn compileWasm(buf: ArrayBuffer) -> any {\n" +
      "  return WebAssembly.compile(buf)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on WebAssembly.compileStreaming(fetch(url))", () => {
    const src =
      "?bs 0.7\n" +
      "fn compileWasm(url: string) -> any {\n" +
      "  return WebAssembly.compileStreaming(fetch(url))\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on new WebAssembly.Module(bytes)", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeModule(bytes: Uint8Array) -> any {\n" +
      "  return new WebAssembly.Module(bytes)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("fires SYN032 on new WebAssembly.Instance(module, imports)", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeInstance(module: any, imports: any) -> any {\n" +
      "  return new WebAssembly.Instance(module, imports)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(true);
  });

  it("SYN032 warning mentions WebAssembly, the member, and the fn name", () => {
    const src =
      "?bs 0.7\n" +
      "fn myLoader(buf: ArrayBuffer) -> any {\n" +
      "  return WebAssembly.instantiate(buf, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN032");
    expect(w).toBeDefined();
    expect(w!.message).toContain("WebAssembly");
    expect(w!.message).toContain("instantiate");
    expect(w!.message).toContain("myLoader");
    expect(w!.severity).toBe("warning");
  });

  it("SYN032 warning carries rule and rewrite from registry", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(buf: ArrayBuffer) -> any {\n" +
      "  WebAssembly.compile(buf)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN032");
    expect(w?.rule).toBeTruthy();
    expect(w?.rewrite).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Version gate
  // ---------------------------------------------------------------------------

  it("does NOT fire SYN032 below ?bs 0.7", () => {
    const src =
      "?bs 0.1\n" +
      "fn f(buf: ArrayBuffer) {\n" +
      "  return WebAssembly.instantiate(buf, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // unsafe suppression
  // ---------------------------------------------------------------------------

  it("does NOT fire SYN032 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(buf: ArrayBuffer) -> any {\n" +
      "  return unsafe \"loads WebAssembly for image decode\" { WebAssembly.instantiate(buf, {}) }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"loads WebAssembly\" fn loadWasm(buf: ArrayBuffer) -> any {\n" +
      "  return WebAssembly.instantiate(buf, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Exclusions
  // ---------------------------------------------------------------------------

  it("does NOT fire SYN032 on obj.WebAssembly.instantiate(...) — member access on obj", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: any) -> any {\n" +
      "  return obj.WebAssembly.instantiate(buf, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on bare WebAssembly reference (no member call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  return WebAssembly\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on WebAssembly.Module as a type annotation", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(m: WebAssembly.Module) -> void { }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on fn WebAssembly declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn WebAssembly(buf: any) -> any = buf\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on function WebAssembly declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function WebAssembly(buf: any) { return buf }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on function* WebAssembly generator declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function* WebAssembly(buf: any) { yield buf }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on WebAssembly.Module without new (type reference, not constructor call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  const ctor = WebAssembly.Module\n" +
      "  return ctor\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });

  it("does NOT fire SYN032 on WebAssembly member not in the detected set", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(mod: any) -> boolean {\n" +
      "  return WebAssembly.validate(new Uint8Array(mod))\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN032")).toBe(false);
  });
});
