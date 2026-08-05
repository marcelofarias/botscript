/**
 * Tests for SYN047: Node.js global receiver bypasses SYN041–SYN046 capability checks (?bs 0.7+).
 *
 * In Node.js, `global` is the native global object (runtime-equivalent to `globalThis`).
 * SYN041–SYN046 only watch `globalThis`, `window`, and `self` receivers, so
 * `global.fetch(url)`, `global['eval'](code)`, and `global.foo = val` bypass every
 * prior check.
 *
 * SYN047 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN047: Node.js global receiver bypass (?bs 0.7+)", () => {
  // ── dot-notation member access ───────────────────────────────────────────

  it("fires SYN047 on global.fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  global.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  it("fires SYN047 on global.eval", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> void {\n" +
      "  global.eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  it("fires SYN047 on global.WebSocket", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> void {\n" +
      "  global.WebSocket(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  it("fires SYN047 on global.setTimeout", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: () -> void) -> void {\n" +
      "  global.setTimeout(cb, 100)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  it("fires SYN047 on global.process member access (process is in dangerous members)", () => {
    const src =
      "?bs 0.7\n" +
      "fn check() -> void {\n" +
      "  global.process.exit(1)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  it("fires SYN047 on global?.fetch (optional chain)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  global?.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  // ── computed bracket access ──────────────────────────────────────────────

  it("fires SYN047 on global['fetch']", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  global['fetch'](url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  it("fires SYN047 on global[\"eval\"]", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> void {\n" +
      "  global[\"eval\"](code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  // ── property write ───────────────────────────────────────────────────────

  it("fires SYN047 on global.foo = val (property write)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setup(val: string) -> void {\n" +
      "  global.foo = val\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  it("fires SYN047 on global.count += 1 (compound assignment)", () => {
    const src =
      "?bs 0.7\n" +
      "fn increment() -> void {\n" +
      "  global.count += 1\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(true);
  });

  // ── suppression ──────────────────────────────────────────────────────────

  it("does not fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  unsafe \"uses fetch via Node global\" { global.fetch(url) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(false);
  });

  it("does not fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"uses Node global\" fn load(url: string) -> void {\n" +
      "  global.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(false);
  });

  // ── version gate ─────────────────────────────────────────────────────────

  it("does not fire at ?bs 0.6 (SYN047 requires 0.7+)", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> void {\n" +
      "  global.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(false);
  });

  // ── no-fire cases ────────────────────────────────────────────────────────

  it("does not fire on obj.global.fetch (global as a property, not the receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(obj: any, url: string) -> void {\n" +
      "  obj.global.fetch(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(false);
  });

  it("does not fire on fn declaration named global", () => {
    const src =
      "?bs 0.7\n" +
      "fn global(x: string) -> string {\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(false);
  });

  it("does not fire on global member access for non-dangerous members", () => {
    const src =
      "?bs 0.7\n" +
      "fn check() -> void {\n" +
      "  global.foo()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(false);
  });

  it("does not fire on global['nonDangerous']", () => {
    const src =
      "?bs 0.7\n" +
      "fn check() -> void {\n" +
      "  global['myProperty']()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN047")).toBe(false);
  });

  // ── diagnostic surface ────────────────────────────────────────────────────

  it("emits code SYN047 (not SYN041) for global.fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  global.fetch(url)\n" +
      "}\n";
    const warns = transform(src).warnings;
    expect(warns.some((w) => w.code === "SYN047")).toBe(true);
    expect(warns.some((w) => w.code === "SYN041")).toBe(false);
  });

  it("diagnostic message names the fn and the member", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> void {\n" +
      "  global.fetch(url)\n" +
      "}\n";
    const warn = transform(src).warnings.find((w) => w.code === "SYN047");
    expect(warn?.message).toContain("loadData");
    expect(warn?.message).toContain("global");
    expect(warn?.message).toContain("fetch");
  });

  it("fires SYN047 alongside other SYN checks when both patterns appear", () => {
    const src =
      "?bs 0.7\n" +
      "fn mixed(url: string) -> void {\n" +
      "  global.fetch(url)\n" +
      "  globalThis.fetch(url)\n" +
      "}\n";
    const warns = transform(src).warnings;
    expect(warns.some((w) => w.code === "SYN047")).toBe(true);
    expect(warns.some((w) => w.code === "SYN041")).toBe(true);
  });
});
