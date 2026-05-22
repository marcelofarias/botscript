/**
 * Tests for THR003: callback throws annotation not propagated to outer fn (?bs 0.9+).
 *
 * Fires when a function-typed parameter declares `throws { X }` but the containing
 * fn does not declare `throws { X }`. Calling the callback can surface X, so the
 * outer fn's throws surface must cover it (same principle as EFF003/EFF004).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

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
