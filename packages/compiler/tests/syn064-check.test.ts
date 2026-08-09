/**
 * Tests for SYN064: dynamic (non-literal) computed bracket access on a dangerous
 * receiver — `globalThis[key]`, `window[name]`, `self[expr]`, `global[v]`,
 * `process[key]` (?bs 0.7+).
 *
 * SYN041–SYN043 catch string-literal bracket forms on globalThis/window/self;
 * SYN047 and SYN063 extend this to global and process. When the key is a
 * variable, template literal, or expression, none can resolve the member name
 * at compile time. SYN064 closes this gap.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN064: dynamic bracket access on dangerous receiver (?bs 0.7+)", () => {
  // ── fires: globalThis[variable] ────────────────────────────────────────

  it("fires on globalThis[key] — variable key", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return globalThis[key]()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  it("fires on globalThis[getKey()] — expression key", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  const k = getKey()\n" +
      "  return globalThis[k]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  it("fires on globalThis[`fetch`] — template literal key", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return globalThis[`fetch`]()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  // ── fires: window[variable] ─────────────────────────────────────────────

  it("fires on window[name] — variable key", () => {
    const src =
      "?bs 0.7\n" +
      "fn call(name: string) -> any {\n" +
      "  return window[name]()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  // ── fires: self[variable] ───────────────────────────────────────────────

  it("fires on self[prop] — variable key", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(prop: string) -> any {\n" +
      "  return self[prop]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  // ── fires: process[variable] ────────────────────────────────────────────

  it("fires on process[key] — variable key", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return process[key]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  it("fires on process[`exit`] — template literal key", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process[`exit`](1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  it("fires on process[member] where member is a local variable", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> void {\n" +
      "  const member = 'exit'\n" +
      "  process[member](0)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  // ── fires: global[variable] ─────────────────────────────────────────────

  it("fires on global[key] — variable key", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return global[key]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  // ── suppressed: unsafe {} blocks SYN064 ─────────────────────────────────

  it("does not fire inside unsafe block — globalThis[key]", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return unsafe \"dynamic key validated above\" { globalThis[key]() }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });

  it("does not fire inside unsafe block — process[key]", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return unsafe \"key is safe\" { process[key] }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });

  // ── does not fire: string literal key is covered by SYN043/SYN063 ───────

  it("does not fire on globalThis['fetch'] — string literal fires SYN043 not SYN064", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return globalThis['fetch']('/')\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN043")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });

  it("does not fire on process['exit'] — string literal fires SYN063 not SYN064", () => {
    const src =
      "?bs 0.7\n" +
      "fn bail() -> void {\n" +
      "  process['exit'](1)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN063")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });

  // ── does not fire: number literal key is harmless ───────────────────────

  it("does not fire on globalThis[0] — number literal key is harmless", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return globalThis[0]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });

  it("does not fire on process[0] — number literal key is harmless", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return process[0]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });

  // ── does not fire below ?bs 0.7 ─────────────────────────────────────────

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn run(key: string) -> any {\n" +
      "  return globalThis[key]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });

  // ── does not fire: not a top-level global ident ──────────────────────────

  it("does not fire on obj.globalThis[key] — member access context", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(obj: any, key: string) -> any {\n" +
      "  return obj.globalThis[key]\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(false);
  });
});
