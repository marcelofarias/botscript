/**
 * Tests for parseProgram capability-surface extraction.
 *
 * parseProgram is the foundation for `botscript manifest` — it surfaces
 * per-function uses/reads/writes/throws declarations from a .bs source file.
 * These tests verify that all declared effects are correctly extracted and
 * that pure (no-declaration) functions are included with empty arrays.
 */

import { describe, expect, it } from "vitest";
import { parseProgram } from "../src/parser/parse.js";

describe("parseProgram: capability surface extraction", () => {
  it("extracts uses {} capabilities", () => {
    const src =
      "?bs 0.7\n" +
      "fn fetchUser(id: string) uses { net } -> string {\n" +
      "  return id\n" +
      "}\n";
    const p = parseProgram(src, { allowGenerics: true });
    expect(p.fns).toHaveLength(1);
    const decl = p.fns[0]!.decl;
    expect(decl.name).toBe("fetchUser");
    expect(decl.capabilities).toEqual(["net"]);
    expect(decl.reads ?? []).toEqual([]);
    expect(decl.writes ?? []).toEqual([]);
    expect(decl.throws ?? []).toEqual([]);
  });

  it("extracts reads {} and writes {} declarations", () => {
    const src =
      "?bs 0.9\n" +
      "fn updateMetrics(val: number) reads { cache } writes { metrics } -> void {\n" +
      "  return\n" +
      "}\n";
    const p = parseProgram(src, { allowGenerics: true });
    expect(p.fns).toHaveLength(1);
    const decl = p.fns[0]!.decl;
    expect(decl.reads).toEqual(["cache"]);
    expect(decl.writes).toEqual(["metrics"]);
  });

  it("extracts throws {} declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn risky(x: number) throws { NetworkError, TimeoutError } -> number {\n" +
      "  return x\n" +
      "}\n";
    const p = parseProgram(src, { allowGenerics: true });
    expect(p.fns).toHaveLength(1);
    const decl = p.fns[0]!.decl;
    expect(decl.throws).toEqual(["NetworkError", "TimeoutError"]);
  });

  it("includes functions with no capability declarations (pure-ish)", () => {
    const src =
      "?bs 0.7\n" +
      "fn double(x: number) -> number {\n" +
      "  return x * 2\n" +
      "}\n";
    const p = parseProgram(src, { allowGenerics: true });
    expect(p.fns).toHaveLength(1);
    const decl = p.fns[0]!.decl;
    expect(decl.name).toBe("double");
    expect(decl.capabilities).toEqual([]);
    expect(decl.reads ?? []).toEqual([]);
    expect(decl.writes ?? []).toEqual([]);
    expect(decl.throws ?? []).toEqual([]);
  });

  it("extracts all functions from a multi-function file", () => {
    const src =
      "?bs 0.7\n" +
      "fn net(id: string) uses { net } -> string { return id }\n" +
      "fn store(v: number) reads { db } writes { db } -> void { return }\n" +
      "fn calc(x: number) -> number { return x + 1 }\n";
    const p = parseProgram(src, { allowGenerics: true });
    expect(p.fns).toHaveLength(3);
    expect(p.fns.map((f) => f.decl.name)).toEqual(["net", "store", "calc"]);
    expect(p.fns[0]!.decl.capabilities).toEqual(["net"]);
    expect(p.fns[1]!.decl.reads).toEqual(["db"]);
    expect(p.fns[1]!.decl.writes).toEqual(["db"]);
    expect(p.fns[2]!.decl.capabilities).toEqual([]);
  });

  it("extracts multiple capabilities from uses {}", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() uses { net, stdout, process } -> void { return }\n";
    const p = parseProgram(src, { allowGenerics: true });
    expect(p.fns[0]!.decl.capabilities).toEqual(["net", "stdout", "process"]);
  });

  it("handles async fn correctly", () => {
    const src =
      "?bs 0.7\n" +
      "async fn fetch(url: string) uses { net } -> Promise<string> {\n" +
      "  return url\n" +
      "}\n";
    const p = parseProgram(src, { allowGenerics: true });
    expect(p.fns).toHaveLength(1);
    expect(p.fns[0]!.decl.name).toBe("fetch");
    expect(p.fns[0]!.decl.capabilities).toEqual(["net"]);
    expect(p.fns[0]!.decl.isAsync).toBe(true);
  });
});
