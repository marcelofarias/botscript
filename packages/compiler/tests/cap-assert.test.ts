/**
 * Tests for CAP003: capability declared inside unsafe fn — asserted, not proven (?bs 0.9+).
 *
 * CAP003 is a warning, not an error. Compilation succeeds; the warning is
 * returned in TransformResult.warnings.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

// ---------------------------------------------------------------------------
// Basic firing cases
// ---------------------------------------------------------------------------

describe("CAP003: fires as a warning", () => {
  it("emits CAP003 warning for unsafe fn with uses clause", () => {
    const src =
      "?bs 0.9\n" +
      "unsafe \"wraps external http client\" fn callApi(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.code).toBe("CAP003");
    expect(result.warnings[0]!.severity).toBe("warning");
    expect(result.warnings[0]!.message).toMatch(/callApi/);
    expect(result.warnings[0]!.message).toMatch(/net/);
    expect(result.warnings[0]!.message).toMatch(/asserted/);
  });

  it("does not throw — compilation succeeds despite the warning", () => {
    const src =
      "?bs 0.9\n" +
      "unsafe \"adapter\" fn fetch(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n";
    expect(() => transform(src)).not.toThrow();
  });

  it("fires for multiple capabilities in one unsafe fn", () => {
    const src =
      "?bs 0.9\n" +
      "unsafe \"multi-cap adapter\" fn doWork(url: string, path: string) uses { net, fs } -> string {\n" +
      "  const a = http.get(url);\n" +
      "  fs.readText(path)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.code).toBe("CAP003");
    expect(result.warnings[0]!.message).toMatch(/net, fs/);
  });
});

// ---------------------------------------------------------------------------
// Does not fire for regular fns
// ---------------------------------------------------------------------------

describe("CAP003: does not fire for regular fns", () => {
  it("does not warn for a regular fn with uses clause", () => {
    const src =
      "?bs 0.9\n" +
      "fn callApi(url: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    Ok(data) => ok(data),\n" +
      "    Err(e) => err(e),\n" +
      "  }\n" +
      "}\n";
    const result = transform(src);
    const cap3 = result.warnings.filter((w) => w.code === "CAP003");
    expect(cap3).toHaveLength(0);
  });

  it("does not warn for unsafe fn with no uses clause", () => {
    const src =
      "?bs 0.9\n" +
      "unsafe \"pure adapter\" fn slugify(s: string) -> string {\n" +
      "  s\n" +
      "}\n";
    const result = transform(src);
    const cap3 = result.warnings.filter((w) => w.code === "CAP003");
    expect(cap3).toHaveLength(0);
  });

  it("does not warn for regular fn at ?bs 0.9", () => {
    const src =
      "?bs 0.9\n" +
      'fn now() uses { time } -> number {\n' +
      '  unsafe "time.now returns a plain number" { time.now() }\n' +
      "}\n";
    const result = transform(src);
    const cap3 = result.warnings.filter((w) => w.code === "CAP003");
    expect(cap3).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Version gate
// ---------------------------------------------------------------------------

describe("CAP003: version gate", () => {
  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "unsafe \"adapter\" fn fetch(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n";
    const result = transform(src);
    const cap3 = result.warnings.filter((w) => w.code === "CAP003");
    expect(cap3).toHaveLength(0);
  });

  it("does not fire at ?bs 0.7", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"adapter\" fn fetch(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n";
    const result = transform(src);
    const cap3 = result.warnings.filter((w) => w.code === "CAP003");
    expect(cap3).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple fns in one file
// ---------------------------------------------------------------------------

describe("CAP003: multiple fns", () => {
  it("fires for each unsafe fn with uses, not for safe fns", () => {
    const src =
      "?bs 0.9\n" +
      "fn safeOne(url: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    Ok(d) => ok(d),\n" +
      "    Err(e) => err(e),\n" +
      "  }\n" +
      "}\n" +
      "unsafe \"adapter one\" fn unsafeOne(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n" +
      "unsafe \"adapter two\" fn unsafeTwo(path: string) uses { fs } -> string {\n" +
      "  fs.readText(path)\n" +
      "}\n";
    const result = transform(src);
    const cap3 = result.warnings.filter((w) => w.code === "CAP003");
    expect(cap3).toHaveLength(2);
    const fnNames = cap3.map((w) => w.message.match(/fn '(\w+)'/)![1]);
    expect(fnNames).toContain("unsafeOne");
    expect(fnNames).toContain("unsafeTwo");
    expect(fnNames).not.toContain("safeOne");
  });
});

// ---------------------------------------------------------------------------
// TransformResult shape
// ---------------------------------------------------------------------------

describe("CAP003: TransformResult.warnings array present", () => {
  it("always returns a warnings array (empty when no warnings)", () => {
    const src =
      "?bs 0.9\n" +
      "fn add(a: number, b: number) -> number = pure { a + b }\n";
    const result = transform(src);
    expect(Array.isArray(result.warnings)).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });
});
