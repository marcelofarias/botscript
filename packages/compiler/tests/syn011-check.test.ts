/**
 * Tests for SYN011: dynamic import() call detection (?bs 0.7+).
 *
 * SYN011 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  try {
    return transform(src, {});
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`transform failed unexpectedly: ${msg}`);
  }
}

describe("SYN011: dynamic import() call detection", () => {
  it("fires on bare import(specifier) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadMod(path: string) -> any {\n" +
      "  return import(path)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(true);
  });

  it("fires on template literal import(`./module`)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadMod(name: string) -> any {\n" +
      "  return import(`./modules/${name}`)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(true);
  });

  it("fires on awaited const mod = await import(path)", () => {
    const src =
      "?bs 0.7\n" +
      "async fn loadPlugin(path: string) -> any {\n" +
      "  const mod = await import(path)\n" +
      "  return mod\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(true);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "async fn loadPlugin(path: string) -> any {\n" +
      '  const mod = await unsafe "loads plugin dynamically" { import(path) }\n' +
      "  return mod\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "dynamic loader" async fn loadPlugin(path: string) -> any {\n' +
      "  const mod = await import(path)\n" +
      "  return mod\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(false);
  });

  it("does NOT fire on import.meta.url (import.meta property access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUrl() -> string {\n" +
      "  return import.meta.url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn loadMod(path: string) -> any {\n" +
      "  return import(path)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(false);
  });

  it("severity is warning (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadMod(path: string) -> any {\n" +
      "  return import(path)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN011");
    expect(w?.severity).toBe("warning");
  });

  it("fires once per distinct import() call in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "async fn loadBoth(a: string, b: string) -> any {\n" +
      "  const m1 = await import(a)\n" +
      "  const m2 = await import(b)\n" +
      "  return { m1, m2 }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN011").length).toBe(2);
  });

  it("does NOT fire on bare import reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getImport() -> any {\n" +
      "  return import\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN011")).toBe(false);
  });
});
