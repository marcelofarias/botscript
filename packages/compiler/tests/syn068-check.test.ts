/**
 * Tests for SYN068: fn-body-local array-destructuring alias of a SYN-guarded global (?bs 0.7+).
 *
 * SYN068 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) appears as
 * an element in an array literal on the RHS of a fn-body-local array-destructuring
 * declaration, and the corresponding LHS binding is called within the same fn body.
 *
 * Example: `const [e] = [eval]` inside a fn body; `e(code)` in the same fn bypasses
 * SYN004 because the guarded ident `eval` is inside `[...]`, not in call position, and
 * `e` is not on any watchlist (SYN004–SYN067).
 *
 * SYN068 closes the fn-body gap left by SYN067 (which only covers module-scope declarations):
 * a per-fn pre-pass correlates the guarded global at position N in the RHS array with the
 * LHS ident at position N, and fires when that ident is called in the same fn body.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN068: fn-body-local array-destructuring alias of guarded global (?bs 0.7+)", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const [e] = [eval]; e(code) in same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const [e] = [eval]\n" +
      "  return e(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires on const [r] = [fetch]; r(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const [r] = [fetch]\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires on const [make] = [Function]; make(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  const [make] = [Function]\n" +
      "  return make(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires when guarded global is at index 1: const [a, r] = [x, fetch]", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(x: any, url: string) -> any {\n" +
      "  const [a, r] = [x, fetch]\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires when guarded global is at index 2: const [a, b, e] = [x, y, eval]", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const [a, b, e] = [1, 2, eval]\n" +
      "  return e(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires with let destructuring in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let [r] = [fetch]\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires with var destructuring in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  var [r] = [fetch]\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires with WebSocket guarded global", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  const [WS] = [WebSocket]\n" +
      "  return new WS(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("fires with tagged-template call form: e`code`", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const [e] = [eval]\n" +
      "  return e`${code}`\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(true);
  });

  it("warning message names the guarded global and alias", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const [e] = [eval]\n" +
      "  return e(code)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN068");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("e");
    expect(w!.message).toContain("SYN004");
  });

  it("fires in each fn that has its own local alias", () => {
    const src =
      "?bs 0.7\n" +
      "fn first(code: string) -> any {\n" +
      "  const [e] = [eval]\n" +
      "  return e(code)\n" +
      "}\n" +
      "fn second(url: string) -> any {\n" +
      "  const [r] = [fetch]\n" +
      "  return r(url)\n" +
      "}\n";
    const warnings = transform(src).warnings.filter((w) => w.code === "SYN068");
    expect(warnings.length).toBe(2);
  });

  // ── does not fire cases ──────────────────────────────────────────────────

  it("does not fire when alias is suppressed with unsafe {}", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const [e] = [eval]\n" +
      '  return unsafe "calls eval via local array-destructure alias" { e(code) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(false);
  });

  it("does not fire for non-guarded globals in array", () => {
    const src =
      "?bs 0.7\n" +
      "const safeHelper = (x: string) => x\n" +
      "fn run(x: string) -> string {\n" +
      "  const [r] = [safeHelper]\n" +
      "  return r(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(false);
  });

  it("does not fire when alias is used as a member-access receiver, not called directly", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const [e] = [eval]\n" +
      "  return e.toString()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(false);
  });

  it("does not fire when the direct call fires SYN004 instead", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(false);
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("does not fire for module-scope array destructuring (covered by SYN067)", () => {
    const src =
      "?bs 0.7\n" +
      "const [e] = [eval]\n\n" +
      "fn run(code: string) -> any {\n" +
      "  return e(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(false);
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("does not fire when alias is not called (just declared)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> string {\n" +
      "  const [e] = [eval]\n" +
      "  return code.toUpperCase()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(false);
  });

  it("does not fire in unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "eval-adapter" fn run(code: string) -> any {\n' +
      "  const [e] = [eval]\n" +
      "  return e(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN068")).toBe(false);
  });
});
