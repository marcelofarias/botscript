/**
 * Tests for SYN031: requestAnimationFrame / requestIdleCallback call detection (?bs 0.7+).
 *
 * SYN031 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN031: requestAnimationFrame / requestIdleCallback call detection", () => {
  it("fires on requestAnimationFrame() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRender(update: () -> void) -> void {\n" +
      "  requestAnimationFrame(update)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on requestIdleCallback() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn deferWork(task: () -> void) -> void {\n" +
      "  requestIdleCallback(task)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on optional-call form requestAnimationFrame?.()", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRender(update: () -> void) -> void {\n" +
      "  requestAnimationFrame?.(update)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on optional-call form requestIdleCallback?.()", () => {
    const src =
      "?bs 0.7\n" +
      "fn deferWork(task: () -> void) -> void {\n" +
      "  requestIdleCallback?.(task)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("produces a warning-severity diagnostic", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRender(update: () -> void) -> void {\n" +
      "  requestAnimationFrame(update)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w?.severity).toBe("warning");
  });

  it("diagnostic message names the global", () => {
    const src =
      "?bs 0.7\n" +
      "fn deferWork(task: () -> void) -> void {\n" +
      "  requestIdleCallback(task)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w?.message).toContain("requestIdleCallback");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn scheduleRender(update: () -> void) -> void {\n" +
      "  requestAnimationFrame(update)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleRender(update: () -> void) -> void {\n" +
      '  unsafe "schedules deferred render effect" { requestAnimationFrame(update) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "uses rAF" fn scheduleRender(update: () -> void) -> void {\n' +
      "  requestAnimationFrame(update)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on obj.requestAnimationFrame() (member call on a local)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(ctx: any) -> void {\n" +
      "  ctx.requestAnimationFrame(fn)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on bare requestAnimationFrame reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> any {\n" +
      "  return requestAnimationFrame\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("fires once per distinct rAF/rIC call", () => {
    const src =
      "?bs 0.7\n" +
      "fn scheduleAll(fn: () -> void) -> void {\n" +
      "  requestAnimationFrame(fn)\n" +
      "  requestIdleCallback(fn)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN031").length).toBe(2);
  });

  it("does NOT fire on function declarations named requestAnimationFrame inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(callback: () -> void) -> void {\n" +
      "  function requestAnimationFrame(cb: () -> void) -> void {}\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on botscript fn declarations named requestAnimationFrame inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(callback: () -> void) -> void {\n" +
      "  fn requestAnimationFrame(cb: () -> void) -> void { }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on object method shorthands named requestAnimationFrame", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(callback: () -> void) -> any {\n" +
      "  return { requestAnimationFrame(cb: () -> void) { callback() } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on function* requestAnimationFrame() generator declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> any {\n" +
      "  function* requestAnimationFrame(cb: any) { yield 0 }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });
});
