/**
 * Tests for SYN051: module-scope assignment-expression alias of a guarded global
 * called in a fn body bypasses SYN004–SYN050 (?bs 0.7+).
 *
 * `let f; f = fetch` at module scope (bare assignment, not a declaration initialiser)
 * followed by `f(url)` inside a fn body bypasses all prior SYN checks because they
 * fire on the guarded identifier token, and SYN044 only catches the `const/let/var f = fetch`
 * declaration form. SYN051 closes the bare assignment gap.
 *
 * SYN051 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN051: module-scope assignment-expression alias of guarded global called in fn body", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on let f; f = fetch at module scope; f(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(true);
  });

  it("fires on f = eval at module scope; f(code) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = eval\n" +
      "fn execute(code: string) -> any {\n" +
      "  return f(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(true);
  });

  it("fires on f = WebSocket at module scope; f(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = WebSocket\n" +
      "fn connect(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(true);
  });

  it("fires on f = setTimeout at module scope; f(cb, ms) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = setTimeout\n" +
      "fn schedule(cb: any, ms: number) -> void {\n" +
      "  f(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(true);
  });

  it("fires when alias is called with optional chaining: f?.(url)", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f?.(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(true);
  });

  it("fires when alias is called in multiple fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n" +
      "fn loadAlt(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    const w = transform(src).warnings.filter((w) => w.code === "SYN051");
    expect(w.length).toBeGreaterThanOrEqual(2);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN051");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("includes the guarded global name and alias in the message", () => {
    const src =
      "?bs 0.7\n" +
      "let httpCall: any\n" +
      "httpCall = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return httpCall(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN051");
    expect(w).toBeDefined();
    expect(w!.message).toContain("httpCall");
    expect(w!.message).toContain("fetch");
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when call is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      '  return unsafe "calls fetch via assignment alias for legacy compat" { f(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      'unsafe "legacy fetch wrapper" fn load(url: string) -> any {\n' +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire when alias is called as a method: obj.f(url)", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return obj.f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire when RHS is not a guarded global: f = myHelper", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = myHelper\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire when RHS is a call (not a bare alias): f = fetch(url)", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = fetch(url)\n" +
      "fn load() -> any {\n" +
      "  return f\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire when RHS is a member access: f = lib.fetch", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "f = lib.fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire when assignment is inside a fn body (not module scope)", () => {
    const src =
      "?bs 0.7\n" +
      "let f: any\n" +
      "fn load(url: string) -> any {\n" +
      "  f = fetch\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire when alias name is declared with const/let/var (handled by SYN044)", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    // SYN044 fires, not SYN051
    const warnings = transform(src).warnings;
    expect(warnings.some((w) => w.code === "SYN044")).toBe(true);
    expect(warnings.some((w) => w.code === "SYN051")).toBe(false);
  });

  it("does not fire when LHS is a member write: obj.f = fetch", () => {
    const src =
      "?bs 0.7\n" +
      "obj.f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return obj.f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN051")).toBe(false);
  });
});
