/**
 * Tests for SYN027: bare postMessage() detection (?bs 0.7+).
 *
 * SYN027 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN027: bare postMessage() cross-origin messaging detection", () => {
  it("fires on bare postMessage(data, origin) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  postMessage({ type: \"user-ready\", id: userId }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("fires on optional-call form postMessage?.(data, origin)", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  postMessage?.({ type: \"ready\" }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("warning message includes fn name and postMessage", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  postMessage({ type: \"ready\" }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    const warn = result.warnings.find((w) => w.code === "SYN027");
    expect(warn).toBeDefined();
    expect(warn!.message).toContain("notifyParent");
    expect(warn!.message).toContain("postMessage");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  postMessage({ type: \"ready\" }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  unsafe \"posts user-ready event to parent frame\" { postMessage({ id: userId }, \"https://parent.example.com\") }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"cross-origin messaging wrapper\" fn notifyParent(userId: string) -> void {\n" +
      "  postMessage({ type: \"ready\", id: userId }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire on member call worker.postMessage(data)", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendToWorker(worker: any, data: object) -> void {\n" +
      "  worker.postMessage(data)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire on member call iframe.contentWindow.postMessage(data, origin)", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendToFrame(iframe: any, data: object) -> void {\n" +
      "  iframe.contentWindow.postMessage(data, \"https://child.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire on optional member call obj?.postMessage(data)", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendIfExists(target: any, data: object) -> void {\n" +
      "  target?.postMessage(data)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire on fn declaration named postMessage", () => {
    const src =
      "?bs 0.7\n" +
      "fn postMessage(data: object, origin: string) -> void {\n" +
      "  console.log(data)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire on function keyword declaration named postMessage", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> void {\n" +
      "  function postMessage(data: object, origin: string) { }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire on object method shorthand { postMessage(data) { ... } }", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeHandler() -> any {\n" +
      "  return { postMessage(data: object) { return data } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("does NOT fire on bare postMessage reference without call parens", () => {
    const src =
      "?bs 0.7\n" +
      "fn getRef() -> any {\n" +
      "  return postMessage\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("fires on window.postMessage(data, origin) — ambient global spelling", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  window.postMessage({ type: \"ready\", id: userId }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("window.postMessage message names the receiver (not 'bare postMessage')", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  window.postMessage({ type: \"ready\", id: userId }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN027");
    expect(w).toBeDefined();
    expect(w!.message).toContain("window.postMessage");
  });

  it("fires on globalThis.postMessage(data, origin) — ambient global spelling", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  globalThis.postMessage({ type: \"ready\", id: userId }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("fires on self.postMessage(data, origin) — ambient global spelling", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  self.postMessage({ type: \"ready\", id: userId }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("does NOT fire on obj.window.postMessage(data, origin) — non-ambient receiver", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendTo(ctx: any, data: object) -> void {\n" +
      "  ctx.window.postMessage(data, \"https://example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("fires on window?.postMessage(data, origin) — optional-chain ambient spelling", () => {
    const src =
      "?bs 0.7\n" +
      "fn notifyParent(userId: string) -> void {\n" +
      "  window?.postMessage({ type: \"ready\", id: userId }, \"https://parent.example.com\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
  });
});
