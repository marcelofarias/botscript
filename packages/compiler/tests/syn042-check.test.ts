/**
 * Tests for SYN042: Reflect.* calls that bypass static name-based SYN checks (?bs 0.7+).
 *
 * Six Reflect methods are flagged:
 *   - Reflect.apply / Reflect.construct — dynamic dispatch, defeats SYN004–SYN041
 *   - Reflect.set / Reflect.defineProperty / Reflect.deleteProperty — property mutation (like SYN039)
 *   - Reflect.setPrototypeOf — prototype replacement (like SYN040)
 *
 * SYN042 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN042: Reflect.* dangerous method detection", () => {
  // ── fires cases: dynamic dispatch ────────────────────────────────────────

  it("fires on Reflect.apply(fetch, null, [url])", () => {
    const src =
      "?bs 0.7\n" +
      "fn fetchData(url: string) -> any {\n" +
      "  return Reflect.apply(fetch, null, [url])\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  it("fires on Reflect.construct(SomeClass, args)", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(args: unknown[]) -> object {\n" +
      "  return Reflect.construct(WebSocket, args)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  it("fires on Reflect.apply with optional chain", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(fn: Function, args: unknown[]) -> any {\n" +
      "  return Reflect?.apply(fn, null, args)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  it("fires on Reflect.apply with optional call", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(fn: Function, args: unknown[]) -> any {\n" +
      "  return Reflect.apply?.(fn, null, args)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  // ── fires cases: property mutation ───────────────────────────────────────

  it("fires on Reflect.set(obj, 'key', value)", () => {
    const src =
      "?bs 0.7\n" +
      "fn mutate(obj: Record<string, unknown>) -> void {\n" +
      "  Reflect.set(obj, 'key', 42)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  it("fires on Reflect.defineProperty(target, key, desc)", () => {
    const src =
      "?bs 0.7\n" +
      "fn seal(target: object) -> void {\n" +
      "  Reflect.defineProperty(target, 'x', { value: 1, writable: false })\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  it("fires on Reflect.deleteProperty(obj, key)", () => {
    const src =
      "?bs 0.7\n" +
      "fn remove(obj: Record<string, unknown>) -> void {\n" +
      "  Reflect.deleteProperty(obj, 'key')\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  // ── fires cases: prototype replacement ───────────────────────────────────

  it("fires on Reflect.setPrototypeOf(obj, proto)", () => {
    const src =
      "?bs 0.7\n" +
      "fn rechain(obj: object, proto: object) -> void {\n" +
      "  Reflect.setPrototypeOf(obj, proto)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(true);
  });

  // ── suppressed inside unsafe {} ───────────────────────────────────────────

  it("does NOT fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn patchGlobal(obj: object) -> void {\n" +
      '  unsafe "patches prototype for hot-reload" { Reflect.setPrototypeOf(obj, null) }\n' +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(false);
  });

  it("does NOT fire inside unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "calls Reflect.apply for dynamic dispatch" fn dispatch(fn: Function, args: unknown[]) -> any {\n' +
      "  return Reflect.apply(fn, null, args)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(false);
  });

  // ── does not fire: harmless Reflect methods ───────────────────────────────

  it("does NOT fire on Reflect.has(obj, key) — read-only, non-dangerous", () => {
    const src =
      "?bs 0.7\n" +
      "fn check(obj: object, key: string) -> boolean {\n" +
      "  return Reflect.has(obj, key)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(false);
  });

  it("does NOT fire on Reflect.get(obj, key) — read-only, non-dangerous", () => {
    const src =
      "?bs 0.7\n" +
      "fn read(obj: object, key: string) -> unknown {\n" +
      "  return Reflect.get(obj, key)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(false);
  });

  it("does NOT fire on Reflect.ownKeys(obj) — enumeration, non-dangerous", () => {
    const src =
      "?bs 0.7\n" +
      "fn keys(obj: object) -> (string | symbol)[] {\n" +
      "  return Reflect.ownKeys(obj)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(false);
  });

  // ── does not fire: member access on local bindings ────────────────────────

  it("does NOT fire on obj.Reflect.apply (member access, not bare Reflect)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(obj: { Reflect: typeof Reflect }) -> any {\n" +
      "  return obj.Reflect.apply(fn, null, [])\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(false);
  });

  // ── does not fire below version 0.7 ──────────────────────────────────────

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.1\n" +
      "fn run(fn: Function, args: unknown[]) -> any {\n" +
      "  return Reflect.apply(fn, null, args)\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN042")).toBe(false);
  });

  // ── diagnostic properties ────────────────────────────────────────────────

  it("warning has correct code, severity, line, and message substring", () => {
    const src =
      "?bs 0.7\n" +
      "fn dispatch(fn: Function, args: unknown[]) -> any {\n" +
      "  return Reflect.apply(fn, null, args)\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN042");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
    expect(w!.line).toBe(3);
    expect(w!.message).toContain("Reflect.apply");
    expect(w!.message).toContain("SYN004–SYN041");
  });
});
