import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN020: Date.now() / new Date() / Date() detection", () => {
  // ── fires: Date.now() ──────────────────────────────────────────────────────

  it("fires on Date.now() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn isExpired(expiresAt: number) -> boolean {\n" +
      "  return Date.now() > expiresAt\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on Date?.now() — optional chaining on Date", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return Date?.now()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on Date.now?.() — optional call on now", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return Date.now?.()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  // ── fires: new Date() ──────────────────────────────────────────────────────

  it("fires on new Date() — no-arg constructor", () => {
    const src =
      "?bs 0.7\n" +
      "fn now() -> any {\n" +
      "  return new Date()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on new Date<T>() — TypeScript generic no-arg constructor", () => {
    const src =
      "?bs 0.7\n" +
      "fn now() -> any {\n" +
      "  return new Date<Date>()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  // ── fires: bare Date() ─────────────────────────────────────────────────────

  it("fires on Date() — bare call with no args", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> string {\n" +
      "  return Date()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on Date?.() — optional bare call with no args", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> string {\n" +
      "  return Date?.()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on Date(arg) — JS ignores args to Date() called without new, still returns current time", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts(x: number) -> string {\n" +
      "  return Date(x)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  // ── does NOT fire below ?bs 0.7 ───────────────────────────────────────────

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn ts() -> number {\n" +
      "  return Date.now()\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  // ── suppressed inside unsafe ───────────────────────────────────────────────

  it("does NOT fire inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      '  return unsafe "uses current time for logging" { Date.now() }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "uses current time" fn ts() -> number {\n' +
      "  return Date.now()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  // ── excluded forms ─────────────────────────────────────────────────────────

  it("does NOT fire on new Date(timestamp) — explicit arg", () => {
    const src =
      "?bs 0.7\n" +
      "fn fromMs(ms: number) -> any {\n" +
      "  return new Date(ms)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on new Date('2024-01-01') — explicit string arg", () => {
    const src =
      "?bs 0.7\n" +
      "fn parseDate(s: string) -> any {\n" +
      "  return new Date('2024-01-01')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on new Date(year, month, day) — multiple explicit args", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeDate(y: number, m: number, d: number) -> any {\n" +
      "  return new Date(y, m, d)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on Date.parse(str) — not an ambient-time call", () => {
    const src =
      "?bs 0.7\n" +
      "fn parseMs(s: string) -> number {\n" +
      "  return Date.parse(s)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on Date.UTC(...) — not an ambient-time call", () => {
    const src =
      "?bs 0.7\n" +
      "fn utc(y: number, m: number) -> number {\n" +
      "  return Date.UTC(y, m)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on obj.Date() — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts(obj: any) -> any {\n" +
      "  return obj.Date()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on fn Date(...) botscript declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn Date(ms: number) -> string {\n" +
      "  return ms.toString()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on function Date() {} — function declaration named Date", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  function Date() { return '' }\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on function* Date() {} — generator declaration named Date", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  function* Date() { yield '' }\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on Date < x > (y) — comparison expression, not generic construction", () => {
    const src =
      "?bs 0.7\n" +
      "fn cmp(x: number, y: number) -> boolean {\n" +
      "  return Date < x > (y)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  // ── attribution and message ────────────────────────────────────────────────

  it("warning severity is 'warning' (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return Date.now()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.severity).toBe("warning");
  });

  it("message mentions Date.now()", () => {
    const src =
      "?bs 0.7\n" +
      "fn ts() -> number {\n" +
      "  return Date.now()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.message).toContain("Date.now()");
  });

  it("fires twice when Date.now() and new Date() both appear in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn dual() -> string {\n" +
      "  const ms = Date.now()\n" +
      "  const d = new Date()\n" +
      "  return d.toISOString() + ms\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN020").length).toBe(2);
  });

  it("nested fn attribution: warns on inner fn, not outer", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  fn inner() -> number {\n" +
      "    return Date.now()\n" +
      "  }\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.message).toContain("inner");
  });

  it("fires on Date.now() as ternary consequent after await", () => {
    // `cond ? await Date.now() : 0` — the `:` is ternary, not a TS type annotation; must not suppress
    const src =
      "?bs 0.7\n" +
      "fn ts(cond: boolean) -> number {\n" +
      "  return cond ? await Date.now() : 0\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on new Date() as ternary consequent after await", () => {
    // `cond ? await new Date() : null` — must not be suppressed by `:` guard
    const src =
      "?bs 0.7\n" +
      "fn ts(cond: boolean) -> string {\n" +
      "  return cond ? await new Date() : \"\"\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });
});
