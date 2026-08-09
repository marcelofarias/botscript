/**
 * Tests for SYN066: inline object-literal property alias bypass (?bs 0.7+).
 *
 * SYN066 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) is stored
 * as a named property value in an inline object literal and that property is immediately
 * dot-called on the same object inside a fn body.
 *
 * Example: `{ exec: eval }.exec(code)` or `({ run: fetch }).run(url)`.
 *
 * The per-ident call-position checks (SYN004, SYN007, …) only fire when the guarded
 * ident is directly followed by `(` or `?.(`. Inside `{ exec: eval }`, `eval` is
 * followed by `}` — no call-position match. Alias-binding checks (SYN044–SYN065)
 * track binding declarations, not object-property value assignments.
 *
 * SYN066 closes the gap by correlating the property value with the property call site
 * on the immediately following expression.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN066: inline object-literal property alias bypass (?bs 0.7+)", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on { exec: eval }.exec(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }.exec(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(true);
  });

  it("fires on paren-wrapped ({ run: eval }).run(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ({ run: eval }).run(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(true);
  });

  it("fires on ({ run: fetch }).run(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return ({ run: fetch }).run(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(true);
  });

  it("fires on { make: Function }.make(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return { make: Function }.make(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(true);
  });

  it("fires on { go: setTimeout }.go(cb, ms)", () => {
    const src =
      "?bs 0.7\n" +
      "fn schedule(cb: () -> void, ms: number) -> void {\n" +
      "  ({ go: setTimeout }).go(cb, ms)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(true);
  });

  it("fires on { sock: WebSocket }.sock(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return { sock: WebSocket }.sock(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(true);
  });

  it("fires on optional-chain call { exec: eval }?.exec(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }?.exec(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(true);
  });

  it("produces warning severity (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }.exec(code)\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN066");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  // ── suppression ──────────────────────────────────────────────────────────

  it("does not fire when wrapped in unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return unsafe \"direct eval needed for sandbox\" { { exec: eval }.exec(code) }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(false);
  });

  // ── no false positives ────────────────────────────────────────────────────

  it("does not fire on direct eval(code) — covered by SYN004 not SYN066", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN066")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("does not fire when property called does not match the guarded-global key", () => {
    // { exec: eval }.other() — .other() not the aliased property
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }.other(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(false);
  });

  it("does not fire on object with guarded-global as property key (not value)", () => {
    // { eval: someOtherFn } — eval is the key, not the guarded value
    const src =
      "?bs 0.7\n" +
      "fn run(x: any) -> any {\n" +
      "  return { eval: (s: string) => s }.eval(\"safe\")\n" +
      "}\n";
    // eval the key is not in guarded-global value position
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(false);
  });

  it("does not fire on object property access without call (no trailing open paren)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return { exec: eval }.exec\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }.exec(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN066")).toBe(false);
  });

  // ── no cross-check with SYN004 ─────────────────────────────────────────

  it("does not also fire SYN004 for the same inline-object-property form", () => {
    // SYN004 requires eval in direct call position — not the case here
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }.exec(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN066")).toBe(true);
  });
});
