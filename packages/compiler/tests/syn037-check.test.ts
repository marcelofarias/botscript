/**
 * Tests for SYN037 — SYN-guarded global called via .call()/.apply()/.bind()
 * bypasses name-token detection (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN037 — guarded global .call()/.apply()/.bind() bypass (?bs 0.7+)", () => {
  it("fires SYN037 on fetch.call(null, url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires SYN037 on fetch.apply(null, [url])", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  fetch.apply(null, [url])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires SYN037 on fetch.bind(null)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load() -> void {\n" +
      "  const bound = fetch.bind(null)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires SYN037 on WebSocket.call(null, url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> void {\n" +
      "  WebSocket.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires SYN037 on setTimeout.call(null, fn, ms)", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(fn: () => void) -> void {\n" +
      "  setTimeout.call(null, fn, 100)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires SYN037 on eval.call(null, code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> void {\n" +
      "  eval.call(null, code)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires SYN037 on XMLHttpRequest.apply(null, [])", () => {
    const src =
      "?bs 0.7\n" +
      "fn request() -> void {\n" +
      "  XMLHttpRequest.apply(null, [])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires SYN037 on optional chain fetch?.call(null, url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  fetch?.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("SYN037 message contains fn name and global name", () => {
    const src =
      "?bs 0.7\n" +
      "fn fetchViaCall(url: string) -> void {\n" +
      "  fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN037");
    expect(w).toBeDefined();
    expect(w!.message).toContain("fetchViaCall");
    expect(w!.message).toContain("fetch");
    expect(w!.message).toContain("call");
  });

  it("SYN037 message mentions bypassing detection", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void {\n" +
      "  fetch.apply(null, [url])\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN037");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/bypass|detection|SYN00[0-9]/i);
  });

  it("does NOT fire SYN037 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void {\n" +
      "  const resp = unsafe \"fetch.call for legacy compat\" {\n" +
      "    fetch.call(null, url)\n" +
      "  }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("does NOT fire SYN037 on obj.fetch.call(...) — member access receiver", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(env: any, url: string) -> void {\n" +
      "  env.fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("does NOT fire SYN037 for ?bs < 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn f(url: string) -> void {\n" +
      "  fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("does NOT fire SYN037 on unguarded name .call() — e.g. myFn.call(this)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  myFn.call(this)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("does NOT fire SYN037 inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"network shim\" fn f(url: string) -> void {\n" +
      "  fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("reports correct line number for fetch.call", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void {\n" +
      "  fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN037");
    expect(w).toBeDefined();
    expect(w!.line).toBe(3);
  });

  it("fires on multiple bypasses in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string, fn: () => void) -> void {\n" +
      "  fetch.call(null, url)\n" +
      "  setTimeout.apply(null, [fn, 0])\n" +
      "}\n";
    const result = compile(src);
    const syn037s = result.warnings.filter((w) => w.code === "SYN037");
    expect(syn037s.length).toBeGreaterThanOrEqual(2);
  });
});
