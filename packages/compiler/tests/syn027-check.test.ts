/**
 * Tests for SYN027 — Observer constructor APIs (MutationObserver,
 * IntersectionObserver, ResizeObserver, PerformanceObserver) that schedule
 * deferred callbacks outside the fn's capability surface.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const OBSERVERS = [
  "MutationObserver",
  "IntersectionObserver",
  "ResizeObserver",
  "PerformanceObserver",
] as const;

// ---------------------------------------------------------------------------
// SYN027 — each observer fires independently
// ---------------------------------------------------------------------------

describe("SYN027 — Observer constructor scheduling bypass (?bs 0.7+)", () => {
  for (const obs of OBSERVERS) {
    it(`fires SYN027 on new ${obs}(cb)`, () => {
      const src =
        "?bs 0.7\n" +
        `fn watch(el: Element) -> any {\n` +
        `  return new ${obs}(cb)\n` +
        "}\n";
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
    });

    it(`fires SYN027 on bare ${obs}(cb) without new`, () => {
      const src =
        "?bs 0.7\n" +
        `fn watch(el: Element) -> any {\n` +
        `  return ${obs}(cb)\n` +
        "}\n";
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
    });

    it(`fires SYN027 on ${obs}?.(cb)`, () => {
      const src =
        "?bs 0.7\n" +
        `fn watch(el: Element) -> any {\n` +
        `  return ${obs}?.(cb)\n` +
        "}\n";
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
    });

    it(`SYN027 warning mentions ${obs} and fn name`, () => {
      const src =
        "?bs 0.7\n" +
        `fn myObserveFn(node: Element) -> any {\n` +
        `  return new ${obs}(cb)\n` +
        "}\n";
      const result = compile(src);
      const w = result.warnings.find((w) => w.code === "SYN027");
      expect(w).toBeDefined();
      expect(w!.message).toContain(obs);
      expect(w!.message).toContain("myObserveFn");
      expect(w!.severity).toBe("warning");
    });

    it(`does NOT fire SYN027 on ${obs} below ?bs 0.7`, () => {
      const src =
        "?bs 0.1\n" +
        "fn f() {\n" +
        `  return new ${obs}(cb)\n` +
        "}\n";
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
    });

    it(`does NOT fire SYN027 on new ${obs}() inside unsafe {} block`, () => {
      const src =
        "?bs 0.7\n" +
        `fn watch(el: Element) -> any {\n` +
        `  return unsafe "observes mutations for logging" { new ${obs}(cb) }\n` +
        "}\n";
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
    });

    it(`does NOT fire SYN027 on obj.${obs}(cb) (member call)`, () => {
      const src =
        "?bs 0.7\n" +
        "fn f(obj: any) -> any {\n" +
        `  return obj.${obs}(cb)\n` +
        "}\n";
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
    });

    it(`does NOT fire SYN027 on fn ${obs}() declaration`, () => {
      const src =
        "?bs 0.7\n" +
        `fn ${obs}(cb: any) -> any = 0\n`;
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
    });

    it(`does NOT fire SYN027 on function ${obs}() declaration`, () => {
      const src =
        "?bs 0.7\n" +
        `function ${obs}(cb: any) { return 0 }\n`;
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
    });

    it(`does NOT fire SYN027 on function* ${obs}() generator`, () => {
      const src =
        "?bs 0.7\n" +
        `function* ${obs}(cb: any) { yield 0 }\n`;
      const result = compile(src);
      expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
    });

    it(`SYN027 carries rule and rewrite from registry for ${obs}`, () => {
      const src =
        "?bs 0.7\n" +
        `fn f(el: any) -> any {\n` +
        `  return new ${obs}(cb)\n` +
        "}\n";
      const result = compile(src);
      const w = result.warnings.find((w) => w.code === "SYN027");
      expect(w?.rule).toBeTruthy();
      expect(w?.rewrite).toBeTruthy();
    });
  }

  it("fires SYN027 on new MutationObserver<T>(cb) generic form", () => {
    const src =
      "?bs 0.7\n" +
      "fn watch(el: any) -> any {\n" +
      "  return new MutationObserver<any>(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(true);
  });

  it("does NOT fire SYN027 inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "wraps DOM observer" fn observe(el: any) -> any {\n' +
      "  return new MutationObserver(cb)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });

  it("fires SYN027 on all four observers in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn attachAll(el: any) -> void {\n" +
      "  const m = new MutationObserver(cb)\n" +
      "  const i = new IntersectionObserver(cb)\n" +
      "  const r = new ResizeObserver(cb)\n" +
      "  const p = new PerformanceObserver(cb)\n" +
      "}\n";
    const result = compile(src);
    const codes = result.warnings.filter((w) => w.code === "SYN027");
    expect(codes.length).toBe(4);
  });

  it("does NOT fire SYN027 on a bare MutationObserver reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f() -> any {\n" +
      "  return MutationObserver\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN027")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// navigator.sendBeacon — now covered by SYN023
// ---------------------------------------------------------------------------

describe("SYN023 — navigator.sendBeacon fire-and-forget network request", () => {
  it("fires SYN023 on navigator.sendBeacon(url, data)", () => {
    const src =
      "?bs 0.7\n" +
      "fn logEvent(url: string, data: string) -> void {\n" +
      "  navigator.sendBeacon(url, data)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN023")).toBe(true);
  });

  it("SYN023 on sendBeacon mentions sendBeacon and fn name", () => {
    const src =
      "?bs 0.7\n" +
      "fn myFn(url: string) -> void {\n" +
      "  navigator.sendBeacon(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN023");
    expect(w).toBeDefined();
    expect(w!.message).toContain("sendBeacon");
    expect(w!.message).toContain("myFn");
  });

  it("does NOT fire SYN023 on navigator.sendBeacon inside unsafe {} block", () => {
    const src =
      "?bs 0.7\n" +
      "fn logEvent(url: string, data: string) -> void {\n" +
      "  unsafe \"fire-and-forget analytics beacon\" { navigator.sendBeacon(url, data) }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN023")).toBe(false);
  });

  it("does NOT fire SYN023 on obj.navigator.sendBeacon (member chain)", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(obj: any) -> void {\n" +
      "  obj.navigator.sendBeacon(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN023")).toBe(false);
  });
});
