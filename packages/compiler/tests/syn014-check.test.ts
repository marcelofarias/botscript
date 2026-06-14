/**
 * Tests for SYN014: BroadcastChannel() construction detection (?bs 0.7+).
 *
 * SYN014 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN014: BroadcastChannel() construction detection", () => {
  it("fires on new BroadcastChannel(name) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return new BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(true);
  });

  it("fires on bare BroadcastChannel(name) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(true);
  });

  it("fires on TypeScript instantiation form new BroadcastChannel<MessageEvent>(name)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return new BroadcastChannel<MessageEvent>(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return new BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return unsafe \"tab coordination channel\" { new BroadcastChannel(name) }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"broadcast channel factory\" fn openChannel(name: string) -> any {\n" +
      "  return new BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire on obj.BroadcastChannel(...) — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(obj: any, name: string) -> any {\n" +
      "  return obj.BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire on bare BroadcastChannel reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getConstructor() -> any {\n" +
      "  return BroadcastChannel\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire on object method shorthands named BroadcastChannel", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeObj(name: string) -> any {\n" +
      "  return { BroadcastChannel(n: string) { return n } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire on fn BroadcastChannel(...) botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn BroadcastChannel(name: string) -> any {\n" +
      "  return name\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature without return type", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeType(name: string) -> any {\n" +
      "  type T = { BroadcastChannel(name: string) }\n" +
      "  return name\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature with optional parameter", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeType() -> any {\n" +
      "  type T = { BroadcastChannel(name?: string) }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });

  it("fires in ternary consequent — not suppressed by trailing ':'", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean, a: string, b: string) -> any {\n" +
      "  return cond ? new BroadcastChannel(a) : new BroadcastChannel(b)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN014");
    expect(codes.length).toBe(2);
  });

  it("message says 'constructs new BroadcastChannel' for new BroadcastChannel form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return new BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN014");
    expect(w?.message).toContain("constructs new BroadcastChannel()");
  });

  it("message says 'calls BroadcastChannel' for bare BroadcastChannel(name) form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN014");
    expect(w?.message).toContain("calls BroadcastChannel()");
  });

  it("severity is warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(name: string) -> any {\n" +
      "  return new BroadcastChannel(name)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN014");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple BroadcastChannel calls independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannels(a: string, b: string) -> any {\n" +
      "  const bc1 = new BroadcastChannel(a)\n" +
      "  const bc2 = new BroadcastChannel(b)\n" +
      "  return [bc1, bc2]\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN014");
    expect(codes.length).toBe(2);
  });

  it("does NOT false-fire on BroadcastChannel < x > (y) comparison expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn compare(BroadcastChannel: number, x: number, y: number) -> boolean {\n" +
      "  return BroadcastChannel < x > (y)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN014")).toBe(false);
  });
});
