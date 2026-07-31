/**
 * Tests for SYN033: import.meta.env access in fn bodies (?bs 0.7+).
 *
 * SYN033 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

describe("SYN033: import.meta.env access detection", () => {
  it("fires a warning on import.meta.env.PROPERTY access", () => {
    const src =
      "?bs 0.7\n" +
      "fn getApiUrl() -> string {\n" +
      "  return import.meta.env.VITE_API_URL\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(true);
  });

  it("fires a warning on bare import.meta.env access (no trailing property)", () => {
    const src =
      "?bs 0.7\n" +
      "fn allEnv() -> Record<string, string> {\n" +
      "  return import.meta.env\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(true);
  });

  it("fires a warning on import.meta?.env access (optional chain on meta)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getMode() -> string {\n" +
      "  return import.meta?.env.MODE\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(true);
  });

  it("fires when accessed inside a ternary", () => {
    const src =
      "?bs 0.7\n" +
      "fn isDev() -> boolean {\n" +
      "  return import.meta.env.DEV ? true : false\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(true);
  });

  it("fires when import.meta.env is assigned to a const", () => {
    const src =
      "?bs 0.7\n" +
      "fn getMode() -> string {\n" +
      "  const mode = import.meta.env.MODE\n" +
      "  return mode\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(true);
  });

  it("warning message mentions fn name and import.meta.env", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadConfig() -> string {\n" +
      "  return import.meta.env.SECRET_KEY\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN033")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("loadConfig");
    expect(w.message).toContain("import.meta");
    expect(w.message).toContain("env");
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getUrl() -> string {\n" +
      "  return import.meta.env.VITE_API_URL\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });

  it("does not fire when inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUrl() -> string {\n" +
      '  return unsafe "reads build-time env" { import.meta.env.VITE_API_URL }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });

  it("does not fire when inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "reads build-time env" fn loadConfig() -> string {\n' +
      "  return import.meta.env.VITE_API_URL\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });

  it("does not fire on obj.import.meta.env — import is not the global", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(ctx: { import: { meta: { env: Record<string, string> } } }) -> string {\n" +
      "  return ctx.import.meta.env.KEY\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });

  it("does not fire on import.meta.url — not the env property", () => {
    const src =
      "?bs 0.7\n" +
      "fn getDir() -> string {\n" +
      "  return import.meta.url\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });

  it("does not fire on import.meta.hot — not the env property", () => {
    const src =
      "?bs 0.7\n" +
      "fn setupHmr() -> void {\n" +
      "  if (import.meta.hot) { import.meta.hot.accept() }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });

  it("does not fire on import.meta.resolve — not the env property", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPath() -> string {\n" +
      "  return import.meta.resolve('./module.js')\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });

  it("does not trigger SYN033 on dynamic import() calls — SYN011 covers those", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadPlugin(id: string) -> Promise<unknown> {\n" +
      "  return import('./plugins/' + id)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(true);
  });

  it("fires multiple warnings for multiple import.meta.env accesses", () => {
    const src =
      "?bs 0.7\n" +
      "fn buildHeaders() -> Record<string, string> {\n" +
      "  const key = import.meta.env.API_KEY\n" +
      "  const env = import.meta.env.MODE\n" +
      "  return { key, env }\n" +
      "}\n";
    const result = transform(src);
    const warnings = result.warnings.filter((w) => w.code === "SYN033");
    expect(warnings.length).toBe(2);
  });

  it("has severity 'warning' (non-blocking — transform must not throw)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUrl() -> string {\n" +
      "  return import.meta.env.VITE_API_URL\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN033");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("does not fire when import.meta.env access is outside a fn body (module level)", () => {
    const src =
      "?bs 0.7\n" +
      "const BASE_URL = import.meta.env.VITE_API_URL\n" +
      "fn getUrl() -> string {\n" +
      "  return BASE_URL\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN033")).toBe(false);
  });
});
