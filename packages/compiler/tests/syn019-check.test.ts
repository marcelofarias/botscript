import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

describe("SYN019: crypto.getRandomValues() / crypto.randomUUID() detection", () => {
  it("fires on crypto.getRandomValues(buf)", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeToken(buf: Uint8Array) -> Uint8Array {\n" +
      "  crypto.getRandomValues(buf)\n" +
      "  return buf\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(true);
  });

  it("fires on crypto.randomUUID()", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeId() -> string {\n" +
      "  return crypto.randomUUID()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(true);
  });

  it("fires on crypto?.getRandomValues(buf) — optional chain on crypto", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeToken(buf: Uint8Array) -> Uint8Array {\n" +
      "  crypto?.getRandomValues(buf)\n" +
      "  return buf\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(true);
  });

  it("fires on crypto.getRandomValues?.(buf) — optional call on method", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeToken(buf: Uint8Array) -> Uint8Array {\n" +
      "  crypto.getRandomValues?.(buf)\n" +
      "  return buf\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn makeId() -> string {\n" +
      "  return crypto.randomUUID()\n" +
      "}\n";
    const result = passSynCheck(src, { resolved: "0.6", declared: "0.6" });
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("is suppressed inside unsafe {} blocks", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeId() -> string {\n" +
      '  return unsafe "uses crypto for UUID generation" { crypto.randomUUID() }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("is suppressed inside unsafe fn bodies", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "uses crypto directly" fn makeToken(buf: Uint8Array) -> Uint8Array {\n' +
      "  crypto.getRandomValues(buf)\n" +
      "  return buf\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("does NOT fire on obj.crypto.getRandomValues(buf) — member call on local", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeToken(ctx: any, buf: Uint8Array) -> Uint8Array {\n" +
      "  ctx.crypto.getRandomValues(buf)\n" +
      "  return buf\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("does NOT fire on function crypto() {} — fn declaration named crypto", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  function crypto(buf: ArrayBuffer) { return buf }\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("does NOT fire on function* crypto() {} — generator declaration named crypto", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  function* crypto(buf: ArrayBuffer) { yield buf }\n" +
      "  return\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("does NOT fire on crypto.subtle.digest() — non-randomness member", () => {
    const src =
      "?bs 0.7\n" +
      "fn hashIt(data: ArrayBuffer) -> Promise<ArrayBuffer> {\n" +
      "  return crypto.subtle.digest('SHA-256', data)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("does NOT fire on bare crypto reference with no following call", () => {
    const src =
      "?bs 0.7\n" +
      "fn getCrypto() -> any {\n" +
      "  return crypto\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN019")).toBe(false);
  });

  it("nested fn attribution: fires on inner fn, attributed correctly", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  fn inner() -> string {\n" +
      "    return crypto.randomUUID()\n" +
      "  }\n" +
      "  inner()\n" +
      "}\n";
    const result = compile(src);
    const warns = result.warnings.filter((w) => w.code === "SYN019");
    expect(warns.length).toBe(1);
    expect(warns[0]?.message).toContain("inner");
  });

  it("message contains crypto.getRandomValues() for getRandomValues calls", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeToken(buf: Uint8Array) -> Uint8Array {\n" +
      "  crypto.getRandomValues(buf)\n" +
      "  return buf\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN019");
    expect(w?.message).toContain("crypto.getRandomValues");
  });

  it("message contains crypto.randomUUID() for randomUUID calls", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeId() -> string {\n" +
      "  return crypto.randomUUID()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN019");
    expect(w?.message).toContain("crypto.randomUUID");
  });
});
