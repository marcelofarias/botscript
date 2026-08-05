/**
 * Tests for SYN048: fn-body-local alias of a SYN-guarded global called in same fn body (?bs 0.7+).
 *
 * `const req = fetch` (or `const run = eval`, etc.) declared inside a fn body followed by
 * `req(url)` in the same body bypasses SYN004–SYN047. SYN044 only covers module-scope aliases;
 * SYN048 closes the fn-body-local gap.
 *
 * SYN048 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN048: fn-body-local guarded-global alias call detection", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const req = fetch; req(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("fires on const run = eval; run(code) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  const run = eval\n" +
      "  return run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("fires on const later = setTimeout; later(cb, ms) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: () -> void, ms: number) -> void {\n" +
      "  const later = setTimeout\n" +
      "  later(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("fires on let alias = fetch; alias(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let alias = fetch\n" +
      "  return alias(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("fires on var f = fetch; f(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  var f = fetch\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return req(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN048");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("warning message mentions alias name and original global", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return req(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN048");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/req/);
    expect(w!.message).toMatch(/fetch/);
  });

  it("fires on optional call: req?.(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return req?.(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  // ── module-scope alias should fire SYN044 not SYN048 ─────────────────────

  it("module-scope alias fires SYN044 not SYN048", () => {
    const src =
      "?bs 0.7\n" +
      "const f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN044")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when alias call is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      '  return unsafe "calls fetch via local alias for legacy compat" { req(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "legacy fetch wrapper" fn load(url: string) -> any {\n' +
      "  const req = fetch\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire when req is a method call: obj.req()", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(obj: any, url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return obj.req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire when RHS is not a bare guarded global (member access: const req = globalThis.fetch)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = globalThis.fetch\n" +
      "  return req(url)\n" +
      "}\n";
    // SYN041 may fire on globalThis.fetch; SYN048 should not fire (RHS is a member access)
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire on non-guarded-global RHS: const f = myHelper", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const f = myHelper\n" +
      "  return f(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire when alias name is used as a value (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn ref() -> any {\n" +
      "  const req = fetch\n" +
      "  return req\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire on the alias declaration itself (const req = fetch line)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });

  it("does not fire in nested fn body (alias scoped to outer fn only)", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  const req = fetch\n" +
      "  fn inner(url: string) -> any {\n" +
      "    return req(url)\n" +
      "  }\n" +
      "  return inner\n" +
      "}\n";
    // The alias is declared in outer's body; calling req() inside inner's body
    // is in a nested scope — SYN048 should not fire for inner (only outer's pre-pass
    // collects it, and the dispatch loop for inner doesn't have fnLocalAliases48).
    // SYN044 also won't fire (module-scope only). This is a known gap documented in rule.
    expect(transform(src).warnings.some((w) => w.code === "SYN048")).toBe(false);
  });
});
