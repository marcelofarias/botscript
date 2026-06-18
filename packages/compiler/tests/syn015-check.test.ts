import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN015: localStorage / sessionStorage access detection", () => {
  it("fires on localStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
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
      "fn clearAll() -> void {\n" +
      "  localStorage.clear()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on localStorage.length (property access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn countKeys() -> number {\n" +
      "  return localStorage.length\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on sessionStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSession(key: string) -> string | null {\n" +
      "  return sessionStorage.getItem(key)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on sessionStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn setSession(key: string, val: string) -> void {\n" +
      "  sessionStorage.setItem(key, val)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on optional-chain localStorage?.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string | null {\n" +
      "  return localStorage?.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("fires on optional-chain sessionStorage?.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveSession(key: string, val: string) -> void {\n" +
      "  sessionStorage?.setItem(key, val)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(true);
  });

  it("does NOT fire on obj.localStorage.getItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme(ctx: any) -> string | null {\n" +
      "  return ctx.localStorage.getItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on bare localStorage reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn passStorage(fn: (s: Storage) => void) -> void {\n" +
      "  fn(localStorage)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on fn localStorage() botscript declarations", () => {
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
      "fn outer() -> void {\n" +
      "  function localStorage(key: string) { return null }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire on JS generator function* localStorage() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  function* localStorage(key: string) { yield null }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      '  return unsafe "reads theme from localStorage" { localStorage.getItem(\'theme\') } ?? \'light\'\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "accesses localStorage directly" fn saveTheme(theme: string) -> void {\n' +
      "  localStorage.setItem('theme', theme)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("does NOT fire before ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN015")).toBe(false);
  });

  it("fires with warning severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN015");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple localStorage accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn syncTheme() -> void {\n" +
      "  const theme = localStorage.getItem('theme')\n" +
      "  localStorage.setItem('theme-copy', theme ?? 'light')\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN015");
    expect(codes.length).toBe(2);
  });

  it("counts localStorage and sessionStorage accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn syncStorage() -> void {\n" +
      "  const val = localStorage.getItem('key')\n" +
      "  sessionStorage.setItem('key', val ?? '')\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN015");
    expect(codes.length).toBe(2);
  });

  it("message includes the storage global name and member separator", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN015");
    expect(w?.message).toContain("localStorage.");
    expect(w?.message).toContain("capability model");
  });
});
