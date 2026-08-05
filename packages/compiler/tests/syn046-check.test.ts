/**
 * Tests for SYN046: module-scope destructuring rename of a guarded global called
 * through the alias bypasses SYN004–SYN045 name-token checks (?bs 0.7+).
 *
 * `const { fetch: req } = globalThis` at module scope followed by `req(url)` inside
 * a fn body bypasses SYN007 (token is `req`, not `fetch`) and SYN044 (not a plain
 * binding). SYN046 detects the renamed-alias call and warns.
 *
 * SYN046 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN046: module-scope destructuring rename of guarded global", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const { fetch: req } = globalThis; req(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on const { eval: run } = globalThis; run(code) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const { eval: run } = globalThis\n" +
      "fn execute(code: string) -> any {\n" +
      "  return run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on const { setTimeout: defer } = globalThis; defer(fn, ms) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const { setTimeout: defer } = globalThis\n" +
      "fn schedule(fn: () -> void, ms: number) -> void {\n" +
      "  defer(fn, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on const { WebSocket: Sock } = globalThis; Sock(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const { WebSocket: Sock } = globalThis\n" +
      "fn connect(url: string) -> any {\n" +
      "  return Sock(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on destructuring from window", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = window\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on destructuring from self", () => {
    const src =
      "?bs 0.7\n" +
      "const { eval: run } = self\n" +
      "fn execute(code: string) -> any {\n" +
      "  return run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on let destructuring rename", () => {
    const src =
      "?bs 0.7\n" +
      "let { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on var destructuring rename", () => {
    const src =
      "?bs 0.7\n" +
      "var { eval: run } = globalThis\n" +
      "fn execute(code: string) -> any {\n" +
      "  return run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on multiple renames from same destructuring — one warning per call", () => {
    const src =
      "?bs 0.7\n" +
      "const { eval: run, fetch: req } = globalThis\n" +
      "fn a(code: string) -> any {\n" +
      "  return run(code)\n" +
      "}\n" +
      "fn b(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    const warns = transform(src).warnings.filter((w) => w.code === "SYN046");
    expect(warns.length).toBe(2);
  });

  it("fires when alias is called in multiple fns", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn a(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n" +
      "fn b(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    const warns = transform(src).warnings.filter((w) => w.code === "SYN046");
    expect(warns.length).toBe(2);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN046");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("message names alias, original global, and receiver", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN046");
    expect(w?.message).toContain("'req'");
    expect(w?.message).toContain("'fetch'");
    expect(w?.message).toContain("'globalThis'");
    expect(w?.message).toContain("SYN004");
  });

  // ── does NOT fire cases ──────────────────────────────────────────────────

  it("does NOT fire for non-renamed destructuring (const { fetch } = globalThis)", () => {
    // Non-renamed: fetch() would fire SYN007 on the canonical token
    const src =
      "?bs 0.7\n" +
      "const { fetch } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire for destructuring from non-receiver object", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = someOtherObj\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire for non-dangerous property rename", () => {
    const src =
      "?bs 0.7\n" +
      "const { document: doc } = globalThis\n" +
      "fn run() -> any {\n" +
      "  return doc\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire for fn-body-level destructuring rename (shadowing guard)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  return req(\"url\")\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire when alias used as member-access target (not a call)", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn run() -> any {\n" +
      "  return req\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire when alias is itself a property access (obj.req())", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn run(obj: any) -> any {\n" +
      "  return obj.req(\"url\")\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  unsafe \"calls fetch via destructuring rename for DI\" { return req(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "unsafe \"calls fetch via destructuring rename\" fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });

  it("does NOT fire for versions below 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "const { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN046")).toBe(false);
  });
});
