/**
 * Tests for throws {} transitivity enforcement (?bs 0.9+).
 *
 * THR001: fn A calls fn B which throws { X }, but A doesn't declare throws { X }.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";
import { lex } from "../src/parser/lex.js";
import { parseFn } from "../src/parser/parse-fn.js";

function compile(src: string): string {
  return transform(src).code;
}

function parseFirstFn(src: string) {
  const tokens = lex(src);
  const fnIdx = tokens.findIndex((t) => t.kind === "keyword" && t.keyword === "fn");
  if (fnIdx === -1) throw new Error("no fn found");
  return parseFn(tokens, fnIdx, { allowGenerics: true, src });
}

// ---------------------------------------------------------------------------
// Parser-level: throws {} lands in FnDecl
// ---------------------------------------------------------------------------

describe("parseFn throws {}", () => {
  it("parses throws {} on a fn", () => {
    const decl = parseFirstFn(
      `fn fetchRemote(id: string) throws { HttpError, TimeoutError } -> string { return id; }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.throws).toEqual(["HttpError", "TimeoutError"]);
  });

  it("parses throws {} alongside uses/reads/writes", () => {
    const decl = parseFirstFn(
      `fn loadUser(id: string) uses { net } reads { cache } throws { HttpError } -> string { return id; }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.throws).toEqual(["HttpError"]);
    expect(decl!.reads).toEqual(["cache"]);
  });

  it("throws is undefined when not present", () => {
    const decl = parseFirstFn(`fn helper(id: string) -> string = id`);
    expect(decl).not.toBeNull();
    expect(decl!.throws).toBeUndefined();
  });

  it("throws {} is stripped from TS output", () => {
    const src = "fn fetchRemote(id: string) throws { HttpError } -> string = id\n";
    const out = compile(src);
    expect(out).not.toContain("throws {"); // the clause syntax specifically
    expect(out).not.toContain("HttpError"); // the exception type name
  });

  it("rejects duplicate throws {} clauses with SYN001", () => {
    const src = `fn bad(id: string) throws { HttpError } throws { TimeoutError } -> string = id`;
    expect(() => parseFirstFn(src)).toThrow("SYN001");
  });
});

// ---------------------------------------------------------------------------
// THR001: throws transitivity enforcement
// ---------------------------------------------------------------------------

describe("THR001: throws under-declared (0.9+)", () => {
  it("fires when a caller omits a direct callee's throws label", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) -> string = fetchRemote(id)\n";
    expect(() => compile(src)).toThrow("THR001");
    expect(() => compile(src)).toThrow(/fetchRemote.*throws \{ HttpError \}/);
  });

  it("fires when a caller omits a transitive (multi-hop) throws label", () => {
    const src =
      "?bs 0.9\n" +
      "fn callApi(id: string) throws { HttpError } -> string = id\n" +
      "fn fetchUser(id: string) throws { HttpError } -> string = callApi(id)\n" +
      "fn loadUser(id: string) -> string = fetchUser(id)\n";
    expect(() => compile(src)).toThrow("THR001");
    expect(() => compile(src)).toThrow(/loadUser/);
  });

  it("passes when the caller declares the missing throws label", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) throws { HttpError } -> string = fetchRemote(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes when the caller over-declares (extra types are fine)", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) throws { HttpError, TimeoutError } -> string = fetchRemote(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes for a fn that declares throws with no callees", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes for two fns with no throws calling each other", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = id\n" +
      "fn caller(id: string) -> string = helper(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) -> string = fetchRemote(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("reports multiple missing labels", () => {
    const src =
      "?bs 0.9\n" +
      "fn callApi(id: string) throws { HttpError, TimeoutError } -> string = id\n" +
      "fn loadUser(id: string) -> string = callApi(id)\n";
    expect(() => compile(src)).toThrow("THR001");
  });

  it("does not flag property-access calls as same-file callee (obj.helper)", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(id: string) throws { HttpError } -> string = id\n" +
      "fn caller(obj: { helper: (id: string) => string }, id: string) -> string = obj.helper(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("includes rewrite hint in error message", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) -> string = fetchRemote(id)\n";
    expect(() => compile(src)).toThrow(/throws \{ HttpError \}/);
  });

  it("works alongside reads/writes annotations without interference", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) reads { cache } throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) reads { cache } throws { HttpError } -> string = fetchRemote(id)\n";
    expect(() => compile(src)).not.toThrow();
  });
});
