import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

describe("SYN008 — WebSocket bypasses the net capability model", () => {
  it("fires on new WebSocket(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on bare WebSocket(url) call without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = WebSocket(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on TypeScript instantiation form new WebSocket<MessageEvent>(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket<MessageEvent>(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on nested generic form new WebSocket<EventSource<MessageEvent>>(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket<EventSource<MessageEvent>>(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on WebSocket?.(url) optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = WebSocket?.(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("fires on WebSocket?.<MessageEvent>(url) optional call with type arguments", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = WebSocket?.<MessageEvent>(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(true);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does not fire when WebSocket is inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      '  const ws = unsafe "wraps WebSocket for live feed" { new WebSocket(url) }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does not fire when WebSocket is inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "wraps WebSocket" fn subscribe(url: string) -> void {\n' +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does not fire on obj.WebSocket(url) — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = factory.WebSocket(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("does not fire on bare WebSocket reference without call", () => {
    const src =
      "?bs 0.7\n" +
      "fn isSupported() -> boolean {\n" +
      "  return typeof WebSocket !== 'undefined'\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN008")).toBe(false);
  });

  it("warning carries correct code and severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket(url)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN008");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });
});
