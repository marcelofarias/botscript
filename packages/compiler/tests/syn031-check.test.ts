import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN031: localStorage / sessionStorage access detection", () => {
  // ── localStorage fires ──────────────────────────────────────────────────

  it("fires on localStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on localStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveTheme(theme: string) -> void {\n" +
      "  localStorage.setItem('theme', theme)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on localStorage.removeItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn clearTheme() -> void {\n" +
      "  localStorage.removeItem('theme')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on localStorage.clear()", () => {
    const src =
      "?bs 0.7\n" +
      "fn resetStorage() -> void {\n" +
      "  localStorage.clear()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on localStorage.length access", () => {
    const src =
      "?bs 0.7\n" +
      "fn countKeys() -> number {\n" +
      "  return localStorage.length\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on optional-chain localStorage?.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage?.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  // ── sessionStorage fires ─────────────────────────────────────────────────

  it("fires on sessionStorage.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTab() -> string {\n" +
      "  return sessionStorage.getItem('tab') ?? 'home'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on sessionStorage.setItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn saveTab(tab: string) -> void {\n" +
      "  sessionStorage.setItem('tab', tab)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  it("fires on optional-chain sessionStorage?.getItem()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTab() -> string {\n" +
      "  return sessionStorage?.getItem('tab') ?? 'home'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(true);
  });

  // ── exclusions ───────────────────────────────────────────────────────────

  it("does NOT fire on obj.localStorage.getItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme(ctx: any) -> string {\n" +
      "  return ctx.localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on obj.sessionStorage.getItem() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTab(ctx: any) -> string {\n" +
      "  return ctx.sessionStorage.getItem('tab') ?? 'home'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on bare localStorage reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn passThrough(fn: (s: typeof localStorage) -> void) -> void {\n" +
      "  fn(localStorage)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on fn localStorage() botscript declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn localStorage(key: string) -> string {\n" +
      "  return key\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on fn sessionStorage() botscript declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn sessionStorage(key: string) -> string {\n" +
      "  return key\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on JS function localStorage() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(key: string) -> string {\n" +
      "  function localStorage(k: string) { return k }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("does NOT fire on JS generator function* localStorage() declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  function* localStorage(k: string) { yield k }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  // ── unsafe suppression ───────────────────────────────────────────────────

  it("is suppressed inside unsafe {} blocks (localStorage)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      '  return unsafe "reads localStorage for theme preference" { localStorage.getItem(\'theme\') } ?? \'light\'\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks (sessionStorage)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTab() -> string {\n" +
      '  return unsafe "reads sessionStorage for active tab" { sessionStorage.getItem(\'tab\') } ?? \'home\'\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "accesses localStorage directly" fn loadTheme() -> string {\n' +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  // ── version gate ─────────────────────────────────────────────────────────

  it("does NOT fire before ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN031")).toBe(false);
  });

  // ── diagnostic quality ───────────────────────────────────────────────────

  it("fires with warning severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w?.severity).toBe("warning");
  });

  it("message includes the global name and 'capability model'", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w?.message).toContain("localStorage");
    expect(w?.message).toContain("capability model");
  });

  it("message names the fn and includes the separator form", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN031");
    expect(w?.message).toContain("loadTheme");
    expect(w?.message).toContain("localStorage.");
  });

  it("counts multiple Web Storage accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn syncPrefs() -> void {\n" +
      "  const theme = localStorage.getItem('theme')\n" +
      "  sessionStorage.setItem('theme', theme ?? 'light')\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN031");
    expect(codes.length).toBe(2);
  });
});
