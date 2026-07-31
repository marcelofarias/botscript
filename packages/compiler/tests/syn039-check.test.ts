/**
 * Tests for SYN039: Object.defineProperty() / Object.defineProperties() in fn bodies (?bs 0.7+).
 *
 * These calls redefine property descriptors — value, writable, enumerable, configurable,
 * get, set — at runtime with effects invisible to botscript's capability model. They can
 * silently override capability-gated globals (fetch, WebSocket, setTimeout) bypassing
 * SYN007–SYN038 at runtime even when source-level checks passed.
 *
 * SYN039 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN039: Object.defineProperty / Object.defineProperties detection", () => {
  // ── fires cases ──────────────────────────────────────────────────────────

  it("fires on Object.defineProperty(globalThis, key, descriptor)", () => {
    const src =
      "?bs 0.7\n" +
      "fn exposeConfig(cfg: Config) -> void {\n" +
      "  Object.defineProperty(globalThis, 'config', { get: () => cfg })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(true);
  });

  it("fires on Object.defineProperties(api, descriptors)", () => {
    const src =
      "?bs 0.7\n" +
      "fn sealApi(api: Api) -> void {\n" +
      "  Object.defineProperties(api, { fetch: { value: myFetch, writable: false } })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(true);
  });

  it("fires when target is a plain local object", () => {
    const src =
      "?bs 0.7\n" +
      "fn configure(obj: Record<string, unknown>) -> void {\n" +
      "  Object.defineProperty(obj, 'key', { value: 42, writable: false })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(true);
  });

  it("fires on Object?.defineProperty optional-chain call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(target: object) -> void {\n" +
      "  Object?.defineProperty(target, 'x', { value: 1 })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(true);
  });

  it("fires on Object.defineProperty?.(target, ...) optional-call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(target: object) -> void {\n" +
      "  Object.defineProperty?.(target, 'x', { value: 1 })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(true);
  });

  it("produces a warning-severity diagnostic (non-blocking)", () => {
    const src =
      "?bs 0.7\n" +
      "fn seal(obj: object) -> void {\n" +
      "  Object.defineProperty(obj, 'key', { writable: false })\n" +
      "}\n";
    let result: ReturnType<typeof transform>;
    expect(() => { result = transform(src); }).not.toThrow();
    const w = result!.warnings.find((w) => w.code === "SYN039");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("warning message mentions the fn name and method called", () => {
    const src =
      "?bs 0.7\n" +
      "fn patchFetch(impl: Function) -> void {\n" +
      "  Object.defineProperty(globalThis, 'fetch', { value: impl })\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN039")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("patchFetch");
    expect(w.message).toContain("Object.defineProperty");
  });

  it("warning message for defineProperties mentions the correct method name", () => {
    const src =
      "?bs 0.7\n" +
      "fn sealAll(api: Api) -> void {\n" +
      "  Object.defineProperties(api, { x: { value: 1 }, y: { value: 2 } })\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN039")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("defineProperties");
  });

  it("fires inside nested fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn outer() -> void {\n" +
      "  fn inner(target: object) -> void {\n" +
      "    Object.defineProperty(target, 'x', { value: 1 })\n" +
      "  }\n" +
      "  inner({})\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(true);
  });

  // ── does-not-fire cases ───────────────────────────────────────────────────

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn run(obj: object) -> void {\n" +
      "  Object.defineProperty(obj, 'x', { value: 1 })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(obj: object) -> void {\n" +
      '  unsafe "redefines obj.x for polyfill" { Object.defineProperty(obj, \'x\', { value: 1 }) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "redefines globalThis.fetch for testing" fn patchFetch(impl: Function) -> void {\n' +
      "  Object.defineProperty(globalThis, 'fetch', { value: impl })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire on myObj.Object.defineProperty — Object is not the global", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(ctx: { Object: typeof Object }) -> void {\n" +
      "  ctx.Object.defineProperty(ctx, 'x', { value: 1 })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire on bare Object reference (no method call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return Object\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire on Object.keys() — not a descriptor-mutation method", () => {
    const src =
      "?bs 0.7\n" +
      "fn getKeys(obj: Record<string, unknown>) -> string[] {\n" +
      "  return Object.keys(obj)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire on Object.freeze() — not a descriptor method", () => {
    const src =
      "?bs 0.7\n" +
      "fn seal(obj: Record<string, unknown>) -> void {\n" +
      "  Object.freeze(obj)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire on fn Object(...) declaration", () => {
    const src =
      "?bs 0.7\n" +
      "fn Object(x: number) -> number {\n" +
      "  return x\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("does NOT fire on Object.getOwnPropertyDescriptor() — read-only, no mutation", () => {
    const src =
      "?bs 0.7\n" +
      "fn inspect(obj: object, key: string) -> PropertyDescriptor | undefined {\n" +
      "  return Object.getOwnPropertyDescriptor(obj, key)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN039")).toBe(false);
  });

  it("optional-chain message includes ?. separator", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(target: object) -> void {\n" +
      "  Object?.defineProperty(target, 'x', { value: 1 })\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN039")!;
    expect(w).toBeDefined();
    expect(w.message).toContain("Object?.defineProperty");
  });
});
