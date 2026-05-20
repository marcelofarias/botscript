import { describe, expect, it } from "vitest";
import { BotscriptError } from "../src/diagnostics.js";
import { transform } from "../src/index.js";

function compile(src: string): string {
  return transform(src).code;
}

function expectEff(src: string, code: "EFF002"): void {
  try {
    compile(src);
    throw new Error(`Expected ${code} but no error thrown`);
  } catch (e) {
    expect(e).toBeInstanceOf(BotscriptError);
    const err = e as BotscriptError;
    expect(err.diagnostics[0]!.code).toBe(code);
  }
}

describe("-> to => conversion in parameter types", () => {
  it("converts -> to => in a function-typed parameter", () => {
    const src = `?bs 0.7
fn run(action: () -> string) -> string = action()
`;
    const out = compile(src);
    expect(out).toContain("action: () => string");
    expect(out).not.toContain("action: () -> string");
  });

  it("converts -> to => in a generic function-typed parameter", () => {
    const src = `?bs 0.7
fn map(transform: (x: string) -> number) -> number = transform("hello")
`;
    const out = compile(src);
    expect(out).toContain("transform: (x: string) => number");
  });

  it("does not affect the function return type arrow", () => {
    const src = `?bs 0.7
fn identity(x: string) -> string = pure { x }
`;
    const out = compile(src);
    // Return type uses `:` not `->` in TypeScript output
    expect(out).toContain("function identity(x: string): string");
  });

  it("compiles a function with no callback parameters unchanged (no -> in args)", () => {
    const src = `?bs 0.7
fn greet(name: string) -> string = pure { "hello " + name }
`;
    const out = compile(src);
    expect(out).toContain("function greet(name: string): string");
  });
});

describe("uses {} stripping from parameter types", () => {
  it("strips uses {} from a function-typed parameter", () => {
    const src = `?bs 0.7
fn withRetry(action: () uses { net } -> string) uses { net } -> string = action()
`;
    const out = compile(src);
    // TypeScript output should not contain uses {}
    expect(out).toContain("action: () => string");
    expect(out).not.toContain("uses { net }");
  });

  it("strips uses {} with multiple capabilities", () => {
    const src = `?bs 0.7
fn withEffect(action: () uses { net, time } -> void) uses { net, time } -> void = action()
`;
    const out = compile(src);
    expect(out).toContain("action: () => void");
    expect(out).not.toContain("uses {");
  });

  it("strips uses {} from one of multiple parameters", () => {
    const src = `?bs 0.7
fn apply(action: () uses { net } -> string, count: number) uses { net } -> string = action()
`;
    const out = compile(src);
    expect(out).toContain("action: () => string");
    expect(out).toContain("count: number");
    expect(out).not.toContain("uses {");
  });
});

describe("EFF002 — outer fn narrower than callback parameter", () => {
  it("fires EFF002 when outer fn declares no capabilities but callback declares net", () => {
    const src = `?bs 0.7
fn withRetry(action: () uses { net } -> string) -> string = action()
`;
    expectEff(src, "EFF002");
  });

  it("fires EFF002 when outer fn declares time but callback declares net", () => {
    const src = `?bs 0.7
fn withRetry(action: () uses { net } -> string) uses { time } -> string = action()
`;
    expectEff(src, "EFF002");
  });

  it("fires EFF002 when multiple callback params cover capabilities not in outer fn", () => {
    const src = `?bs 0.7
fn run(a: () uses { net } -> void, b: () uses { fs } -> void) uses { net } -> void = a()
`;
    expectEff(src, "EFF002");
  });

  it("passes when outer fn declares all callback capabilities", () => {
    const src = `?bs 0.7
fn withRetry(action: () uses { net } -> string) uses { net } -> string = action()
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("passes when outer fn declares a superset of callback capabilities", () => {
    // Outer fn declares both net and time; callback declares net; outer fn
    // also directly calls time.now() so time is not over-declared.
    const src = `?bs 0.7
fn withRetry(action: () uses { net } -> string) uses { net, time } -> string {
  const start = time.now();
  return action();
}
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("passes when callback has no uses annotation", () => {
    const src = `?bs 0.7
fn run(action: () -> string) -> string = action()
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("passes when no function-typed parameters are present", () => {
    const src = `?bs 0.7
fn greet(name: string) -> string = pure { "hello " + name }
`;
    expect(() => compile(src)).not.toThrow();
  });

  it("EFF002 diagnostic includes the missing capability name", () => {
    const src = `?bs 0.7
fn withRetry(action: () uses { net } -> string) -> string = action()
`;
    try {
      compile(src);
      expect.fail("should have thrown EFF002");
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.message).toContain("net");
    }
  });

  it("is not active before ?bs 0.7", () => {
    // Pre-0.7: no intent or effect checks run, so EFF002 does not fire.
    const src = `?bs 0.6
fn withRetry(action: () uses { net } -> string) -> string = action()
`;
    // Should compile without EFF002 (CAP002 might fire for over-declaration,
    // but cap-check is at a different level — here we just check no EFF002).
    // In practice this also avoids CAP001/002 since the compiler doesn't
    // inspect param types for capability uses in older versions.
    expect(() => compile(src)).not.toThrow();
  });
});

describe("EFF002 interacts correctly with CAP001/CAP002", () => {
  it("passes — outer fn declares net, callback uses net, no CAP002 (body calls action())", () => {
    // The outer fn calls action() which exercises net. That's a call to a
    // local variable, not a direct stdlib call, so CAP001/CAP002 won't fire
    // on the direct-use basis. EFF002 is satisfied because the outer fn
    // declares net.
    const src = `?bs 0.7
fn withRetry(action: () uses { net } -> string) uses { net } -> string = action()
`;
    expect(() => compile(src)).not.toThrow();
  });
});

describe("STDLIB.bs receives uses {} on callbacks", () => {
  it("a realistic higher-order fn compiles cleanly", () => {
    const src = `?bs 0.7
fn fetchOrFallback(fetch: () uses { net } -> string, fallback: string) uses { net } -> string {
  const result = fetch();
  return result;
}
`;
    const out = compile(src);
    expect(out).toContain("fetch: () => string");
    expect(out).toContain("fallback: string");
    expect(out).not.toContain("uses {");
  });
});

describe("EFF002 checks nested fn declarations", () => {
  it("fires EFF002 on a nested fn that under-declares callback effects", () => {
    const src = `?bs 0.7
fn outer() -> void {
  fn inner(action: () uses { net } -> string) -> string = action()
}
`;
    expectEff(src, "EFF002");
  });

  it("passes when nested fn correctly declares callback effects", () => {
    const src = `?bs 0.7
fn outer() -> void {
  fn inner(action: () uses { net } -> string) uses { net } -> string = action()
}
`;
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// EFF003: reads {} on callback parameters (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("EFF003: reads on callback not propagated (?bs 0.9+)", () => {
  it("fires EFF003 when a callback declares reads {} but outer fn declares no reads", () => {
    const src =
      "?bs 0.9\n" +
      "fn withCache(loader: () reads { cache } -> string) -> string = loader()\n";
    expect(() => compile(src)).toThrow("EFF003");
    expect(() => compile(src)).toThrow(/withCache/);
  });

  it("fires EFF003 when a callback declares reads {} but outer fn declares different reads", () => {
    const src =
      "?bs 0.9\n" +
      "fn withCache(loader: () reads { cache } -> string) reads { db } -> string = loader()\n";
    expect(() => compile(src)).toThrow("EFF003");
  });

  it("does not fire EFF003 when outer fn declares all callback reads", () => {
    const src =
      "?bs 0.9\n" +
      "fn withCache(loader: () reads { cache } -> string) reads { cache } -> string = loader()\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire EFF003 when outer fn over-declares reads (superset)", () => {
    const src =
      "?bs 0.9\n" +
      "fn withCache(loader: () reads { cache } -> string) reads { cache, db } -> string = loader()\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("strips reads {} from callback parameter in emitted TypeScript", () => {
    const src =
      "?bs 0.9\n" +
      "fn withCache(loader: () reads { cache } -> string) reads { cache } -> string = loader()\n";
    const out = compile(src);
    expect(out).not.toContain("reads");
    expect(out).toContain("loader: () => string");
  });

  it("does not fire EFF003 below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn withCache(loader: () reads { cache } -> string) -> string = loader()\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire EFF003 when callback has no reads annotation", () => {
    const src =
      "?bs 0.9\n" +
      "fn run(action: () -> string) -> string = action()\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("fires EFF003 with multiple missing reads labels", () => {
    const src =
      "?bs 0.9\n" +
      "fn withData(loader: () reads { cache, db } -> string) -> string = loader()\n";
    expect(() => compile(src)).toThrow("EFF003");
    expect(() => compile(src)).toThrow(/cache/);
  });
});

// ---------------------------------------------------------------------------
// EFF004: writes {} on callback parameters (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("EFF004: writes on callback not propagated (?bs 0.9+)", () => {
  it("fires EFF004 when a callback declares writes {} but outer fn declares no writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) -> void { recorder() }\n";
    expect(() => compile(src)).toThrow("EFF004");
    expect(() => compile(src)).toThrow(/withMetrics/);
  });

  it("fires EFF004 when callback writes not covered by outer fn writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) writes { audit } -> void { recorder() }\n";
    expect(() => compile(src)).toThrow("EFF004");
  });

  it("does not fire EFF004 when outer fn declares all callback writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) writes { metrics } -> void { recorder() }\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire EFF004 when outer fn over-declares writes (superset)", () => {
    const src =
      "?bs 0.9\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) writes { metrics, audit } -> void { recorder() }\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("strips writes {} from callback parameter in emitted TypeScript", () => {
    const src =
      "?bs 0.9\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) writes { metrics } -> void { recorder() }\n";
    const out = compile(src);
    expect(out).not.toContain("writes");
    expect(out).toContain("recorder: () => void");
  });

  it("does not fire EFF004 below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) -> void { recorder() }\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire EFF004 when callback has no writes annotation", () => {
    const src =
      "?bs 0.9\n" +
      "fn run(action: () -> void) -> void { action() }\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("can fire EFF003 and EFF004 together when callback has both reads and writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn withDataOp(op: () reads { cache } writes { db } -> void) -> void { op() }\n";
    // Should throw — at least one of EFF003 or EFF004
    expect(() => compile(src)).toThrow();
  });
});
