/**
 * Tests for SYN072: Reflect.get(<global-receiver>, '<dangerous-member>') bypass (?bs 0.7+).
 *
 * SYN072 fires when `Reflect.get` is called with a global-receiver token
 * (`globalThis`, `window`, `self`, `global`) as the first argument and a string
 * literal in SYN041_DANGEROUS_MEMBERS as the second argument. This is semantically
 * identical to `globalThis.eval` (SYN041) or `globalThis['eval']` (SYN043) at runtime,
 * but the key is encoded as a string argument, hiding the dangerous global from
 * both token-level checks.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN072: Reflect.get(<global-receiver>, '<dangerous-member>') bypass (?bs 0.7+)", () => {
  // ── fires cases: globalThis receiver ────────────────────────────────────────

  it("fires on Reflect.get(globalThis, 'eval')(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Reflect.get(globalThis, 'eval')(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  it("fires on Reflect.get(globalThis, 'fetch')(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return Reflect.get(globalThis, 'fetch')(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  it("fires on Reflect.get(globalThis, 'Function')(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return Reflect.get(globalThis, 'Function')(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  // ── fires cases: window receiver ────────────────────────────────────────────

  it("fires on Reflect.get(window, 'fetch')(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return Reflect.get(window, 'fetch')(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  it("fires on Reflect.get(window, 'eval')(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Reflect.get(window, 'eval')(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  // ── fires cases: self receiver ───────────────────────────────────────────────

  it("fires on Reflect.get(self, 'WebSocket')(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return Reflect.get(self, 'WebSocket')(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  // ── fires cases: global (Node.js) receiver ──────────────────────────────────

  it("fires on Reflect.get(global, 'eval')(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Reflect.get(global, 'eval')(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  // ── fires: stored result (no immediate call) ─────────────────────────────────

  it("fires when result is stored rather than immediately called", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const e = Reflect.get(globalThis, 'eval')\n" +
      "  return e(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(true);
  });

  // ── suppressed inside unsafe block ──────────────────────────────────────────

  it("does not fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return unsafe \"uses eval via Reflect.get for legacy compat\" { Reflect.get(globalThis, 'eval')(code) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(false);
  });

  // ── does not fire cases ──────────────────────────────────────────────────────

  it("does not fire for non-global receiver", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(obj: any, code: string) -> any {\n" +
      "  return Reflect.get(obj, 'eval')(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(false);
  });

  it("does not fire for non-dangerous member", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return Reflect.get(globalThis, 'location')\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(false);
  });

  it("does not fire for Reflect.apply (covered by SYN042)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(fn: any, args: any) -> any {\n" +
      "  return Reflect.apply(fn, null, args)\n" +
      "}\n";
    // SYN042 fires for apply; SYN072 should not
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(false);
  });

  it("does not fire for dynamic (non-literal) key", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return Reflect.get(globalThis, key)\n" +
      "}\n";
    // key is an ident, not a string literal — SYN072 does not fire (different check)
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(false);
  });

  it("does not fire for obj.Reflect.get (member access, not global Reflect)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(ns: any) -> any {\n" +
      "  return ns.Reflect.get(globalThis, 'eval')\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN072")).toBe(false);
  });

  // ── message content ──────────────────────────────────────────────────────────

  it("warning message names both the receiver and member", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Reflect.get(globalThis, 'eval')(code)\n" +
      "}\n";
    const w = transform(src).warnings.find((w) => w.code === "SYN072");
    expect(w).toBeDefined();
    expect(w?.message).toContain("globalThis");
    expect(w?.message).toContain("eval");
    expect(w?.message).toContain("Reflect.get");
  });
});
