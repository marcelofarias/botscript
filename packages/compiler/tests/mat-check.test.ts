/**
 * Tests for MAT001/MAT002: non-exhaustive match (?bs 0.9+).
 *
 * MAT001: fires when a Result match has an ok arm but no err arm (or vice versa) and no wildcard.
 * MAT002: fires when an Option match has a some arm but no none arm (or vice versa) and no wildcard.
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
