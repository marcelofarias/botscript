/**
 * Tests for SYN067: module-scope array-destructuring alias of a SYN-guarded global (?bs 0.7+).
 *
 * SYN067 fires when a SYN-guarded global (`eval`, `fetch`, `Function`, etc.) appears as
 * an element in an array literal on the RHS of a module-scope array-destructuring
 * declaration, and the corresponding LHS binding is called inside a fn body.
 *
 * Example: `const [e] = [eval]` at module scope; `e(code)` inside a fn body bypasses
 * SYN004 because the guarded ident `eval` is inside `[...]`, not in call position, and
 * `e` is not on any watchlist (SYN004–SYN066).
 *
 * SYN067 closes the gap: a module-scope pre-pass correlates the guarded global at
 * position N in the RHS array with the LHS ident at position N, and fires when that
 * ident is called in a fn body.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN067: module-scope array-destructuring alias of guarded global (?bs 0.7+)", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on const [e] = [eval]; e(code)", () => {
    const src =
      "?bs 0.7\n" +
      "const [e] = [eval]\n\n" +
      "fn run(code: string) -> any {\n" +
      "  return e(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("fires on const [r] = [fetch]; r(url)", () => {
    const src =
      "?bs 0.7\n" +
      "const [r] = [fetch]\n\n" +
      "fn load(url: string) -> any {\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("fires on const [make] = [Function]; make(body)()", () => {
    const src =
      "?bs 0.7\n" +
      "const [make] = [Function]\n\n" +
      "fn execute(body: string) -> any {\n" +
      "  return make(body)()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("fires when guarded global is at index 1: const [a, r] = [x, fetch]", () => {
    const src =
      "?bs 0.7\n" +
      "const something = 1\n" +
      "const [a, r] = [something, fetch]\n\n" +
      "fn load(url: string) -> any {\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("fires when guarded global is at index 2: const [a, b, e] = [x, y, eval]", () => {
    const src =
      "?bs 0.7\n" +
      "const x = 1\n" +
      "const y = 2\n" +
      "const [a, b, e] = [x, y, eval]\n\n" +
      "fn run(code: string) -> any {\n" +
      "  return e(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("fires with let destructuring", () => {
    const src =
      "?bs 0.7\n" +
      "let [r] = [fetch]\n\n" +
      "fn load(url: string) -> any {\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("fires with var destructuring", () => {
    const src =
      "?bs 0.7\n" +
      "var [r] = [fetch]\n\n" +
      "fn load(url: string) -> any {\n" +
      "  return r(url)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  it("warning message names the guarded global", () => {
    const src =
      "?bs 0.7\n" +
      "const [e] = [eval]\n\n" +
      "fn run(code: string) -> any {\n" +
      "  return e(code)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN067");
    expect(w).toBeDefined();
    expect(w!.message).toContain("eval");
    expect(w!.message).toContain("e");
    expect(w!.message).toContain("SYN004");
  });

  it("fires with tagged-template call form: e`code`", () => {
    const src =
      "?bs 0.7\n" +
      "const [e] = [eval]\n\n" +
      "fn run(code: string) -> any {\n" +
      "  return e`${code}`\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(true);
  });

  // ── does not fire cases ──────────────────────────────────────────────────

  it("does not fire when alias is suppressed with unsafe {}", () => {
    const src =
      "?bs 0.7\n" +
      "const [e] = [eval]\n\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "calls eval via array-destructure alias" { e(code) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(false);
  });

  it("does not fire for non-guarded globals in array", () => {
    const src =
      "?bs 0.7\n" +
      "const safeHelper = (x: string) => x\n" +
      "const [r] = [safeHelper]\n\n" +
      "fn run(x: string) -> string {\n" +
      "  return r(x)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(false);
  });

  it("does not fire when alias is used as a member-access receiver, not called directly", () => {
    const src =
      "?bs 0.7\n" +
      "const [e] = [eval]\n\n" +
      "fn run() -> any {\n" +
      "  return e.toString()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(false);
  });

  it("does not fire when the direct call fires SYN004 instead", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(false);
    expect(transform(src).warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("does not fire for fn-body-local array destructuring (module-scope only)", () => {
    // SYN067 only tracks module-scope declarations; fn-body local array destructuring
    // is not covered by this check (would be SYN068).
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const [e] = [eval]\n" +
      "  return e(code)\n" +
      "}\n";
    // This specific case is NOT caught by SYN067 (fn-body scope).
    // It may or may not fire another check, but SYN067 should not fire.
    expect(transform(src).warnings.some((w) => w.code === "SYN067")).toBe(false);
  });
});
