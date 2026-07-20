/**
 * Tests for SYN025 (requestAnimationFrame) and SYN026 (requestIdleCallback)
 * scheduling-bypass detection.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

// ---------------------------------------------------------------------------
// SYN025 — requestAnimationFrame
// ---------------------------------------------------------------------------

describe("SYN025 — requestAnimationFrame scheduling bypass (?bs 0.7+)", () => {
  it("fires SYN025 on requestAnimationFrame(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRender(frame: number) -> void {\n" +
      "  requestAnimationFrame(() => frame + 1)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("fires SYN025 on requestAnimationFrame?.(cb) — optional-call form with callback", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRender(cb: () -> void) -> void {\n" +
      "  requestAnimationFrame?.(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("SYN025 warning mentions requestAnimationFrame and fn name", () => {
    const src =
      "?bs 0.7\n" +
      "fn myFn() -> void {\n" +
      "  requestAnimationFrame(cb)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN025");
    expect(w).toBeDefined();
    expect(w!.message).toContain("requestAnimationFrame");
    expect(w!.message).toContain("myFn");
    expect(w!.severity).toBe("warning");
  });

  it("does NOT fire SYN025 below ?bs 0.7", () => {
    const src =
      "?bs 0.1\n" +
      "fn f() {\n" +
      "  requestAnimationFrame(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRender() -> void {\n" +
      "  unsafe \"schedules animation frame\" { requestAnimationFrame(cb) }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"schedules animation frame\" fn scheduleRender(cb: () -> void) -> void {\n" +
      "  requestAnimationFrame(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 on obj.requestAnimationFrame(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: any) -> void {\n" +
      "  obj.requestAnimationFrame(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 on bare requestAnimationFrame reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  return requestAnimationFrame\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 on fn requestAnimationFrame() declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn requestAnimationFrame(cb: any) -> number = 0\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 on function requestAnimationFrame() declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function requestAnimationFrame(cb: any) { return 0 }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 on function* requestAnimationFrame() generator declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function* requestAnimationFrame(cb: any) { yield 0 }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does NOT fire SYN025 on object method shorthand named requestAnimationFrame", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(cb: () -> void) -> any {\n" +
      "  return { requestAnimationFrame(cb: any) { cb() } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("SYN025 carries rule and rewrite from registry", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void { requestAnimationFrame(cb) }\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN025");
    expect(w?.rule).toBeTruthy();
    expect(w?.rewrite).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// SYN026 — requestIdleCallback
// ---------------------------------------------------------------------------

describe("SYN026 — requestIdleCallback scheduling bypass (?bs 0.7+)", () => {
  it("fires SYN026 on requestIdleCallback(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn deferCleanup() -> void {\n" +
      "  requestIdleCallback(() => 0)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("fires SYN026 on requestIdleCallback?.(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn deferCleanup() -> void {\n" +
      "  requestIdleCallback?.(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("SYN026 warning mentions requestIdleCallback and fn name", () => {
    const src =
      "?bs 0.7\n" +
      "fn myFn() -> void {\n" +
      "  requestIdleCallback(cb)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN026");
    expect(w).toBeDefined();
    expect(w!.message).toContain("requestIdleCallback");
    expect(w!.message).toContain("myFn");
    expect(w!.severity).toBe("warning");
  });

  it("does NOT fire SYN026 below ?bs 0.7", () => {
    const src =
      "?bs 0.1\n" +
      "fn f() {\n" +
      "  requestIdleCallback(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn deferWork() -> void {\n" +
      "  unsafe \"schedules idle callback\" { requestIdleCallback(cb) }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"schedules idle callback\" fn deferWork(cb: () -> void) -> void {\n" +
      "  requestIdleCallback(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 on obj.requestIdleCallback(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: any) -> void {\n" +
      "  obj.requestIdleCallback(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 on bare requestIdleCallback reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  return requestIdleCallback\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 on fn requestIdleCallback() declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn requestIdleCallback(cb: any) -> number = 0\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 on function requestIdleCallback() declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function requestIdleCallback(cb: any) { return 0 }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 on function* requestIdleCallback() generator declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function* requestIdleCallback(cb: any) { yield 0 }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire SYN026 on object method shorthand named requestIdleCallback", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(cb: () -> void) -> any {\n" +
      "  return { requestIdleCallback(cb: any) { cb() } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("SYN026 carries rule and rewrite from registry", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void { requestIdleCallback(cb) }\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN026");
    expect(w?.rule).toBeTruthy();
    expect(w?.rewrite).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Both in same fn
// ---------------------------------------------------------------------------

describe("SYN025 + SYN026 together", () => {
  it("fires both SYN025 and SYN026 when both appear in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn bothSchedulers() -> void {\n" +
      "  requestAnimationFrame(render)\n" +
      "  requestIdleCallback(cleanup)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN025")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });
});
