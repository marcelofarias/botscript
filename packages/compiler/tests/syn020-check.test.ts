import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN020: localStorage / sessionStorage access detection", () => {
  // ── localStorage ─────────────────────────────────────────────────────────
  it("fires on localStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return localStorage.getItem('auth-token')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on localStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveToken(token: string) -> void {\n" +
      "  localStorage.setItem('auth-token', token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on localStorage.removeItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn clearToken() -> void {\n" +
      "  localStorage.removeItem('auth-token')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on localStorage.clear()", () => {
    const src =
      "?bs 0.7\n" +
      "fn clearAll() -> void {\n" +
      "  localStorage.clear()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on optional-chain localStorage?.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return localStorage?.getItem('auth-token')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  // ── sessionStorage ───────────────────────────────────────────────────────
  it("fires on sessionStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession(key: string) -> string | null {\n" +
      "  return sessionStorage.getItem(key)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on sessionStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn setSession(key: string, value: string) -> void {\n" +
      "  sessionStorage.setItem(key, value)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  it("fires on optional-chain sessionStorage?.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn setSession(key: string, value: string) -> void {\n" +
      "  sessionStorage?.setItem(key, value)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(true);
  });

  // ── exclusions ───────────────────────────────────────────────────────────
  it("does NOT fire on obj.localStorage.getItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken(ctx: any) -> string | null {\n" +
      "  return ctx.localStorage.getItem('auth-token')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on obj.sessionStorage.getItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession(ctx: any, key: string) -> string | null {\n" +
      "  return ctx.sessionStorage.getItem(key)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on bare localStorage reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn passStorage(fn: (s: Storage) => void) -> void {\n" +
      "  fn(localStorage)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on fn localStorage() botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn localStorage(key: string) -> string | null {\n" +
      "  return key\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on JS function sessionStorage() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(key: string) -> string | null {\n" +
      "  function sessionStorage(k: string) { return k }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire on JS generator function* localStorage() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  function* localStorage(k: string) { yield k }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      '  return unsafe "accesses localStorage for auth token" { localStorage.getItem(\'auth-token\') }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "accesses localStorage directly" fn getToken() -> string | null {\n' +
      "  return localStorage.getItem('auth-token')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("does NOT fire before ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getToken() -> string | null {\n" +
      "  return localStorage.getItem('auth-token')\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN020")).toBe(false);
  });

  it("fires with warning severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return localStorage.getItem('auth-token')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple storage accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn syncStorage(key: string) -> void {\n" +
      "  const val = localStorage.getItem(key)\n" +
      "  sessionStorage.setItem(key, val ?? '')\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN020");
    expect(codes.length).toBe(2);
  });

  it("message includes the storage global name and capability model reference", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return localStorage.getItem('auth-token')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.message).toContain("localStorage.");
    expect(w?.message).toContain("capability model");
  });

  it("message names sessionStorage when that global is accessed", () => {
    const src =
      "?bs 0.7\n" +
      "fn setSession(key: string, val: string) -> void {\n" +
      "  sessionStorage.setItem(key, val)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN020");
    expect(w?.message).toContain("sessionStorage.");
  });
});
