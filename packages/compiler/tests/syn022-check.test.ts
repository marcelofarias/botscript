/**
 * Tests for SYN022: process.* ambient state access in fn bodies (?bs 0.7+).
 *
 * Covers: process.argv, process.cwd(), process.platform, process.arch,
 * process.pid, process.ppid, process.version, process.versions,
 * process.hrtime(), process.uptime(), process.memoryUsage(),
 * process.cpuUsage(), process.resourceUsage().
 *
 * Does NOT cover process.env (SYN005) or process.exit (SYN006).
 * SYN022 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN022: process.* ambient state access detection", () => {
  it("fires on process.argv", () => {
    const src =
      "?bs 0.7\n" +
      "fn getArgs() -> string[] {\n" +
      "  return process.argv\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.cwd()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getDir() -> string {\n" +
      "  return process.cwd()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.platform", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPlatform() -> string {\n" +
      "  return process.platform\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.arch", () => {
    const src =
      "?bs 0.7\n" +
      "fn getArch() -> string {\n" +
      "  return process.arch\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.pid", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPid() -> number {\n" +
      "  return process.pid\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.ppid", () => {
    const src =
      "?bs 0.7\n" +
      "fn getParentPid() -> number {\n" +
      "  return process.ppid\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.version", () => {
    const src =
      "?bs 0.7\n" +
      "fn getVersion() -> string {\n" +
      "  return process.version\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.versions", () => {
    const src =
      "?bs 0.7\n" +
      "fn getVersions() -> any {\n" +
      "  return process.versions\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.hrtime()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getNanoTime() -> number[] {\n" +
      "  return process.hrtime()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.uptime()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUptime() -> number {\n" +
      "  return process.uptime()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.memoryUsage()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getMemory() -> any {\n" +
      "  return process.memoryUsage()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.cpuUsage()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getCpu() -> any {\n" +
      "  return process.cpuUsage()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on process.resourceUsage()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getResources() -> any {\n" +
      "  return process.resourceUsage()\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("fires on optional-chain process?.argv", () => {
    const src =
      "?bs 0.7\n" +
      "fn getArgs() -> string[] {\n" +
      "  return process?.argv\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(true);
  });

  it("optional-call form process.cwd?.() shows ?.() in message, not ()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getDir() -> string {\n" +
      "  return process.cwd?.()\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN022")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("process.cwd?.()");
    expect(w.message).not.toContain("process.cwd()");
  });

  it("produces a warning-severity diagnostic (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPid() -> number {\n" +
      "  return process.pid\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN022");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("warning message mentions the fn name and the accessed member", () => {
    const src =
      "?bs 0.7\n" +
      "fn diagnose() -> number {\n" +
      "  return process.pid\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN022")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("diagnose");
    expect(w.message).toContain("process.pid");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getPid() -> number {\n" +
      "  return process.pid\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPid() -> number {\n" +
      '  return unsafe "reads process pid" { process.pid }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "reads process state" fn getPid() -> number {\n' +
      "  return process.pid\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });

  it("does NOT fire on obj.process.pid — process is not the global", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(ctx: { process: { pid: number } }) -> number {\n" +
      "  return ctx.process.pid\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });

  it("does NOT fire on process.env — that is SYN005, not SYN022", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUrl() -> string {\n" +
      "  return process.env.DATABASE_URL\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });

  it("does NOT fire on process.exit() — that is SYN006, not SYN022", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process.exit(1)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });

  it("does NOT fire on bare process reference (no member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getProc() -> any {\n" +
      "  return process\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });

  it("does NOT fire on process.stdout — not in the ambient-state set", () => {
    const src =
      "?bs 0.7\n" +
      "fn write() uses { stdout } -> void {\n" +
      "  process.stdout.write('hi')\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN022")).toBe(false);
  });
});
