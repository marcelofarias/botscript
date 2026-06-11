/**
 * Tests for SYN010: setTimeout / setInterval / queueMicrotask call detection (?bs 0.7+).
 *
 * SYN010 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN010: timer / microtask global call detection", () => {
  it("fires on setTimeout() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRetry(fn: () -> void) -> void {\n" +
      "  setTimeout(fn, 1000)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("fires on setInterval() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn poll(fn: () -> void) -> void {\n" +
      "  setInterval(fn, 5000)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("fires on queueMicrotask() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn defer(fn: () -> void) -> void {\n" +
      "  queueMicrotask(fn)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("fires on optional-call form setTimeout?.()", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRetry(fn: () -> void) -> void {\n" +
      "  setTimeout?.(fn, 1000)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(true);
  });

  it("produces a warning-severity diagnostic", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRetry(fn: () -> void) -> void {\n" +
      "  setTimeout(fn, 1000)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN010");
    expect(w?.severity).toBe("warning");
  });

  it("diagnostic message names the timer global", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRetry(fn: () -> void) -> void {\n" +
      "  setInterval(fn, 5000)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN010");
    expect(w?.message).toContain("setInterval");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn scheduleRetry(fn: () -> void) -> void {\n" +
      "  setTimeout(fn, 1000)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRetry(fn: () -> void) -> void {\n" +
      '  unsafe "schedules deferred effect" { setTimeout(fn, 1000) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "uses timers" fn scheduleRetry(callback: () -> void) -> void {\n' +
      "  setTimeout(callback, 1000)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });

  it("does NOT fire on obj.setTimeout() (member call on a local)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(ctx: any) -> void {\n" +
      "  ctx.setTimeout(fn, 1000)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });

  it("does NOT fire on bare setTimeout reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> any {\n" +
      "  return setTimeout\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });

  it("fires once per distinct timer call", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleAll(fn: () -> void) -> void {\n" +
      "  setTimeout(fn, 100)\n" +
      "  setInterval(fn, 1000)\n" +
      "  queueMicrotask(fn)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN010").length).toBe(3);
  });

  it("does NOT fire on function declarations named setTimeout inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(callback: () -> void, ms: number) -> void {\n" +
      "  function setTimeout(cb: () -> void, delay: number) -> void {}\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });

  it("does NOT fire on botscript fn declarations named setTimeout inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(callback: () -> void, ms: number) -> void {\n" +
      "  fn setTimeout(delay: number) -> void { }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });

  it("does NOT fire on object method shorthands named setTimeout", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(callback: () -> void) -> any {\n" +
      "  return { setTimeout(cb: () -> void, ms: number) { callback() } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN010")).toBe(false);
  });
});
