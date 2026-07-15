/**
 * Tests for SYN009: XMLHttpRequest() call detection (?bs 0.7+).
 *
 * SYN009 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN009: XMLHttpRequest() call detection", () => {
  it("fires on new XMLHttpRequest()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on bare XMLHttpRequest() without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> void {\n" +
      "  const xhr = XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("fires on optional-call XMLHttpRequest?.()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> void {\n" +
      "  const xhr = XMLHttpRequest?.()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(true);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> void {\n" +
      '  const xhr = unsafe "wraps XHR for legacy compat" { new XMLHttpRequest() }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "wraps XHR" fn loadData(url: string) -> void {\n' +
      "  const xhr = new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on member call obj.XMLHttpRequest()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(ctx: any, url: string) -> void {\n" +
      "  const xhr = ctx.XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire on bare XMLHttpRequest reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getClass() -> any {\n" +
      "  return XMLHttpRequest\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn loadData(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("severity is warning (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN009");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT fire on object method shorthand named XMLHttpRequest", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  const handler = { XMLHttpRequest() { return null; } };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("fires on XMLHttpRequest() inside a ternary expression (regression: `:` must not suppress)", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean) -> any {\n" +
      "  return cond ? XMLHttpRequest() : XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN009").length).toBe(2);
  });

  it("fires on new XMLHttpRequest() inside a ternary expression (regression: `:` must not suppress)", () => {
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean) -> any {\n" +
      "  return cond ? new XMLHttpRequest() : new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN009").length).toBe(2);
  });

  it("fires once per distinct XHR construction in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTwo() -> void {\n" +
      "  const xhr1 = new XMLHttpRequest()\n" +
      "  const xhr2 = new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN009").length).toBe(2);
  });

  it("does NOT fire on function* XMLHttpRequest() generator declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> any {\n" +
      "  function* XMLHttpRequest() { yield null }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN009")).toBe(false);
  });

  it("message mentions the net capability model and unsafe escape hatch", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData() -> void {\n" +
      "  const xhr = new XMLHttpRequest()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN009");
    expect(w?.message).toContain("capability model");
    expect(w?.message).toContain("unsafe");
  });
});
