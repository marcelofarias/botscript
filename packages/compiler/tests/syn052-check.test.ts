/**
 * Tests for SYN052: module-scope assignment-expression alias of a global receiver
 * used as member-access receiver in a fn body bypasses SYN041–SYN051 (?bs 0.7+).
 *
 * `let g; g = globalThis` at module scope (bare assignment, not a declaration
 * initialiser) followed by `g.fetch(url)` inside a fn body bypasses SYN041–SYN051:
 * those checks fire on the literal receiver tokens or on declaration-form aliases.
 * SYN045 covers the `const/let/var g = globalThis` declaration form; SYN052 closes
 * the bare assignment gap.
 *
 * SYN052 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN052: module-scope assignment-expression alias of global receiver used as member-access receiver", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on let g; g = globalThis at module scope; g.fetch(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(true);
  });

  it("fires on g = window at module scope; g.eval(code) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = window\n" +
      "fn execute(code: string) -> any {\n" +
      "  return g.eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(true);
  });

  it("fires on g = self at module scope; g.setTimeout(cb, ms) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = self\n" +
      "fn schedule(cb: any, ms: number) -> void {\n" +
      "  g.setTimeout(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(true);
  });

  it("fires on g = globalThis; g.WebSocket(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn connect(url: string) -> any {\n" +
      "  return g.WebSocket(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(true);
  });

  it("fires on optional-chain: g?.fetch(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g?.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(true);
  });

  it("fires when alias is used as receiver in multiple fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n" +
      "fn loadAlt(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    const w = transform(src).warnings.filter((w) => w.code === "SYN052");
    expect(w.length).toBeGreaterThanOrEqual(2);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN052");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("includes the alias name and receiver global in the message", () => {
    const src =
      "?bs 0.7\n" +
      "let ns: any\n" +
      "ns = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return ns.fetch(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN052");
    expect(w).toBeDefined();
    expect(w!.message).toContain("ns");
    expect(w!.message).toContain("globalThis");
    expect(w!.message).toContain("fetch");
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when access is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      '  return unsafe "uses fetch via aliased globalThis for legacy compat" { g.fetch(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      'unsafe "legacy globals wrapper" fn load(url: string) -> any {\n' +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire when member is not in dangerous watch-list: g.someMethod()", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load() -> any {\n" +
      "  return g.someMethod()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire when RHS is not a receiver global: g = myObj", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = myObj\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire when RHS is a member access: g = obj.globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = obj.globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire when alias is itself a property of another object: obj.g.fetch()", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return obj.g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire when assignment is inside a fn body (not module scope)", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any\n" +
      "fn load(url: string) -> any {\n" +
      "  g = globalThis\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire when alias is declared via const/let/var (handled by SYN045)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    // SYN045 fires, not SYN052
    const warnings = transform(src).warnings;
    expect(warnings.some((w) => w.code === "SYN045")).toBe(true);
    expect(warnings.some((w) => w.code === "SYN052")).toBe(false);
  });

  it("does not fire when LHS is a member write: obj.g = globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "obj.g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return obj.g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN052")).toBe(false);
  });
});
