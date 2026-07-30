/**
 * Tests for SYN030 — new FinalizationRegistry(callback) registers a GC-triggered
 * callback with effects invisible to the fn header (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN030 — FinalizationRegistry GC callback scheduler (?bs 0.7+)", () => {
  it("fires SYN030 on new FinalizationRegistry(cb)", () => {
    const src =
      "?bs 0.7\n" +
      "fn trackObject(obj: object, id: string) -> void {\n" +
      "  const reg = new FinalizationRegistry((heldId) => { storage.delete(heldId) })\n" +
      "  reg.register(obj, id)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires SYN030 on bare FinalizationRegistry(cb) without new", () => {
    const src =
      "?bs 0.7\n" +
      "fn trackIt(obj: object) -> void {\n" +
      "  FinalizationRegistry((heldVal) => { console.log(heldVal) })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires SYN030 on FinalizationRegistry?.(cb) optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn trackIt(obj: object) -> void {\n" +
      "  FinalizationRegistry?.((heldVal) => { cleanup(heldVal) })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("fires SYN030 on new FinalizationRegistry<T>(cb) generic form", () => {
    const src =
      "?bs 0.7\n" +
      "fn trackTyped<T>(obj: T) -> void {\n" +
      "  const reg = new FinalizationRegistry<string>((key) => { cleanup(key) })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(true);
  });

  it("SYN030 message contains fn name and 'FinalizationRegistry'", () => {
    const src =
      "?bs 0.7\n" +
      "fn myTracker(obj: object, id: string) -> void {\n" +
      "  const reg = new FinalizationRegistry((k) => { cleanup(k) })\n" +
      "  reg.register(obj, id)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN030");
    expect(w).toBeDefined();
    expect(w!.message).toContain("myTracker");
    expect(w!.message).toContain("FinalizationRegistry");
  });

  it("SYN030 message mentions GC or non-deterministic", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: object) -> void {\n" +
      "  new FinalizationRegistry((k) => { cleanup(k) })\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN030");
    expect(w).toBeDefined();
    expect(w!.message).toMatch(/garbage-collected|GC|non-deterministic/i);
  });

  it("does NOT fire SYN030 inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: object, id: string) -> void {\n" +
      "  const reg = unsafe \"registers GC callback for cache eviction\" {\n" +
      "    new FinalizationRegistry((k) => { cleanup(k) })\n" +
      "  }\n" +
      "  reg.register(obj, id)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire SYN030 on obj.FinalizationRegistry (member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(env: any) -> void {\n" +
      "  env.FinalizationRegistry((k) => { cleanup(k) })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire SYN030 on the function declaration named FinalizationRegistry itself", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  function FinalizationRegistry(cb: (v: string) => void) { cb('x') }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire SYN030 for ?bs < 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn f(obj: object) -> void {\n" +
      "  new FinalizationRegistry((k) => { cleanup(k) })\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("does NOT fire SYN030 on method shorthand: { FinalizationRegistry(cb) { } }", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  const obj = { FinalizationRegistry(cb: (v: string) => void) { return cb } }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });

  it("fires on both new form and bare call in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: object) -> void {\n" +
      "  const a = new FinalizationRegistry((k) => { cleanup(k) })\n" +
      "  const b = FinalizationRegistry((k) => { cleanup(k) })\n" +
      "}\n";
    const result = compile(src);
    const syn030s = result.warnings.filter((w) => w.code === "SYN030");
    expect(syn030s.length).toBeGreaterThanOrEqual(2);
  });

  it("reports line number pointing at the FinalizationRegistry call", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: object) -> void {\n" +
      "  const reg = new FinalizationRegistry((k) => { cleanup(k) })\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN030");
    expect(w).toBeDefined();
    expect(w!.line).toBe(3);
  });

  it("does NOT fire SYN030 on TS method signature: { FinalizationRegistry(cb): T; }", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> void {\n" +
      "  type R = { FinalizationRegistry(cb: (v: string) => void): string; }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN030")).toBe(false);
  });
});
