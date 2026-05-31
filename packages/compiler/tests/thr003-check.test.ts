/**
 * Tests for THR003 and THR004 (?bs 0.9+).
 *
 * THR003: fires when a function-typed parameter declares `throws { X }` but the
 * containing fn does not declare `throws { X }`. Calling the callback can surface X,
 * so the outer fn's throws surface must cover it (same principle as EFF003/EFF004).
 *
 * THR004: fires (warning-level) when a fn declares `throws { X }` but no same-file
 * callee (direct or transitive) throws X, the fn's body does not construct err(X...),
 * and no callback param declares `throws { X }`. Suppressed for leaf fns, self-only-
 * recursive fns, and fns with opaque (untracked) external calls.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// THR004: over-declared throws (0.9+, warning)
// ---------------------------------------------------------------------------

describe("THR004: throws over-declared (0.9+)", () => {
  it("fires when a fn declares throws { X } but no callee throws X and body has no err(X)", () => {
    // helper does not throw, body has no err(NetworkError)
    const src =
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = \"ok\"\n" +
      "fn load(id: string) throws { NetworkError } -> string = helper(id)\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(true);
    expect(result.warnings.find((w: any) => w.code === "THR004")!.message).toContain("NetworkError");
  });

  it("does NOT fire when callee transitively throws X", () => {
    const src =
      "?bs 0.9\n" +
      "fn risky(id: string) throws { NetworkError } -> string = id\n" +
      "fn load(id: string) throws { NetworkError } -> string = risky(id)\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(false);
  });

  it("does NOT fire when body directly constructs err(X)", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn load() throws { NetworkError } -> string {\n" +
      "  helper();\n" +
      "  err(NetworkError())\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(false);
  });

  it("does NOT fire for leaf fn (no tracked callees)", () => {
    const src =
      "?bs 0.9\n" +
      "fn load(id: string) throws { NetworkError } -> string = id\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(false);
  });

  it("does NOT fire for self-recursive fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn retry(n: number) throws { NetworkError } -> string {\n" +
      "  if (n > 0) retry(n - 1);\n" +
      "  \"ok\"\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(false);
  });

  it("does NOT fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn load() throws { NetworkError } -> string = helper()\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(false);
  });

  it("is non-blocking (does not throw)", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn load() throws { NetworkError } -> string = helper()\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does NOT fire when paramThrows justifies the label", () => {
    const src =
      "?bs 0.9\n" +
      "fn noop() -> void { }\n" +
      "fn withHandler(cb: () throws { NetworkError } -> string) throws { NetworkError } -> string {\n" +
      "  noop();\n" +
      "  cb()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(false);
  });

  it("THR004 has severity 'warning'", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn load() throws { NetworkError } -> string = helper()\n";
    const result = transform(src);
    const w = result.warnings.find((w: any) => w.code === "THR004");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT fire when fn has an opaque (untracked) call alongside tracked callees", () => {
    // externalLib is not declared anywhere in this file — it's opaque,
    // so we cannot statically determine its throws surface.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn load() throws { NetworkError } -> string {\n" +
      "  helper();\n" +
      "  externalLib()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(false);
  });

  it("does NOT treat err() as an opaque call — fires when err constructs a different error type", () => {
    // AuthError is justified by err(AuthError()), but NetworkError is not.
    // err() is a builtin, not an opaque external call, so THR004 must still fire for NetworkError.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn load() throws { AuthError, NetworkError } -> string {\n" +
      "  helper();\n" +
      "  err(AuthError())\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(true);
    expect(result.warnings.find((w: any) => w.code === "THR004")!.message).toContain("NetworkError");
  });

  it("does NOT treat ok() and other stdlib result helpers as opaque calls", () => {
    // ok(), some(), isOk(), etc. are botscript stdlib builtins, not opaque external calls.
    // THR004 must still fire even when they are present in the fn body.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"result\"\n" +
      "fn load() throws { NetworkError } -> string {\n" +
      "  helper();\n" +
      "  ok(\"value\")\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w: any) => w.code === "THR004")).toBe(true);
    expect(result.warnings.find((w: any) => w.code === "THR004")!.message).toContain("NetworkError");
  });

  it("message lists all stale labels, not just the first", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn load() throws { AuthError, NetworkError } -> string = helper()\n";
    const result = transform(src);
    const w = result.warnings.find((w: any) => w.code === "THR004");
    expect(w).toBeDefined();
    expect(w!.message).toContain("AuthError");
    expect(w!.message).toContain("NetworkError");
  });
});

// ---------------------------------------------------------------------------
// THR003: missing throws from callback parameter
// ---------------------------------------------------------------------------

describe("THR003: callback throws not propagated", () => {
  it("fires when callback declares throws and outer fn declares none", () => {
    const src =
      "?bs 0.9\n" +
      "fn process(\n" +
      "  items: string[],\n" +
      "  handler: fn(string) throws { NetworkError } -> void\n" +
      ") -> void {\n" +
      "  handler(items[0])\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR003");
    expect(() => compile(src)).toThrow(/NetworkError/);
  });

  it("fires when callback throws is a superset of outer fn throws", () => {
    const src =
      "?bs 0.9\n" +
      "fn retry(\n" +
      "  action: fn() throws { NetworkError, TimeoutError } -> string\n" +
      ") throws { NetworkError } -> string {\n" +
      "  action()\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR003");
    expect(() => compile(src)).toThrow(/TimeoutError/);
  });

  it("fires with multiple callback params each declaring throws", () => {
    const src =
      "?bs 0.9\n" +
      "fn run(\n" +
      "  a: fn() throws { AuthError } -> void,\n" +
      "  b: fn() throws { NetworkError } -> void\n" +
      ") -> void {\n" +
      "  a()\n" +
      "  b()\n" +
      "}\n";
    expect(() => compile(src)).toThrow("THR003");
  });
});

// ---------------------------------------------------------------------------
// THR003: suppressed when throws surface is covered
// ---------------------------------------------------------------------------

describe("THR003: suppressed when covered", () => {
  it("does not fire when outer fn declares the callback throws", () => {
    const src =
      "?bs 0.9\n" +
      "fn process(\n" +
      "  items: string[],\n" +
      "  handler: fn(string) throws { NetworkError } -> void\n" +
      ") throws { NetworkError } -> void {\n" +
      "  handler(items[0])\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when outer fn over-declares throws", () => {
    const src =
      "?bs 0.9\n" +
      "fn withRetry(\n" +
      "  action: fn() throws { NetworkError } -> string\n" +
      ") throws { NetworkError, TimeoutError } -> string {\n" +
      "  action()\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire when callback has no throws annotation", () => {
    const src =
      "?bs 0.9\n" +
      "fn withRetry(\n" +
      "  action: fn() -> string\n" +
      ") -> string {\n" +
      "  action()\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn process(\n" +
      "  items: string[],\n" +
      "  handler: fn(string) throws { NetworkError } -> void\n" +
      ") -> void {\n" +
      "  handler(items[0])\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// THR003: throws annotation stripped from emitted TypeScript
// ---------------------------------------------------------------------------

describe("THR003: throws stripped from emitted TS", () => {
  it("strips throws from callback parameter type in emitted TypeScript", () => {
    const src =
      "?bs 0.9\n" +
      "fn process(\n" +
      "  handler: fn(string) throws { NetworkError } -> void\n" +
      ") throws { NetworkError } -> void {\n" +
      "  handler(\"x\")\n" +
      "}\n";
    const out = compile(src);
    expect(out).not.toContain("throws");
    expect(out).toContain("(string) =>");
  });
});

// ---------------------------------------------------------------------------
// THR003: diagnostic fields
// ---------------------------------------------------------------------------

describe("THR003: diagnostic code", () => {
  it("throws with THR003 code in diagnostics", () => {
    const src =
      "?bs 0.9\n" +
      "fn process(\n" +
      "  handler: fn(string) throws { NetworkError } -> void\n" +
      ") -> void {\n" +
      "  handler(\"x\")\n" +
      "}\n";
    try {
      compile(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as { diagnostics?: Array<{ code: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("THR003");
    }
  });
});
