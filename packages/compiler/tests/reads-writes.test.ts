/**
 * Tests for reads {} / writes {} declarative annotations (?bs 0.8+).
 *
 * reads and writes are metadata: parsed and stored on FnDecl, stripped
 * from the TypeScript output. No enforcement in 0.8 — that comes later.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";
import { lex } from "../src/parser/lex.js";
import { parseFn } from "../src/parser/parse-fn.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function compile(src: string): string {
  return transform(src).code;
}

function parseFirstFn(src: string) {
  const tokens = lex(src);
  const fnIdx = tokens.findIndex((t) => t.kind === "keyword" && t.keyword === "fn");
  if (fnIdx === -1) throw new Error("no fn found");
  return parseFn(tokens, fnIdx, { allowGenerics: true });
}

// ---------------------------------------------------------------------------
// Parse-level tests: reads/writes land in FnDecl
// ---------------------------------------------------------------------------

describe("parseFn reads/writes", () => {
  it("parses reads {} on a fn", () => {
    const decl = parseFirstFn(
      `fn loadUser(id: string) reads { cache, db } -> string { return id; }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.reads).toEqual(["cache", "db"]);
    expect(decl!.writes).toBeUndefined();
  });

  it("parses writes {} on a fn", () => {
    const decl = parseFirstFn(
      `fn recordHit(id: string) uses { net } writes { metrics } -> void { }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.writes).toEqual(["metrics"]);
    expect(decl!.reads).toBeUndefined();
  });

  it("parses both reads {} and writes {} together", () => {
    const decl = parseFirstFn(
      `fn sync(id: string) reads { cache } writes { db, metrics } -> void { }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.reads).toEqual(["cache"]);
    expect(decl!.writes).toEqual(["db", "metrics"]);
  });

  it("parses reads and writes alongside uses and intent", () => {
    // parseFn is called directly here (no cap-check), so uses { net } is fine
    // even if the body doesn't call stdlib — cap-check runs in transform only.
    const decl = parseFirstFn(
      `fn loadUser(id: string) uses { net } reads { cache } writes { audit } intent: "net-fetcher" -> string { return id; }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.capabilities).toEqual(["net"]);
    expect(decl!.reads).toEqual(["cache"]);
    expect(decl!.writes).toEqual(["audit"]);
    expect(decl!.intent).toBe("net-fetcher");
  });

  it("parses writes before reads (any order)", () => {
    const decl = parseFirstFn(
      `fn process(x: string) writes { log } reads { store } -> void { }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.reads).toEqual(["store"]);
    expect(decl!.writes).toEqual(["log"]);
  });

  it("reads/writes with empty braces produce empty arrays", () => {
    const decl = parseFirstFn(
      `fn noop(x: string) reads { } writes { } -> void { }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.reads).toEqual([]);
    expect(decl!.writes).toEqual([]);
  });

  it("fn without reads/writes has undefined fields", () => {
    const decl = parseFirstFn(
      `fn slug(s: string) -> string = pure { s.toLowerCase() }`,
    );
    expect(decl).not.toBeNull();
    expect(decl!.reads).toBeUndefined();
    expect(decl!.writes).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Transform-level tests: reads/writes stripped from TS output
// ---------------------------------------------------------------------------

describe("reads/writes stripped from TypeScript output", () => {
  // Canonical form (?bs 0.4+): single-return bodies are rewritten to `= expr`;
  // every file ends with exactly one trailing newline.

  it("reads {} does not appear in compiled output", () => {
    const src = "?bs 0.8\nfn loadUser(id: string) reads { cache } -> string = id\n";
    const out = compile(src);
    expect(out).not.toContain("reads");
    expect(out).toContain("function loadUser");
  });

  it("writes {} does not appear in compiled output", () => {
    const src = "?bs 0.8\nfn recordHit(id: string) writes { metrics } -> void {\n}\n";
    const out = compile(src);
    expect(out).not.toContain("writes");
    expect(out).toContain("function recordHit");
  });

  it("reads and writes together are both stripped", () => {
    const src = "?bs 0.8\nfn sync(id: string) reads { cache } writes { db } -> void {\n}\n";
    const out = compile(src);
    expect(out).not.toContain("reads");
    expect(out).not.toContain("writes");
    expect(out).toContain("function sync");
  });

  it("reads/writes alongside uses and intent are all stripped", () => {
    // No stdlib usage in body, so no uses {} needed — keeps the test focused.
    const src =
      `?bs 0.8\nfn process(id: string) reads { cache } writes { audit } intent: "pure" -> string = id\n`;
    const out = compile(src);
    expect(out).not.toContain("reads");
    expect(out).not.toContain("writes");
    expect(out).not.toContain("intent");
    // capabilities array is empty (no uses {}) — $enter gets []
    expect(out).toContain("function process");
  });

  it("fn body is correct after reads/writes stripped", () => {
    const src = "?bs 0.8\nfn double(n: number) reads { } writes { } -> number = n * 2\n";
    const out = compile(src);
    expect(out).toContain("n * 2");
    expect(out).toContain("function double");
  });
});

// ---------------------------------------------------------------------------
// Duplicate annotation detection
// ---------------------------------------------------------------------------

describe("parseFn duplicate reads/writes", () => {
  it("returns null for duplicate reads {} annotations", () => {
    // The second reads {} is treated as a parse error (not a silent overwrite).
    const tokens = lex(
      `fn dup(id: string) reads { cache } reads { db } -> string = id`,
    );
    const fnIdx = tokens.findIndex((t) => t.kind === "keyword" && t.keyword === "fn");
    const decl = parseFn(tokens, fnIdx, { allowGenerics: true });
    expect(decl).toBeNull();
  });

  it("returns null for duplicate writes {} annotations", () => {
    const tokens = lex(
      `fn dup(id: string) writes { metrics } writes { audit } -> void { }`,
    );
    const fnIdx = tokens.findIndex((t) => t.kind === "keyword" && t.keyword === "fn");
    const decl = parseFn(tokens, fnIdx, { allowGenerics: true });
    expect(decl).toBeNull();
  });

  it("returns null for duplicate intent: annotations", () => {
    // The second intent: is treated as a parse error (not a silent overwrite).
    const tokens = lex(
      `fn dup(id: string) intent: "pure" intent: "idempotent" -> string = id`,
    );
    const fnIdx = tokens.findIndex((t) => t.kind === "keyword" && t.keyword === "fn");
    const decl = parseFn(tokens, fnIdx, { allowGenerics: true });
    expect(decl).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Version gate: reads/writes parse silently under earlier pins too
// (parseFn is version-agnostic; the check level, not parse level, is gated)
// ---------------------------------------------------------------------------

describe("reads/writes parse under earlier pins (forward compat)", () => {
  it("reads {} on ?bs 0.7 compiles without error", () => {
    // parseFn is not version-gated — it accepts reads/writes under any pin.
    // No uses {} to avoid CAP002; body is a pure transform.
    const src = "?bs 0.7\nfn loadUser(id: string) reads { cache } -> string = id\n";
    expect(() => compile(src)).not.toThrow();
    expect(compile(src)).not.toContain("reads");
  });
});
