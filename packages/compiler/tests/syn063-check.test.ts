/**
 * Tests for SYN063: process['member'] computed bracket access (?bs 0.7+).
 *
 * SYN005 (process.env), SYN006 (process.exit), and SYN022 (process.*) all fire
 * on dot-notation. The bracket form hides the member name in a string literal
 * where token-level checks cannot see it. SYN063 closes the gap.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN063: process['member'] computed bracket bypass (?bs 0.7+)", () => {
  // ── fires: process['exit'] bypasses SYN006 ─────────────────────────────

  it("fires on process['exit']()", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail(code: number) -> void {\n" +
      "  process['exit'](code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(true);
  });

  it("fires on process[\"exit\"]()", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      '  process["exit"](1)\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(true);
  });

  // ── fires: process['env'] bypasses SYN005 ──────────────────────────────

  it("fires on process['env'] access", () => {
    const src =
      "?bs 0.7\n" +
      "fn getKey() -> string {\n" +
      "  return process['env']['API_KEY']\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(true);
  });

  // ── fires: SYN022 members via bracket ──────────────────────────────────

  it("fires on process['argv'] (SYN022 member via bracket)", () => {
    const src =
      "?bs 0.7\n" +
      "fn args() -> string[] {\n" +
      "  return process['argv']\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(true);
  });

  it("fires on process['platform'] (SYN022 member via bracket)", () => {
    const src =
      "?bs 0.7\n" +
      "fn plat() -> string {\n" +
      "  return process['platform']\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(true);
  });

  it("fires on process['pid'] (SYN022 member via bracket)", () => {
    const src =
      "?bs 0.7\n" +
      "fn pid() -> number {\n" +
      "  return process['pid']\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(true);
  });

  // ── suppressed: unsafe {} blocks SYN063 ────────────────────────────────

  it("does not fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  unsafe \"exits on error\" { process['exit'](1) }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(false);
  });

  // ── does not fire: dot-notation still caught by SYN005/SYN006/SYN022 ──

  it("dot-notation process.exit() still fires SYN006 (not SYN063)", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process.exit(1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(false);
  });

  it("dot-notation process.env still fires SYN005 (not SYN063)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getKey() -> string {\n" +
      "  return process.env.API_KEY\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(false);
  });

  // ── does not fire: harmless bracket accesses ────────────────────────────

  it("does not fire on process['unknown'] — not a dangerous member", () => {
    const src =
      "?bs 0.7\n" +
      "fn noop() -> any {\n" +
      "  return process['customProp']\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(false);
  });

  it("does not fire on obj.process['exit'] — preceded by member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn noop(obj: any) -> void {\n" +
      "  obj.process['exit'](1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(false);
  });

  // ── does not fire below ?bs 0.7 ────────────────────────────────────────

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn bail() -> void {\n" +
      "  process['exit'](1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(false);
  });
});
