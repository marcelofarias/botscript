/**
 * Tests for SYN053: fn-body assignment-expression alias of a guarded global
 * called in the same fn body bypasses SYN004–SYN052 (?bs 0.7+).
 *
 * `let f; f = fetch` inside a fn body (bare assignment, not a declaration initialiser)
 * followed by `f(url)` in the same fn body bypasses all prior SYN checks because they
 * fire on the guarded identifier token. SYN048 catches `const/let/var f = fetch`
 * declarations inside fn bodies; SYN051 catches module-scope assignment aliases.
 * SYN053 closes the remaining fn-body bare-assignment gap.
 *
 * SYN053 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN053: fn-body assignment-expression alias of guarded global called in same fn body", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on f = fetch inside fn body; f(url) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = fetch\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(true);
  });

  it("fires on f = eval inside fn body; f(code) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  let f: any\n" +
      "  f = eval\n" +
      "  return f(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(true);
  });

  it("fires on f = WebSocket inside fn body; f(url) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = WebSocket\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(true);
  });

  it("fires on f = setTimeout inside fn body; f(cb, ms) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: any, ms: number) -> void {\n" +
      "  let f: any\n" +
      "  f = setTimeout\n" +
      "  f(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(true);
  });

  it("fires when alias is called with optional chaining: f?.(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = fetch\n" +
      "  return f?.(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = fetch\n" +
      "  return f(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN053");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("includes the guarded global name and alias in the message", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let httpCall: any\n" +
      "  httpCall = fetch\n" +
      "  return httpCall(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN053");
    expect(w).toBeDefined();
    expect(w!.message).toContain("httpCall");
    expect(w!.message).toContain("fetch");
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when call is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = fetch\n" +
      '  return unsafe "calls fetch via assignment alias for legacy compat" { f(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "legacy fetch wrapper" fn load(url: string) -> any {\n' +
      "  let f: any\n" +
      "  f = fetch\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = fetch\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire when alias is called as a method: obj.f(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = fetch\n" +
      "  return obj.f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire when RHS is not a guarded global: f = myHelper", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = myHelper\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire when RHS is a call (not a bare alias): f = fetch(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load() -> any {\n" +
      "  let f: any\n" +
      "  f = fetch(url)\n" +
      "  return f\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire when RHS is a member access: f = lib.fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: any\n" +
      "  f = lib.fetch\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire when alias is declared with const/let/var (handled by SYN048)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const f = fetch\n" +
      "  return f(url)\n" +
      "}\n";
    const warnings = transform(src).warnings;
    expect(warnings.some((w) => w.code === "SYN048")).toBe(true);
    expect(warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire when assignment is at module scope (handled by SYN051)", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    const warnings = transform(src).warnings;
    expect(warnings.some((w) => w.code === "SYN051")).toBe(true);
    expect(warnings.some((w) => w.code === "SYN053")).toBe(false);
  });

  it("does not fire when LHS is a member write: obj.f = fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  obj.f = fetch\n" +
      "  return obj.f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN053")).toBe(false);
  });
});
