/**
 * Tests for SYN043: computed string bracket access on global receivers bypasses
 * SYN041 name-based detection (?bs 0.7+).
 *
 * `globalThis['fetch']`, `window['eval']`, and `self['setTimeout']` put the
 * dangerous global name inside a string literal where token-level ident checks
 * cannot see it; the capability bypass at runtime is identical to dot notation.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN043 — computed bracket access on global receiver (?bs 0.7+)", () => {
  // ── fires ─────────────────────────────────────────────────────────────────

  it("fires on globalThis['fetch']", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  globalThis['fetch'](url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on window['fetch'] (double quotes)", () => {
    const src =
      "?bs 0.7\n" +
      'fn load(url: string) -> void {\n' +
      '  window["fetch"](url)\n' +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on self['eval']", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> void {\n" +
      "  self['eval'](code)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on globalThis['eval']", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> void {\n" +
      "  globalThis['eval'](code)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on window['setTimeout']", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: () -> void) -> void {\n" +
      "  window['setTimeout'](cb, 0)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on globalThis['WebSocket']", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> void {\n" +
      "  const ws = globalThis['WebSocket'](url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on window['localStorage']", () => {
    const src =
      "?bs 0.7\n" +
      "fn store(key: string, value: string) -> void {\n" +
      "  window['localStorage'].setItem(key, value)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on globalThis['Function']", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeAdder() -> void {\n" +
      "  globalThis['Function']('return 1 + 1')\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on self['crypto']", () => {
    const src =
      "?bs 0.7\n" +
      "fn getRand() -> void {\n" +
      "  self['crypto'].getRandomValues(new Uint8Array(16))\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("fires on globalThis['Reflect'] (Reflect is in SYN041_DANGEROUS_MEMBERS)", () => {
    const src =
      "?bs 0.7\n" +
      "fn call(target: any) -> void {\n" +
      "  globalThis['Reflect'].apply(target, null, [])\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(true);
  });

  it("includes the dangerous name in the warning message", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  globalThis['fetch'](url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN043");
    expect(w).toBeDefined();
    expect(w!.message).toContain("fetch");
    expect(w!.message).toContain("globalThis");
  });

  // ── does NOT fire ─────────────────────────────────────────────────────────

  it("does NOT fire on globalThis.fetch (SYN041 handles dot notation)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  globalThis.fetch(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN043")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN041")).toBe(true);
  });

  it("does NOT fire on globalThis['harmlessMethod'] (not in dangerous set)", () => {
    const src =
      "?bs 0.7\n" +
      "fn go() -> void {\n" +
      "  globalThis['console'].log('ok')\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(false);
  });

  it("does NOT fire on globalThis['fetch'] inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> void {\n" +
      "  unsafe \"intentional global bracket access\" { globalThis['fetch'](url) }\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(false);
  });

  it("does NOT fire on unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"wraps global fetch\" fn load(url: string) -> void {\n" +
      "  globalThis['fetch'](url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(false);
  });

  it("does NOT fire on obj.globalThis['fetch'] (receiver is a member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn go(obj: any) -> void {\n" +
      "  obj.globalThis['fetch']('url')\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(false);
  });

  it("does NOT fire on globalThis[computedKey] (dynamic key, not string literal)", () => {
    const src =
      "?bs 0.7\n" +
      "fn go(key: string) -> void {\n" +
      "  globalThis[key]()\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> void {\n" +
      "  globalThis['fetch'](url)\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(false);
  });

  it("does NOT fire when ident is a fn declaration named globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "fn globalThis() -> void { }\n" +
      "fn go() -> void {\n" +
      "  globalThis()\n" +
      "}\n";
    expect(compile(src).warnings.some((w) => w.code === "SYN043")).toBe(false);
  });
});
