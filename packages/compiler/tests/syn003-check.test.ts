/**
 * Tests for SYN003 (?bs 0.7+).
 *
 * SYN003: fires as a non-blocking warning when a fn body contains a direct
 * `console.*` call. Direct console output bypasses botscript's stdout/stderr
 * capability model — the compiler cannot enforce capability declarations for
 * output routed through `console`.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN003: console.* call bypasses capability model (?bs 0.7+)", () => {
  it("fires when fn body calls console.log", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: string) -> void {\n" +
      "  console.log(`Hello, ${name}`)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(true);
  });

  it("fires when fn body calls console.error", () => {
    const src =
      "?bs 0.9\n" +
      "fn fail(msg: string) -> void {\n" +
      "  console.error(msg)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(true);
  });

  it("fires when fn body calls console.warn", () => {
    const src =
      "?bs 0.9\n" +
      "fn warn(msg: string) -> void {\n" +
      "  console.warn(msg)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(true);
  });

  it("fires when fn body calls console.debug", () => {
    const src =
      "?bs 0.9\n" +
      "fn debug(msg: string) -> void {\n" +
      "  console.debug(msg)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(true);
  });

  it("has severity 'warning' (non-blocking)", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: string) -> void {\n" +
      "  console.log(name)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN003");
    expect(w?.severity).toBe("warning");
    expect(() => transform(src)).not.toThrow();
  });

  it("message names the method and mentions stdout", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: string) -> void {\n" +
      "  console.log(name)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN003");
    expect(w?.message).toContain("console.log");
    expect(w?.message).toContain("stdout");
  });

  it("does NOT fire at ?bs 0.6 (below 0.7 gate)", () => {
    const src =
      "?bs 0.6\n" +
      "fn greet(name: string) -> void {\n" +
      "  console.log(name)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(false);
  });

  it("does NOT fire when fn has no console calls", () => {
    // stdout.write needs UNS005 treatment — use unsafe to satisfy the contract check
    const src =
      "?bs 0.9\n" +
      "fn greet(name: string) uses { stdout } -> void {\n" +
      "  unsafe \"stdout.write returns void\" { stdout.write(name) }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(false);
  });

  it("does NOT fire when 'console' is a property of another object: obj.console.log()", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(ctx: any) -> void {\n" +
      "  ctx.console.log('x')\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(false);
  });

  it("does NOT fire when 'console' is used as a property key: { console: 1 }", () => {
    const src =
      "?bs 0.9\n" +
      "fn makeObj() -> any {\n" +
      "  return { console: 1 }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(false);
  });

  it("does NOT fire on console.assert (not an output method)", () => {
    const src =
      "?bs 0.9\n" +
      "fn check(x: boolean) -> void {\n" +
      "  console.assert(x, 'must be true')\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(false);
  });

  it("fires for console.log inside nested fn body", () => {
    const src =
      "?bs 0.9\n" +
      "fn outer() -> void {\n" +
      "  fn inner() -> void {\n" +
      "    console.log('nested')\n" +
      "  }\n" +
      "  inner()\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "SYN003");
    expect(warns.length).toBe(1);
    expect(warns[0]?.message).toContain("inner");
  });

  it("fires when fn body calls console?.log (optional chaining)", () => {
    const src =
      "?bs 0.9\n" +
      "fn greet(name: string) -> void {\n" +
      "  console?.log(`Hello, ${name}`)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN003")).toBe(true);
    const w = result.warnings.find((w) => w.code === "SYN003");
    expect(w?.message).toContain("console?.log");
  });

  it("fires on ?bs 0.7 and 0.8", () => {
    for (const ver of ["0.7", "0.8"]) {
      const src =
        `?bs ${ver}\n` +
        "fn greet(name: string) -> void {\n" +
        "  console.log(name)\n" +
        "}\n";
      const result = transform(src);
      expect(result.warnings.some((w) => w.code === "SYN003"),
        `should fire on ?bs ${ver}`).toBe(true);
    }
  });
});
