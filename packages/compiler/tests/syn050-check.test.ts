/**
 * Tests for SYN050: fn-body-local destructuring rename of a guarded global called
 * through the alias bypasses SYN004–SYN049 name-token checks (?bs 0.7+).
 *
 * `const { fetch: req } = globalThis` inside a fn body followed by `req(url)` bypasses
 * SYN007 (token is `req`), SYN041 (token is `req` not `globalThis`), SYN046 (module-scope
 * only), and SYN050 (fn-body direct-call alias only). SYN046 covers module-scope
 * destructuring renames; SYN050 closes the fn-body gap.
 *
 * SYN050 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN050: fn-body-local destructuring rename of guarded global", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const { fetch: req } = globalThis; req(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(true);
  });

  it("fires on const { eval: run } = globalThis; run(code) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  const { eval: run } = globalThis\n" +
      "  return run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(true);
  });

  it("fires on const { setTimeout: later } = globalThis; later(cb, ms) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: () -> void, ms: number) -> void {\n" +
      "  const { setTimeout: later } = globalThis\n" +
      "  later(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(true);
  });

  it("fires on const { fetch: req } = window; req(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = window\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(true);
  });

  it("fires on const { fetch: req } = self; req(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = self\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(true);
  });

  it("fires on let { fetch: req } = globalThis; req(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let { fetch: req } = globalThis\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(true);
  });

  it("fires on var { fetch: req } = globalThis; req(url) inside fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  var { fetch: req } = globalThis\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  return req(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN050");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  // ── suppression cases ─────────────────────────────────────────────────────

  it("does not fire when alias call is inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      '  return unsafe "calls fetch via destructured alias for legacy compat" { req(url) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "legacy fetch wrapper" fn load(url: string) -> any {\n' +
      "  const { fetch: req } = globalThis\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire when RHS is not a global receiver: const { fetch: req } = myObj", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = myObj\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire when property is not guarded: const { someMethod: fn } = globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "fn load() -> any {\n" +
      "  const { someMethod: fn } = globalThis\n" +
      "  return fn()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire on non-renamed destructuring: const { fetch } = globalThis (fetch still fires SYN007)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch } = globalThis\n" +
      "  return fetch(url)\n" +
      "}\n";
    // SYN007 fires on the canonical `fetch` token; SYN050 should not fire
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire on the alias declaration itself", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire when req is used as a method target: obj.req()", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(obj: any, url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  return obj.req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });

  it("does not fire in nested fn body (alias scoped to outer fn only)", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  fn inner(url: string) -> any {\n" +
      "    return req(url)\n" +
      "  }\n" +
      "  return inner\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN050")).toBe(false);
  });
});
