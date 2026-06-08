/**
 * Tests for SYN004: process.exit() / process.abort() in fn bodies (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN004: process.exit / process.abort detection", () => {
  it("fires a warning on process.exit(code) in a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn shutdown(code: number) -> void {\n" +
      "  process.exit(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires a warning on process.abort() in a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn crash() -> void {\n" +
      "  process.abort()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("warning message mentions the fn name and the method called", () => {
    const src =
      "?bs 0.7\n" +
      "fn terminateWorker() -> void {\n" +
      "  process.exit(1)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN004")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("terminateWorker");
    expect(w.message).toContain("process.exit");
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn shutdown() -> void {\n" +
      "  process.exit(0)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire when process.exit is inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn shutdown() -> void {\n" +
      "  unsafe \"controlled shutdown\" { process.exit(0) }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire when process.exit is inside an unsafe fn", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"controlled shutdown\" fn shutdown() -> void {\n" +
      "  process.exit(0)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on obj.process.exit — process is not the global", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(env: { process: { exit: (code: number) -> void } }) -> void {\n" +
      "  env.process.exit(1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on { process: value } — object literal key use", () => {
    const src =
      "?bs 0.7\n" +
      "fn describe() -> string {\n" +
      "  const obj = { process: \"running\" };\n" +
      "  return obj.process\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("does not fire on process.env — not exit or abort", () => {
    const src =
      "?bs 0.7\n" +
      "fn getEnv() -> string {\n" +
      "  return process.env\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });

  it("fires on optional chain process?.exit(...)", () => {
    const src =
      "?bs 0.7\n" +
      "fn shutdown() -> void {\n" +
      "  process?.exit(1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("fires on optional call process.exit?.(code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn shutdown(code: number) -> void {\n" +
      "  process.exit?.(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
  });

  it("does not fire on process.exitCode assignment — assignment form is out of scope (documents boundary)", () => {
    // process.exitCode = N is the assignment form — not currently detected by SYN004
    // (the token sequence is `process.exitCode` `=` — no `(` follows).
    // This test documents the current scope boundary.
    const src =
      "?bs 0.7\n" +
      "fn setCode() -> void {\n" +
      "  process.exitCode = 1\n" +
      "}\n";
    const result = transform(src);
    // Assignment form is not yet detected — warning does NOT fire.
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(false);
  });
});
