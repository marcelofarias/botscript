/**
 * Tests for SYN013: Worker() / SharedWorker() construction detection (?bs 0.7+).
 *
 * SYN013 is a non-blocking warning — transform must not throw.
 */

import { describe, it, expect } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

describe("SYN013: Worker() / SharedWorker() construction detection", () => {
  it("fires on new Worker(url) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(url: string) -> any {\n" +
      "  return new Worker(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("fires on new SharedWorker(url) inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn startShared(url: string) -> any {\n" +
      "  return new SharedWorker(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("fires on bare Worker(url) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(url: string) -> any {\n" +
      "  return Worker(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("fires on TypeScript instantiation form new Worker<MessageEvent>(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(url: string) -> any {\n" +
      "  return new Worker<MessageEvent>(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(true);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn startWorker(url: string) -> any {\n" +
      "  return new Worker(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(url: string) -> any {\n" +
      '  return unsafe "spawns computation worker" { new Worker(url) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "worker factory" fn startWorker(url: string) -> any {\n' +
      "  return new Worker(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire on obj.Worker(...) — member call on a local", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(obj: any, url: string) -> any {\n" +
      "  return obj.Worker(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire on bare Worker reference (not called)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getConstructor() -> any {\n" +
      "  return Worker\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire on object method shorthands named Worker", () => {
    const src =
      "?bs 0.7\n" +
      "fn makeObj(url: string) -> any {\n" +
      "  return { Worker(u: string) { return u } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire on fn Worker(...) botscript declarations", () => {
    const src =
      "?bs 0.7\n" +
      "fn Worker(url: string) -> any {\n" +
      "  return url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire on JS function Worker(...) declaration inside a fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer(url: string) -> any {\n" +
      "  function Worker(u: string) { return u }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("does NOT fire on TS type-literal method signature without return type", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> any {\n" +
      "  type T = { Worker(url: string) }\n" +
      "  return null\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN013")).toBe(false);
  });

  it("fires in ternary consequent — not suppressed by trailing ':'", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(flag: boolean, a: string, b: string) -> any {\n" +
      "  return flag ? new Worker(a) : new Worker(b)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN013");
    expect(codes.length).toBe(2);
  });

  it("message says 'constructs new Worker' for new Worker form", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(url: string) -> any {\n" +
      "  return new Worker(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN013");
    expect(w?.message).toContain("constructs new Worker()");
  });

  it("message says 'constructs new SharedWorker' for new SharedWorker form", () => {
    const src =
      "?bs 0.7\n" +
      "fn startShared(url: string) -> any {\n" +
      "  return new SharedWorker(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN013");
    expect(w?.message).toContain("constructs new SharedWorker()");
  });

  it("message says 'calls Worker' for bare Worker(url) form", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(url: string) -> any {\n" +
      "  return Worker(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN013");
    expect(w?.message).toContain("calls Worker()");
  });

  it("severity is warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorker(url: string) -> any {\n" +
      "  return new Worker(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN013");
    expect(w?.severity).toBe("warning");
  });

  it("counts multiple Worker calls independently", () => {
    const src =
      "?bs 0.7\n" +
      "fn startWorkers(a: string, b: string) -> any {\n" +
      "  const w1 = new Worker(a)\n" +
      "  const w2 = new Worker(b)\n" +
      "  return [w1, w2]\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN013");
    expect(codes.length).toBe(2);
  });
});
