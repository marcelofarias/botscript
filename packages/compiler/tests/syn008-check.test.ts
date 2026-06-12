/**
 * Tests for SYN008: WebSocket() call detection (?bs 0.7+).
 *
 * SYN008 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN008: WebSocket() call detection", () => {
  it("fires on new WebSocket(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on bare WebSocket(url) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = WebSocket(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on TypeScript generic form new WebSocket<MessageEvent>(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket<MessageEvent>(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on nested generic form new WebSocket<EventSource<MessageEvent>>(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket<EventSource<MessageEvent>>(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on optional-call WebSocket?.(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = WebSocket?.(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      '  const ws = unsafe "wraps WebSocket for live updates" { new WebSocket(url) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "wraps WebSocket" fn subscribe(url: string) -> void {\n' +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does NOT fire on member call obj.WebSocket(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(ctx: any) -> void {\n" +
      "  const ws = ctx.WebSocket(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does NOT fire on bare WebSocket reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getClass() -> any {\n" +
      "  return WebSocket\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("severity is warning (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN008");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT fire on object method shorthand named WebSocket", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  const handler = { WebSocket(url) { return url; } };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does NOT false-fire on WebSocket < x > (y) comparison expression", () => {
    // The generic scan only activates when preceded by `new`. Without `new`, `WebSocket < x > (y)`
    // is a comparison expression and must not trigger SYN008.
    const src =
      "?bs 0.7\n" +
      "fn compare(x: number, y: number) -> boolean {\n" +
      "  const WebSocket = 42\n" +
      "  return WebSocket < x\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("fires once per distinct WebSocket construction in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTwo(a: string, b: string) -> void {\n" +
      "  const ws1 = new WebSocket(a)\n" +
      "  const ws2 = new WebSocket(b)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN008").length).toBe(2);
  });
});
