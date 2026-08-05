/**
 * Tests for SYN045: module-scope global-receiver alias used as member-access receiver
 * in fn body bypasses SYN041–SYN043 (?bs 0.7+).
 *
 * `const g = globalThis` at module scope followed by `g.fetch(url)` inside a fn body
 * bypasses SYN041 because the receiver token is `g`, not `globalThis`.
 *
 * SYN045 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN045: module-scope global-receiver alias used as member-access receiver", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const g = globalThis; g.fetch(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires on const w = window; w.eval(code) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const w = window\n" +
      "fn run(code: string) -> any {\n" +
      "  return w.eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires on const s = self; s.setTimeout(fn, ms) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const s = self\n" +
      "fn schedule(fn: () -> void, ms: number) -> void {\n" +
      "  s.setTimeout(fn, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires on let g = globalThis; g.WebSocket(url) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let g = globalThis\n" +
      "fn connect(url: string) -> any {\n" +
      "  return g.WebSocket(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires on var g = globalThis; g.Function(code) in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "var g = globalThis\n" +
      "fn run(code: string) -> any {\n" +
      "  return g.Function(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires on optional chain g?.fetch(url)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g?.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires on const g = globalThis; g.Proxy(target, handler)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn wrap(target: any, handler: any) -> any {\n" +
      "  return g.Proxy(target, handler)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires on g.crypto access in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn rng() -> any {\n" +
      "  return g.crypto\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(true);
  });

  it("fires in multiple fns with same alias", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn a() -> any {\n" +
      "  return g.fetch(\"url\")\n" +
      "}\n" +
      "fn b() -> any {\n" +
      "  return g.eval(\"code\")\n" +
      "}\n";
    const warnings = transform(src).warnings.filter((w) => w.code === "SYN045");
    expect(warnings.length).toBe(2);
  });

  // ── does NOT fire cases ──────────────────────────────────────────────────

  it("does NOT fire on fn-body-level alias of globalThis (shadowing guard)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.fetch(\"url\")\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(false);
  });

  it("does NOT fire on non-dangerous member (g.document)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn run() -> any {\n" +
      "  return g.document\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(false);
  });

  it("does NOT fire when alias used as value (not receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn run() -> any {\n" +
      "  return g\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(false);
  });

  it("does NOT fire when alias is itself a property access target (obj.g.fetch)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn run(obj: any) -> any {\n" +
      "  return obj.g.fetch(\"url\")\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(false);
  });

  it("does NOT fire inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn run(url: string) -> any {\n" +
      "  unsafe \"uses fetch via aliased globalThis for DI\" { return g.fetch(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(false);
  });

  it("does NOT fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "unsafe \"uses fetch via aliased globalThis\" fn run(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(false);
  });

  it("does NOT fire for versions below 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "const g = globalThis\n" +
      "fn run(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN045")).toBe(false);
  });

  // ── message content ───────────────────────────────────────────────────────

  it("message names alias, original receiver, and member", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN045");
    expect(w?.message).toContain("'g'");
    expect(w?.message).toContain("globalThis");
    expect(w?.message).toContain("fetch");
    expect(w?.message).toContain("SYN041");
  });
});
