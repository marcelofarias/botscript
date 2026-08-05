/**
 * Tests for SYN044: module-scope guarded-global alias called in fn body (?bs 0.7+).
 *
 * `const f = fetch` at module scope followed by `f(url)` inside a fn body bypasses
 * SYN004–SYN043 name-token checks. SYN044 detects the aliased call and warns.
 *
 * SYN044 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN044: module-scope guarded-global alias call detection", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const f = fetch; f(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("fires on const run = eval; run(code) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const run = eval\n" +
      "fn execute(code: string) -> any {\n" +
      "  return run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("fires on let sock = WebSocket; sock(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let sock = WebSocket\n" +
      "fn connect(url: string) -> any {\n" +
      "  return sock(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("fires on var timer = setTimeout; timer(fn, ms) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "var timer = setTimeout\n" +
      "fn schedule(fn: () -> void, ms: number) -> void {\n" +
      "  timer(fn, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN044");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("warning message mentions alias name and original global", () => {
    const src =
      "?bs 0.7\n" +
      "const req = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN044");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/req/);
    expect(w!.message).toMatch(/fetch/);
  });

  it("fires on optional call: f?.(url)", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f?.(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when alias call is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      'fn load(url: string) -> any {\n' +
      '  return unsafe "calls fetch via alias for legacy compat" { f(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      'unsafe "legacy fetch wrapper" fn load(url: string) -> any {\n' +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });

  it("does not fire when f is a method call: obj.f()", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      "fn load(obj: any, url: string) -> any {\n" +
      "  return obj.f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });

  it("does not fire when RHS is not a bare guarded global (member access)", () => {
    const src =
      "?bs 0.7\n" +
      "const f = globalThis.fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    // SYN041 may fire on globalThis.fetch; SYN044 should not fire (RHS is a member access)
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });

  it("does not fire on non-guarded-global RHS: const f = myHelper", () => {
    const src =
      "?bs 0.7\n" +
      "const f = myHelper\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "const f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });

  it("does not fire when alias name is used as a value (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      "fn ref() -> any {\n" +
      "  return f\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });

  it("does not fire on the alias declaration itself (const f = fetch line)", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN044")).toBe(false);
  });
});
