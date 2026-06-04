/**
 * Tests for SYN002 (?bs 0.7+).
 *
 * SYN002: fires as a non-blocking warning when a fn body contains a native
 * `throw` statement. Native throws bypass the Result-based error contract —
 * callers relying on `?` unwrap or match on Result will not observe them.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN002: native throw statement (?bs 0.7+)", () => {
  it("fires when fn body contains throw new ErrorType()", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("fires when fn body contains a bare throw expression", () => {
    const src =
      "?bs 0.9\n" +
      "fn fail(msg: string) -> void {\n" +
      "  throw new Error(msg)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("has severity 'warning' (non-blocking)", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN002");
    expect(w?.severity).toBe("warning");
    expect(() => transform(src)).not.toThrow();
  });

  it("message mentions Result as the alternative", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN002");
    expect(w?.message).toContain("Result");
    expect(w?.message).toContain("err");
  });

  it("does NOT fire at ?bs 0.6 (below 0.7 gate)", () => {
    const src =
      "?bs 0.6\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when there is no throw in the body", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> Result<string, ParseError> {\n" +
      "  if (!s) { const e = new ParseError(\"empty\"); return err(e) }\n" +
      "  return ok(s)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire for throw inside a nested fn (nested fn gets its own SYN002)", () => {
    // The outer fn 'outer' has no throw at its body level;
    // 'inner' has the throw and should get the SYN002.
    const src =
      "?bs 0.9\n" +
      "fn outer(s: string) -> string {\n" +
      "  fn inner() -> void { throw new Error(\"x\") }\n" +
      "  return s\n" +
      "}\n";
    const result = transform(src);
    const warnings = result.warnings.filter((w) => w.code === "SYN002");
    // inner is a nested fn — it gets its own SYN002
    expect(warnings.length).toBe(1);
  });

  it("fires on ?bs 0.7", () => {
    const src =
      "?bs 0.7\n" +
      "fn fail() -> void {\n" +
      "  throw new Error(\"x\")\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("fires on ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn fail() -> void {\n" +
      "  throw new Error(\"x\")\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(true);
  });

  it("does NOT fire when 'throw' is an object literal property key", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { throw: 1 }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });

  it("does NOT fire when 'throw' is a method shorthand in an object literal", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  const o = { throw() { return 1 } }\n" +
      "  return o\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN002")).toBe(false);
  });
});
