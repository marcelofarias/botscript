/**
 * Tests for SYN017: Notification() construction detection (?bs 0.7+).
 *
 * SYN017 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN017: Notification() construction detection", () => {
  it("fires on new Notification(title) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  new Notification(title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(true);
  });

  it("fires on bare Notification(title) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  Notification(title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(true);
  });

  it("fires on TypeScript instantiation form new Notification<NotificationOptions>(title)", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  new Notification<NotificationOptions>(title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(true);
  });

  it("fires on Notification?.(title) optional call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  Notification?.(title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn alert(title: string) -> void {\n" +
      "  new Notification(title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      '  unsafe "sends alert notification for user action" { new Notification(title) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "notification factory" fn alert(title: string) -> void {\n' +
      "  new Notification(title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire on obj.Notification(...) — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(obj: any, title: string) -> void {\n" +
      "  obj.Notification(title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire on bare Notification reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getConstructor() -> any {\n" +
      "  return Notification\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire on object method shorthands named Notification", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeObj(title: string) -> any {\n" +
      "  return { Notification(t: string) { return t } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire on fn Notification(...) botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn Notification(title: string) -> void {\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire on JS function Notification() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(title: string) -> void {\n" +
      "  function Notification(t: string) { return }\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature without return type", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  type T = { Notification(title: string) }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature with optional parameter", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  type T = { Notification(title?: string) }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });

  it("fires in ternary consequent — not suppressed by trailing ':'", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean, a: string, b: string) -> void {\n" +
      "  cond ? new Notification(a) : new Notification(b)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN017");
    expect(codes.length).toBe(2);
  });

  it("message says 'constructs new Notification' for new Notification form", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  new Notification(title)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN017");
    expect(w?.message).toContain("constructs new Notification()");
  });

  it("message says 'calls Notification' for bare Notification(title) form", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  Notification(title)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN017");
    expect(w?.message).toContain("calls Notification()");
  });

  it("message preserves ?. for Notification?.() optional call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  Notification?.(title)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN017");
    expect(w?.message).toContain("calls Notification?.()");
  });

  it("severity is warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn alert(title: string) -> void {\n" +
      "  new Notification(title)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN017");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT false-fire on Notification < x > (y) comparison expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn compare(Notification: number, x: number, y: number) -> boolean {\n" +
      "  return Notification < x > (y)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN017")).toBe(false);
  });
});
