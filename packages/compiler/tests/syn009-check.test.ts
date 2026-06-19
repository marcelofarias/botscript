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

  it("does NOT fire on TypeScript method signature with omitted return type", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  type XhrLike = { XMLHttpRequest(url: string) };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on TypeScript method signature with optional param and omitted return type", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  type XhrLike = { XMLHttpRequest(url?: string) };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("fires on XMLHttpRequest() inside a ternary expression (regression: `:` must not suppress)", () => {
    // `cond ? XMLHttpRequest() : other` — the `:` after the closing `)` must not trigger
    // the method-signature exclusion and hide SYN009.
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean) -> any {\n" +
      "  return cond ? new XMLHttpRequest() : new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN009").length).toBe(2);
  });

  it("fires on await new XMLHttpRequest() inside ternary (ternary guard must walk past await)", () => {
    // `cond ? await new XMLHttpRequest() : other` — must NOT be suppressed by the trailing `:`
    const src =
      "?bs 0.7\n" +
      "async fn pick(cond: boolean) -> any {\n" +
      "  return cond ? await new XMLHttpRequest() : null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on await XMLHttpRequest() (bare, no new) inside ternary", () => {
    const src =
      "?bs 0.7\n" +
      "async fn pick(cond: boolean) -> any {\n" +
      "  return cond ? await XMLHttpRequest() : null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("anchors diagnostic start at new token for new XMLHttpRequest()", () => {
    const src =
      "?bs 0.7\n" +
      "fn send() -> void {\n" +
      "  new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN009");
    expect(w).toBeDefined();
    // 'new' appears before 'XMLHttpRequest' — start should be at 'new', not at 'XMLHttpRequest'.
    // Positions are reported in the pragma-stripped source (`?bs 0.7` is removed; `\n` kept),
    // so subtract the pragma length (= index of first `\n`) from the raw indexOf result.
    const pragmaLen = src.indexOf("\n"); // length of "?bs 0.7" = 7, the stripped portion
    const newIdx = src.indexOf("new XMLHttpRequest") - pragmaLen;
    expect(w!.start).toBe(newIdx);
  });

  it("does NOT fire on fn XMLHttpRequest(...) botscript declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn XMLHttpRequest(url: string) -> void {\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on function XMLHttpRequest(...) declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function XMLHttpRequest(url: string) {}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on function* XMLHttpRequest(...) generator declaration", () => {
    const src =
      "?bs 0.7\n" +
      "function* XMLHttpRequest(url: string) { yield url }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature with empty parens — type X = { XMLHttpRequest() }", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  type XhrLike = { XMLHttpRequest() };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on XMLHttpRequest < x > (y) comparison expression (false-positive guard)", () => {
    const src =
      "?bs 0.7\n" +
      "fn compare(XMLHttpRequest: number, x: number, y: number) -> boolean {\n" +
      "  return XMLHttpRequest < x > (y)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("fires on new XMLHttpRequest<T> without parens — generic no-parens construction", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeXhr<T>() -> any {\n" +
      "  const x = new XMLHttpRequest<T>\n" +
      "  return x\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
    const w = result.warnings.find((w) => w.code === "SYN009");
    expect(w?.message).toContain("new XMLHttpRequest");
    expect(w?.message).not.toContain("new XMLHttpRequest()");
  });

  it("fires on XMLHttpRequest?.( optional-call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn sendRequest(url: string) -> void {\n" +
      "  const xhr = XMLHttpRequest?.()\n" +
      "  xhr?.open('GET', url)\n" +
      "  xhr?.send()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
    const w = result.warnings.find((w) => w.code === "SYN009");
    expect(w?.message).toContain("XMLHttpRequest?.()");
  });

  it("does NOT fire on malformed/unterminated generic new XMLHttpRequest< — bail out safely", () => {
    // The angle-bracket scan should bail out (anglDepth > 0) without producing a false-positive.
    const src =
      "?bs 0.7\n" +
      "fn bad() -> void {\n" +
      "  const x = new XMLHttpRequest<string\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on class method named XMLHttpRequest", () => {
    const src =
      "?bs 0.7\n" +
      "class HttpAdapter {\n" +
      "  XMLHttpRequest() { return 0 }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });
});
