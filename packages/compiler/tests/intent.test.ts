/**
 * Tests for the intent-check pass (INT001).
 *
 * The `intent: "..."` clause is parsed from `?bs 0.1` onward (the parser is
 * version-agnostic for this construct), but INT001 is only enforced from
 * `?bs 0.7` onwards per the versioned-syntax rule.
 *
 * Sources in these tests are always in canonical form (what `botscript fmt`
 * would produce) because `?bs 0.4+` rejects non-canonical input. Expression
 * bodies (`= expr`) are used wherever the single-`return` rule would apply.
 */

import { describe, expect, it } from "vitest";

import { BotscriptError, transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("intent: clause — parsing (all versions)", () => {
  it("parses intent: on ?bs 0.1 without any check firing", () => {
    // ?bs 0.1: no canonical-form gate, no cap check, no intent check.
    const src = `?bs 0.1\nfn fetch(url: string) uses { net } intent: "pure" -> string = url\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("emits valid TypeScript for a fn with intent: — clause absent from output", () => {
    const src = `?bs 0.7\nfn slug(s: string) intent: "pure" -> string = pure { s.toLowerCase() }\n`;
    const out = t(src);
    // The intent clause must NOT appear in the emitted TypeScript.
    expect(out).not.toContain("intent:");
    // The function body must be present.
    expect(out).toContain("function slug");
    expect(out).toContain("toLowerCase");
  });

  it("emits valid TypeScript when intent: and uses {} coexist without conflict", () => {
    // "net-fetcher" contains no "pure" claim, so INT001 does not fire.
    // No uses clause so CAP002 does not fire either.
    const src = `?bs 0.7\nfn fetchUser(id: string) intent: "net-fetcher" -> string = id\n`;
    const out = t(src);
    expect(out).not.toContain("intent:");
    expect(out).toContain("function fetchUser");
  });

  it("parses intent: when there is no uses {} clause", () => {
    const src = `?bs 0.7\nfn add(a: number, b: number) intent: "pure" -> number = pure { a + b }\n`;
    const out = t(src);
    expect(out).toContain("function add");
    expect(out).not.toContain("intent:");
  });
});

describe("INT001 — intent 'pure' vs capability declarations (0.7+)", () => {
  it("fires INT001 when intent is 'pure' and uses { net } is declared", () => {
    // intentCheck runs before capCheck, so INT001 fires even though the body
    // would also trigger CAP002 (declared net, body never uses it).
    const src = `?bs 0.7\nfn fetch(url: string) uses { net } intent: "pure" -> string = url\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics).toHaveLength(1);
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT001");
      expect(d.message).toContain("fetch");
      expect(d.message).toContain("pure");
      expect(d.message).toContain("net");
      expect(d.rule).toMatch(/pure/);
      expect(d.rewrite).toBeTruthy();
    }
  });

  it("fires INT001 when intent is 'pure function' (whole-word match)", () => {
    const src = `?bs 0.7\nfn now() uses { time } intent: "pure function" -> number = 42\n`;
    expect(() => t(src)).toThrow(/INT001/);
  });

  it("fires INT001 when intent is 'idempotent and pure'", () => {
    const src = `?bs 0.7\nfn stamp(s: string) uses { time } intent: "idempotent and pure" -> string = s\n`;
    expect(() => t(src)).toThrow(/INT001/);
  });

  it("does NOT fire INT001 when intent is 'pure' and uses {} is absent", () => {
    const src = `?bs 0.7\nfn slug(s: string) intent: "pure" -> string = pure { s.toLowerCase() }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT001 when intent is 'pure' and uses {} is empty", () => {
    // An empty uses clause means no capabilities — no conflict.
    const src = `?bs 0.7\nfn noop() uses { } intent: "pure" -> void { }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT001 when intent contains 'impure' (not a whole-word 'pure' match)", () => {
    // "impure" contains "pure" as a substring but fails the word-boundary check.
    // No uses clause so no CAP errors either.
    const src = `?bs 0.7\nfn send(msg: string) intent: "impure" -> void { }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT001 when intent is 'net-fetcher' (no pure claim)", () => {
    const src = `?bs 0.7\nfn load(id: string) intent: "net-fetcher" -> string = id\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT001 for multiple caps in uses {}", () => {
    const src = `?bs 0.7\nfn bad() uses { net, time } intent: "pure" -> void { }\n`;
    expect(() => t(src)).toThrow(/INT001/);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT001");
      expect(d.message).toContain("net");
      expect(d.message).toContain("time");
    }
  });

  it("does NOT fire INT001 on pre-0.7 pins (check is gated)", () => {
    // ?bs 0.1 has no canonical-form gate, no cap check, no intent check —
    // the safest pin to use when testing that intent: itself doesn't crash.
    const src = `?bs 0.1\nfn fetch(url: string) uses { net } intent: "pure" -> string = url\n`;
    expect(() => t(src)).not.toThrow();
  });
});

describe("INT001 — diagnostic shape", () => {
  it("carries line and column pointing at the intent string", () => {
    const src = `?bs 0.7\nfn bad(x: number) uses { time } intent: "pure" -> number = x\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT001");
      expect(d.line).toBeGreaterThan(0);
      expect(d.column).toBeGreaterThan(0);
      expect(d.start).toBeTypeOf("number");
      expect(d.end).toBeTypeOf("number");
    }
  });

  it("carries rule, idiom, and rewrite from the registry", () => {
    const src = `?bs 0.7\nfn bad() uses { fs } intent: "pure" -> void { }\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT001");
      expect(d.rule).toBeTruthy();
      expect(d.idiom).toBeTruthy();
      expect(d.rewrite).toBeTruthy();
    }
  });
});
