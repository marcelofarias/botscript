import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN016: indexedDB access detection", () => {
  it("fires on indexedDB.open()", () => {
    const src =
      "?bs 0.7\n" +
      "fn openDb(name: string) -> any {\n" +
      "  return indexedDB.open(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(true);
  });

  it("fires on indexedDB.deleteDatabase()", () => {
    const src =
      "?bs 0.7\n" +
      "fn dropDb(name: string) -> any {\n" +
      "  return indexedDB.deleteDatabase(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(true);
  });

  it("fires on indexedDB.databases()", () => {
    const src =
      "?bs 0.7\n" +
      "fn listDbs() -> any {\n" +
      "  return indexedDB.databases()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(true);
  });

  it("fires on optional-chain indexedDB?.open()", () => {
    const src =
      "?bs 0.7\n" +
      "fn openDb(name: string) -> any {\n" +
      "  return indexedDB?.open(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(true);
  });

  it("does NOT fire on obj.indexedDB.open() — member of a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn openDb(ctx: any) -> any {\n" +
      "  return ctx.indexedDB.open('db')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("does NOT fire on bare indexedDB reference without member access", () => {
    const src =
      "?bs 0.7\n" +
      "fn passThrough(fn: (db: typeof indexedDB) => void) -> void {\n" +
      "  fn(indexedDB)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("does NOT fire on fn indexedDB() botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn indexedDB(name: string) -> any {\n" +
      "  return name\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("does NOT fire on JS function indexedDB() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(name: string) -> any {\n" +
      "  function indexedDB(n: string) { return n }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("does NOT fire on JS generator function* indexedDB() declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  function* indexedDB(n: string) { yield n }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks", () => {
    const src =
      "?bs 0.7\n" +
      "fn openDb(name: string) -> any {\n" +
      '  return unsafe "accesses indexedDB for app data" { indexedDB.open(name) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "accesses indexedDB directly" fn openDb(name: string) -> any {\n' +
      "  return indexedDB.open(name)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("does NOT fire before ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn openDb(name: string) -> any {\n" +
      "  return indexedDB.open(name)\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN016")).toBe(false);
  });

  it("fires with warning severity", () => {
    const src =
      "?bs 0.7\n" +
      "fn openDb(name: string) -> any {\n" +
      "  return indexedDB.open(name)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN016");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple indexedDB accesses independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn openAndList(name: string) -> any {\n" +
      "  const req = indexedDB.open(name)\n" +
      "  const dbs = indexedDB.databases()\n" +
      "  return [req, dbs]\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN016");
    expect(codes.length).toBe(2);
  });

  it("message includes the member separator form", () => {
    const src =
      "?bs 0.7\n" +
      "fn openDb(name: string) -> any {\n" +
      "  return indexedDB.open(name)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN016");
    expect(w?.message).toContain("indexedDB.");
    expect(w?.message).toContain("capability model");
  });
});
