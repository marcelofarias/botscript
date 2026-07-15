/**
 * Tests for SYN030: addEventListener('message', ...) detection (?bs 0.7+).
 *
 * SYN030 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN030: addEventListener('message', ...) cross-origin receive channel detection", () => {
  it("fires on bare addEventListener('message', handler) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires on window.addEventListener('message', handler)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  window.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires on globalThis.addEventListener('message', handler)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  globalThis.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires on self.addEventListener('message', handler)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  self.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires on double-quoted addEventListener(\"message\", handler) form", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      '  addEventListener("message", (e) => { return e.data })\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn setupIncoming() -> void {\n" +
      "  addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  unsafe \"listens for messages from parent frame\" {\n" +
      "    addEventListener('message', (e) => { return e.data })\n" +
      "  }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"cross-origin receive channel\" fn setupIncoming() -> void {\n" +
      "  addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on non-message event types (click, keydown, etc.)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupClick(el: any) -> void {\n" +
      "  addEventListener('click', (e) => { return e })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on non-message event via window.addEventListener", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupResize() -> void {\n" +
      "  window.addEventListener('resize', () => { return null })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on obj.addEventListener('message', ...) — non-ambient receiver", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupWorker(worker: any) -> void {\n" +
      "  worker.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on deeply chained receiver — iframe.contentWindow.addEventListener", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupFrame(iframe: any) -> void {\n" +
      "  iframe.contentWindow.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on fn addEventListener() botscript declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn addEventListener(type: string, handler: any) -> void {\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on object method shorthand named addEventListener", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeTarget() -> any {\n" +
      "  return { addEventListener(type: string, cb: any) { return null } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on function addEventListener() declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> void {\n" +
      "  function addEventListener(type: string, cb: any) { return null }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on function* addEventListener() generator declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> void {\n" +
      "  function* addEventListener(type: string) { yield type }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire on bare addEventListener reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getRef() -> any {\n" +
      "  return addEventListener\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("message includes the call form and channel warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN030");
    expect(w?.message).toContain("addEventListener()");
    expect(w?.message).toContain("cross-origin receive channel");
  });

  it("message includes ambient receiver for window.addEventListener form", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  window.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN030");
    expect(w?.message).toContain("window.addEventListener()");
  });

  it("message includes ambient receiver for globalThis.addEventListener form", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  globalThis.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN030");
    expect(w?.message).toContain("globalThis.addEventListener()");
  });

  it("severity is warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupIncoming() -> void {\n" +
      "  addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN030");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple addEventListener('message') calls independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn setup() -> void {\n" +
      "  addEventListener('message', (e) => { return e.data })\n" +
      "  window.addEventListener('message', (e) => { return e.data })\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN030");
    expect(codes.length).toBe(2);
  });
});
