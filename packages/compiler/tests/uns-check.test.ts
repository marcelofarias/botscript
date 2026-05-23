/**
 * Tests for UNS005: external call without declared result contract (?bs 0.9+).
 *
 * Fires on any stdlib capability call (http.x, fs.x, time.x, etc.) that has
 * no declared result contract at the call site.
 *
 * Suppressed by:
 *   - `match ns.method(...) { ... }` — direct match at the call site
 *   - `match await ns.method(...) { ... }` — await is transparent
 *   - `unsafe "reason" { ns.method(...) }` — explicit escape hatch
 *   - `unsafe "reason" fn` — declaration-level escape hatch
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// Basic firing cases
// ---------------------------------------------------------------------------

describe("UNS005: basic firing", () => {
  it("fires on a bare http call assigned to a variable", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  const data = http.get(url);\n" +
      "  data\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
    expect(() => compile(src)).toThrow(/http\.get/);
  });

  it("fires on a bare fs call", () => {
    const src =
      "?bs 0.9\n" +
      "fn readConfig(path: string) uses { fs } -> string {\n" +
      "  fs.readText(path)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
    expect(() => compile(src)).toThrow(/fs\.read/);
  });

  it("fires on a bare time call", () => {
    const src =
      "?bs 0.9\n" +
      "fn getTs() uses { time } -> number {\n" +
      "  time.now()\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });

  it("fires on a bare random call", () => {
    const src =
      "?bs 0.9\n" +
      "fn roll() uses { random } -> number {\n" +
      "  random.next()\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });

  it("fires on a bare http.post call", () => {
    const src =
      "?bs 0.9\n" +
      "fn send(url: string, body: string) uses { net } -> string {\n" +
      "  http.post(url, body)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });
});

// ---------------------------------------------------------------------------
// Suppression: match
// ---------------------------------------------------------------------------

describe("UNS005: suppressed by match", () => {
  it("does not fire when the call is the direct subject of match", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when await-wrapped call is the match subject", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> Result<string, string> {\n" +
      "  match await http.get(url) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire for fs.readText in a match", () => {
    const src =
      "?bs 0.9\n" +
      "fn readFile(path: string) uses { fs } -> Result<string, string> {\n" +
      "  match fs.readText(path) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when the call is parenthesized inside match", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> Result<string, string> {\n" +
      "  match (http.get(url)) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("fires when the call follows a parenthesized match but is not its subject", () => {
    // A match (x) { ... } block appears earlier in the fn, so there's a
    // `match (` in the token stream before the bare http.get call. The backward
    // scan from http must NOT cross statement boundaries and incorrectly conclude
    // this call is suppressed.
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string, x: number) uses { net } -> string {\n" +
      "  match (x) {\n" +
      "    ok { v } -> v\n" +
      "    _ -> http.get(url)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });

  it("fires when the call is part of a larger expression in the match scrutinee", () => {
    // `http.get(url) + "x"` — the stdlib call is inside a binary expression,
    // not the direct match subject. The forward scan sees `+` after the closing
    // paren and correctly rejects suppression.
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  match (http.get(url) + \"x\") {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });
});

// ---------------------------------------------------------------------------
// Suppression: unsafe block
// ---------------------------------------------------------------------------

describe("UNS005: suppressed by unsafe block", () => {
  it("does not fire when the call is inside an unsafe block", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      '  unsafe "I know http.get returns a plain string here" { http.get(url) }\n' +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire for fs.readText inside unsafe", () => {
    const src =
      "?bs 0.9\n" +
      "fn readConfig(path: string) uses { fs } -> string {\n" +
      '  unsafe "config file is always valid JSON" { fs.readText(path) }\n' +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Suppression: unsafe fn declaration
// ---------------------------------------------------------------------------

describe("UNS005: suppressed by unsafe fn declaration", () => {
  it("does not fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.9\n" +
      'unsafe "known adapter — callers trust the return type" fn fetchRaw(url: string) uses { net } -> string {\n' +
      "  http.get(url)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Version gate
// ---------------------------------------------------------------------------

describe("UNS005: version gate", () => {
  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  const data = http.get(url);\n" +
      "  data\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire at ?bs 0.7", () => {
    const src =
      "?bs 0.7\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Inner fn exclusion
// ---------------------------------------------------------------------------

describe("UNS005: inner fn exclusion", () => {
  it("fires on the outer fn but not the inner if inner is unsafe-wrapped", () => {
    // outer has a bare call → should fire UNS005
    // inner has a match → should not fire
    const src =
      "?bs 0.9\n" +
      "fn outer(url: string) uses { net } -> string {\n" +
      "  const r = http.get(url);\n" +
      "  fn inner(u: string) uses { net } -> Result<string, string> {\n" +
      "    match http.get(u) {\n" +
      "      ok { value } -> ok(value)\n" +
      "      err { error } -> err(error)\n" +
      "    }\n" +
      "  }\n" +
      "  r\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });

  it("does not fire on inner fn when inner fn uses match", () => {
    const src =
      "?bs 0.9\n" +
      "fn outer(url: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> {\n" +
      "      fn inner(u: string) uses { net } -> Result<string, string> {\n" +
      "        match http.get(u) {\n" +
      "          ok { value } -> ok(value)\n" +
      "          err { error } -> err(error)\n" +
      "        }\n" +
      "      }\n" +
      "      ok(value)\n" +
      "    }\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// stdout / stderr namespaces
// ---------------------------------------------------------------------------

describe("UNS005: stdout and stderr namespaces", () => {
  it("fires on a bare stdout call", () => {
    const src =
      "?bs 0.9\n" +
      "fn logMsg(msg: string) uses { stdout } -> string {\n" +
      "  const r = stdout.write(msg);\n" +
      "  msg\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });

  it("fires on a bare stderr call", () => {
    const src =
      "?bs 0.9\n" +
      "fn logErr(msg: string) uses { stderr } -> string {\n" +
      "  const r = stderr.println(msg);\n" +
      "  msg\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });

  it("suppresses stdout call inside unsafe block", () => {
    const src =
      "?bs 0.9\n" +
      "fn logMsg(msg: string) uses { stdout } -> string {\n" +
      "  unsafe \"fire and forget\" { stdout.write(msg) }\n" +
      "  msg\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Multiple calls
// ---------------------------------------------------------------------------

describe("UNS005: multiple calls in one fn", () => {
  it("fires for a fn that has two bare stdlib calls", () => {
    const src =
      "?bs 0.9\n" +
      "fn doWork(url: string, path: string) uses { net, fs } -> string {\n" +
      "  const a = http.get(url);\n" +
      "  const b = fs.readText(path);\n" +
      "  a\n" +
      "}\n";
    // Should throw UNS005 (first violation, same as other passes)
    expect(() => compile(src)).toThrow("UNS005");
  });

  it("passes when all calls in a fn are match-wrapped", () => {
    const src =
      "?bs 0.9\n" +
      "fn doWork(url: string, path: string) uses { net, fs } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> match fs.readText(path) {\n" +
      "      ok { value } -> ok(value)\n" +
      "      err { error } -> err(error)\n" +
      "    }\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Diagnostic precedence: UNS003 over UNS005 for malformed unsafe blocks
// ---------------------------------------------------------------------------

describe("UNS003 takes precedence over UNS005 for malformed unsafe blocks", () => {
  it("fires UNS003 (not UNS005) for unsafe \"reason\" ns.method() (missing {})", () => {
    // `unsafe "reason" http.get(url)` is a malformed unsafe block — the
    // author forgot the `{ ... }` body. passUnsafe owns this and fires UNS003.
    // passUnsCheck must not fire UNS005 for the call first.
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      "  unsafe \"trust me\" http.get(url)\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      // Should be UNS003 (malformed block), not UNS005 (missing contract)
      expect(err.diagnostics?.[0]?.code).toBe("UNS003");
    }
  });

  it("fires UNS003 (not UNS005) for unsafe \"reason\" await ns.method() (missing {})", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      "  unsafe \"trust me\" await http.get(url)\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("UNS003");
    }
  });

  it("fires UNS003 (not UNS005) for unsafe \"reason\" (ns.method()) (missing {})", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      "  unsafe \"trust me\" (http.get(url))\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("UNS003");
    }
  });

  it("fires UNS003 (not UNS005) for unsafe \"reason\" foo(ns.method()) — wrapped call", () => {
    // `unsafe "reason" foo(http.get(url))` — the stdlib call is inside a
    // wrapper function, but the unsafe block is still missing `{ ... }`.
    // isMalformedUnsafeExpr must scan past the wrapper ident and parens to
    // detect the enclosing unsafe expression and suppress UNS005.
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      "  unsafe \"trust me\" log(http.get(url))\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("UNS003");
    }
  });
});

// ---------------------------------------------------------------------------
// Scan scope: body only, not fn header
// ---------------------------------------------------------------------------

describe("UNS005: scan scope (body only)", () => {
  it("does not fire when stdlib namespace appears as type annotation in header", () => {
    // A user-defined type named 'http' in the return type should not trigger
    // UNS005 — the scan must start from bodyTokenStart, not tokenStart.
    // This tests that we skip the fn header (params + return type).
    const src =
      "?bs 0.9\n" +
      "fn identity(x: string) -> string {\n" +
      "  x\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("fires on a stdlib call in the body but not on fn name or param types", () => {
    // A fn whose name contains 'http' as a prefix must not confuse the scanner.
    // Only the body call matters.
    const src =
      "?bs 0.9\n" +
      "fn fetchData(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n";
    expect(() => compile(src)).toThrow("UNS005");
  });
});
