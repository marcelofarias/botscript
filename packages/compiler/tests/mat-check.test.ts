/**
 * Tests for MAT001/MAT002/MAT003: non-exhaustive match (?bs 0.9+).
 *
 * MAT001: fires when a Result match has an ok arm but no err arm (or vice versa) and no wildcard.
 * MAT002: fires when an Option match has a some arm but no none arm (or vice versa) and no wildcard.
 * MAT003: fires when a match on a user-defined tagged union is missing at least one variant arm.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// MAT001: missing err arm
// ---------------------------------------------------------------------------

describe("MAT001: missing err arm", () => {
  it("fires when a match has ok arm but no err arm", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> value\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT001");
    expect(() => compile(src)).toThrow(/missing 'err' arm/);
  });

  it("fires when await-wrapped call is the scrutinee and err arm is missing", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  match await http.get(url) {\n" +
      "    ok { value } -> value\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT001");
  });
});

// ---------------------------------------------------------------------------
// MAT001: missing ok arm
// ---------------------------------------------------------------------------

describe("MAT001: missing ok arm", () => {
  it("fires when a match has err arm but no ok arm", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  match http.get(url) {\n" +
      "    err { e } -> e\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT001");
    expect(() => compile(src)).toThrow(/missing 'ok' arm/);
  });
});

// ---------------------------------------------------------------------------
// MAT001: suppression
// ---------------------------------------------------------------------------

describe("MAT001: suppressed when exhaustive", () => {
  it("does not fire when both ok and err arms are present", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { e } -> err(e)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when a wildcard arm covers the missing err", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    _ -> err(\"failed\")\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when a wildcard arm covers the missing ok", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  match http.get(url) {\n" +
      "    err { e } -> e\n" +
      "    _ -> \"default\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire for a match with no ok/err tag arms (non-ok/err patterns)", () => {
    const src =
      "?bs 0.9\n" +
      "fn classify(x: number) -> string {\n" +
      "  match x {\n" +
      "    1 -> \"one\"\n" +
      "    _ -> \"other\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> value\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// MAT001: diagnostic fields
// ---------------------------------------------------------------------------

describe("MAT001: diagnostic code and message", () => {
  it("throws BotscriptError with MAT001 code", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> value\n" +
      "  }\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("MAT001");
    }
  });
});

// ---------------------------------------------------------------------------
// MAT002: Option match exhaustiveness
// ---------------------------------------------------------------------------

describe("MAT002: missing none arm", () => {
  it("fires when a match has some arm but no none arm", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: Option<string>) -> string {\n" +
      "  match name {\n" +
      "    some { v } -> `Hello, ${v}`\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT002");
    expect(() => compile(src)).toThrow(/missing 'none' arm/);
  });
});

describe("MAT002: missing some arm", () => {
  it("fires when a match has none arm but no some arm", () => {
    const src =
      "?bs 0.9\n" +
      "fn describe(opt: Option<number>) -> string {\n" +
      "  match opt {\n" +
      "    none -> \"empty\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT002");
    expect(() => compile(src)).toThrow(/missing 'some' arm/);
  });
});

describe("MAT002: suppressed when exhaustive", () => {
  it("does not fire when both some and none arms are present", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: Option<string>) -> string {\n" +
      "  match name {\n" +
      "    some { v } -> `Hello, ${v}`\n" +
      "    none -> \"Hello, stranger\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when a wildcard arm covers the missing none", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: Option<string>) -> string {\n" +
      "  match name {\n" +
      "    some { v } -> `Hello, ${v}`\n" +
      "    _ -> \"Hello, stranger\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn greet(name: Option<string>) -> string {\n" +
      "  match name {\n" +
      "    some { v } -> `Hello, ${v}`\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire for a match with no some/none arms", () => {
    const src =
      "?bs 0.9\n" +
      "fn classify(x: number) -> string {\n" +
      "  match x {\n" +
      "    0 -> \"zero\"\n" +
      "    _ -> \"nonzero\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

describe("MAT002: MAT001 and MAT002 do not interfere", () => {
  it("MAT001 still fires for ok/err incomplete match", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      "  match http.get(url) {\n" +
      "    ok { v } -> v\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT001");
  });

  it("MAT002 fires for some/none incomplete match without affecting ok/err", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: Option<string>) -> string {\n" +
      "  match name {\n" +
      "    some { v } -> `Hello, ${v}`\n" +
      "  }\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("MAT002");
    }
  });
});

// ---------------------------------------------------------------------------
// MAT003: user-defined tagged union exhaustiveness
// ---------------------------------------------------------------------------

// Status canonical form: variants sorted alphabetically — Done, Failed, Loading
const STATUS_TYPE = "type Status = Done { value: string } | Failed { code: number } | Loading\n";
// Shape canonical form: Circle, Square, Triangle (C < S < T)
const SHAPE_TYPE = "type Shape = Circle { r: number } | Square { side: number } | Triangle { base: number }\n";
// Toggle canonical form: Off, On (alphabetical by second char: 'f' < 'n')
const TOGGLE_TYPE = "type Toggle = Off | On { value: boolean }\n";

describe("MAT003: missing variant arm on user-defined tagged union", () => {
  it("fires when a match is missing one variant of a three-variant union", () => {
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Done { value } -> value\n" +
      "    Loading -> \"loading...\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT003");
    expect(() => compile(src)).toThrow(/Failed/);
  });

  it("fires when only one of three variants is covered", () => {
    const src =
      "?bs 0.9\n" +
      SHAPE_TYPE +
      "fn area(s: Shape) -> number {\n" +
      "  match s {\n" +
      "    Circle { r } -> r\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT003");
    expect(() => compile(src)).toThrow(/Square.*Triangle|Triangle.*Square/);
  });

  it("fires for a two-variant union with only one arm", () => {
    const src =
      "?bs 0.9\n" +
      TOGGLE_TYPE +
      "fn isOn(t: Toggle) -> boolean {\n" +
      "  match t {\n" +
      "    On { value } -> value\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("MAT003");
    expect(() => compile(src)).toThrow(/Off/);
  });
});

describe("MAT003: suppressed when exhaustive or wildcarded", () => {
  it("does not fire when all variants are covered", () => {
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Done { value } -> value\n" +
      "    Failed { code } -> `error ${code}`\n" +
      "    Loading -> \"loading...\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when a wildcard arm is present", () => {
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Loading -> \"loading...\"\n" +
      "    _ -> \"done or failed\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "type Status = Done { value: string } | Failed { code: number } | Loading\n" +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Done { value } -> value\n" +
      "    Loading -> \"loading...\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire for bare-tag-only unions (no field blocks)", () => {
    // type Red = A | B | C has no field blocks, so collectTaggedUnionTypes skips it.
    const src =
      "?bs 0.9\n" +
      "type Flag = Disabled | Enabled\n" +
      "fn check(f: Flag) -> boolean {\n" +
      "  match f {\n" +
      "    Enabled -> true\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when the match contains any non-tag arm (literal, binding, etc.)", () => {
    // A match mixing tag arms with literal patterns is not a pure union match.
    // MAT003 must not fire even if some tags belong to a known union.
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn check(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Done { value } -> value\n" +
      "    \"fallback\" -> \"other\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow(/MAT003/);
  });

  it("does not fire when arm tags are ambiguous across multiple unions", () => {
    // Both unions have 'Active' — the match is ambiguous and MAT003 does not fire.
    const src =
      "?bs 0.9\n" +
      "type StateA = Active { id: string } | Inactive\n" +
      "type StateB = Active { id: string } | Pending\n" +
      "fn check(s: StateA) -> string {\n" +
      "  match s {\n" +
      "    Active { id } -> id\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

describe("MAT003: diagnostic fields", () => {
  it("throws BotscriptError with MAT003 code", () => {
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Done { value } -> value\n" +
      "    Loading -> \"loading...\"\n" +
      "  }\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("MAT003");
    }
  });

  it("names the union type and missing variant in the message", () => {
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Done { value } -> value\n" +
      "    Loading -> \"loading...\"\n" +
      "  }\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ message: string }> };
      expect(err.diagnostics?.[0]?.message).toMatch(/Status/);
      expect(err.diagnostics?.[0]?.message).toMatch(/Failed/);
    }
  });

  it("rewrite uses 'Tag { ... } -> ...' for body variants and 'Tag -> ...' for bare-tag variants", () => {
    // Status = Done { value } | Failed { code } | Loading (bare tag)
    // Match only Done — missing Failed (has body) and Loading (bare tag)
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn check(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Done { value } -> value\n" +
      "  }\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ rewrite: string }> };
      const rewrite = err.diagnostics?.[0]?.rewrite ?? "";
      // Failed has a body block → should use `{ ... }` form
      expect(rewrite).toContain("'Failed { ... } -> ...'");
      // Loading is bare-tag → should NOT use `{ ... }` form
      expect(rewrite).toContain("'Loading -> ...'");
      expect(rewrite).not.toContain("'Loading { ... } -> ...'");
    }
  });

  it("does not fire when all arms are lowercase identifiers (no CapCase tags to match a union)", () => {
    // Lowercase arm labels are not tagged-union variant arms — they match
    // anything (binding-style). After the CapCase filter, userArmTags is empty
    // so MAT003 has nothing to evaluate exhaustiveness against.
    const src =
      "?bs 0.9\n" +
      STATUS_TYPE +
      "fn check(s: Status) -> string {\n" +
      "  match s {\n" +
      "    done -> \"d\"\n" +
      "    failed -> \"f\"\n" +
      "    loading -> \"l\"\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});
