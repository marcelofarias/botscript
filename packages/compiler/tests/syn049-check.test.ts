/**
 * Tests for SYN049: fn-body-local alias of a global receiver used as member-access
 * receiver bypasses SYN041–SYN048 (?bs 0.7+).
 *
 * `const g = globalThis` inside a fn body followed by `g.fetch(url)` bypasses
 * SYN041 (which fires on `globalThis.X` but not `g.X`) and SYN048 (which fires
 * on direct-call aliases, not receiver aliases). SYN045 covers module-scope
 * receiver aliases; SYN049 closes the fn-body gap.
 *
 * SYN049 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN049: fn-body-local receiver alias used as member-access receiver", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const g = globalThis; g.fetch(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(true);
  });

  it("fires on const w = window; w.eval(code) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  const w = window\n" +
      "  return w.eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(true);
  });

  it("fires on const s = self; s.setTimeout(cb, ms) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: () -> void, ms: number) -> void {\n" +
      "  const s = self\n" +
      "  s.setTimeout(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(true);
  });

  it("fires on let g = globalThis; g.WebSocket(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  let g = globalThis\n" +
      "  return g.WebSocket(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(true);
  });

  it("fires on var g = globalThis; g.fetch(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  var g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(true);
  });

  it("fires on optional-chain: g?.fetch(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return g?.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN049");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when member access is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      '  return unsafe "calls fetch via aliased globalThis for legacy compat" { g.fetch(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "legacy fetch wrapper" fn load(url: string) -> any {\n' +
      "  const g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });

  it("does not fire when member is not in dangerous watch-list: g.someMethod()", () => {
    const src =
      "?bs 0.7\n" +
      "fn load() -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.someMethod()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });

  it("does not fire when g is not a receiver alias: const g = myObj", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = myObj\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });

  it("does not fire when g is itself a member access: const g = obj.globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = obj.globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });

  it("does not fire in nested fn body (alias scoped to outer fn only)", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  const g = globalThis\n" +
      "  fn inner(url: string) -> any {\n" +
      "    return g.fetch(url)\n" +
      "  }\n" +
      "  return inner\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });

  it("does not fire when alias is itself a member access target: obj.g.fetch()", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return obj.g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN049")).toBe(false);
  });
});
