/**
 * Tests for SYN054: fn-body assignment-expression alias of a global receiver
 * used as member-access receiver in the same fn body bypasses SYN041–SYN053 (?bs 0.7+).
 *
 * `let g; g = globalThis` inside a fn body (bare assignment, not a declaration
 * initialiser) followed by `g.fetch(url)` in the same fn body bypasses all prior
 * SYN receiver-alias checks. SYN049 catches `const/let/var g = globalThis`
 * declarations inside fn bodies; SYN052 catches module-scope assignment aliases.
 * SYN054 closes the remaining fn-body bare-assignment gap.
 *
 * SYN054 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN054: fn-body assignment-expression alias of global receiver used as member-access receiver", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on g = globalThis inside fn body; g.fetch(url) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(true);
  });

  it("fires on g = window inside fn body; g.eval(code) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  let g: any\n" +
      "  g = window\n" +
      "  return g.eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(true);
  });

  it("fires on g = self inside fn body; g.setTimeout(cb, ms) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: any, ms: number) -> void {\n" +
      "  let g: any\n" +
      "  g = self\n" +
      "  g.setTimeout(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(true);
  });

  it("fires on g = globalThis inside fn body; g.WebSocket(url) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return g.WebSocket(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(true);
  });

  it("fires on optional-chain: g?.fetch(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return g?.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN054");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("includes the alias name and receiver global in the message", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let ns: any\n" +
      "  ns = globalThis\n" +
      "  return ns.fetch(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN054");
    expect(w).toBeDefined();
    expect(w!.message).toContain("ns");
    expect(w!.message).toContain("globalThis");
    expect(w!.message).toContain("fetch");
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when access is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      '  return unsafe "uses fetch via aliased globalThis for legacy compat" { g.fetch(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "legacy globals wrapper" fn load(url: string) -> any {\n' +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire when member is not in dangerous watch-list: g.someMethod()", () => {
    const src =
      "?bs 0.7\n" +
      "fn load() -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return g.someMethod()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire when RHS is not a receiver global: g = myObj", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = myObj\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire when RHS is a member access: g = obj.globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = obj.globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire when alias is itself a property of another object: obj.g.fetch()", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: any\n" +
      "  g = globalThis\n" +
      "  return obj.g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire when alias is declared via const/let/var (handled by SYN049)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    const warnings = transform(src).warnings;
    expect(warnings.some((w) => w.code === "SYN049")).toBe(true);
    expect(warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire when assignment is at module scope (handled by SYN052)", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    const warnings = transform(src).warnings;
    expect(warnings.some((w) => w.code === "SYN052")).toBe(true);
    expect(warnings.some((w) => w.code === "SYN054")).toBe(false);
  });

  it("does not fire when LHS is a member write: obj.g = globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  obj.g = globalThis\n" +
      "  return obj.g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN054")).toBe(false);
  });
});
