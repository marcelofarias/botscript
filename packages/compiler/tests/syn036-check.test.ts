/**
 * Tests for SYN036 — WebAssembly.instantiate/compile executes opaque binary code
 * invisible to the capability model (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN036 — WebAssembly execution/compilation bypass (?bs 0.7+)", () => {
  it("fires SYN036 on WebAssembly.instantiate(bytes, imports)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadWasm(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires SYN036 on WebAssembly.instantiateStreaming(response, imports)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadWasm(resp: Response) -> void {\n" +
      "  WebAssembly.instantiateStreaming(resp, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires SYN036 on WebAssembly.compile(bytes)", () => {
    const src =
      "?bs 0.7\n" +
      "fn compileWasm(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.compile(bytes)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires SYN036 on WebAssembly.compileStreaming(response)", () => {
    const src =
      "?bs 0.7\n" +
      "fn compileWasm(resp: Response) -> void {\n" +
      "  WebAssembly.compileStreaming(resp)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires SYN036 on new WebAssembly.Instance(module, imports)", () => {
    const src =
      "?bs 0.7\n" +
      "fn runWasm(mod: WebAssembly.Module) -> void {\n" +
      "  const inst = new WebAssembly.Instance(mod, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires SYN036 on new WebAssembly.Module(bytes)", () => {
    const src =
      "?bs 0.7\n" +
      "fn buildWasm(bytes: ArrayBuffer) -> void {\n" +
      "  const mod = new WebAssembly.Module(bytes)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires SYN036 on WebAssembly.Instance(module) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn runWasm(mod: WebAssembly.Module) -> void {\n" +
      "  const inst = WebAssembly.Instance(mod, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("fires SYN036 on optional chain WebAssembly?.instantiate()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadWasm(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly?.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(true);
  });

  it("SYN036 message contains fn name and 'WebAssembly'", () => {
    const src =
      "?bs 0.7\n" +
      "fn instantiateModule(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN036");
    expect(w).toBeDefined();
    expect(w!.message).toContain("instantiateModule");
    expect(w!.message).toContain("WebAssembly");
  });

  it("SYN036 message mentions capability, opaque, or similar", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN036");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/opaque|capability|capabilit/i);
  });

  it("does NOT fire SYN036 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(bytes: ArrayBuffer) -> void {\n" +
      "  const result = unsafe \"executes image-processing WASM for performance\" {\n" +
      "    WebAssembly.instantiate(bytes, {})\n" +
      "  }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire SYN036 on obj.WebAssembly (member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(env: any) -> void {\n" +
      "  env.WebAssembly.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire SYN036 for ?bs < 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn f(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire SYN036 on WebAssembly.validate() (non-execution member)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(bytes: ArrayBuffer) -> void {\n" +
      "  const ok = WebAssembly.validate(bytes)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire SYN036 on fn declaration named WebAssembly", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  function WebAssembly(bytes: ArrayBuffer) { return null }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("does NOT fire SYN036 on bare WebAssembly reference without member call", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> boolean {\n" +
      "  return typeof WebAssembly !== 'undefined'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("reports correct line number for WebAssembly.instantiate call", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN036");
    expect(w).toBeDefined();
    expect(w!.line).toBe(3);
  });

  it("fires SYN036 inside unsafe fn body (unsafeReason only suppresses its own fn body from SYN)", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"wraps wasm runtime\" fn outer() -> void {\n" +
      "  WebAssembly.instantiate(new ArrayBuffer(0), {})\n" +
      "}\n";
    const result = compile(src);
    // SYN checks are suppressed entirely inside unsafe fn bodies
    expect(result.warnings.some((w) => w.code === "SYN036")).toBe(false);
  });

  it("fires on multiple WASM calls in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.compile(bytes)\n" +
      "  WebAssembly.instantiate(bytes, {})\n" +
      "}\n";
    const result = compile(src);
    const syn036s = result.warnings.filter((w) => w.code === "SYN036");
    expect(syn036s.length).toBeGreaterThanOrEqual(2);
  });
});
