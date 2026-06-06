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

  it("fires with 'has no throws clause' message when fn has no throws annotation", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> Result<string, string> {\n" +
      "  err(ParseError(\"bad\"))\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string; message: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("THR002");
      expect(err.diagnostics?.[0]?.message).toMatch(/has no throws clause/);
    }
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

  it("does not fire when err(TypeName(...)) is used in a Result<T, TypeName>-returning fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn parseId(raw: string) intent: \"pure\" -> Result<string, ParseError> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok(raw)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when err(new TypeName(...)) is used in a Result<T, TypeName>-returning fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn parseId(raw: string) -> Result<string, ParseError> {\n" +
      "  if (!raw) return err(new ParseError(\"invalid\"))\n" +
      "  return ok(raw)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when bare err(TypeName) is used in a Result<T, TypeName>-returning fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn fail() -> Result<string, ParseError> = err(ParseError)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("still fires when TypeName is in T (success type) but not E (error type) of Result", () => {
    const src =
      "?bs 0.9\n" +
      "fn wrap() -> Result<ParseError, string> = err(ParseError(\"x\"))\n";
    expect(() => compile(src)).toThrow("THR002");
  });

  it("does not fire for Result<T, E1 | E2> when both error types are constructed", () => {
    const src =
      "?bs 0.9\n" +
      "fn parseOrFetch(raw: string) -> Result<string, ParseError | NetworkError> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return err(NetworkError(\"timeout\"))\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when return type has whitespace before the `<` in `Result <T, E>`", () => {
    const src =
      "?bs 0.9\n" +
      "fn parseId(raw: string) -> Result <string, ParseError> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok(raw)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when success type T is a tuple/array with commas", () => {
    // Commas inside `[A, B]` must not be mistaken for the Result<T, E> separator.
    const src =
      "?bs 0.9\n" +
      "fn parsePair(raw: string) -> Result<[string, number], ParseError> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok([raw, 1])\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when success type T contains `->` (arrow type, not generic close)", () => {
    // The `>` in `->` must not decrement angle-bracket depth — it is part of an
    // arrow-type token, not a generic close. Without this guard the scanner exits
    // Result<…> prematurely and misidentifies the error type position.
    const src =
      "?bs 0.9\n" +
      "fn parseItem(raw: string) -> Result<(x: string) -> string, ParseError> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok((x: string) -> x)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when success type T contains `=>` (fat-arrow callback type, not generic close)", () => {
    // The `>` in `=>` must not decrement angle-bracket depth, same as `->`.
    // Without this guard the scanner exits Result<…> prematurely and
    // misidentifies the error type position.
    const src =
      "?bs 0.9\n" +
      "fn parseItem(raw: string) -> Result<(x: string) => string, ParseError> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok((x: string) => x)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("still fires when the error type in Result is ParseError[] (array), not ParseError", () => {
    // `ParseError[]` (array) is distinct from the bare `ParseError` ident.
    // Suppression should NOT apply — `ParseError` is absent from the declared
    // Result<T, E> error position when E is `ParseError[]`.
    const src =
      "?bs 0.9\n" +
      "fn parseId(raw: string) -> Result<string, ParseError[]> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok(raw)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR002");
  });

  it("still fires when error type in Result is ParseError [] (with trivia before [)", () => {
    // `ParseError []` with whitespace before `[` is still an array type.
    // leadingIdent() must skip past the trivia when checking for the array suffix.
    const src =
      "?bs 0.9\n" +
      "fn parseId(raw: string) -> Result<string, ParseError []> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok(raw)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR002");
  });

  it("does not fire when err(TypeName(...)) is used in a fn returning Promise<Result<T, TypeName>>", () => {
    // Fns returning `Promise<Result<T, E>>` still signal errors through Result —
    // THR002 suppression must cover this form.
    const src =
      "?bs 0.9\n" +
      "fn fetchUser(id: string) -> Promise<Result<string, ParseError>> {\n" +
      "  if (!id) return err(ParseError(\"invalid id\"))\n" +
      "  return ok(id)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("still fires when the error type in Result is ParseError<T>[] (generic array), not ParseError", () => {
    // `ParseError<T>[]` is an array type — distinct from the bare `ParseError<T>` generic.
    // Suppression must NOT apply: `ParseError` (without the generic+array suffix) is absent.
    const src =
      "?bs 0.9\n" +
      "fn parseId(raw: string) -> Result<string, ParseError<string>[]> {\n" +
      "  if (!raw) return err(ParseError(\"invalid\"))\n" +
      "  return ok(raw)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR002");
  });

  it("does not fire when err(new TypeName(...)) is used in a Promise<Result<T, TypeName>>-returning fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchUser(id: string) -> Promise<Result<string, ParseError>> {\n" +
      "  if (!id) return err(new ParseError(\"invalid id\"))\n" +
      "  return ok(id)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});
