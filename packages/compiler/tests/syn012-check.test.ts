/**
 * Tests for SYN012: EventSource() construction detection (?bs 0.7+).
 *
 * SYN012 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN012: EventSource() construction detection", () => {
  it("fires on new EventSource(url) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return new EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("fires on bare EventSource(url) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("fires on TypeScript instantiation form new EventSource<MessageEvent>(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return new EventSource<MessageEvent>(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("fires on nested generic form new EventSource<EventSource<MessageEvent>>(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return new EventSource<EventSource<MessageEvent>>(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("fires on optional-call form EventSource?.(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return EventSource?.(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return new EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      '  return unsafe "wraps EventSource for streaming feed" { new EventSource(url) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "direct SSE access" fn openFeed(url: string) -> any {\n' +
      "  return new EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("does NOT fire on obj.EventSource(...) — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(obj: any, url: string) -> any {\n" +
      "  return obj.EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("does NOT fire on bare EventSource reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getConstructor() -> any {\n" +
      "  return EventSource\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("does NOT fire on object method shorthands named EventSource", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeObj(url: string) -> any {\n" +
      "  return { EventSource(u: string) { return u } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("does NOT fire on fn EventSource(...) botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn EventSource(url: string) -> any {\n" +
      "  return url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("does NOT false-fire on EventSource < x > (y) comparison expression", () => {
    const src =
      "?bs 0.7\n" +
      "fn compare(EventSource: number, x: number, y: number) -> boolean {\n" +
      "  return EventSource < x > (y)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN012")).toBe(false);
  });

  it("fires in ternary consequent — not suppressed by trailing ':'", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(flag: boolean, a: string, b: string) -> any {\n" +
      "  return flag ? new EventSource(a) : new EventSource(b)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN012");
    expect(codes.length).toBe(2);
  });

  it("message says 'constructs new' for new EventSource form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return new EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN012");
    expect(w?.message).toContain("constructs new EventSource");
  });

  it("message says 'calls' for bare EventSource(url) form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN012");
    expect(w?.message).toContain("calls EventSource()");
  });

  it("severity is warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return new EventSource(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN012");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple EventSource calls independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFeeds(a: string, b: string) -> any {\n" +
      "  const es1 = new EventSource(a)\n" +
      "  const es2 = new EventSource(b)\n" +
      "  return [es1, es2]\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN012");
    expect(codes.length).toBe(2);
  });
});
