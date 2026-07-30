/**
 * Tests for SYN029 — document.write() / document.writeln() call that injects
 * raw HTML and bypasses the DOM capability model (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN029 — document.write / document.writeln DOM injection (?bs 0.7+)", () => {
  it("fires SYN029 on document.write(html)", () => {
    const src =
      "?bs 0.7\n" +
      "fn render(html: string) -> void {\n" +
      "  document.write(html)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires SYN029 on document.writeln(html)", () => {
    const src =
      "?bs 0.7\n" +
      "fn render(html: string) -> void {\n" +
      "  document.writeln(html)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires SYN029 on document?.write(html) optional chain", () => {
    const src =
      "?bs 0.7\n" +
      "fn render(html: string) -> void {\n" +
      "  document?.write(html)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires SYN029 on document.write?.(html) optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn render(html: string) -> void {\n" +
      "  document.write?.(html)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("SYN029 message contains fn name, 'document.write', and capability model info", () => {
    const src =
      "?bs 0.7\n" +
      "fn injectBanner(html: string) -> void {\n" +
      "  document.write(html)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN029");
    expect(w).toBeDefined();
    expect(w!.message).toContain("injectBanner");
    expect(w!.message).toContain("write");
  });

  it("SYN029 message for writeln contains 'writeln'", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(html: string) -> void {\n" +
      "  document.writeln(html)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN029");
    expect(w).toBeDefined();
    expect(w!.message).toContain("writeln");
  });

  it("does NOT fire SYN029 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn render(html: string) -> void {\n" +
      "  unsafe \"writes to document for legacy embed\" { document.write(html) }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire SYN029 on obj.document.write(...) member chain", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(frame: any) -> void {\n" +
      "  frame.document.write('<p>hello</p>')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire SYN029 on fn declaration named document", () => {
    const src =
      "?bs 0.7\n" +
      "fn document(html: string) -> void {\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire SYN029 on document.createElement (non-write member)", () => {
    const src =
      "?bs 0.7\n" +
      "fn render() -> void {\n" +
      "  const el = document.createElement('div')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire SYN029 on document.write as a bare reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  return document.write\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire SYN029 in unsafe 'reason' fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"writes to document for polyfill injection\" fn render(html: string) -> void {\n" +
      "  document.write(html)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("does NOT fire SYN029 below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn render(html: string) -> void {\n" +
      "  document.write(html)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(false);
  });

  it("fires SYN029 in nested fn (non-unsafe)", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  fn inner(html: string) -> void {\n" +
      "    document.write(html)\n" +
      "  }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN029")).toBe(true);
  });

  it("fires both write and writeln in the same fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn render(a: string, b: string) -> void {\n" +
      "  document.write(a)\n" +
      "  document.writeln(b)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN029").map((w) => w.message);
    expect(codes.length).toBe(2);
  });
});
