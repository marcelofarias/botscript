import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN018: Math.random() detection", () => {
  it("fires on Math.random() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn roll(sides: number) -> number {\n" +
      "  return Math.floor(Math.random() * sides) + 1\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(true);
  });

  it("fires on Math?.random() optional chaining on Math", () => {
    const src =
      "?bs 0.7\n" +
      "fn jitter(n: number) -> number {\n" +
      "  return n + Math?.random() * 10\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(true);
  });

  it("fires on Math.random?.() optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick() -> number {\n" +
      "  return Math.random?.()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(true);
  });

  it("does NOT fire on bare Math.random reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getRng() -> any {\n" +
      "  return Math.random\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(false);
  });

  it("does NOT fire on obj.Math.random() — member access on local", () => {
    const src =
      "?bs 0.7\n" +
      "fn fromLib(lib: any) -> number {\n" +
      "  return lib.Math.random()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(false);
  });

  it("does NOT fire on Math.floor(), Math.abs(), other Math methods", () => {
    const src =
      "?bs 0.7\n" +
      "fn clamp(x: number) -> number {\n" +
      "  return Math.max(0, Math.min(1, Math.abs(x)))\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(false);
  });

  it("does NOT fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn jitter(base: number) -> number {\n" +
      '  return base + unsafe "uses Math.random for legacy distribution" { Math.random() } * 10\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(false);
  });

  it("does NOT fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "uses Math.random for legacy" fn roll(sides: number) -> number {\n' +
      "  return Math.floor(Math.random() * sides) + 1\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(false);
  });

  it("does NOT fire at ?bs 0.6 or lower", () => {
    const src =
      "?bs 0.6\n" +
      "fn roll(sides: number) -> number {\n" +
      "  return Math.floor(Math.random() * sides) + 1\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN018")).toBe(false);
  });

  it("warning message mentions Math.random and capability model", () => {
    const src =
      "?bs 0.7\n" +
      "fn roll(sides: number) -> number {\n" +
      "  return Math.floor(Math.random() * sides) + 1\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN018");
    expect(w?.message).toContain("Math");
    expect(w?.message).toContain("random");
    expect(w?.message).toContain("capability model");
  });

  it("warning severity is 'warning' not 'error'", () => {
    const src =
      "?bs 0.7\n" +
      "fn roll(sides: number) -> number {\n" +
      "  return Math.floor(Math.random() * sides) + 1\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN018");
    expect(w?.severity).toBe("warning");
  });

  it("fires multiple times when called more than once in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn twoRolls(sides: number) -> number {\n" +
      "  return Math.floor(Math.random() * sides) + Math.floor(Math.random() * sides)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN018").length).toBe(2);
  });

  it("attributes SYN018 to the nested fn body (inner), not the outer fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> number {\n" +
      "  fn inner() -> number {\n" +
      "    return Math.random()\n" +
      "  }\n" +
      "  return inner()\n" +
      "}\n";
    const result = compile(src);
    const w18 = result.warnings.filter((w) => w.code === "SYN018");
    expect(w18.length).toBe(1);
    expect(w18[0]!.message).toContain("'inner'");
  });
});
