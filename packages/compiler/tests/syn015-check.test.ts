import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN015: localStorage / sessionStorage access detection", () => {
  it("fires on localStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveTheme(theme: string) -> void {\n" +
      "  localStorage.setItem('theme', theme)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.removeItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn clearTheme() -> void {\n" +
      "  localStorage.removeItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.clear()", () => {
    const src =
      "?bs 0.7\n" +
      "fn resetStorage() -> void {\n" +
      "  localStorage.clear()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on sessionStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      "  return sessionStorage.getItem('token')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on sessionStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn storeToken(token: string) -> void {\n" +
      "  sessionStorage.setItem('token', token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on optional-chain localStorage?.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string | null {\n" +
      "  return localStorage?.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on optional-chain sessionStorage?.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn storeToken(token: string) -> void {\n" +
      "  sessionStorage?.setItem('token', token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("does NOT fire on obj.localStorage.getItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme(ctx: any) -> string | null {\n" +
      "  return ctx.localStorage.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on obj.sessionStorage.setItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn storeToken(ctx: any, token: string) -> void {\n" +
      "  ctx.sessionStorage.setItem('token', token)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on bare localStorage reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn passThrough(fn: (s: Storage) => void) -> void {\n" +
      "  fn(localStorage)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on bare sessionStorage reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn passThrough(fn: (s: Storage) => void) -> void {\n" +
      "  fn(sessionStorage)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on fn localStorage() botscript declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn localStorage(key: string) -> string | null {\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on JS function localStorage() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(key: string) -> any {\n" +
      "  function localStorage(k: string) { return k }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks for localStorage", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string {\n" +
      '  return unsafe "reads theme from localStorage" { localStorage.getItem(\'theme\') } ?? \'light\'\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks for sessionStorage", () => {
    const src =
      "?bs 0.7\n" +
      "fn getToken() -> string | null {\n" +
      '  return unsafe "reads token from sessionStorage" { sessionStorage.getItem(\'token\') }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "accesses Web Storage directly" fn savePrefs(prefs: string) -> void {\n' +
      "  localStorage.setItem('prefs', prefs)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire before ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("fires with warning severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN015");
    expect(w?.severity).toBe("warning");
  });

  it("counts localStorage and sessionStorage accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn syncPrefs(key: string) -> void {\n" +
      "  const val = localStorage.getItem(key)\n" +
      "  sessionStorage.setItem(key, val ?? '')\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN015");
    expect(codes.length).toBe(2);
  });

  it("message identifies the specific global accessed", () => {
    const src =
      "?bs 0.7\n" +
      "fn savePrefs(prefs: string) -> void {\n" +
      "  localStorage.setItem('prefs', prefs)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN015");
    expect(w?.message).toContain("localStorage.");
    expect(w?.message).toContain("capability model");
  });
});
