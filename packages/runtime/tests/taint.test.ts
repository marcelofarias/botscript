import { describe, expect, it } from "vitest";

import { fetched, trust, trustUnchecked, type Fetched, type Trusted } from "../src/taint.js";

describe("Fetched / Trusted taint types", () => {
  // ── fetched() ──────────────────────────────────────────────────────────────

  it("fetched() wraps a value with zero overhead — same reference at runtime", () => {
    const raw = { body: "hello" };
    const f = fetched(raw);
    expect(f).toBe(raw);
  });

  it("fetched() works on primitives", () => {
    expect(fetched("hello")).toBe("hello");
    expect(fetched(42)).toBe(42);
    expect(fetched(true)).toBe(true);
    expect(fetched(null)).toBe(null);
  });

  // ── trust() ────────────────────────────────────────────────────────────────

  it("trust() returns ok when validate passes", () => {
    const raw = fetched("hello");
    const result = trust(raw, (v) => v.length > 0);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.value).toBe("hello");
    }
  });

  it("trust() returns err when validate fails", () => {
    const raw = fetched("");
    const result = trust(raw, (v) => v.length > 0);
    expect(result.kind).toBe("err");
    if (result.kind === "err") {
      expect(result.error).toBe("validation failed");
    }
  });

  it("trust() uses the provided reason on failure", () => {
    const raw = fetched(-5);
    const result = trust(raw, (v) => v >= 0, "must be non-negative");
    expect(result.kind).toBe("err");
    if (result.kind === "err") {
      expect(result.error).toBe("must be non-negative");
    }
  });

  it("trust() on a complex object", () => {
    type Payload = { id: number; name: string };
    const raw = fetched<Payload>({ id: 1, name: "alice" });
    const result = trust(raw, (p) => typeof p.id === "number" && p.name.length > 0);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.value).toEqual({ id: 1, name: "alice" });
    }
  });

  it("trust() value has same runtime identity as input", () => {
    const raw = fetched({ x: 1 });
    const result = trust(raw, () => true);
    if (result.kind === "ok") {
      // Trusted<T> is T at runtime — same object reference
      expect(result.value).toBe(raw);
    }
  });

  // ── trustUnchecked() ───────────────────────────────────────────────────────

  it("trustUnchecked() returns a Trusted value at runtime", () => {
    const raw = fetched("sensitive");
    const trusted = trustUnchecked(raw, "already validated upstream by OAuth token check");
    expect(trusted).toBe("sensitive");
  });

  it("trustUnchecked() requires a non-empty justification (string param exists)", () => {
    // This is a type-level requirement, but we exercise the path
    const raw = fetched(99);
    const trusted = trustUnchecked(raw, "verified by schema validator at ingress");
    expect(trusted).toBe(99);
  });

  // ── type-level structural incompatibility (enforced by TypeScript compiler) ─
  // These tests validate runtime behaviour; the structural check is static.
  // The comments show what the type-checker would reject.

  it("Trusted<T> value is usable as T at runtime", () => {
    const raw = fetched("world");
    const result = trust(raw, () => true);
    if (result.kind === "ok") {
      const trusted: Trusted<string> = result.value;
      // At runtime, Trusted<string> is just string
      expect(trusted.toUpperCase()).toBe("WORLD");
    }
  });

  it("Fetched<T> value is usable as T at runtime", () => {
    const f: Fetched<number> = fetched(7);
    // At runtime, Fetched<number> is just number
    expect(f + 1).toBe(8);
  });

  // ── composition with Result patterns ──────────────────────────────────────

  it("trust() composes with ? operator pattern (manual simulation)", () => {
    // Simulates: let v = trust(raw, validate)?
    function processInput(raw: Fetched<string>): { kind: "ok"; value: string } | { kind: "err"; error: string } {
      const r = trust(raw, (v) => v.trim().length > 0, "empty input");
      if (r.kind === "err") return r;
      // At this point r.value is Trusted<string>
      return { kind: "ok", value: r.value.trim().toUpperCase() };
    }

    expect(processInput(fetched("  hello  "))).toEqual({ kind: "ok", value: "HELLO" });
    expect(processInput(fetched("  "))).toEqual({ kind: "err", error: "empty input" });
  });

  it("trust() can be used inside match on the kind field", () => {
    const r = trust(fetched(42), (n) => n > 0);
    let output: string;
    if (r.kind === "ok") {
      output = `trusted: ${r.value}`;
    } else {
      output = `rejected: ${r.error}`;
    }
    expect(output).toBe("trusted: 42");
  });
});
