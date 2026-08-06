/**
 * Tests for SYN055/SYN056: default-parameter alias bypass detection (?bs 0.7+).
 *
 * SYN055: `fn run(f = fetch)` — default-parameter alias of a SYN-guarded global called in the fn body.
 *         All prior alias checks (SYN044/SYN048/SYN051/SYN053) start scanning from the body `{`;
 *         the default-parameter binding is invisible to them. SYN055 closes this gap.
 *
 * SYN056: `fn run(g = globalThis)` — default-parameter alias of a global receiver object used as
 *         a member-access receiver for a SYN041-dangerous member. Parallel to SYN055 for receiver
 *         aliases; prior checks (SYN045/SYN049/SYN052/SYN054) also miss default-param bindings.
 *
 * Both are non-blocking warnings — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN055: default-parameter alias of guarded global called in fn body", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on fn(f = fetch) { f(url) }", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(true);
  });

  it("fires on fn(run = eval) { run(code) }", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(code: string, run = eval) -> any {\n" +
      "  return run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(true);
  });

  it("fires on fn(later = setTimeout) { later(cb, ms) }", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: () -> void, ms: number, later = setTimeout) -> void {\n" +
      "  later(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(true);
  });

  it("fires on fn(f = fetch) { f?.(url) } (optional chain call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return f?.(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(true);
  });

  it("fires on first parameter with default (no preceding params)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(f = fetch) -> any {\n" +
      "  return f(\"https://api.example.com\")\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN055");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  // ── suppression cases ──────────────────────────────────────────────────────

  it("does not fire when call is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return unsafe \"test\" { f(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(false);
  });

  it("does not fire when call is a member access (obj.f())", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return obj.f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(false);
  });

  it("does not fire when f is called directly (not via alias)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN055")).toBe(false);
  });

  // ── no false positives on SYN051 ─────────────────────────────────────────

  it("does not also fire SYN051 for the same default-param pattern", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN051")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN055")).toBe(true);
  });
});

describe("SYN056: default-parameter alias of global receiver used as member-access receiver", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on fn(g = globalThis) { g.fetch(url) }", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, g = globalThis) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN056")).toBe(true);
  });

  it("fires on fn(g = window) { g.eval(code) }", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(code: string, g = window) -> any {\n" +
      "  return g.eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN056")).toBe(true);
  });

  it("fires on fn(g = self) { g.fetch(url) }", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, g = self) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN056")).toBe(true);
  });

  it("fires on fn(g = globalThis) { g?.fetch(url) } (optional chain)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, g = globalThis) -> any {\n" +
      "  return g?.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN056")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, g = globalThis) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN056");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  // ── suppression cases ──────────────────────────────────────────────────────

  it("does not fire when access is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, g = globalThis) -> any {\n" +
      "  return unsafe \"test\" { g.fetch(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN056")).toBe(false);
  });

  it("does not fire for non-dangerous members (g.nonDangerous)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(g = globalThis) -> string {\n" +
      "  return g.location.href\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN056")).toBe(false);
  });

  // ── no false positives on SYN052 ─────────────────────────────────────────

  it("does not also fire SYN052 for the same default-param pattern", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string, g = globalThis) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN052")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN056")).toBe(true);
  });
});
