import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN020: localStorage / sessionStorage access detection", () => {
  // ── localStorage: basic firing ────────────────────────────────────────────

  it("fires on localStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string | null {\n" +
      "  return localStorage.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on localStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveTheme(theme: string) -> void {\n" +
      "  localStorage.setItem('theme', theme)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on localStorage.removeItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn clearTheme() -> void {\n" +
      "  localStorage.removeItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on localStorage.clear()", () => {
    const src =
      "?bs 0.7\n" +
      "fn resetStorage() -> void {\n" +
      "  localStorage.clear()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on localStorage.length", () => {
    const src =
      "?bs 0.7\n" +
      "fn countKeys() -> number {\n" +
      "  return localStorage.length\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  // ── sessionStorage: basic firing ─────────────────────────────────────────

  it("fires on sessionStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return sessionStorage.getItem('token')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on sessionStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveToken(token: string) -> void {\n" +
      "  sessionStorage.setItem('token', token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on optional-chain localStorage?.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string | null {\n" +
      "  return localStorage?.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on optional-chain sessionStorage?.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveToken(token: string) -> void {\n" +
      "  sessionStorage?.setItem('token', token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  // ── exclusions ────────────────────────────────────────────────────────────

  it("does NOT fire on obj.localStorage.getItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme(ctx: any) -> string | null {\n" +
      "  return ctx.localStorage.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on obj.sessionStorage.setItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveToken(ctx: any, token: string) -> void {\n" +
      "  ctx.sessionStorage.setItem('token', token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on bare localStorage reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn passStorage(fn: (s: typeof localStorage) => void) -> void {\n" +
      "  fn(localStorage)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on fn localStorage() botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn localStorage(key: string) -> string | null {\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on JS function localStorage() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(key: string) -> string | null {\n" +
      "  function localStorage(k: string) { return null }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on fn sessionStorage() botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn sessionStorage(key: string) -> string | null {\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  // ── unsafe suppression ────────────────────────────────────────────────────

  it("is suppressed inside unsafe {} blocks for localStorage", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string | null {\n" +
      "  return unsafe \"reads localStorage for user theme preference\" { localStorage.getItem('theme') }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks for sessionStorage", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return unsafe \"reads sessionStorage for session token\" { sessionStorage.getItem('token') }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies for localStorage", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"reads localStorage for theme\" fn getTheme() -> string | null {\n" +
      "  return localStorage.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  // ── version gate ─────────────────────────────────────────────────────────

  it("does NOT fire before ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getTheme() -> string | null {\n" +
      "  return localStorage.getItem('theme')\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  // ── diagnostic shape ─────────────────────────────────────────────────────

  it("fires with warning severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string | null {\n" +
      "  return localStorage.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.severity).toBe("warning");
  });

  it("message names the storage global", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string | null {\n" +
      "  return localStorage.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.message).toContain("localStorage");
    expect(w?.message).toContain("capability model");
  });

  it("message names sessionStorage when that is the global used", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return sessionStorage.getItem('token')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.message).toContain("sessionStorage");
  });

  it("counts multiple storage accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn syncStorage() -> void {\n" +
      "  const theme = localStorage.getItem('theme')\n" +
      "  const token = sessionStorage.getItem('token')\n" +
      "  localStorage.setItem('last-seen', 'now')\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN020");
    expect(codes.length).toBe(3);
  });
});
