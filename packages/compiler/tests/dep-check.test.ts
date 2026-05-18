/**
 * Tests for reads {} / writes {} transitivity enforcement (?bs 0.9+).
 *
 * DEP001: fn A calls fn B which reads { x }, but A doesn't declare reads { x }.
 * DEP002: fn A calls fn B which writes { x }, but A doesn't declare writes { x }.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// DEP001: reads transitivity
// ---------------------------------------------------------------------------

describe("DEP001: reads under-declared (0.9+)", () => {
  it("fires when a caller omits a direct callee's reads label", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) -> string = getFromCache(id)\n";
    expect(() => compile(src)).toThrow("DEP001");
    expect(() => compile(src)).toThrow(/getFromCache.*reads \{ cache \}/);
  });

  it("fires when a caller omits a transitive (multi-hop) reads label", () => {
    const src =
      "?bs 0.9\n" +
      "fn readDb(id: string) reads { db } -> string = id\n" +
      "fn getUser(id: string) reads { db } -> string = readDb(id)\n" +
      "fn loadUser(id: string) -> string = getUser(id)\n";
    expect(() => compile(src)).toThrow("DEP001");
    expect(() => compile(src)).toThrow(/loadUser/);
  });

  it("passes when the caller declares the missing reads label", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) reads { cache } -> string = getFromCache(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes when the caller over-declares (extra labels are fine)", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) reads { cache, db } -> string = getFromCache(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes for a fn that reads directly with no callees", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) reads { cache } -> string = id\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes for a fn with no reads or writes calling a fn with no reads or writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = id\n" +
      "fn caller(id: string) -> string = helper(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) -> string = getFromCache(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("reports multiple missing labels", () => {
    const src =
      "?bs 0.9\n" +
      "fn getData(id: string) reads { cache, db } -> string = id\n" +
      "fn loadUser(id: string) -> string = getData(id)\n";
    expect(() => compile(src)).toThrow("DEP001");
  });

  it("does not flag property-access calls as same-file callee (obj.helper)", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(id: string) reads { cache } -> string = id\n" +
      "fn caller(obj: { helper: (id: string) => string }, id: string) -> string = obj.helper(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("call inside a closure expression in a fn body is still tracked", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn outer(id: string) -> string {\n" +
      "  const inner = (x: string): string => getFromCache(x);\n" +
      "  return inner(id);\n" +
      "}\n";
    // getFromCache appears in outer's body token stream — dep-check fires.
    // Consistent with cap-check: closure expressions don't create a new fn scope
    // from dep-check's perspective.
    expect(() => compile(src)).toThrow("DEP001");
  });
});

// ---------------------------------------------------------------------------
// DEP002: writes transitivity
// ---------------------------------------------------------------------------

describe("DEP002: writes under-declared (0.9+)", () => {
  it("fires when a caller omits a direct callee's writes label", () => {
    const src =
      "?bs 0.9\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) -> void { updateMetrics(id); }\n";
    expect(() => compile(src)).toThrow("DEP002");
    expect(() => compile(src)).toThrow(/updateMetrics.*writes \{ metrics \}/);
  });

  it("fires when a caller omits a transitive writes label", () => {
    const src =
      "?bs 0.9\n" +
      "fn writeAudit(id: string) writes { audit } -> void { }\n" +
      "fn logEvent(id: string) writes { audit } -> void { writeAudit(id); }\n" +
      "fn recordEvent(id: string) -> void { logEvent(id); }\n";
    expect(() => compile(src)).toThrow("DEP002");
    expect(() => compile(src)).toThrow(/recordEvent/);
  });

  it("passes when the caller declares the missing writes label", () => {
    const src =
      "?bs 0.9\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) writes { metrics } -> void { updateMetrics(id); }\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) -> void { updateMetrics(id); }\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Mixed reads + writes
// ---------------------------------------------------------------------------

describe("DEP001 + DEP002 mixed", () => {
  it("fires DEP001 when reads are missing, even when writes are correct", () => {
    const src =
      "?bs 0.9\n" +
      "fn syncData(id: string) reads { cache } writes { db } -> void { }\n" +
      "fn process(id: string) writes { db } -> void { syncData(id); }\n";
    expect(() => compile(src)).toThrow("DEP001");
  });

  it("fires DEP002 when writes are missing, even when reads are correct", () => {
    const src =
      "?bs 0.9\n" +
      "fn syncData(id: string) reads { cache } writes { db } -> void { }\n" +
      "fn process(id: string) reads { cache } -> void { syncData(id); }\n";
    expect(() => compile(src)).toThrow("DEP002");
  });

  it("passes when both reads and writes are correctly declared", () => {
    const src =
      "?bs 0.9\n" +
      "fn syncData(id: string) reads { cache } writes { db } -> void { }\n" +
      "fn process(id: string) reads { cache } writes { db } -> void { syncData(id); }\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Self-recursive fns
// ---------------------------------------------------------------------------

describe("recursive fns", () => {
  it("does not infinitely loop on a self-recursive fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn countdown(n: number) reads { store } -> void {\n" +
      "  if (n > 0) countdown(n - 1);\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});
