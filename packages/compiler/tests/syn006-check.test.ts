/**
 * Tests for SYN006: process.exit() call detection in fn bodies (?bs 0.7+).
 *
 * SYN006 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN006: process.exit() call detection (?bs 0.7+)", () => {
  it("fires on process.exit() in a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn validate(cfg: Config) -> void {\n" +
      "  if (!cfg.valid) process.exit(1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(true);
  });

  it("fires on process.exit() with no argument", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process.exit()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(true);
  });

  it("fires on process?.exit() optional chain form", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process?.exit(1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(true);
  });

  it("fires on process.exit?.() optional call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process.exit?.(1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(true);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn bail(code: number) -> void {\n" +
      "  process.exit(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(false);
  });

  it("does not fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail(code: number) -> void {\n" +
      '  unsafe "process must exit on fatal signal" { process.exit(code) }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(false);
  });

  it("does not fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "bootstrap entrypoint — process.exit is intentional" fn main() -> void {\n' +
      "  process.exit(0)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(false);
  });

  it("does not fire on obj.process.exit — member access on a local named process", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(obj: any) -> void {\n" +
      "  obj.process.exit(1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(false);
  });

  it("does not fire on process.exit as a reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getExit() -> Function {\n" +
      "  return process.exit\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(false);
  });

  it("does not fire on process.exitCode (different property)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setCode(code: number) -> void {\n" +
      "  process.exitCode = code\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN006")).toBe(false);
  });

  it("has severity 'warning' (non-blocking — transform must not throw)", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process.exit(1)\n" +
      "}\n";
    expect(() => transform(src)).not.toThrow();
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN006");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });
});
