/**
 * Tests for SYN024: document.cookie access detection (?bs 0.7+).
 *
 * SYN024 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN024: document.cookie access detection", () => {
  it("fires on document.cookie read", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(true);
  });

  it("fires on document.cookie assignment (write)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setSession(token: string) -> void {\n" +
      "  document.cookie = 'session=' + token\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(true);
  });

  it("fires on document.cookie.includes() member call", () => {
    const src =
      "?bs 0.7\n" +
      "fn isLoggedIn() -> boolean {\n" +
      "  return document.cookie.includes('session=')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(true);
  });

  it("fires on document?.cookie optional-chain form", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession() -> string {\n" +
      "  return document?.cookie ?? ''\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(true);
    const w = result.warnings.find((w) => w.code === "SYN024");
    expect(w?.message).toContain("document?.cookie");
  });

  it("produces a warning-severity diagnostic", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN024");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getSession() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession() -> string {\n" +
      '  return unsafe "reads session cookie" { document.cookie }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "reads cookies directly" fn getSession() -> string {\n' +
      "  return document.cookie\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(false);
  });

  it("does NOT fire on obj.document.cookie (member access on local binding)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test(ctx: any) -> string {\n" +
      "  return ctx.document.cookie\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(false);
  });

  it("does NOT fire on bare document reference (no member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> any {\n" +
      "  return document\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(false);
  });

  it("does NOT fire on document.title — only .cookie is flagged", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTitle() -> string {\n" +
      "  return document.title\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(false);
  });

  it("does NOT fire on fn document() declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn document() -> string {\n" +
      "  return 'ok'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN024")).toBe(false);
  });

  it("warning message mentions document.cookie and the fn name", () => {
    const src =
      "?bs 0.7\n" +
      "fn readAuth() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN024");
    expect(w?.message).toContain("readAuth");
    expect(w?.message).toContain("document.cookie");
  });
});
