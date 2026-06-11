/**
 * Tests for SYN007: fetch() call detection in fn bodies (?bs 0.7+).
 *
 * SYN007 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN007: fetch() call detection (?bs 0.7+)", () => {
  it("fires on fetch() call in a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> string {\n" +
      "  return fetch(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("fires on fetch() with multiple args", () => {
    const src =
      "?bs 0.7\n" +
      "fn postData(url: string, body: string) -> string {\n" +
      "  return fetch(url, { method: 'POST', body })\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("fires on fetch?.() optional call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> string {\n" +
      "  return fetch?.(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("fires on fetch<Response>() TypeScript instantiation form", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> string {\n" +
      "  return fetch<Response>(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("fires on fetch<Promise<Response>>() nested generic instantiation form", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> string {\n" +
      "  return fetch<Promise<Response>>(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(true);
  });

  it("does not fire when fetch is inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> string {\n" +
      '  return unsafe "uses raw fetch for compat" { fetch(url) }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does not fire when fetch is inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "wraps fetch" fn loadRaw(url: string) -> string {\n' +
      "  return fetch(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does not fire on fetch() as an object-literal method shorthand inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeClient() -> any {\n" +
      "  return { fetch(url: string) { return url } }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does not fire on fetch() as a type-literal method signature inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn check(client: any) -> any {\n" +
      "  const typed: { fetch(url: string): string } = client\n" +
      "  return typed\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does not fire on .fetch() — method call on a local object", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(client: { fetch: (url: string) -> string }) -> string {\n" +
      "  return client.fetch(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does not fire on bare fetch reference — not called", () => {
    const src =
      "?bs 0.7\n" +
      "fn getFetcher() -> string {\n" +
      "  return typeof fetch !== 'undefined'\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn loadData(url: string) -> string {\n" +
      "  return fetch(url)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN007")).toBe(false);
  });

  it("severity is warning (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadData(url: string) -> string {\n" +
      "  return fetch(url)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN007");
    expect(w).toBeDefined();
    expect(w?.severity).toBe("warning");
  });
});
