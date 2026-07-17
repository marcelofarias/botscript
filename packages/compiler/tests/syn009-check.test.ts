/**
 * Tests for SYN009: XMLHttpRequest() call detection in fn bodies (?bs 0.7+).
 *
 * SYN009 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN009: XMLHttpRequest() call detection", () => {
  it("fires on new XMLHttpRequest() inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest()\n" +
      "  xhr.open('GET', url)\n" +
      "  xhr.send()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on bare XMLHttpRequest() without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = XMLHttpRequest()\n" +
      "  xhr.open('GET', url)\n" +
      "  xhr.send()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on new XMLHttpRequest without parens (bare new-expression)", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest\n" +
      "  xhr.open('GET', url)\n" +
      "  xhr.send()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on TypeScript instantiation form new XMLHttpRequest<T>()", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest<Event>()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on nested generic form new XMLHttpRequest<EventSource<Event>>()", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest<EventSource<Event>>()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("produces a warning-severity diagnostic", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest()\n" +
      "  xhr.send()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN009");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest()\n" +
      "  xhr.send()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      '  const xhr = unsafe "wraps XHR directly" { new XMLHttpRequest() }\n' +
      "  xhr.send()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "wraps XHR" fn sendRaw(url: string) -> void {\n' +
      "  const xhr = new XMLHttpRequest()\n" +
      "  xhr.send()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on obj.XMLHttpRequest() (member call on a local)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(ctx: any) -> void {\n" +
      "  ctx.XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on bare XMLHttpRequest reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> any {\n" +
      "  return XMLHttpRequest\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on XMLHttpRequest.prototype access", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  const open = XMLHttpRequest.prototype.open\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on new XMLHttpRequest.prototype.open() (member access on constructor)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  const open = new XMLHttpRequest.prototype.open()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("fires on new XMLHttpRequest<ResponseType> — TypeScript generic without call parens", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeXhr() -> any {\n" +
      "  return new XMLHttpRequest<string>\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("does NOT fire on object method shorthand named XMLHttpRequest", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  const handler = { XMLHttpRequest(url) { return url; } };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on TypeScript method signature named XMLHttpRequest", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  type XhrLike = { XMLHttpRequest(url: string): void };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("fires on XMLHttpRequest() inside a ternary expression (regression: `:` must not suppress)", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean) -> any {\n" +
      "  return cond ? new XMLHttpRequest() : new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN009").length).toBe(2);
  });
});
