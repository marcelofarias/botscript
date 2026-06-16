import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN021: performance.now() / performance.timeOrigin detection", () => {
  // ── fires: performance.now() ──────────────────────────────────────────────

  it("fires on performance.now() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn elapsed(startMs: number) -> number {\n" +
      "  return performance.now() - startMs\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(true);
  });

  it("fires on performance?.now() — optional chaining on performance", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return performance?.now()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(true);
  });

  it("fires on performance.now?.() — optional call on now", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return performance.now?.()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(true);
  });

  // ── fires: performance.timeOrigin ─────────────────────────────────────────

  it("fires on performance.timeOrigin property read", () => {
    const src =
      "?bs 0.7\n" +
      "fn origin() -> number {\n" +
      "  return performance.timeOrigin\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(true);
  });

  it("fires on performance?.timeOrigin — optional chaining", () => {
    const src =
      "?bs 0.7\n" +
      "fn origin() -> number {\n" +
      "  return performance?.timeOrigin\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(true);
  });

  // ── does NOT fire below ?bs 0.7 ───────────────────────────────────────────

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn ts() -> number {\n" +
      "  return performance.now()\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  // ── suppressed inside unsafe ───────────────────────────────────────────────

  it("does NOT fire inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      '  return unsafe "uses performance.now for timing" { performance.now() }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  it("does NOT fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "uses performance.now" fn ts() -> number {\n' +
      "  return performance.now()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  // ── excluded forms ─────────────────────────────────────────────────────────

  it("does NOT fire on obj.performance.now() — member access on local binding", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts(obj: any) -> number {\n" +
      "  return obj.performance.now()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  it("does NOT fire on performance.mark() — write-only, no ambient time read", () => {
    const src =
      "?bs 0.7\n" +
      "fn markEvent() -> void {\n" +
      "  performance.mark('start')\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  it("does NOT fire on performance.measure() — mark measurement, no ambient time read", () => {
    const src =
      "?bs 0.7\n" +
      "fn measure() -> void {\n" +
      "  performance.measure('total', 'start', 'end')\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  it("does NOT fire on fn performance(...) declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn performance(x: number) -> number {\n" +
      "  return x * 2\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  it("does NOT fire on function* performance(...) generator declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> any {\n" +
      "  function* performance(x: number) { yield x }\n" +
      "  return performance(1)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(false);
  });

  // ── attribution and message ────────────────────────────────────────────────

  it("warning severity is 'warning' (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return performance.now()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN021");
    expect(w?.severity).toBe("warning");
  });

  it("message mentions performance.now()", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return performance.now()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN021");
    expect(w?.message).toContain("performance");
    expect(w?.message).toContain("now");
  });

  it("message mentions performance.timeOrigin for property read", () => {
    const src =
      "?bs 0.7\n" +
      "fn origin() -> number {\n" +
      "  return performance.timeOrigin\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN021");
    expect(w?.message).toContain("timeOrigin");
  });

  it("fires twice when performance.now() and performance.timeOrigin both appear", () => {
    const src =
      "?bs 0.7\n" +
      "fn dual() -> number {\n" +
      "  const t = performance.now()\n" +
      "  const o = performance.timeOrigin\n" +
      "  return t + o\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN021").length).toBe(2);
  });

  it("fires on performance.timeOrigin in ternary consequent", () => {
    // The `:` here is the ternary separator, not a TS type annotation — must not suppress
    const src =
      "?bs 0.7\n" +
      "fn origin(usePerf: boolean) -> number {\n" +
      "  return usePerf ? performance.timeOrigin : 0\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN021")).toBe(true);
  });
});
