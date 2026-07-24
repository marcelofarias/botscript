/**
 * Tests for SYN037: SYN-guarded global called via .call()/.apply()/.bind() (?bs 0.7+).
 *
 * SYN037 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN037: .call()/.apply()/.bind() bypass detection", () => {
  // ── fires: .call on guarded globals ──────────────────────────────────────

  it("fires on fetch.call(null, url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on fetch.apply(null, [url])", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return fetch.apply(null, [url])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on fetch.bind(null)(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const boundFetch = fetch.bind(null)\n" +
      "  return boundFetch(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on WebSocket.call(null, url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn connect(url: string) -> any {\n" +
      "  return WebSocket.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on setTimeout.call(null, fn, ms)", () => {
    const src =
      "?bs 0.7\n" +
      "fn defer(fn: () -> void) -> void {\n" +
      "  setTimeout.call(null, fn, 0)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on EventSource.apply(null, [url])", () => {
    const src =
      "?bs 0.7\n" +
      "fn listen(url: string) -> any {\n" +
      "  return EventSource.apply(null, [url])\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on Notification.call(null, title)", () => {
    const src =
      "?bs 0.7\n" +
      "fn notify(title: string) -> void {\n" +
      "  Notification.call(null, title)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on postMessage.call(window, data)", () => {
    const src =
      "?bs 0.7\n" +
      "fn send(data: any) -> void {\n" +
      "  postMessage.call(window, data)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on eval.call(null, code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval.call(null, code)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  it("fires on optional-call form fetch?.call(null, url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return fetch?.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(true);
  });

  // ── suppressed: unsafe block ──────────────────────────────────────────────

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      '  return unsafe "fetch.call for polyfill compat" { fetch.call(null, url) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "calls fetch.call for legacy compat" fn load(url: string) -> any {\n' +
      "  return fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  // ── not fired: member access on non-global receiver ──────────────────────

  it("does NOT fire on obj.fetch.call(null, url) — receiver is a member", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(obj: any, url: string) -> any {\n" +
      "  return obj.fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("does NOT fire on someObj.call(null, arg) — non-guarded receiver", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(someObj: any, arg: string) -> any {\n" +
      "  return someObj.call(null, arg)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  it("does NOT fire on myFn.call(null) — local fn name is not a guarded global", () => {
    const src =
      "?bs 0.7\n" +
      "fn helper() -> void { }\n" +
      "fn run() -> void {\n" +
      "  helper.call(null)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  // ── not fired: below version floor ───────────────────────────────────────

  it("does NOT fire on ?bs 0.6 (below 0.7 floor)", () => {
    const src =
      "?bs 0.6\n" +
      "fn load(url: string) -> any {\n" +
      "  return fetch.call(null, url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN037")).toBe(false);
  });

  // ── warning metadata ──────────────────────────────────────────────────────

  it("warning message names both the global and the method", () => {
    const src =
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return fetch.apply(null, [url])\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN037");
    expect(w).toBeDefined();
    expect(w!.message).toContain("fetch");
    expect(w!.message).toContain("apply");
  });
});
