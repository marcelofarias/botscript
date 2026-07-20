/**
 * Tests for SYN034: MessageChannel() construction detection (?bs 0.7+).
 *
 * SYN034 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN034: MessageChannel() construction detection", () => {
  it("fires on new MessageChannel() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel() -> any {\n" +
      "  return new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires on bare MessageChannel() without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel() -> any {\n" +
      "  return MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires on MessageChannel?.() optional-call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel() -> any {\n" +
      "  return MessageChannel?.()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn openChannel() -> any {\n" +
      "  return new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel() -> any {\n" +
      "  return unsafe \"worker bridge channel\" { new MessageChannel() }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"message channel factory\" fn openChannel() -> any {\n" +
      "  return new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on obj.MessageChannel() — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(obj: any) -> any {\n" +
      "  return obj.MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on function MessageChannel() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> any {\n" +
      "  function MessageChannel() { return null }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on fn MessageChannel() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> any {\n" +
      "  fn MessageChannel() -> any {\n" +
      "    return null\n" +
      "  }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on function* MessageChannel() generator declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> any {\n" +
      "  function* MessageChannel() { yield null }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on object method shorthand { MessageChannel() { ... } }", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeObj() -> any {\n" +
      "  return { MessageChannel() { return null } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on TypeScript method signature { MessageChannel(): Channel; }", () => {
    const src =
      "?bs 0.7\n" +
      "fn useFactory(f: { MessageChannel(): any }) -> any {\n" +
      "  return f.MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("fires in a ternary consequent: cond ? new MessageChannel() : other", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel(flag: boolean) -> any {\n" +
      "  return flag ? new MessageChannel() : null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("severity is warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel() -> any {\n" +
      "  return new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN034");
    expect(w?.severity).toBe("warning");
  });

  it("message says 'constructs new MessageChannel' for new MessageChannel() form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel() -> any {\n" +
      "  return new MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN034");
    expect(w?.message).toContain("constructs new MessageChannel()");
  });

  it("message says 'calls MessageChannel' for bare MessageChannel() form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannel() -> any {\n" +
      "  return MessageChannel()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN034");
    expect(w?.message).toContain("calls MessageChannel()");
  });

  it("counts multiple MessageChannel() calls independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn openChannels() -> any {\n" +
      "  const ch1 = new MessageChannel()\n" +
      "  const ch2 = new MessageChannel()\n" +
      "  return [ch1, ch2]\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN034");
    expect(codes.length).toBe(2);
  });

  it("does NOT fire on a bare MessageChannel reference (no call parentheses)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getRef() -> any {\n" +
      "  return MessageChannel\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });
});
