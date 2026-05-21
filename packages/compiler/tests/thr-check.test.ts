/**
 * Tests for throws {} enforcement (?bs 0.9+).
 *
 * THR001: fn A calls fn B which throws { X }, but A doesn't declare throws { X }.
 * THR002: fn body constructs err(TypeName(...)), err(new TypeName(...)), or bare
 *         err(TypeName) where TypeName (CapCase) is not in throws {}.
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
    // HttpError appears only in the throws clause — not the fn name, param
    // types, or return type — so its absence in the output confirms stripping.
    const src = "fn fetchRemote(id: string) throws { HttpError } -> string = id\n";
    const out = compile(src);
    expect(out).toContain("fetchRemote"); // fn is present in output
    expect(out).not.toContain("throws {"); // clause is stripped
    expect(out).not.toContain("HttpError"); // exception type name is not leaked
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

  it("shows full 3-hop path in error message when the failing fn is defined first", () => {
    // loadAll is defined before fetchUser and callApi, so it is validated first.
    // Its path is loadAll -> fetchUser -> callApi (2 hops from the declaring fn),
    // exercising the multi-hop displayPath branch in mkError.
    const src =
      "?bs 0.9\n" +
      "fn loadAll() -> string = fetchUser()\n" +
      "fn fetchUser() -> string = callApi()\n" +
      "fn callApi() throws { NetworkError } -> string = \"x\"\n";
    expect(() => compile(src)).toThrow("THR001");
    expect(() => compile(src)).toThrow(/loadAll/);
    expect(() => compile(src)).toThrow(/transitively/);
    expect(() => compile(src)).toThrow(/fetchUser.*callApi/);
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

// ---------------------------------------------------------------------------
// THR002: undeclared error construction
// ---------------------------------------------------------------------------

describe("THR002: body constructs undeclared error type (0.9+)", () => {
  it("fires when body calls err(CapCase(...)) not in throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn parseConfig(s: string) throws { ParseError } -> Result<string, string> {\n" +
      "  if (bad) err(NetworkError(\"timed out\"))\n" +
      "  else ok(s)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR002");
    expect(() => compile(src)).toThrow(/NetworkError/);
  });

  it("fires when body calls err(CapCase) bare ref not in throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn build(s: string) -> Result<string, string> {\n" +
      "  if (bad) err(BuildError)\n" +
      "  else ok(s)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR002");
    expect(() => compile(src)).toThrow(/BuildError/);
  });

  it("fires when body calls err(new CapCase(...)) not in throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn connect(url: string) throws { TimeoutError } -> Result<string, string> {\n" +
      "  if (bad) err(new NetworkError(\"conn refused\"))\n" +
      "  else ok(url)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR002");
    expect(() => compile(src)).toThrow(/NetworkError/);
  });

  it("does not fire when the error type is declared in throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn parseConfig(s: string) throws { ParseError } -> Result<string, string> {\n" +
      "  if (bad) err(ParseError(\"invalid\"))\n" +
      "  else ok(s)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire for lowercase err(e) patterns (indirect, out of scope)", () => {
    const src =
      "?bs 0.9\n" +
      "fn wrap(s: string) -> Result<string, string> {\n" +
      "  const e = \"something failed\"\n" +
      "  err(e)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when the fn has no throws {} but body uses err(lowercase)", () => {
    const src =
      "?bs 0.9\n" +
      "fn fail(s: string) -> Result<string, string> = err(s)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn parseConfig(s: string) throws { ParseError } -> Result<string, string> {\n" +
      "  if (bad) err(NetworkError(\"timed out\"))\n" +
      "  else ok(s)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire for err as a property access (obj.err(...))", () => {
    const src =
      "?bs 0.9\n" +
      "fn handle(logger: { err: (x: string) => void }, s: string) -> string {\n" +
      "  logger.err(BadInput(\"oops\"))\n" +
      "  s\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when declared throws covers multiple error types including the constructed one", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) throws { HttpError, NetworkError } -> Result<string, string> {\n" +
      "  if (slow) err(NetworkError(\"timeout\"))\n" +
      "  else err(HttpError(\"404\"))\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("includes the undeclared type name in the error message", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> Result<string, string> {\n" +
      "  err(SyntaxError(\"bad input\"))\n" +
      "}\n";
    expect(() => compile(src)).toThrow(/SyntaxError/);
    expect(() => compile(src)).toThrow(/THR002/);
  });

  it("does not fire for err call inside an inner fn that itself declares the type", () => {
    const src =
      "?bs 0.9\n" +
      "fn outer(s: string) -> string {\n" +
      "  fn inner(x: string) throws { ParseError } -> Result<string, string> {\n" +
      "    err(ParseError(\"bad\"))\n" +
      "  }\n" +
      "  s\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

describe("THR003 — callback parameter throws not covered by containing fn", () => {
  it("fires when callback parameter declares throws { X } but outer fn has no throws clause", () => {
    const src =
      "?bs 0.9\n" +
      "fn process(\n" +
      "  items: string[],\n" +
      "  handler: (s: string) throws { NetworkError } -> void\n" +
      ") -> void {\n" +
      "  handler(items[0])\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR003");
    expect(() => compile(src)).toThrow(/process/);
    expect(() => compile(src)).toThrow(/NetworkError/);
  });

  it("fires when callback throws X but outer fn declares throws { Y } (missing X)", () => {
    const src =
      "?bs 0.9\n" +
      "fn apply(\n" +
      "  f: (s: string) throws { IoError } -> string\n" +
      ") throws { ParseError } -> string {\n" +
      "  f(\"x\")\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR003");
    expect(() => compile(src)).toThrow(/IoError/);
  });

  it("does not fire when outer fn's throws is a superset of callback throws", () => {
    const src =
      "?bs 0.9\n" +
      "fn process(\n" +
      "  items: string[],\n" +
      "  handler: (s: string) throws { NetworkError } -> void\n" +
      ") throws { NetworkError } -> void {\n" +
      "  handler(items[0])\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when outer fn over-declares (superset)", () => {
    const src =
      "?bs 0.9\n" +
      "fn wrap(\n" +
      "  f: () throws { IoError } -> void\n" +
      ") throws { IoError, ParseError } -> void {\n" +
      "  f()\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when callback parameter has no throws annotation", () => {
    const src =
      "?bs 0.9\n" +
      "fn run(\n" +
      "  action: (s: string) -> void\n" +
      ") -> void {\n" +
      "  action(\"x\")\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn process(\n" +
      "  handler: (s: string) throws { NetworkError } -> void\n" +
      ") -> void {\n" +
      "  handler(\"x\")\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("strips throws {} from callback parameter type in emitted TypeScript", () => {
    const src =
      "?bs 0.9\n" +
      "fn wrap(\n" +
      "  f: (s: string) throws { IoError } -> string\n" +
      ") throws { IoError } -> string {\n" +
      "  f(\"x\")\n" +
      "}\n";
    const out = compile(src);
    expect(out).not.toContain("throws");
    expect(out).not.toContain("IoError");
    expect(out).toContain("=> string");
  });

  it("collects throws from multiple callback parameters, fires when any are missing", () => {
    const src =
      "?bs 0.9\n" +
      "fn both(\n" +
      "  a: () throws { IoError } -> void,\n" +
      "  b: () throws { ParseError } -> void\n" +
      ") -> void {\n" +
      "  a()\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR003");
  });

  it("bs explain THR003 entry exists with rule, idiom, and rewrite", async () => {
    const { getErrorCode } = await import("../src/error-codes.js");
    const entry = getErrorCode("THR003");
    expect(entry).toBeDefined();
    expect(entry!.rule).toMatch(/throws/);
    expect(entry!.idiom).toBeDefined();
    expect(entry!.rewrite).toBeDefined();
  });
});
