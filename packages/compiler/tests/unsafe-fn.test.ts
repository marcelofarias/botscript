/**
 * Tests for declaration-level `unsafe "reason" fn` (issue #49).
 *
 * An `unsafe "reason" fn name(…)` declaration marks the fn itself as the
 * type-coercion trust boundary. Inside the body, bare `as` casts are allowed
 * without wrapping each cast in `unsafe "reason" { … }`. The justification
 * lives on the declaration, not at every call site.
 *
 * The enforcement activates at ?bs 0.5+ (same as UNS004).
 *
 * All test inputs are in canonical form (what `botscript fmt` produces), so
 * FMT001 does not fire and canonicalization bugs are not hidden.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

const compile = (src: string): string => transform(src).code;

// ---------------------------------------------------------------------------
// Basic: unsafe fn allows bare `as` inside the body
// ---------------------------------------------------------------------------

describe("unsafe fn — basic", () => {
  it("allows a bare `as` cast inside an unsafe fn body (?bs 0.5)", () => {
    const src = `?bs 0.5
unsafe "raw API response validated by schema" fn parseUser(raw: unknown) -> string = raw as string
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("emits a leading /* unsafe: … */ comment in the compiled output", () => {
    const src = `?bs 0.5
unsafe "raw API response validated by schema" fn parseUser(raw: unknown) -> string = raw as string
`;
    const out = compile(src);
    expect(out).toContain('/* unsafe: "raw API response validated by schema" */');
  });

  it("allows multiple `as` casts inside one unsafe fn body", () => {
    const src = `?bs 0.5
unsafe "all fields validated externally" fn coerce(a: unknown, b: unknown) -> string {
  const x = a as string;
  return x + (b as string);
}
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("callers do not need an unsafe context — fn is a normal call site", () => {
    const src = `?bs 0.5
unsafe "validated by schema" fn parseUser(raw: unknown) -> string = raw as string
fn loadUser(raw: unknown) -> string = parseUser(raw)
`;
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Async variant
// ---------------------------------------------------------------------------

describe("unsafe fn — async variant", () => {
  it("async unsafe fn is accepted and allows bare as inside", () => {
    const src = `?bs 0.5
unsafe "api response shape confirmed by integration test" async fn fetchUser(id: string) uses { net } -> Promise<string> {
  const resp = await http.get("https://api.example.com/users/" + id);
  return resp as string;
}
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("emits the unsafe comment before async function", () => {
    const src = `?bs 0.5
unsafe "test only" async fn asyncCoerce(x: unknown) -> Promise<string> = x as string
`;
    const out = compile(src);
    expect(out).toContain('/* unsafe: "test only" */');
    expect(out).toContain("async function asyncCoerce");
  });
});

// ---------------------------------------------------------------------------
// Bare `as` outside unsafe fn still fires UNS004
// ---------------------------------------------------------------------------

describe("unsafe fn — UNS004 still fires outside unsafe fn", () => {
  it("a bare `as` in a normal fn body still throws UNS004", () => {
    const src = `?bs 0.5
fn parse(raw: unknown) -> string = raw as string
`;
    expect(() => compile(src)).toThrow(/\[UNS004\]/);
  });

  it("a bare `as` in a normal fn body at file scope still throws UNS004", () => {
    const src = `?bs 0.5
const x = {} as string;
`;
    expect(() => compile(src)).toThrow(/\[UNS004\]/);
  });
});

// ---------------------------------------------------------------------------
// Validation: malformed unsafe fn still errors
// ---------------------------------------------------------------------------

describe("unsafe fn — validation", () => {
  it("unsafe with empty reason string throws UNS002", () => {
    const src = `?bs 0.5
unsafe "" fn parseUser(raw: unknown) -> string = raw as string
`;
    expect(() => compile(src)).toThrow(/\[UNS002\]/);
  });

  it("unsafe fn without a reason string: bare `as` in body throws UNS004 (not treated as unsafe fn)", () => {
    // `unsafe fn` without a reason string is not recognized as declaration-level
    // unsafe fn (the reason string is required). The body is not added to the
    // skip set, so any bare `as` inside still fires UNS004.
    const src = `?bs 0.5
unsafe fn parseUser(raw: unknown) -> string = raw as string
`;
    expect(() => compile(src)).toThrow(/\[UNS004\]/);
  });
});

// ---------------------------------------------------------------------------
// Modifier ordering: async may precede the unsafe prefix
// ---------------------------------------------------------------------------

describe("unsafe fn — async before unsafe modifier order", () => {
  it("async unsafe fn is accepted (async before unsafe prefix)", () => {
    const src = `?bs 0.5
async unsafe "validated externally" fn coerce(x: unknown) -> string = x as string
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("async unsafe fn emits async function (async is not dropped)", () => {
    const src = `?bs 0.5
async unsafe "test only" fn asyncCoerce(x: unknown) -> string = x as string
`;
    const out = compile(src);
    expect(out).toContain("async function asyncCoerce");
    expect(out).toContain('/* unsafe: "test only" */');
  });

  it("async unsafe fn allows bare as inside the body", () => {
    const src = `?bs 0.5
async unsafe "all externally verified" fn parseAll(raw: unknown) -> string = raw as string
`;
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Security: reason string containing `*/` does not break the block comment
// ---------------------------------------------------------------------------

describe("unsafe fn — comment injection prevention", () => {
  it("a reason string containing `*/` does not terminate the block comment early (declaration-level)", () => {
    const src = `?bs 0.5
unsafe "reason with */ inside" fn coerce(x: unknown) -> string = x as string
`;
    const out = compile(src);
    // The emitted comment must not contain a raw `*/` before the closing delimiter.
    // JSON.stringify escapes it so the comment is a single valid block comment.
    const commentMatch = out.match(/\/\* unsafe: (.*?) \*\//s);
    expect(commentMatch).not.toBeNull();
    expect(commentMatch![1]).not.toContain("*/");
  });

  it("an unsafe block reason containing `*/` does not terminate the block comment early", () => {
    const src = `?bs 0.3
const val = unsafe "reason with */ inside" { "ok" }
`;
    const out = compile(src);
    const commentMatch = out.match(/\/\* unsafe: (.*?) \*\//s);
    expect(commentMatch).not.toBeNull();
    expect(commentMatch![1]).not.toContain("*/");
  });
});

// ---------------------------------------------------------------------------
// Forward-compat: files below 0.5 are unaffected
// ---------------------------------------------------------------------------

describe("unsafe fn — version compat", () => {
  it("a file at ?bs 0.4 with unsafe fn syntax compiles without UNS004 (check is off)", () => {
    // passBareAs only runs at ?bs 0.5+; at 0.4, bare `as` is allowed everywhere.
    const src = `?bs 0.4
unsafe "legacy" fn coerce(x: unknown) -> string = x as string
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("without any ?bs pin (default version), UNS004 is not active", () => {
    const src = `unsafe "test" fn coerce(x: unknown) -> string = x as string
`;
    // LATEST_VERSION is 0.1; passBareAs only runs at 0.5+, so no UNS004.
    expect(() => compile(src)).not.toThrow();
  });
});
