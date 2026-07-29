/**
 * Tests for UNS007: stale unsafe block — body contains no identifier tokens
 * (?bs 0.9+).
 *
 * Fires when an `unsafe "reason" { body }` block's body contains NO ident
 * tokens — meaning only literals (numbers, strings), operators, and
 * punctuation. Such a body CANNOT need the unsafe wrapper: no cast, no fn
 * call, no bypass pattern, no Result-returning call.
 *
 * Does NOT fire when:
 *   - body contains any ident (local var, fn call, true/false/null, `as`, etc.)
 *   - body contains any keyword (fn, return, new, ...)
 *   - version < 0.9
 *   - the form is `unsafe "reason" fn` (declaration-level)
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// Firing cases — body has no ident tokens at all
// ---------------------------------------------------------------------------

describe("UNS007: stale unsafe block fires (pure literal body)", () => {
  it("fires on a numeric literal body", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "stale" { 42 };\n';
    expect(() => compile(src)).toThrow("UNS007");
  });

  it("fires on a string literal body", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "stale" { "hello" };\n';
    expect(() => compile(src)).toThrow("UNS007");
  });

  it("fires on an arithmetic-only body", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "stale" { 1 + 2 };\n';
    expect(() => compile(src)).toThrow("UNS007");
  });

  it("fires on a negation-only body", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "stale" { -1 };\n';
    expect(() => compile(src)).toThrow("UNS007");
  });

  it("fires inside a fn body (not just top-level)", () => {
    const src =
      "?bs 0.9\n" +
      "fn compute(n: number) -> number {\n" +
      '  unsafe "dead" { 999 }\n' +
      "}\n";
    expect(() => compile(src)).toThrow("UNS007");
  });
});

// ---------------------------------------------------------------------------
// Non-firing cases — body has idents (any ident suppresses the diagnostic)
// ---------------------------------------------------------------------------

describe("UNS007: does not fire when body has any ident", () => {
  it("does not fire when body contains a local fn call", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "was needed once" { someLocalFn(42) };\n';
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body contains an ident reference", () => {
    const src =
      "?bs 0.9\n" +
      "const y = 5;\n" +
      'const x = unsafe "stale" { y };\n';
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body contains `true`", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "stale" { true };\n';
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body contains `null`", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "stale" { null };\n';
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body contains an `as` cast", () => {
    const src =
      "?bs 0.9\n" +
      'const x = unsafe "json() returns any" { (data as User) };\n';
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body contains a stdlib http call", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      '  unsafe "fire and forget" { http.get(url) }\n' +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body wraps a throw", () => {
    const src =
      "?bs 0.9\n" +
      "fn fail() -> never {\n" +
      '  unsafe "must throw" { throw new Error("oops") }\n' +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body wraps a console call", () => {
    const src =
      "?bs 0.9\n" +
      "fn dbg() -> void {\n" +
      '  unsafe "debug" { console.log("hi") }\n' +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire when body discards a Result-returning call (RES002 suppression)", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) -> void {\n" +
      '  unsafe "intentional discard" { saveUser(user) }\n' +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS007");
  });
});

// ---------------------------------------------------------------------------
// Version gate
// ---------------------------------------------------------------------------

describe("UNS007: version gate", () => {
  it("does not fire at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      'const x = unsafe "stale" { 42 };\n';
    expect(() => compile(src)).not.toThrow("UNS007");
  });

  it("does not fire at ?bs 0.5", () => {
    const src =
      "?bs 0.5\n" +
      'const x = unsafe "stale" { 42 };\n';
    expect(() => compile(src)).not.toThrow("UNS007");
  });
});

// ---------------------------------------------------------------------------
// Declaration-level unsafe fn: not checked
// ---------------------------------------------------------------------------

describe("UNS007: does not fire on unsafe fn declarations", () => {
  it("passes on unsafe fn with pure numeric body", () => {
    const src =
      "?bs 0.9\n" +
      'unsafe "opaque" fn trivial() -> number {\n' +
      "  42\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow("UNS007");
  });
});
