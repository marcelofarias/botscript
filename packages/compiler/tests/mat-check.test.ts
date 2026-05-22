/**
 * Tests for MAT001: non-exhaustive Result match (?bs 0.9+).
 *
 * Fires when a match has an ok arm but no err arm (or vice versa) and no wildcard.
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
