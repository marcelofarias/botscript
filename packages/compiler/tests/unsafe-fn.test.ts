/**
 * Tests for declaration-level `unsafe "reason" fn` (issue #49).
 *
 * An `unsafe "reason" fn name(…)` declaration marks the fn itself as the
 * type-coercion trust boundary. Inside the body, bare `as` casts are allowed
 * without wrapping each cast in `unsafe "reason" { … }`. The justification
 * lives on the declaration, not at every call site.
 *
 * The enforcement activates at ?bs 0.5+ (same as UNS004).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";
import { formatSource } from "../src/format/format.js";

function compile(src: string): string {
  return transform(formatSource(src)).code;
}

// ---------------------------------------------------------------------------
// Basic: unsafe fn allows bare `as` inside the body
// ---------------------------------------------------------------------------

describe("unsafe fn — basic", () => {
  it("allows a bare `as` cast inside an unsafe fn body (?bs 0.5)", () => {
    const src = `?bs 0.5
unsafe "raw API response validated by schema" fn parseUser(raw: unknown) -> string {
  return raw as string;
}
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("emits a leading /* unsafe: … */ comment in the compiled output", () => {
    const src = `?bs 0.5
unsafe "raw API response validated by schema" fn parseUser(raw: unknown) -> string {
  return raw as string;
}
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
unsafe "validated by schema" fn parseUser(raw: unknown) -> string {
  return raw as string;
}
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
unsafe "test only" async fn asyncCoerce(x: unknown) -> Promise<string> {
  return x as string;
}
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
fn parse(raw: unknown) -> string {
  return raw as string;
}
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
unsafe "" fn parseUser(raw: unknown) -> string {
  return raw as string;
}
`;
    expect(() => compile(src)).toThrow(/\[UNS002\]/);
  });

  it("unsafe fn without a reason string: bare `as` in body throws UNS004 (not treated as unsafe fn)", () => {
    // `unsafe fn` without a reason string is not recognized as declaration-level
    // unsafe fn (the reason string is required). The body is not added to the
    // skip set, so any bare `as` inside still fires UNS004.
    const src = `?bs 0.5
unsafe fn parseUser(raw: unknown) -> string {
  return raw as string;
}
`;
    expect(() => compile(src)).toThrow(/\[UNS004\]/);
  });
});

// ---------------------------------------------------------------------------
// Forward-compat: files below 0.5 are unaffected
// ---------------------------------------------------------------------------

describe("unsafe fn — version compat", () => {
  it("a file at ?bs 0.4 with unsafe fn syntax compiles without UNS004 (check is off)", () => {
    // passBareAs only runs at ?bs 0.5+; at 0.4, bare `as` is allowed everywhere.
    const src = `?bs 0.4
unsafe "legacy" fn coerce(x: unknown) -> string {
  return x as string;
}
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("without any ?bs pin (default version), UNS004 is not active", () => {
    const src = `unsafe "test" fn coerce(x: unknown) -> string {
  return x as string;
}
`;
    // LATEST_VERSION is 0.1; passBareAs only runs at 0.5+, so no UNS004.
    expect(() => compile(src)).not.toThrow();
  });
});
