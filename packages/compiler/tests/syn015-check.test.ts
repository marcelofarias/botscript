/**
 * Tests for SYN015: localStorage / sessionStorage access detection (?bs 0.7+).
 *
 * SYN015 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN015: localStorage / sessionStorage access detection", () => {
  it("fires on localStorage.getItem(...) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> any {\n" +
      "  return localStorage.getItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.setItem(...) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveToken(token: string) -> void {\n" +
      "  localStorage.setItem(\"auth\", token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on sessionStorage.getItem(...) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession(key: string) -> any {\n" +
      "  return sessionStorage.getItem(key)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on sessionStorage.setItem(...) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveSession(key: string, val: string) -> void {\n" +
      "  sessionStorage.setItem(key, val)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.removeItem(...)", () => {
    const src =
      "?bs 0.7\n" +
      "fn clearToken() -> void {\n" +
      "  localStorage.removeItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.clear()", () => {
    const src =
      "?bs 0.7\n" +
      "fn clearAll() -> void {\n" +
      "  localStorage.clear()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage?.getItem(...) optional chaining", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> any {\n" +
      "  return localStorage?.getItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.length property access", () => {
    const src =
      "?bs 0.7\n" +
      "fn storageSize() -> any {\n" +
      "  return localStorage.length\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getToken() -> any {\n" +
      "  return localStorage.getItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> any {\n" +
      "  return unsafe \"reads auth token from localStorage\" { localStorage.getItem(\"auth\") }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"accesses localStorage directly\" fn getToken() -> any {\n" +
      "  return localStorage.getItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on obj.localStorage.getItem(...) — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken(obj: any) -> any {\n" +
      "  return obj.localStorage.getItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on bare localStorage reference (not accessed)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getStorage() -> any {\n" +
      "  return localStorage\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on fn localStorage(...) botscript declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn localStorage(key: string) -> any {\n" +
      "  return key\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("fires twice when both localStorage and sessionStorage are accessed", () => {
    const src =
      "?bs 0.7\n" +
      "fn syncStorage(key: string) -> void {\n" +
      "  const val = localStorage.getItem(key)\n" +
      "  sessionStorage.setItem(key, val)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN015");
    expect(codes.length).toBe(2);
  });

  it("severity is 'warning'", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> any {\n" +
      "  return localStorage.getItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN015");
    expect(w?.severity).toBe("warning");
  });

  it("message mentions localStorage and the capability model", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> any {\n" +
      "  return localStorage.getItem(\"auth\")\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN015");
    expect(w?.message).toContain("localStorage");
    expect(w?.message).toContain("capability model");
  });

  it("message mentions sessionStorage for sessionStorage access", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession(key: string) -> any {\n" +
      "  return sessionStorage.getItem(key)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN015");
    expect(w?.message).toContain("sessionStorage");
  });
});
