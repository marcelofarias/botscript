import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN026: caches.* Cache Storage API access detection", () => {
  it("fires on caches.open()", () => {
    const src =
      "?bs 0.7\n" +
      "fn warmCache(name: string) -> any {\n" +
      "  return caches.open(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("fires on caches.match()", () => {
    const src =
      "?bs 0.7\n" +
      "fn loadAsset(url: string) -> any {\n" +
      "  return caches.match(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("fires on caches.has()", () => {
    const src =
      "?bs 0.7\n" +
      "fn hasCache(name: string) -> any {\n" +
      "  return caches.has(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("fires on caches.delete()", () => {
    const src =
      "?bs 0.7\n" +
      "fn evictCache(name: string) -> any {\n" +
      "  return caches.delete(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("fires on caches.keys()", () => {
    const src =
      "?bs 0.7\n" +
      "fn listCaches() -> any {\n" +
      "  return caches.keys()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("fires on optional-chain caches?.open()", () => {
    const src =
      "?bs 0.7\n" +
      "fn warmCache(name: string) -> any {\n" +
      "  return caches?.open(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(true);
  });

  it("does NOT fire on obj.caches.open() — member of a local binding", () => {
    const src =
      "?bs 0.7\n" +
      "fn openCache(ctx: any) -> any {\n" +
      "  return ctx.caches.open('v1')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire on bare caches reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn init(store: CacheStorage) -> void { }\n" +
      "fn setup() -> void {\n" +
      "  init(caches)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire on fn caches() botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn caches(name: string) -> string {\n" +
      "  return name\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire on JS function caches() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  function caches(n: string) { return n }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire on JS generator function* caches() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  function* caches(n: string) { yield n }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks", () => {
    const src =
      "?bs 0.7\n" +
      "fn warmCache(name: string) -> any {\n" +
      '  return unsafe "accesses caches for sw asset caching" { caches.open(name) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "accesses caches directly" fn warmCache(name: string) -> any {\n' +
      "  return caches.open(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("does NOT fire before ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn warmCache(name: string) -> any {\n" +
      "  return caches.open(name)\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN026")).toBe(false);
  });

  it("fires with warning severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn warmCache(name: string) -> any {\n" +
      "  return caches.open(name)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN026");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple caches accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn refreshCache(name: string) -> any {\n" +
      "  const exists = caches.has(name)\n" +
      "  const cache = caches.open(name)\n" +
      "  return [exists, cache]\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN026");
    expect(codes.length).toBe(2);
  });

  it("message includes caches. and capability model", () => {
    const src =
      "?bs 0.7\n" +
      "fn warmCache(name: string) -> any {\n" +
      "  return caches.open(name)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN026");
    expect(w?.message).toContain("caches.");
    expect(w?.message).toContain("capability model");
  });
});
