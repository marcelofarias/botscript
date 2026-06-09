/**
 * Tests for SYN005: process.env access in fn bodies (?bs 0.7+).
 *
 * SYN005 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN005: process.env access detection", () => {
  it("fires a warning on process.env read in a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUrl() -> string {\n" +
      "  return process.env.DATABASE_URL\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(true);
  });

  it("fires a warning on process.env access without property chain", () => {
    const src =
      "?bs 0.7\n" +
      "fn allEnv() -> Record<string, string> {\n" +
      "  return process.env\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(true);
  });

  it("fires a warning on optional-chain process?.env", () => {
    const src =
      "?bs 0.7\n" +
      "fn getKey() -> string {\n" +
      "  return process?.env.API_KEY\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(true);
  });

  it("warning message mentions the fn name and process.env", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadConfig() -> string {\n" +
      "  return process.env.SECRET_KEY\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN005")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("loadConfig");
    expect(w.message).toContain("process.env");
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getUrl() -> string {\n" +
      "  return process.env.DATABASE_URL\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(false);
  });

  it("does not fire when process.env is inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUrl() -> string {\n" +
      '  return unsafe "reads deployment env" { process.env.DATABASE_URL }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(false);
  });

  it("does not fire when process.env is inside an unsafe fn", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "reads deployment env" fn loadConfig() -> string {\n' +
      "  return process.env.DATABASE_URL\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(false);
  });

  it("does not fire on obj.process.env — process is not the global", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(ctx: { process: { env: Record<string, string> } }) -> string {\n" +
      "  return ctx.process.env.KEY\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(false);
  });

  it("does not fire on { process: value } — object literal key use", () => {
    const src =
      "?bs 0.7\n" +
      "fn describe() -> string {\n" +
      "  const obj = { process: 'running' }\n" +
      "  return obj.process\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(false);
  });

  it("does not fire on process.pid — not the env property", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPid() -> number {\n" +
      "  return process.pid\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN005")).toBe(false);
  });

  it("has severity 'warning' (non-blocking — transform must not throw)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUrl() -> string {\n" +
      "  return process.env.DATABASE_URL\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN005");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });
});
