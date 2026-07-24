/**
 * Tests for SYN038: globalThis / window / self property write in fn bodies (?bs 0.7+).
 *
 * Writing to the global object mutates ambient shared state invisible to the
 * capability model — no uses{}/reads{}/writes{} declaration covers global scope writes.
 */

import { describe, expect, it } from "vitest";
import { passSynCheck } from "../src/passes/syn-check.js";

function compile(src: string) {
  return passSynCheck(src, { resolved: "0.7", declared: "0.7" });
}

function warnings(src: string) {
  return compile(src).warnings.filter((w) => w.code === "SYN038");
}

describe("SYN038: globalThis / window / self property write detection", () => {

  // ── Positive cases: should warn ────────────────────────────────────────────

  it("fires on globalThis.foo = value", () => {
    const src =
      "?bs 0.7\n" +
      "fn register(x: number) -> void {\n" +
      "  globalThis.foo = x\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws).toHaveLength(1);
    expect(ws[0]!.code).toBe("SYN038");
    expect(ws[0]!.message).toContain("globalThis.foo =");
  });

  it("fires on window.bar = value", () => {
    const src =
      "?bs 0.7\n" +
      "fn init(s: string) -> void {\n" +
      "  window.bar = s\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws).toHaveLength(1);
    expect(ws[0]!.message).toContain("window.bar =");
  });

  it("fires on self.baz = value", () => {
    const src =
      "?bs 0.7\n" +
      "fn setup(b: boolean) -> void {\n" +
      "  self.baz = b\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws).toHaveLength(1);
    expect(ws[0]!.message).toContain("self.baz =");
  });

  it("fires on compound assignment globalThis.count += 1", () => {
    const src =
      "?bs 0.7\n" +
      "fn inc() -> void {\n" +
      "  globalThis.count += 1\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws).toHaveLength(1);
    expect(ws[0]!.message).toContain("globalThis.count +=");
  });

  it("fires on bitwise compound assignment window.flags |= 1", () => {
    const src =
      "?bs 0.7\n" +
      "fn setFlag() -> void {\n" +
      "  window.flags |= 1\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws).toHaveLength(1);
    expect(ws[0]!.message).toContain("window.flags |=");
  });

  it("fires on optional-chain receiver globalThis?.config = {}", () => {
    const src =
      "?bs 0.7\n" +
      "fn configure() -> void {\n" +
      "  globalThis?.config = {}\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws).toHaveLength(1);
    expect(ws[0]!.message).toContain("globalThis?.config =");
  });

  it("fires on multiple global writes in the same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn multiWrite() -> void {\n" +
      "  globalThis.a = 1\n" +
      "  window.b = 2\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws).toHaveLength(2);
    expect(ws[0]!.message).toContain("globalThis.a =");
    expect(ws[1]!.message).toContain("window.b =");
  });

  it("includes the fn name in the warning message", () => {
    const src =
      "?bs 0.7\n" +
      "fn initConfig(cfg: Config) -> void {\n" +
      "  globalThis.config = cfg\n" +
      "}\n";
    const ws = warnings(src);
    expect(ws[0]!.message).toMatch(/fn 'initConfig'/);
  });

  // ── Negative cases: should NOT warn ────────────────────────────────────────

  it("does not fire on globalThis.foo read (no assignment)", () => {
    const src =
      "?bs 0.7\n" +
      "fn readGlobal() -> unknown {\n" +
      "  return globalThis.foo\n" +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire on window.location read", () => {
    const src =
      "?bs 0.7\n" +
      "fn getHref() -> string {\n" +
      "  return window.location.href\n" +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire on obj.globalThis.foo = v (member on local binding)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setOnObj(obj: any) -> void {\n" +
      "  obj.globalThis.foo = 1\n" +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire on function declaration named globalThis", () => {
    const src =
      "?bs 0.7\n" +
      "function globalThis(x: number) -> number {\n" +
      "  return x\n" +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire on fn keyword declaration named window", () => {
    const src =
      "?bs 0.7\n" +
      "fn window(x: number) -> number = x\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn polyfill() -> void {\n" +
      '  unsafe "writes globalThis.Promise for polyfill" { globalThis.Promise = MyPromise }\n' +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire when fn is unsafe", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "polyfills Promise global" fn polyfillFn() -> void {\n' +
      "  globalThis.Promise = MyPromise\n" +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire on globalThis.foo === x (comparison, not assignment)", () => {
    const src =
      "?bs 0.7\n" +
      "fn isUndef() -> boolean {\n" +
      "  return globalThis.foo === undefined\n" +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire below ?bs 0.7", () => {
    const result = passSynCheck(
      "?bs 0.6\nfn run() -> void {\n  globalThis.foo = 1\n}\n",
      { resolved: "0.6", declared: "0.6" },
    );
    expect(result.warnings.filter((w) => w.code === "SYN038")).toHaveLength(0);
  });

  it("does not fire when globalThis is bare (no dot access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getGlobal() -> any {\n" +
      "  return globalThis\n" +
      "}\n";
    expect(warnings(src)).toHaveLength(0);
  });

  it("does not fire on globalThis[key] = v (computed property — out of scope for token-level check)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setDynamic(key: string, v: any) -> void {\n" +
      "  globalThis[key] = v\n" +
      "}\n";
    // Computed property access is not detected by SYN038 (token after ident is `[`, not `.`)
    expect(warnings(src)).toHaveLength(0);
  });
});
