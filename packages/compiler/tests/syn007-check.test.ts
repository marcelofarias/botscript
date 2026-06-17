/**
 * Tests for SYN007: fetch() call detection (?bs 0.7+).
 *
 * SYN007 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN007: fetch() call detection", () => {
  it("fires on bare fetch(url) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUser(id: string) -> any {\n" +
      "  return fetch(`/api/users/${id}`)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("fires on awaited fetch(url)", () => {
    const src =
      "?bs 0.7\n" +
      "async fn getUser(url: string) -> any {\n" +
      "  const resp = await fetch(url)\n" +
      "  return resp\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("fires on optional-call form fetch?.(url)", () => {
    const src =
      "?bs 0.7\n" +
      "async fn getUser(url: string) -> any {\n" +
      "  return fetch?.(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "async fn getUser(url: string) -> any {\n" +
      '  return unsafe "calls fetch directly" { fetch(url) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "calls fetch directly" async fn getUser(url: string) -> any {\n' +
      "  return fetch(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does NOT fire on member call obj.fetch(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUser(client: any) -> any {\n" +
      "  return client.fetch('/api')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does NOT fire on bare fetch reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getFetch() -> any {\n" +
      "  return fetch\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getUser(url: string) -> any {\n" +
      "  return fetch(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("severity is warning (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getUser(url: string) -> any {\n" +
      "  return fetch(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN007");
    expect(w?.severity).toBe("warning");
  });

  it("does NOT fire on object method shorthand named fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  const client = { fetch(url) { return url; } };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does NOT fire on TypeScript method signature named fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn test() -> void {\n" +
      "  type Client = { fetch(url: string): Promise<Response> };\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does NOT fire on a botscript fn declaration named fetch", () => {
    const src =
      "?bs 0.7\n" +
      "fn fetch(url: string) -> any {\n" +
      "  return url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("fires on fetch() inside a ternary expression (regression: `:` must not suppress)", () => {
    // `cond ? fetch(a) : fetch(b)` — the `:` after fetch(a)'s closing `)` used to
    // incorrectly match the TS method-signature exclusion, hiding SYN007.
    const src =
      "?bs 0.7\n" +
      "fn pick(cond: boolean, a: string, b: string) -> any {\n" +
      "  return cond ? fetch(a) : fetch(b)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN007").length).toBe(2);
  });

  it("fires on await fetch() inside a ternary expression (regression: await must not hide ternary context)", () => {
    // `cond ? await fetch(a) : other` — prev token before fetch is `await`, not `?`.
    // The ternary guard must look one token further back when prev is `await`.
    const src =
      "?bs 0.7\n" +
      "async fn pick(cond: boolean, a: string, b: string) -> any {\n" +
      "  return cond ? await fetch(a) : await fetch(b)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN007").length).toBe(2);
  });

  it("fires once per distinct fetch() call in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "async fn loadBoth(a: string, b: string) -> any {\n" +
      "  const r1 = await fetch(a)\n" +
      "  const r2 = await fetch(b)\n" +
      "  return { r1, r2 }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN007").length).toBe(2);
  });

  it("does NOT fire on function* fetch() generator declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn wrapper() -> any {\n" +
      "  function* fetch(url: string) { yield url }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });
});
