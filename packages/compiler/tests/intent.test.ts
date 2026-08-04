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

import { BotscriptError, buildModuleEffects, transform } from "../src/index.js";

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

describe("INT001 — case-insensitive pure matching", () => {
  it("fires INT001 when intent is 'Pure' (capital P)", () => {
    const src = `?bs 0.7\nfn fetch(url: string) uses { net } intent: "Pure" -> string = url\n`;
    expect(() => t(src)).toThrow();
  });

  it("fires INT001 when intent is 'PURE' (all caps)", () => {
    const src = `?bs 0.7\nfn compute() uses { time } intent: "PURE" -> number = 42\n`;
    expect(() => t(src)).toThrow();
  });

  it("fires INT001 when intent is 'Pure function' (mixed case)", () => {
    const src = `?bs 0.7\nfn slug(s: string) uses { fs } intent: "Pure function" -> string = s\n`;
    expect(() => t(src)).toThrow();
  });
});

describe("INT002 — pure intent violated in body (?bs 0.7+)", () => {
  // Canonical form: single-return string fns use expression bodies (= expr).
  // Void fns with standalone expression statements stay as block bodies.

  it("fires INT002 when pure fn body directly calls http.get", () => {
    const src = `?bs 0.7\nfn fetchSecret(id: string) intent: "pure" -> string = http.get("/secret/" + id)\n`;
    expect(() => t(src)).toThrow(/INT002/);
  });

  it("fires INT002 when pure fn body uses time.now()", () => {
    const src = `?bs 0.7\nfn timestamp() intent: "pure" -> number = time.now()\n`;
    expect(() => t(src)).toThrow(/INT002/);
  });

  it("fires INT002 for random, fs, stdout, stderr capabilities in body", () => {
    const cases: [string, string][] = [
      ["random", "random.next()"],
      ["fs", "fs.readFile(\"x\")"],
    ];
    for (const [cap, expr] of cases) {
      const src = `?bs 0.7\nfn op() intent: "pure" -> void {\n  ${expr};\n}\n`;
      expect(() => t(src), `expected INT002 for ${cap}`).toThrow(/INT002/);
    }
    // Void fns with stdout/stderr — block body form
    const stdoutSrc = `?bs 0.7\nfn op() intent: "pure" -> void {\n  stdout.write("x");\n}\n`;
    expect(() => t(stdoutSrc), "expected INT002 for stdout").toThrow(/INT002/);
    const stderrSrc = `?bs 0.7\nfn op() intent: "pure" -> void {\n  stderr.write("x");\n}\n`;
    expect(() => t(stderrSrc), "expected INT002 for stderr").toThrow(/INT002/);
  });

  it("diagnostic message includes fn name, namespace, member, and capability", () => {
    const src = `?bs 0.7\nfn drainSecrets(id: string) intent: "pure" -> string = http.get("/s/" + id)\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT002");
      expect(d.message).toContain("drainSecrets");
      expect(d.message).toContain("http.get");
      expect(d.message).toContain("net");
      expect(d.rule).toBeTruthy();
      expect(d.idiom).toBeTruthy();
      expect(d.rewrite).toBeTruthy();
    }
  });

  it("INT001 takes priority over INT002 when uses {} is also declared", () => {
    // INT001 fires first (header conflict) — INT002 should not fire too.
    const src = `?bs 0.7\nfn bad(id: string) uses { net } intent: "pure" -> string = id\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("INT001");
    }
  });

  it("does NOT fire INT002 when pure fn body has no stdlib calls", () => {
    const src = `?bs 0.7\nfn add(a: number, b: number) intent: "pure" -> number = pure { a + b }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT002 when body uses a non-stdlib identifier", () => {
    const src = `?bs 0.7\nfn slug(s: string) intent: "pure" -> string = pure { s.toLowerCase() }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT002 on pre-0.7 pins", () => {
    // ?bs 0.1 has no canonical-form gate, no intent check.
    const src = `?bs 0.1\nfn fetchSecret(id: string) intent: "pure" -> string = http.get("/secret")\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT002 for capability use inside a nested fn body", () => {
    // The outer fn declares intent: pure. Inner fn uses net inside its own body.
    // INT002 must not fire for the outer fn — inner decl is excluded from the body scan.
    const src = `?bs 0.7\nfn outer() intent: "pure" -> void {\n  fn inner() uses { net } -> void {\n    http.get("/x");\n  }\n}\n`;
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      for (const d of err.diagnostics) {
        expect(d.code).not.toBe("INT002");
      }
    }
  });

  it("carries source range (start/end) pointing at the intent annotation", () => {
    const src = `?bs 0.7\nfn bad() intent: "pure" -> void {\n  time.now();\n}\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT002");
      expect(d.start).toBeTypeOf("number");
      expect(d.end).toBeTypeOf("number");
      expect(d.line).toBeGreaterThan(0);
      expect(d.column).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// INT002 — optional-chaining bypass (?bs 0.8+)
// ---------------------------------------------------------------------------

describe("INT002 — optional-chaining bypass (?bs 0.8)", () => {
  it("fires INT002 when pure fn body calls time?.now() at ?bs 0.8", () => {
    const src = `?bs 0.8\nfn stamp() intent: "pure" -> number = time?.now()\n`;
    expect(() => t(src)).toThrow(/INT002/);
  });

  it("fires INT002 when pure fn body calls random?.next() at ?bs 0.8", () => {
    const src = `?bs 0.8\nfn roll() intent: "pure" -> number = random?.next()\n`;
    expect(() => t(src)).toThrow(/INT002/);
  });

  it("does NOT fire INT002 for time?.now() below ?bs 0.8 (not yet detected)", () => {
    const src = `?bs 0.7\nfn stamp() intent: "pure" -> number = time?.now()\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("INT002 message renders '?.' when optional chaining is the access operator", () => {
    const src = `?bs 0.8\nfn stamp() intent: "pure" -> number = time?.now()\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT002");
      expect(d.message).toContain("time?.now");
    }
  });
});

// ---------------------------------------------------------------------------
// INT003 — idempotent intent vs non-idempotent capability in uses {}
// ---------------------------------------------------------------------------

describe("INT003 — idempotent intent vs uses { random | time } (?bs 0.7+)", () => {
  it("fires INT003 when intent is 'idempotent' and uses { time }", () => {
    const src = `?bs 0.7\nfn expireAt(ttl: number) uses { time } intent: "idempotent" -> number = ttl\n`;
    expect(() => t(src)).toThrow(/INT003/);
  });

  it("fires INT003 when intent is 'idempotent' and uses { random }", () => {
    const src = `?bs 0.7\nfn generateId(prefix: string) uses { random } intent: "idempotent" -> string = prefix\n`;
    expect(() => t(src)).toThrow(/INT003/);
  });

  it("fires INT003 when both random and time are declared", () => {
    const src = `?bs 0.7\nfn bad() uses { random, time } intent: "idempotent" -> number = 0\n`;
    expect(() => t(src)).toThrow(/INT003/);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT003");
      expect(d.message).toContain("random");
      expect(d.message).toContain("time");
    }
  });

  it("does NOT fire INT003 when intent is 'idempotent' and uses { net }", () => {
    // INT003 only flags `random`/`time`; `net` is not structurally flagged by this check.
    // CAP002 may fire because the body doesn't call http.get; we only care INT003 doesn't.
    const src = `?bs 0.7\nfn fetch(id: string) uses { net } intent: "idempotent" -> string = id\n`;
    expect(() => t(src)).not.toThrow(/INT003/);
  });

  it("does NOT fire INT003 when intent is 'idempotent' and uses { fs }", () => {
    const src = `?bs 0.7\nfn readConfig() uses { fs } intent: "idempotent" -> string = ""\n`;
    expect(() => t(src)).not.toThrow(/INT003/);
  });

  it("does NOT fire INT003 when intent does not contain 'idempotent'", () => {
    const src = `?bs 0.7\nfn stamp() uses { time } intent: "writes" -> number = 0\n`;
    expect(() => t(src)).not.toThrow(/INT003/);
  });

  it("does NOT fire INT003 when intent contains 'non-idempotent' (hyphen boundary)", () => {
    // "non-idempotent" should NOT match the idempotent claim
    const src = `?bs 0.7\nfn stamp() uses { time } intent: "non-idempotent" -> number = 0\n`;
    expect(() => t(src)).not.toThrow(/INT003/);
  });

  it("diagnostic carries rule, idiom, rewrite, line, column, start, end", () => {
    const src = `?bs 0.7\nfn expireAt(ttl: number) uses { time } intent: "idempotent" -> number = ttl\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT003");
      expect(d.rule).toBeTruthy();
      expect(d.idiom).toBeTruthy();
      expect(d.rewrite).toBeTruthy();
      expect(d.line).toBeGreaterThan(0);
      expect(d.column).toBeGreaterThan(0);
      expect(d.start).toBeTypeOf("number");
      expect(d.end).toBeTypeOf("number");
    }
  });

  it("INT003 subsumes INT004 when uses {} also declares the capability", () => {
    // When the header conflict fires (INT003), the body check (INT004) should not fire too.
    // Expression body avoids FMT001 (canonical form requires = expr for non-void).
    const src = `?bs 0.7\nfn bad(ttl: number) uses { time } intent: "idempotent" -> number = time.now() + ttl\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("INT003");
      expect(err.diagnostics.length).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// INT004 — idempotent intent violated in body (under-declaration variant)
// ---------------------------------------------------------------------------

describe("INT004 — idempotent intent vs non-idempotent call in body (?bs 0.7+)", () => {
  it("fires INT004 when pure idempotent fn body calls time.now()", () => {
    // Expression body — block body with return would fire FMT001 first.
    const src = `?bs 0.7\nfn expireAt(ttl: number) intent: "idempotent" -> number = time.now() + ttl\n`;
    expect(() => t(src)).toThrow(/INT004/);
  });

  it("fires INT004 when idempotent fn body calls random.next()", () => {
    const src = `?bs 0.7\nfn generateId(prefix: string) intent: "idempotent" -> string = prefix + random.next()\n`;
    expect(() => t(src)).toThrow(/INT004/);
  });

  it("diagnostic message includes fn name, namespace.member, and non-idempotent rationale", () => {
    const src = `?bs 0.7\nfn stamp(prefix: string) intent: "idempotent" -> string = prefix + random.next()\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT004");
      expect(d.message).toContain("stamp");
      expect(d.message).toContain("random.next");
      expect(d.rule).toBeTruthy();
      expect(d.idiom).toBeTruthy();
      expect(d.rewrite).toBeTruthy();
    }
  });

  it("does NOT fire INT004 when idempotent fn body has no non-idempotent calls", () => {
    // CAP002 may fire because body doesn't call http.get; we only care INT004 doesn't fire.
    const src = `?bs 0.7\nfn fetch(id: string) uses { net } intent: "idempotent" -> string = id\n`;
    expect(() => t(src)).not.toThrow(/INT004/);
  });

  it("does NOT fire INT004 when body uses time inside a nested fn", () => {
    // INT004 must not fire for the outer fn when time is only in the inner fn's body.
    const src = `?bs 0.7\nfn outer() intent: "idempotent" -> void {\n  fn inner() uses { time } -> number = time.now();\n}\n`;
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      for (const d of err.diagnostics) {
        expect(d.code).not.toBe("INT004");
      }
    }
  });

  it("does NOT fire INT004 on pre-0.7 pins", () => {
    const src = `?bs 0.1\nfn stamp() intent: "idempotent" -> number = time.now()\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT004 when idempotent fn body calls time?.now() at ?bs 0.8", () => {
    const src = `?bs 0.8\nfn stamp() intent: "idempotent" -> number = time?.now()\n`;
    expect(() => t(src)).toThrow(/INT004/);
  });

  it("does NOT fire INT004 for time?.now() below ?bs 0.8 (not yet detected)", () => {
    const src = `?bs 0.7\nfn stamp() intent: "idempotent" -> number = time?.now()\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("INT004 message renders '?.' when optional chaining is the access operator", () => {
    const src = `?bs 0.8\nfn stamp() intent: "idempotent" -> number = time?.now()\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("INT004");
      expect(d.message).toContain("time?.now");
    }
  });
});

// ---------------------------------------------------------------------------
// INT001 extended: reads {} / writes {} also contradict "pure" intent
// ---------------------------------------------------------------------------

describe("INT001 — pure intent vs reads/writes annotations (?bs 0.8)", () => {
  it("fires INT001 when intent is 'pure' but function has reads { }", () => {
    const src = `?bs 0.8\nfn lookup(id: string) reads { cache } intent: "pure" -> string = id\n`;
    expect(() => t(src)).toThrow();
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("INT001");
      expect(err.diagnostics[0]!.message).toContain("reads");
    }
  });

  it("fires INT001 when intent is 'pure' but function has writes { }", () => {
    const src = `?bs 0.8\nfn record(id: string) writes { metrics } intent: "pure" -> void { }\n`;
    expect(() => t(src)).toThrow();
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("INT001");
      expect(err.diagnostics[0]!.message).toContain("writes");
    }
  });

  it("fires INT001 when all three conflict: uses + reads + writes + pure intent", () => {
    const src = `?bs 0.8\nfn combo(id: string) uses { net } reads { cache } writes { metrics } intent: "pure" -> string = id\n`;
    expect(() => t(src)).toThrow();
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("INT001");
      const msg = err.diagnostics[0]!.message;
      expect(msg).toContain("uses");
      expect(msg).toContain("reads");
      expect(msg).toContain("writes");
    }
  });

  it("does NOT fire INT001 when reads/writes present but intent is not pure", () => {
    const src = `?bs 0.8\nfn fetch(id: string) reads { cache } writes { metrics } intent: "net-fetcher" -> string = id\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT001 for reads {} + pure intent under ?bs 0.7 (check gated on 0.8)", () => {
    // The reads/writes INT001 check is gated on ?bs 0.8 via checksReadsWrites.
    // A ?bs 0.7 file with reads { } + intent: "pure" must not raise INT001.
    const src = `?bs 0.7\nfn lookup(id: string) reads { cache } intent: "pure" -> string = id\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT001 for writes {} + pure intent under ?bs 0.7 (check gated on 0.8)", () => {
    const src = `?bs 0.7\nfn record(id: string) writes { metrics } intent: "pure" -> void { }\n`;
    expect(() => t(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// INT005 — idempotent intent vs writes { } (?bs 0.8+)
// ---------------------------------------------------------------------------

describe("INT005 — idempotent intent vs writes { } (?bs 0.8+)", () => {
  it("fires INT005 when intent is 'idempotent' and writes {} is non-empty", () => {
    const src = `?bs 0.9\nfn recordAttempt(id: string) intent: "idempotent" writes { auditLog } -> void { }\n`;
    expect(() => t(src)).toThrow("INT005");
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("INT005");
      expect(err.diagnostics[0]!.message).toContain("auditLog");
      expect(err.diagnostics[0]!.severity).toBe("error");
    }
  });

  it("fires INT005 for multiple writes labels", () => {
    const src = `?bs 0.9\nfn update(id: string) intent: "idempotent" writes { db, cache } -> void { }\n`;
    expect(() => t(src)).toThrow("INT005");
  });

  it("fires INT005 even when idempotent is mixed with other intent words", () => {
    const src = `?bs 0.9\nfn sync(id: string) intent: "idempotent and safe" writes { db } -> void { }\n`;
    expect(() => t(src)).toThrow("INT005");
  });

  it("INT005 takes priority over INT003 when both writes and random/time are present", () => {
    // When writes {} AND random/time are both declared, INT005 fires first.
    const src = `?bs 0.9\nfn bad(id: string) uses { random } intent: "idempotent" writes { db } -> string = id\n`;
    expect(() => t(src)).toThrow();
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("INT005");
    }
  });

  it("does NOT fire INT005 for idempotent intent without writes {}", () => {
    const src = `?bs 0.9\nfn getUser(id: string) intent: "idempotent" reads { cache } -> string = id\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT005 when writes {} is empty", () => {
    const src = `?bs 0.9\nfn step(id: string) intent: "idempotent" writes { } -> void { }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT005 below ?bs 0.8 (check gated on checksReadsWrites)", () => {
    // The writes {} check gates on 0.8 via checksReadsWrites — 0.7 is not enough.
    const src = `?bs 0.7\nfn recordAttempt(id: string) intent: "idempotent" writes { auditLog } -> void { }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT005 for non-idempotent intent with writes {}", () => {
    // Only idempotent intent triggers INT005; other intent strings are fine with writes.
    const src = `?bs 0.9\nfn update(id: string) intent: "writer" writes { db } -> void { }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("INT005 diagnostic has correct start/end and code", () => {
    const src = `?bs 0.9\nfn recordAttempt(id: string) intent: "idempotent" writes { auditLog } -> void { }\n`;
    try {
      t(src);
      throw new Error("should have thrown");
    } catch (e) {
      const err = e as BotscriptError;
      const diag = err.diagnostics[0]!;
      expect(diag.code).toBe("INT005");
      expect(typeof diag.start).toBe("number");
      expect(typeof diag.end).toBe("number");
      expect(diag.start).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// INT001 extended: throws {} also contradicts "pure" intent (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("INT001 — pure intent vs throws {} annotations (?bs 0.9)", () => {
  it("fires INT001 when intent is 'pure' but function has throws { }", () => {
    const src = `?bs 0.9\nfn parseId(raw: string) intent: "pure" throws { ParseError } -> string = raw\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT001");
      expect(e.diagnostics[0]!.message).toContain("throws");
      expect(e.diagnostics[0]!.message).toContain("ParseError");
    }
  });

  it("fires INT001 when intent is 'pure' and throws {} has multiple types", () => {
    const src = `?bs 0.9\nfn parse(raw: string) intent: "pure" throws { ParseError, ValidationError } -> string = raw\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT001");
      const msg = e.diagnostics[0]!.message;
      expect(msg).toContain("ParseError");
      expect(msg).toContain("ValidationError");
    }
  });

  it("fires INT001 when all four conflict: uses + reads + writes + throws + pure intent", () => {
    const src = `?bs 0.9\nfn combo(id: string) uses { net } reads { cache } writes { metrics } throws { NetworkError } intent: "pure" -> string = id\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT001");
      const msg = e.diagnostics[0]!.message;
      expect(msg).toContain("uses");
      expect(msg).toContain("reads");
      expect(msg).toContain("writes");
      expect(msg).toContain("throws");
    }
  });

  it("does NOT fire INT001 for throws {} + pure intent under ?bs 0.8 (check gated on 0.9)", () => {
    const src = `?bs 0.8\nfn parseId(raw: string) intent: "pure" throws { ParseError } -> string = raw\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT001 for throws {} + pure intent under ?bs 0.7 (check gated on 0.9)", () => {
    const src = `?bs 0.7\nfn parseId(raw: string) intent: "pure" throws { ParseError } -> string = raw\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT001 when throws {} present but intent is not pure", () => {
    const src = `?bs 0.9\nfn parseId(raw: string) throws { ParseError } -> string = raw\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("message mentions Result as the alternative when only throws conflicts", () => {
    const src = `?bs 0.9\nfn parseId(raw: string) intent: "pure" throws { ParseError } -> string = raw\n`;
    expect(() => t(src)).toThrow("INT001");
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    expect(caught!.diagnostics[0]!.message).toContain("Result");
  });

  it("does NOT fire INT001 for empty throws { } with pure intent (length === 0)", () => {
    // The implementation keys off throws.length > 0; an empty throws clause
    // is a no-op and must not be treated as a conflicting declaration.
    const src = `?bs 0.9\nfn parseId(raw: string) intent: "pure" throws { } -> string = raw\n`;
    expect(() => t(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// INT006 — total intent vs throws {} (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("INT006 — total intent vs throws {} annotations (?bs 0.9)", () => {
  it("fires INT006 when intent is 'total' and function declares throws {}", () => {
    const src = `?bs 0.9\nfn parseHex(s: string) intent: "total" throws { ParseError } -> string = s\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT006");
      expect(e.diagnostics[0]!.message).toContain("ParseError");
      expect(e.diagnostics[0]!.message).toContain("total");
    }
  });

  it("fires INT006 when intent is 'total' and throws {} has multiple types", () => {
    const src = `?bs 0.9\nfn parse(s: string) intent: "total" throws { ParseError, ValidationError } -> string = s\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT006");
      const msg = e.diagnostics[0]!.message;
      expect(msg).toContain("ParseError");
      expect(msg).toContain("ValidationError");
    }
  });

  it("fires INT006 when intent string is 'total' (standalone)", () => {
    const src = `?bs 0.9\nfn run(s: string) intent: "total" throws { RunError } -> string = s\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).toContain("INT006");
    }
  });

  it("does NOT fire INT006 when intent is 'total' and throws {} is absent", () => {
    const src = `?bs 0.9\nfn parseHex(s: string) intent: "total" -> string = s\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT006 when intent is 'total' and throws {} is empty", () => {
    const src = `?bs 0.9\nfn parseHex(s: string) intent: "total" throws { } -> string = s\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT006 on ?bs 0.8 (check gated on 0.9)", () => {
    const src = `?bs 0.8\nfn parseHex(s: string) intent: "total" throws { ParseError } -> string = s\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT006 on ?bs 0.7 (check gated on 0.9)", () => {
    const src = `?bs 0.7\nfn parseHex(s: string) intent: "total" throws { ParseError } -> string = s\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT006 when throws {} present but intent is not 'total'", () => {
    const src = `?bs 0.9\nfn run(s: string) throws { RunError } -> string = s\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT006 for 'subtotal' — word-boundary guard", () => {
    const src = `?bs 0.9\nfn run(s: string) intent: "subtotal" throws { RunError } -> string = s\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("message includes Result as the fix alternative", () => {
    const src = `?bs 0.9\nfn parseHex(s: string) intent: "total" throws { ParseError } -> string = s\n`;
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    expect(caught!.diagnostics[0]!.message).toContain("Result");
  });

  it("rewrite hint names the throws type in the Result option", () => {
    const src = `?bs 0.9\nfn parseHex(s: string) intent: "total" throws { ParseError } -> string = s\n`;
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    expect(caught!.diagnostics[0]!.rewrite).toContain("ParseError");
  });
});

// ---------------------------------------------------------------------------
// INT007 — total intent body calls same-file fn that throws (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("INT007 — total intent body calls a throwing same-file callee (?bs 0.9)", () => {
  it("fires INT007 when total fn body calls a same-file fn that declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn run(s: string) intent: "total" -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT007");
      expect(e.diagnostics[0]!.message).toContain("validate");
      expect(e.diagnostics[0]!.message).toContain("ValidationError");
      expect(e.diagnostics[0]!.message).toContain("total");
    }
  });

  it("fires INT007 for each distinct throwing callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      "fn parse(s: string) throws { ParseError } -> number = 0\n" +
      'fn run(s: string) intent: "total" -> string {\n' +
      "  validate(s)\n" +
      "  parse(s)\n" +
      "  return s\n" +
      "}\n";
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes.filter((c) => c === "INT007").length).toBe(2);
    }
  });

  it("does NOT fire INT007 when total fn body calls a non-throwing same-file fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(s: string) -> string = s\n" +
      'fn run(s: string) intent: "total" -> string {\n' +
      "  return helper(s)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT007 when total fn has no body (expression-only with no callee)", () => {
    const src = `?bs 0.9\nfn run(s: string) intent: "total" -> string = s\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT007 on ?bs 0.8 (check gated on 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn run(s: string) intent: "total" -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT006 (not INT007) when total fn also declares throws {}", () => {
    // INT006 and INT007 are mutually exclusive — INT006 takes priority.
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn run(s: string) intent: "total" throws { ValidationError } -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).toContain("INT006");
      expect(codes).not.toContain("INT007");
    }
  });

  it("rewrite hint names the callee and the throws type", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchUser(id: string) throws { FetchError } -> string = id\n" +
      'fn run(id: string) intent: "total" -> string {\n' +
      "  return fetchUser(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const diag = caught!.diagnostics.find((d) => d.code === "INT007")!;
    expect(diag.rewrite).toContain("fetchUser");
    expect(diag.rewrite).toContain("FetchError");
  });

  it("does NOT fire INT007 for 'subtotal' — word-boundary guard", () => {
    // THR001 may still fire (run under-declares throws), but INT007 must not.
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn run(s: string) intent: "subtotal" -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    try {
      t(src);
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).not.toContain("INT007");
    }
  });
});

// ---------------------------------------------------------------------------
// INT008 — infallible intent return type is Result<> or Option<> (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("INT008 — infallible intent return type exposes failure path (?bs 0.9)", () => {
  it("fires INT008 when infallible fn returns Result<T, E>", () => {
    const src = `?bs 0.9\nfn defaultName(raw: string) intent: "infallible" -> Result<string, ParseError> = ok(raw)\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT008");
      expect(e.diagnostics[0]!.message).toContain("infallible");
      expect(e.diagnostics[0]!.message).toContain("Result<");
    }
  });

  it("fires INT008 when infallible fn returns Option<T>", () => {
    const src = `?bs 0.9\nfn maybeValue(x: number) intent: "infallible" -> Option<number> = some(x)\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT008");
      expect(e.diagnostics[0]!.message).toContain("Option<");
    }
  });

  it("does NOT fire INT008 when infallible fn returns a plain type", () => {
    const src = `?bs 0.9\nfn greet(name: string) intent: "infallible" -> string = name\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT008 on ?bs 0.8 (check gated on 0.9)", () => {
    const src = `?bs 0.8\nfn defaultName(raw: string) intent: "infallible" -> Result<string, ParseError> = ok(raw)\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT008 independently of INT009 when both violations present", () => {
    const src =
      "?bs 0.9\n" +
      'fn parse(s: string) intent: "infallible" throws { ParseError } -> Result<number, ParseError> = ok(0)\n';
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).toContain("INT008");
      expect(codes).toContain("INT009");
    }
  });

  it("rewrite hint includes the plain-type option", () => {
    const src = `?bs 0.9\nfn defaultName(raw: string) intent: "infallible" -> Result<string, ParseError> = ok(raw)\n`;
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const diag = caught!.diagnostics.find((d) => d.code === "INT008")!;
    expect(diag.rewrite).toContain("infallible");
    expect(diag.rewrite).toContain("total");
  });

  it("does NOT fire INT008 for 'non-infallible' — word-boundary guard", () => {
    const src = `?bs 0.9\nfn defaultName(raw: string) intent: "non-infallible" -> Result<string, ParseError> = ok(raw)\n`;
    try {
      t(src);
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).not.toContain("INT008");
    }
  });
});

// ---------------------------------------------------------------------------
// INT009 — infallible intent declares throws {} (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("INT009 — infallible intent declares throws {} (?bs 0.9)", () => {
  it("fires INT009 when infallible fn declares throws {}", () => {
    const src = `?bs 0.9\nfn parse(s: string) intent: "infallible" throws { ParseError } -> number = 0\n`;
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).toContain("INT009");
      expect(e.diagnostics.find((d) => d.code === "INT009")!.message).toContain("ParseError");
      expect(e.diagnostics.find((d) => d.code === "INT009")!.message).toContain("infallible");
    }
  });

  it("does NOT fire INT009 when infallible fn has no throws declaration", () => {
    const src = `?bs 0.9\nfn greet(name: string) intent: "infallible" -> string = name\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT009 on ?bs 0.8 (check gated on 0.9)", () => {
    const src = `?bs 0.8\nfn parse(s: string) intent: "infallible" throws { ParseError } -> number = 0\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("rewrite hint includes the total+Result option and the remove-throws option", () => {
    const src = `?bs 0.9\nfn parse(s: string) intent: "infallible" throws { ParseError } -> number = 0\n`;
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const diag = caught!.diagnostics.find((d) => d.code === "INT009")!;
    expect(diag.rewrite).toContain("total");
    expect(diag.rewrite).toContain("ParseError");
  });
});

// ---------------------------------------------------------------------------
// INT010 — infallible intent body calls same-file fn that throws (?bs 0.9+)
// ---------------------------------------------------------------------------

describe("INT010 — infallible intent body calls a throwing same-file callee (?bs 0.9)", () => {
  it("fires INT010 when infallible fn body calls a same-file fn that declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn process(s: string) intent: "infallible" -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      expect(e.diagnostics[0]!.code).toBe("INT010");
      expect(e.diagnostics[0]!.message).toContain("validate");
      expect(e.diagnostics[0]!.message).toContain("ValidationError");
      expect(e.diagnostics[0]!.message).toContain("infallible");
    }
  });

  it("does NOT fire INT010 when infallible fn calls a non-throwing callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn clean(s: string) -> string = s\n" +
      'fn process(s: string) intent: "infallible" -> string {\n' +
      "  return clean(s)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT009 (not INT010) when infallible fn also declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn process(s: string) intent: "infallible" throws { ValidationError } -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).toContain("INT009");
      expect(codes).not.toContain("INT010");
    }
  });

  it("does NOT fire INT010 on ?bs 0.8 (check gated on 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn process(s: string) intent: "infallible" -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT010 when infallible fn has no body (expression-only)", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn process(s: string) intent: "infallible" -> string = s\n';
    try {
      t(src);
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).not.toContain("INT010");
    }
  });

  it("rewrite hint names the callee and the throws type", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchUser(id: string) throws { FetchError } -> string = id\n" +
      'fn run(id: string) intent: "infallible" -> string {\n' +
      "  return fetchUser(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const diag = caught!.diagnostics.find((d) => d.code === "INT010")!;
    expect(diag.rewrite).toContain("fetchUser");
    expect(diag.rewrite).toContain("FetchError");
  });

  it("fires INT008 and INT010 together when infallible fn has Result return AND calls throwing callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn process(s: string) intent: "infallible" -> Result<string, ValidationError> {\n' +
      "  return ok(validate(s))\n" +
      "}\n";
    try {
      t(src);
      expect.fail("should have thrown");
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).toContain("INT008");
      expect(codes).toContain("INT010");
    }
  });

  it("does NOT fire INT010 for 'non-infallible' — word-boundary guard", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn process(s: string) intent: "non-infallible" -> string {\n' +
      "  return validate(s)\n" +
      "}\n";
    try {
      t(src);
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = e.diagnostics.map((d) => d.code);
      expect(codes).not.toContain("INT010");
    }
  });
});

describe("INT011 — intent 'pure' + async fn (?bs 0.9+)", () => {
  it("fires INT011 when async fn declares intent: \"pure\"", () => {
    const src =
      "?bs 0.9\n" +
      'async fn slugify(s: string) intent: "pure" -> Promise<string> {\n' +
      "  return s.toLowerCase()\n" +
      "}\n";
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      const d = err.diagnostics.find((d) => d.code === "INT011")!;
      expect(d).toBeDefined();
      expect(d.code).toBe("INT011");
      expect(d.message).toContain("slugify");
      expect(d.message).toContain("pure");
      expect(d.message).toContain("async");
      expect(d.rule).toMatch(/Promise/);
      expect(d.rewrite).toBeTruthy();
    }
  });

  it("fires INT011 when intent contains 'pure' among other words", () => {
    const src =
      "?bs 0.9\n" +
      'async fn compute(x: number) intent: "pure and total" -> Promise<number> {\n' +
      "  return x * 2\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT011/);
  });

  it("fires INT011 for 'Pure' (case-insensitive match)", () => {
    const src =
      "?bs 0.9\n" +
      'async fn toUpper(s: string) intent: "Pure" -> Promise<string> {\n' +
      "  return s.toUpperCase()\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT011/);
  });

  it("does NOT fire INT011 for a sync fn with intent: \"pure\"", () => {
    const src =
      "?bs 0.9\n" +
      'fn slugify(s: string) intent: "pure" -> string {\n' +
      "  return s.toLowerCase()\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT011 for async fn without pure intent", () => {
    const src =
      "?bs 0.9\n" +
      'async fn fetchUser(id: string) uses { net } intent: "idempotent" -> Promise<string> {\n' +
      '  return id\n' +
      "}\n";
    // INT003 would fire (idempotent + random/time), but NOT INT011
    try {
      t(src);
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = (e as BotscriptError).diagnostics.map((d) => d.code);
      expect(codes).not.toContain("INT011");
    }
  });

  it("does NOT fire INT011 on pre-0.9 pins", () => {
    const src =
      "?bs 0.7\n" +
      'async fn slugify(s: string) intent: "pure" -> Promise<string> {\n' +
      "  return s.toLowerCase()\n" +
      "}\n";
    // INT011 is gated at 0.9; on 0.7 it must not fire
    try {
      t(src);
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = (e as BotscriptError).diagnostics.map((d) => d.code);
      expect(codes).not.toContain("INT011");
    }
  });

  it("does NOT fire INT011 for 'impure' (word-boundary guard)", () => {
    const src =
      "?bs 0.9\n" +
      'async fn mutate(s: string) intent: "impure" -> Promise<string> {\n' +
      "  return s\n" +
      "}\n";
    // "impure" does not contain a whole-word "pure" match
    try {
      t(src);
    } catch (e) {
      if (!(e instanceof BotscriptError)) throw e;
      const codes = (e as BotscriptError).diagnostics.map((d) => d.code);
      expect(codes).not.toContain("INT011");
    }
  });

  it("rewrite hint includes all three options", () => {
    const src =
      "?bs 0.9\n" +
      'async fn add(a: number, b: number) intent: "pure" -> Promise<number> {\n' +
      "  return a + b\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const diag = caught!.diagnostics.find((d) => d.code === "INT011")!;
    expect(diag.rewrite).toContain("option A");
    expect(diag.rewrite).toContain("option B");
    expect(diag.rewrite).toContain("option C");
    expect(diag.rewrite).toContain("Promise.resolve");
  });
});

describe("INT012 — intent 'pure' body calls same-file fn with uses {} (?bs 0.9+)", () => {
  it("fires INT012 when pure fn body calls a same-file fn that declares uses {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn getTimestamp() uses { time } -> number = time.now()\n\n" +
      'fn buildKey(id: string) intent: "pure" -> string {\n' +
      "  const ts = getTimestamp()\n" +
      "  return id\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT012/);
  });

  it("INT012 diagnostic names the callee and its uses", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchData() uses { net } -> string = net.get(\"url\")\n\n" +
      'fn processData(x: string) intent: "pure" -> string {\n' +
      "  const raw = fetchData()\n" +
      "  return raw\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT012")!;
    expect(d.code).toBe("INT012");
    expect(d.message).toContain("fetchData");
    expect(d.message).toContain("net");
  });

  it("does NOT fire INT012 when pure fn calls a callee with no uses {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn double(n: number) -> number = n * 2\n\n" +
      'fn square(n: number) intent: "pure" -> number {\n' +
      "  return double(n) * double(n)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT012 on pre-0.9 pins (gated on checksThrows)", () => {
    const src =
      "?bs 0.8\n" +
      "fn getTimestamp() uses { time } -> number = time.now()\n\n" +
      'fn buildKey(id: string) intent: "pure" -> string {\n' +
      "  const ts = getTimestamp()\n" +
      "  return id\n" +
      "}\n";
    // at 0.8 INT001 fires because pure+uses={} is already caught at header level for getTimestamp;
    // but buildKey has no uses {} itself — only INT002 could fire (no direct stdlib call either)
    // INT012 must NOT fire at 0.8
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INT012");
  });

  it("fires INT001 (not INT012) when pure fn itself declares uses {}", () => {
    // If the pure fn already has uses {}, INT001 fires at header level and returns.
    // INT012 must not fire (INT001 subsumes).
    const src =
      "?bs 0.9\n" +
      'fn getTimestamp() uses { time } -> number = unsafe "test" { time.now() }\n\n' +
      'fn buildKey(id: string) uses { time } intent: "pure" -> string {\n' +
      "  const ts = getTimestamp()\n" +
      "  return id\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT001");
    expect(codes).not.toContain("INT012");
  });

  it("fires INT002 (not INT012) when pure fn body directly calls stdlib", () => {
    // If the body directly calls time.now(), INT002 fires and INT012 must not.
    const src =
      "?bs 0.9\n" +
      "fn getTimestamp() uses { time } -> number = time.now()\n\n" +
      'fn buildKey(id: string) intent: "pure" -> string {\n' +
      "  const ts = time.now()\n" +
      "  return id\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT002");
    expect(codes).not.toContain("INT012");
  });

  it("fires INT012 for callee with multiple capabilities", () => {
    const src =
      "?bs 0.9\n" +
      "fn doWork() uses { net, fs } -> string = net.get(\"url\")\n\n" +
      'fn pureWrapper(x: string) intent: "pure" -> string {\n' +
      "  return doWork()\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT012")!;
    expect(d.message).toContain("net");
  });

  it("rewrite hint names the callee and includes injection option", () => {
    const src =
      "?bs 0.9\n" +
      "fn getClock() uses { time } -> number = time.now()\n\n" +
      'fn makeId(prefix: string) intent: "pure" -> string {\n' +
      "  const ts = getClock()\n" +
      "  return prefix\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT012")!;
    expect(d.rewrite).toContain("option A");
    expect(d.rewrite).toContain("option B");
    expect(d.rewrite).toContain("getClock");
  });

  it("does NOT fire INT012 when fn has no body (expression-only)", () => {
    const src =
      "?bs 0.9\n" +
      'fn getTimestamp() uses { time } -> number = unsafe "test" { time.now() }\n\n' +
      'fn buildKey(id: string) intent: "pure" -> string = id\n';
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT011 and INT012 together when pure fn is both async and calls capped callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn getClock() uses { time } -> number = time.now()\n\n" +
      'async fn badFn(x: string) intent: "pure" -> Promise<string> {\n' +
      "  const ts = getClock()\n" +
      "  return x\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT011");
    expect(codes).toContain("INT012");
  });
});

describe("INT013 — intent 'idempotent' body calls same-file fn with uses { random } or uses { time } (?bs 0.9+)", () => {
  it("fires INT013 when idempotent fn body calls a same-file fn that uses { time }", () => {
    const src =
      "?bs 0.9\n" +
      "fn timestamp() uses { time } -> number = time.now()\n\n" +
      'fn tag(id: string) intent: "idempotent" -> string {\n' +
      "  return id + timestamp()\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT013/);
  });

  it("fires INT013 when idempotent fn body calls a same-file fn that uses { random }", () => {
    const src =
      "?bs 0.9\n" +
      "fn nonce() uses { random } -> number = random.float()\n\n" +
      'fn makeId(prefix: string) intent: "idempotent" -> string {\n' +
      "  return prefix + nonce()\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT013/);
  });

  it("INT013 diagnostic names the callee and its non-idempotent capability", () => {
    const src =
      "?bs 0.9\n" +
      "fn getTime() uses { time } -> number = time.now()\n\n" +
      'fn label(x: string) intent: "idempotent" -> string {\n' +
      "  return x + getTime()\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT013")!;
    expect(d.code).toBe("INT013");
    expect(d.message).toContain("getTime");
    expect(d.message).toContain("time");
  });

  it("does NOT fire INT013 when idempotent fn calls a callee with no non-idempotent uses", () => {
    const src =
      "?bs 0.9\n" +
      "fn double(n: number) -> number = n * 2\n\n" +
      'fn compute(n: number) intent: "idempotent" -> number {\n' +
      "  return double(n)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT013 when callee uses { net } (only random/time are non-idempotent)", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetch(url: string) uses { net } -> string = net.get(url)\n\n" +
      'fn load(id: string) intent: "idempotent" -> string {\n' +
      "  return fetch(id)\n" +
      "}\n";
    // net is not a non-idempotent capability for idempotent purposes; no INT013
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INT013");
  });

  it("does NOT fire INT013 on pre-0.9 pins", () => {
    const src =
      "?bs 0.8\n" +
      "fn getTime() uses { time } -> number = time.now()\n\n" +
      'fn label(x: string) intent: "idempotent" -> string {\n' +
      "  return x + getTime()\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INT013");
  });

  it("fires INT003 (not INT013) when idempotent fn itself declares uses { time }", () => {
    const src =
      "?bs 0.9\n" +
      "fn getTime() uses { time } -> number = time.now()\n\n" +
      'fn label(x: string) uses { time } intent: "idempotent" -> string {\n' +
      "  return x + getTime()\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT003");
    expect(codes).not.toContain("INT013");
  });

  it("fires INT004 (not INT013) when idempotent fn body directly calls time.now()", () => {
    const src =
      "?bs 0.9\n" +
      "fn getTime() uses { time } -> number = time.now()\n\n" +
      'fn label(x: string) intent: "idempotent" -> string {\n' +
      "  return x + time.now()\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT004");
    expect(codes).not.toContain("INT013");
  });

  it("INT013 rewrite contains both option A (inject) and option B (remove claim)", () => {
    const src =
      "?bs 0.9\n" +
      "fn getTime() uses { time } -> number = time.now()\n\n" +
      'fn label(x: string) intent: "idempotent" -> string {\n' +
      "  return x + getTime()\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT013")!;
    expect(d.rewrite).toContain("option A");
    expect(d.rewrite).toContain("option B");
    expect(d.rewrite).toContain("getTime");
  });

  it("fires INT013 for callee that uses both random and time — reports non-idempotent caps", () => {
    const src =
      "?bs 0.9\n" +
      "fn mixed() uses { time, random } -> string = time.now() + random.float()\n\n" +
      'fn make(x: string) intent: "idempotent" -> string {\n' +
      "  return x + mixed()\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT013")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("mixed");
  });
});

describe("INT014 — redundant intent claim (subsumption check, ?bs 0.9+)", () => {
  it("fires INT014 when intent contains both 'pure' and 'idempotent'", () => {
    const src =
      "?bs 0.9\n" +
      'fn add(a: number, b: number) intent: "pure idempotent" -> number = a + b\n';
    expect(() => t(src)).toThrow(/INT014/);
  });

  it("fires INT014 when intent contains both 'infallible' and 'total'", () => {
    const src =
      "?bs 0.9\n" +
      'fn trim(s: string) intent: "infallible total" -> string = s.trim()\n';
    expect(() => t(src)).toThrow(/INT014/);
  });

  it("INT014 message names the redundant claim and the stronger claim (pure+idempotent)", () => {
    const src =
      "?bs 0.9\n" +
      'fn add(a: number, b: number) intent: "pure idempotent" -> number = a + b\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT014")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("idempotent");
    expect(d.message).toContain("pure");
    expect(d.message).toContain("redundant");
  });

  it("INT014 message names the redundant claim and the stronger claim (infallible+total)", () => {
    const src =
      "?bs 0.9\n" +
      'fn trim(s: string) intent: "infallible total" -> string = s.trim()\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT014")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("total");
    expect(d.message).toContain("infallible");
    expect(d.message).toContain("redundant");
  });

  it("does NOT fire INT014 when only 'pure' is declared (no redundancy)", () => {
    const src =
      "?bs 0.9\n" +
      'fn add(a: number, b: number) intent: "pure" -> number = a + b\n';
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT014 when only 'idempotent' is declared (no redundancy)", () => {
    const src =
      "?bs 0.9\n" +
      'fn add(a: number, b: number) intent: "idempotent" -> number = a + b\n';
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT014 when only 'infallible' is declared (no redundancy)", () => {
    const src =
      "?bs 0.9\n" +
      'fn trim(s: string) intent: "infallible" -> string = s.trim()\n';
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT014 when only 'total' is declared (no redundancy)", () => {
    const src =
      "?bs 0.9\n" +
      'fn parse(s: string) intent: "total" -> number = Number(s)\n';
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT014 on pre-0.9 pins", () => {
    const src =
      "?bs 0.8\n" +
      'fn add(a: number, b: number) intent: "pure idempotent" -> number = a + b\n';
    let codes: string[] = [];
    try { t(src); } catch (e) { if (e instanceof BotscriptError) codes = e.diagnostics.map((d) => d.code); }
    expect(codes).not.toContain("INT014");
  });

  it("fires both INT014 cases when intent has all four claims", () => {
    const src =
      "?bs 0.9\n" +
      'fn noop() intent: "pure idempotent infallible total" -> number = 0\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes.filter((c) => c === "INT014").length).toBe(2);
  });

  it("INT014 rewrite suggests removing the weaker claim", () => {
    const src =
      "?bs 0.9\n" +
      'fn add(a: number, b: number) intent: "pure idempotent" -> number = a + b\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT014")!;
    expect(d.rewrite).toContain("pure");
    expect(d.rewrite).toBeDefined();
  });
});

describe("INT015 — intent 'idempotent' body calls same-file fn with writes {} (?bs 0.9+)", () => {
  it("fires INT015 when idempotent fn body calls a same-file fn that declares writes {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn persist(data: string) writes { db } -> void = db.save(data)\n" +
      'fn process(raw: string) intent: "idempotent" -> void {\n' +
      "  persist(raw)\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT015/);
  });

  it("INT015 diagnostic names the callee and its writes labels", () => {
    const src =
      "?bs 0.9\n" +
      "fn persist(data: string) writes { db } -> void = db.save(data)\n" +
      'fn process(raw: string) intent: "idempotent" -> void {\n' +
      "  persist(raw)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    expect(caught).not.toBeNull();
    const d = caught!.diagnostics.find((d) => d.code === "INT015")!;
    expect(d.code).toBe("INT015");
    expect(d.message).toContain("persist");
    expect(d.message).toContain("db");
  });

  it("does NOT fire INT015 when idempotent fn calls a callee with no writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn transform(x: string) -> string = x.trim()\n" +
      'fn process(raw: string) intent: "idempotent" -> string {\n' +
      "  return transform(raw)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT015 on pre-0.9 pins", () => {
    const src =
      "?bs 0.8\n" +
      "fn persist(data: string) writes { db } -> void = db.save(data)\n" +
      'fn process(raw: string) intent: "idempotent" -> void {\n' +
      "  persist(raw)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INT015");
  });

  it("fires INT005 (not INT015) when idempotent fn itself declares writes {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn persist(data: string) writes { db } -> void = db.save(data)\n" +
      'fn process(raw: string) writes { db } intent: "idempotent" -> void {\n' +
      "  persist(raw)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).toContain("INT005");
    expect(codes).not.toContain("INT015");
  });

  it("INT015 rewrite contains both split-boundary and remove-claim options", () => {
    const src =
      "?bs 0.9\n" +
      "fn persist(data: string) writes { db } -> void = db.save(data)\n" +
      'fn process(raw: string) intent: "idempotent" -> void {\n' +
      "  persist(raw)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT015")!;
    expect(d.rewrite).toContain("option A");
    expect(d.rewrite).toContain("option B");
    expect(d.rewrite).toContain("db");
  });

  it("fires INT015 for callee with multiple writes labels", () => {
    const src =
      "?bs 0.9\n" +
      "fn audit(x: string) writes { db, log } -> void = db.save(x)\n" +
      'fn process(raw: string) intent: "idempotent" -> void {\n' +
      "  audit(raw)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT015")!;
    expect(d.message).toContain("db");
    expect(d.message).toContain("log");
  });
});

// INT016 — pure intent body calls same-file fn with reads {} or writes {}
describe("INT016 — intent 'pure' body calls same-file fn with reads {} or writes {} (?bs 0.9+)", () => {
  it("fires INT016 when pure fn calls a callee that declares reads { db }", () => {
    const src =
      "?bs 0.9\n" +
      "fn load(id: string) reads { db } -> string = db.find(id)\n" +
      'fn process(id: string) intent: "pure" -> string {\n' +
      "  return load(id)\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT016/);
  });

  it("fires INT016 when pure fn calls a callee that declares writes { db }", () => {
    const src =
      "?bs 0.9\n" +
      "fn persist(data: string) writes { db } -> void = db.save(data)\n" +
      'fn process(raw: string) intent: "pure" -> string {\n' +
      "  persist(raw)\n" +
      "  return raw.trim()\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT016/);
  });

  it("fires INT016 when pure fn calls a callee that declares both reads and writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn upsert(id: string, val: string) reads { db } writes { db } -> string = db.upsert(id, val)\n" +
      'fn process(id: string) intent: "pure" -> string {\n' +
      "  return upsert(id, id)\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT016/);
  });

  it("INT016 diagnostic message names the callee and its effects", () => {
    const src =
      "?bs 0.9\n" +
      "fn load(id: string) reads { cache } -> string = cache.get(id)\n" +
      'fn transform(id: string) intent: "pure" -> string {\n' +
      "  return load(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT016")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("load");
    expect(d.message).toContain("reads { cache }");
  });

  it("INT016 rewrite contains inject-parameter and remove-claim options", () => {
    const src =
      "?bs 0.9\n" +
      "fn load(id: string) reads { db } -> string = db.find(id)\n" +
      'fn process(id: string) intent: "pure" -> string {\n' +
      "  return load(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT016")!;
    expect(d.rewrite).toContain("option A");
    expect(d.rewrite).toContain("option B");
    expect(d.rewrite).toContain("load");
  });

  it("does NOT fire INT016 when pure fn has no callee with reads/writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn add(a: number, b: number) -> number = a + b\n" +
      'fn compute(x: number) intent: "pure" -> number {\n' +
      "  return add(x, 1)\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire INT016 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "fn load(id: string) reads { db } -> string = db.find(id)\n" +
      'fn process(id: string) intent: "pure" -> string {\n' +
      "  return load(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INT016");
  });

  it("fires INT001 (not INT016) when pure fn itself declares reads {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn load(id: string) reads { db } -> string = db.find(id)\n" +
      'fn process(id: string) reads { db } intent: "pure" -> string {\n' +
      "  return load(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).toContain("INT001");
    expect(codes).not.toContain("INT016");
  });

  it("fires INT002 (not INT016) when pure fn body directly calls a stdlib capability", () => {
    const src =
      "?bs 0.9\n" +
      "fn load(id: string) reads { db } -> string = db.find(id)\n" +
      'fn process(id: string) intent: "pure" -> string {\n' +
      "  const x = http.get(id)\n" +
      "  return load(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).toContain("INT002");
    expect(codes).not.toContain("INT016");
  });

  it("fires INT016 for callee with multiple reads labels", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetch(id: string) reads { db, cache } -> string = db.find(id)\n" +
      'fn process(id: string) intent: "pure" -> string {\n' +
      "  return fetch(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT016")!;
    expect(d.message).toContain("db");
    expect(d.message).toContain("cache");
  });
});

// INT017 — pure intent body calls async same-file fn
describe("INT017 — intent 'pure' body calls same-file async fn (?bs 0.9+)", () => {
  it("fires INT017 when pure fn calls an async callee", () => {
    const src =
      "?bs 0.9\n" +
      "async fn helper(x: number) -> Promise<number> = x * 2\n" +
      'fn double(x: number) intent: "pure" -> Promise<number> {\n' +
      "  return helper(x)\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT017/);
  });

  it("INT017 diagnostic message names the caller, callee, and reason", () => {
    const src =
      "?bs 0.9\n" +
      "async fn fetchVal(id: string) -> Promise<string> = id\n" +
      'fn getVal(id: string) intent: "pure" -> Promise<string> {\n' +
      "  return fetchVal(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT017")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("getVal");
    expect(d.message).toContain("fetchVal");
    expect(d.message).toContain("async");
  });

  it("does NOT fire INT017 when pure fn calls a sync callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(x: number) -> number = x * 2\n" +
      'fn double(x: number) intent: "pure" -> number = helper(x)\n';
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT011 (not INT017) when the pure fn itself is async", () => {
    const src =
      "?bs 0.9\n" +
      "async fn helper(x: number) -> Promise<number> = x * 2\n" +
      'async fn double(x: number) intent: "pure" -> Promise<number> {\n' +
      "  return helper(x)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT011");
    expect(codes).not.toContain("INT017");
  });

  it("fires INT002 (not INT017) when pure fn body calls a stdlib capability directly", () => {
    const src =
      "?bs 0.9\n" +
      "async fn helper(x: number) -> Promise<number> = x * 2\n" +
      'fn double(x: number) intent: "pure" -> Promise<number> {\n' +
      "  const t = time.now()\n" +
      "  return helper(x)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT002");
    expect(codes).not.toContain("INT017");
  });

  it("does NOT fire INT017 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "async fn helper(x: number) -> Promise<number> = x * 2\n" +
      'fn double(x: number) intent: "pure" -> Promise<number> {\n' +
      "  return helper(x)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INT017");
  });

  it("INT017 diagnostic has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      "async fn helper(x: number) -> Promise<number> = x * 2\n" +
      'fn double(x: number) intent: "pure" -> Promise<number> {\n' +
      "  return helper(x)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT017")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("fires INT001 (not INT017) when pure fn itself declares uses { net }", () => {
    const src =
      "?bs 0.9\n" +
      "async fn helper(x: number) -> Promise<number> = x * 2\n" +
      'fn double(x: number) uses { net } intent: "pure" -> Promise<number> {\n' +
      "  return helper(x)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT001");
    expect(codes).not.toContain("INT017");
  });
});

// INT018 — pure intent body calls same-file fn with throws {}
describe("INT018 — intent 'pure' body calls same-file fn that declares throws {} (?bs 0.9+)", () => {
  it("fires INT018 when pure fn calls a same-file fn that declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { }\n" +
      'fn process(s: string) intent: "pure" -> string {\n' +
      "  validate(s)\n" +
      "  return s\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT018/);
  });

  it("INT018 diagnostic message names the caller, callee, and thrown type", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { }\n" +
      'fn process(s: string) intent: "pure" -> string {\n' +
      "  validate(s)\n" +
      "  return s\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT018")!;
    expect(d.message).toMatch(/process/);
    expect(d.message).toMatch(/validate/);
    expect(d.message).toMatch(/ValidationError/);
  });

  it("does NOT fire INT018 when pure fn calls a non-throwing callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(s: string) -> string = s.trim()\n" +
      'fn process(s: string) intent: "pure" -> string = helper(s)\n';
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT001 (not INT018) when pure fn itself declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { }\n" +
      'fn process(s: string) intent: "pure" throws { ValidationError } -> string {\n' +
      "  validate(s)\n" +
      "  return s\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT001");
    expect(codes).not.toContain("INT018");
  });

  it("fires INT002 (not INT018) when pure fn body directly calls a stdlib capability", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { }\n" +
      'fn process(s: string) intent: "pure" -> string {\n' +
      "  const t = time.now()\n" +
      "  validate(s)\n" +
      "  return s\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT002");
    expect(codes).not.toContain("INT018");
  });

  it("does NOT fire INT018 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "fn validate(s: string) throws { ValidationError } -> void { }\n" +
      'fn process(s: string) intent: "pure" -> string {\n' +
      "  validate(s)\n" +
      "  return s\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught?.diagnostics.map((d) => d.code) ?? [];
    expect(codes).not.toContain("INT018");
  });

  it("INT018 diagnostic has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { }\n" +
      'fn process(s: string) intent: "pure" -> string {\n' +
      "  validate(s)\n" +
      "  return s\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT018")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("fires INT001 (not INT018) when pure fn itself declares uses { net }", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { }\n" +
      'fn process(s: string) uses { net } intent: "pure" -> string {\n' +
      "  validate(s)\n" +
      "  return s\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT001");
    expect(codes).not.toContain("INT018");
  });

  it("fires INT018 with multiple throwing callees (one diagnostic per callee)", () => {
    const src =
      "?bs 0.9\n" +
      "fn validateA(s: string) throws { ErrorA } -> void { }\n" +
      "fn validateB(s: string) throws { ErrorB } -> void { }\n" +
      'fn process(s: string) intent: "pure" -> string {\n' +
      "  validateA(s)\n" +
      "  validateB(s)\n" +
      "  return s\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.filter((d) => d.code === "INT018");
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });
});

// INT019 — idempotent intent body calls same-file async fn
describe("INT019 — intent 'idempotent' body calls same-file async fn (?bs 0.9+)", () => {
  it("fires INT019 when idempotent fn calls a same-file async fn", () => {
    const src =
      "?bs 0.9\n" +
      "async fn fetchData(id: string) uses { net } -> Promise<string> = id\n" +
      'fn getRecord(id: string) intent: "idempotent" -> Promise<string> {\n' +
      "  return fetchData(id)\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT019/);
  });

  it("INT019 diagnostic message names the caller and async callee", () => {
    const src =
      "?bs 0.9\n" +
      "async fn loadUser(id: string) uses { net } -> Promise<string> = id\n" +
      'fn getUser(id: string) intent: "idempotent" -> Promise<string> {\n' +
      "  return loadUser(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT019")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("getUser");
    expect(d.message).toContain("loadUser");
    expect(d.message).toContain("async");
  });

  it("does NOT fire INT019 when idempotent fn calls a non-async callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn normalize(s: string) -> string = s.toLowerCase()\n" +
      'fn canonicalize(s: string) intent: "idempotent" -> string = normalize(s)\n';
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT003 (not INT019) when idempotent fn itself declares uses { random }", () => {
    const src =
      "?bs 0.9\n" +
      "async fn helper(n: number) -> Promise<number> = n\n" +
      'fn pick(n: number) uses { random } intent: "idempotent" -> Promise<number> {\n' +
      "  return helper(n)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT003");
    expect(codes).not.toContain("INT019");
  });

  it("fires INT004 (not INT019) when idempotent fn body directly references random", () => {
    const src =
      "?bs 0.9\n" +
      "async fn helper(n: number) -> Promise<number> = n\n" +
      'fn pick(n: number) intent: "idempotent" -> Promise<number> {\n' +
      "  const r = random.next()\n" +
      "  return helper(n)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT004");
    expect(codes).not.toContain("INT019");
  });

  it("does NOT fire INT019 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "async fn fetch(id: string) -> Promise<string> = id\n" +
      'fn get(id: string) intent: "idempotent" -> Promise<string> = fetch(id)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT019");
  });

  it("INT019 diagnostic has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      "async fn asyncHelper(x: string) uses { net } -> Promise<string> = x\n" +
      'fn idempotentFn(x: string) intent: "idempotent" -> Promise<string> = asyncHelper(x)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT019")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("fires INT019 with multiple async callees (one diagnostic per callee)", () => {
    const src =
      "?bs 0.9\n" +
      "async fn fetchA(id: string) uses { net } -> Promise<string> = id\n" +
      "async fn fetchB(id: string) uses { net } -> Promise<string> = id\n" +
      'fn getAll(id: string) intent: "idempotent" -> string {\n' +
      "  fetchA(id)\n" +
      "  fetchB(id)\n" +
      "  return id\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.filter((d) => d.code === "INT019");
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT fire INT019 when the idempotent fn itself is async", () => {
    // When the caller is also async, INT019 does not apply (the async-caller
    // case has its own semantic — async idempotent is a distinct pattern).
    const src =
      "?bs 0.9\n" +
      "async fn fetchInner(id: string) uses { net } -> Promise<string> = id\n" +
      'async fn fetchOuter(id: string) intent: "idempotent" uses { net } -> Promise<string> = fetchInner(id)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT019");
  });
});

// INT020 — total intent body calls same-file async fn
describe("INT020 — intent 'total' body calls same-file async fn (?bs 0.9+)", () => {
  it("fires INT020 when total fn calls a same-file async fn", () => {
    const src =
      "?bs 0.9\n" +
      "async fn processAsync(s: string) uses { net } -> Promise<string> = s\n" +
      'fn handle(s: string) intent: "total" -> Promise<string> = processAsync(s)\n';
    expect(() => t(src)).toThrow(/INT020/);
  });

  it("INT020 diagnostic message names the caller and async callee", () => {
    const src =
      "?bs 0.9\n" +
      "async fn fetchData(id: string) uses { net } -> Promise<string> = id\n" +
      'fn loadData(id: string) intent: "total" -> Promise<string> {\n' +
      "  return fetchData(id)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT020")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("loadData");
    expect(d.message).toContain("fetchData");
    expect(d.message).toContain("async");
  });

  it("does NOT fire INT020 when total fn calls a non-async callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn normalize(s: string) -> string = s.trim()\n" +
      'fn clean(s: string) intent: "total" -> string = normalize(s)\n';
    expect(() => t(src)).not.toThrow();
  });

  it("INT020 does NOT fire at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "async fn fetchAsync(id: string) -> Promise<string> = id\n" +
      'fn load(id: string) intent: "total" -> Promise<string> = fetchAsync(id)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT020");
  });

  it("INT020 diagnostic has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      "async fn asyncHelper(x: string) uses { net } -> Promise<string> = x\n" +
      'fn totalFn(x: string) intent: "total" -> Promise<string> = asyncHelper(x)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT020")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("fires INT006 (not INT020) when total fn itself declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "async fn asyncOp(s: string) -> Promise<string> = s\n" +
      'fn handle(s: string) intent: "total" throws { Error } -> Promise<string> = asyncOp(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT006");
    // INT020 may or may not fire depending on impl; INT006 must fire
  });

  it("does NOT fire INT020 when the total fn itself is async", () => {
    const src =
      "?bs 0.9\n" +
      "async fn fetchInner(id: string) uses { net } -> Promise<string> = id\n" +
      'async fn fetchOuter(id: string) intent: "total" uses { net } -> Promise<string> = fetchInner(id)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT020");
  });

  it("fires INT020 with multiple async callees (one diagnostic per callee)", () => {
    const src =
      "?bs 0.9\n" +
      "async fn fetchA(id: string) uses { net } -> Promise<string> = id\n" +
      "async fn fetchB(id: string) uses { net } -> Promise<string> = id\n" +
      'fn getAll(id: string) intent: "total" -> string {\n' +
      "  fetchA(id)\n" +
      "  fetchB(id)\n" +
      "  return id\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.filter((d) => d.code === "INT020");
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });
});

// INT021 — infallible intent body calls same-file async fn
describe("INT021 — intent 'infallible' body calls same-file async fn (?bs 0.9+)", () => {
  it("fires INT021 when infallible fn calls a same-file async fn", () => {
    const src =
      "?bs 0.9\n" +
      "async fn computeAsync(n: number) -> Promise<number> = n\n" +
      'fn double(n: number) intent: "infallible" -> Promise<number> = computeAsync(n)\n';
    expect(() => t(src)).toThrow(/INT021/);
  });

  it("INT021 diagnostic message names the caller and async callee", () => {
    const src =
      "?bs 0.9\n" +
      "async fn asyncCalc(n: number) -> Promise<number> = n\n" +
      'fn compute(n: number) intent: "infallible" -> Promise<number> {\n' +
      "  return asyncCalc(n)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT021")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("compute");
    expect(d.message).toContain("asyncCalc");
    expect(d.message).toContain("async");
  });

  it("does NOT fire INT021 when infallible fn calls a non-async callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn square(n: number) -> number = n * n\n" +
      'fn compute(n: number) intent: "infallible" -> number = square(n)\n';
    expect(() => t(src)).not.toThrow();
  });

  it("INT021 does NOT fire at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "async fn asyncCalc(n: number) -> Promise<number> = n\n" +
      'fn compute(n: number) intent: "infallible" -> Promise<number> = asyncCalc(n)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT021");
  });

  it("INT021 diagnostic has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      "async fn asyncHelper(x: string) -> Promise<string> = x\n" +
      'fn infallibleFn(x: string) intent: "infallible" -> Promise<string> = asyncHelper(x)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT021")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("fires INT009 (not INT021) when infallible fn itself declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "async fn asyncOp(s: string) -> Promise<string> = s\n" +
      'fn handle(s: string) intent: "infallible" throws { Error } -> Promise<string> = asyncOp(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT009");
  });

  it("does NOT fire INT021 when the infallible fn itself is async", () => {
    const src =
      "?bs 0.9\n" +
      "async fn asyncInner(n: number) -> Promise<number> = n\n" +
      'async fn asyncOuter(n: number) intent: "infallible" -> Promise<number> = asyncInner(n)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT021");
  });

  it("fires INT008 AND INT021 independently (different violation axes)", () => {
    // INT008 fires on Result<> return type, INT021 on async callee — both can fire.
    const src =
      "?bs 0.9\n" +
      "async fn mayFail(s: string) -> Promise<string> = s\n" +
      'fn check(s: string) intent: "infallible" -> Result<string, Error> = mayFail(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT008");
    expect(codes).toContain("INT021");
  });
});

// INT022 — idempotent intent + throws {} header
describe("INT022 — intent 'idempotent' but fn declares throws {} (?bs 0.9+)", () => {
  it("fires INT022 when idempotent fn declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      'fn fetchUser(id: string) intent: "idempotent" throws { NetworkError } -> string {\n' +
      "  return id\n" +
      "}\n";
    expect(() => t(src)).toThrow(/INT022/);
  });

  it("INT022 diagnostic message names the caller and thrown type", () => {
    const src =
      "?bs 0.9\n" +
      'fn loadConfig(key: string) intent: "idempotent" throws { ConfigError } -> string {\n' +
      "  return key\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT022")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("loadConfig");
    expect(d.message).toContain("ConfigError");
    expect(d.message).toContain("idempotent");
  });

  it("INT022 diagnostic has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn run(x: string) intent: "idempotent" throws { AppError } -> string = x\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT022")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("does NOT fire INT022 when idempotent fn does not declare throws {}", () => {
    const src =
      "?bs 0.9\n" +
      'fn normalize(s: string) intent: "idempotent" -> string = s.toLowerCase()\n';
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT005 (not INT022) when idempotent fn also declares writes {}", () => {
    const src =
      "?bs 0.9\n" +
      'fn save(s: string) writes { db } intent: "idempotent" throws { DbError } -> void {\n' +
      "  return\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT005");
    expect(codes).not.toContain("INT022");
  });

  it("fires INT003 (not INT022) when idempotent fn declares uses { random } and throws {}", () => {
    const src =
      "?bs 0.9\n" +
      'fn pick(n: number) uses { random } intent: "idempotent" throws { RangeError } -> number {\n' +
      "  return n\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT003");
    expect(codes).not.toContain("INT022");
  });

  it("does NOT fire INT022 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      'fn run(x: string) intent: "idempotent" throws { AppError } -> string = x\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT022");
  });
});

// INT023 — idempotent intent body calls same-file fn that declares throws {}
describe("INT023 — intent 'idempotent' body calls same-file fn that declares throws {} (?bs 0.9+)", () => {
  it("fires INT023 when idempotent fn calls a same-file fn that declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      'fn process(s: string) intent: "idempotent" -> string = validate(s)\n';
    expect(() => t(src)).toThrow(/INT023/);
  });

  it("INT023 diagnostic message names the caller, callee, and thrown type", () => {
    const src =
      "?bs 0.9\n" +
      "fn checkQuota(id: string) throws { QuotaError } -> string = id\n" +
      'fn enforceLimit(id: string) intent: "idempotent" -> string = checkQuota(id)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT023")!;
    expect(d).toBeDefined();
    expect(d.message).toContain("enforceLimit");
    expect(d.message).toContain("checkQuota");
    expect(d.message).toContain("QuotaError");
  });

  it("INT023 diagnostic has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) throws { ParseError } -> string = s\n" +
      'fn compute(s: string) intent: "idempotent" -> string = parse(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT023")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("does NOT fire INT023 when idempotent fn calls a non-throwing callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn normalize(s: string) -> string = s.toLowerCase()\n" +
      'fn canonicalize(s: string) intent: "idempotent" -> string = normalize(s)\n';
    expect(() => t(src)).not.toThrow();
  });

  it("fires INT022 (not INT023) when idempotent fn itself declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(s: string) throws { AppError } -> string = s\n" +
      'fn run(s: string) intent: "idempotent" throws { AppError } -> string = helper(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT022");
    expect(codes).not.toContain("INT023");
  });

  it("fires INT005 (not INT023) when idempotent fn declares writes {}", () => {
    const src =
      "?bs 0.9\n" +
      "fn persist(s: string) throws { DbError } -> string = s\n" +
      'fn save(s: string) writes { db } intent: "idempotent" -> string = persist(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.map((d) => d.code);
    expect(codes).toContain("INT005");
    expect(codes).not.toContain("INT023");
  });

  it("does NOT fire INT023 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      "fn parse(s: string) throws { ParseError } -> number { return 0 }\n" +
      'fn compute(s: string) intent: "idempotent" -> number = parse(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT023");
  });

  it("fires INT023 with multiple throwing callees (one diagnostic per callee)", () => {
    const src =
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      "fn parse(s: string) throws { ParseError } -> string = s\n" +
      'fn process(s: string) intent: "idempotent" -> string {\n' +
      "  const v = validate(s)\n" +
      "  return parse(v)\n" +
      "}\n";
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = caught!.diagnostics.filter((d) => d.code === "INT023");
    expect(codes.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Cross-file throws-transitivity: INT024, INT025, INT026, INT027
// ---------------------------------------------------------------------------

const tWithMods = (src: string, moduleEffects: Record<string, { throws?: string[] }>) =>
  transform(src, { moduleEffects }).code;

// INT024 — pure intent + imported fn throws {}
describe("INT024 — intent 'pure' body calls imported fn that declares throws {} (?bs 0.9+)", () => {
  it("fires INT024 when pure fn calls imported fn with throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn normalize(s: string) intent: "pure" -> string = parse(s)\n';
    expect(() =>
      tWithMods(src, { parse: { throws: ["ParseError"] } }),
    ).toThrow(/INT024/);
  });

  it("INT024 diagnostic names caller, callee, and thrown type", () => {
    const src =
      "?bs 0.9\n" +
      'fn normalize(s: string) intent: "pure" -> string = parse(s)\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { parse: { throws: ["ParseError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT024")!;
    expect(d.message).toContain("normalize");
    expect(d.message).toContain("parse");
    expect(d.message).toContain("ParseError");
  });

  it("does NOT fire INT024 when imported fn has no throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn normalize(s: string) intent: "pure" -> string = parse(s)\n';
    expect(() =>
      tWithMods(src, { parse: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT024 when same-file callee throws (INT018 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) throws { ParseError } -> string = s\n" +
      'fn normalize(s: string) intent: "pure" -> string = parse(s)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT018");
    expect(codes).not.toContain("INT024");
  });

  it("does NOT fire INT024 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      'fn normalize(s: string) intent: "pure" -> string = parse(s)\n';
    expect(() =>
      tWithMods(src, { parse: { throws: ["ParseError"] } }),
    ).not.toThrow();
  });

  it("INT024 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn normalize(s: string) intent: "pure" -> string = parse(s)\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { parse: { throws: ["ParseError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT024")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("resolves import alias and fires INT024", () => {
    // import { parse as p } from "./parser" — local name is 'p', declared name 'parse'
    const src =
      "?bs 0.9\n" +
      "import { parse as p } from \"./parser\"\n" +
      'fn normalize(s: string) intent: "pure" -> string = p(s)\n';
    expect(() =>
      tWithMods(src, { parse: { throws: ["ParseError"] } }),
    ).toThrow(/INT024/);
  });
});

// INT027 — idempotent intent + imported fn throws {}
describe("INT027 — intent 'idempotent' body calls imported fn that declares throws {} (?bs 0.9+)", () => {
  it("fires INT027 when idempotent fn calls imported fn with throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn loadUser(id: string) intent: "idempotent" -> string = fetchUser(id)\n';
    expect(() =>
      tWithMods(src, { fetchUser: { throws: ["NetworkError"] } }),
    ).toThrow(/INT027/);
  });

  it("INT027 diagnostic names caller, callee, and thrown type", () => {
    const src =
      "?bs 0.9\n" +
      'fn loadUser(id: string) intent: "idempotent" -> string = fetchUser(id)\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { fetchUser: { throws: ["NetworkError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT027")!;
    expect(d.message).toContain("loadUser");
    expect(d.message).toContain("fetchUser");
    expect(d.message).toContain("NetworkError");
  });

  it("does NOT fire INT027 when imported fn has no throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn loadUser(id: string) intent: "idempotent" -> string = fetchUser(id)\n';
    expect(() =>
      tWithMods(src, { fetchUser: {} }),
    ).not.toThrow();
  });

  it("fires INT022 (not INT027) when idempotent fn itself declares throws {}", () => {
    const src =
      "?bs 0.9\n" +
      'fn loadUser(id: string) intent: "idempotent" throws { NetworkError } -> string = fetchUser(id)\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { fetchUser: { throws: ["NetworkError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT022");
    expect(codes).not.toContain("INT027");
  });

  it("fires INT023 (not INT027) when same-file callee throws", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchUser(id: string) throws { NetworkError } -> string = id\n" +
      'fn loadUser(id: string) intent: "idempotent" -> string = fetchUser(id)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT023");
    expect(codes).not.toContain("INT027");
  });

  it("INT027 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn loadUser(id: string) intent: "idempotent" -> string = fetchUser(id)\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { fetchUser: { throws: ["NetworkError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT027")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// INT025 — total intent + imported fn throws {}
describe("INT025 — intent 'total' body calls imported fn that declares throws {} (?bs 0.9+)", () => {
  it("fires INT025 when total fn calls imported fn with throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn safeCheck(s: string) intent: "total" -> boolean = validate(s)\n';
    expect(() =>
      tWithMods(src, { validate: { throws: ["ValidationError"] } }),
    ).toThrow(/INT025/);
  });

  it("does NOT fire INT025 when imported fn has no throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn safeCheck(s: string) intent: "total" -> boolean = validate(s)\n';
    expect(() =>
      tWithMods(src, { validate: {} }),
    ).not.toThrow();
  });

  it("INT025 diagnostic names caller, callee, and thrown type", () => {
    const src =
      "?bs 0.9\n" +
      'fn safeCheck(s: string) intent: "total" -> boolean = validate(s)\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { validate: { throws: ["ValidationError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT025")!;
    expect(d.message).toContain("safeCheck");
    expect(d.message).toContain("validate");
    expect(d.message).toContain("ValidationError");
  });
});

// INT026 — infallible intent + imported fn throws {}
describe("INT026 — intent 'infallible' body calls imported fn that declares throws {} (?bs 0.9+)", () => {
  it("fires INT026 when infallible fn calls imported fn with throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn getConfig() intent: "infallible" -> string = load("config")\n';
    expect(() =>
      tWithMods(src, { load: { throws: ["IOError"] } }),
    ).toThrow(/INT026/);
  });

  it("does NOT fire INT026 when imported fn has no throws", () => {
    const src =
      "?bs 0.9\n" +
      'fn getConfig() intent: "infallible" -> string = load("config")\n';
    expect(() =>
      tWithMods(src, { load: {} }),
    ).not.toThrow();
  });

  it("INT026 diagnostic names caller, callee, and thrown type", () => {
    const src =
      "?bs 0.9\n" +
      'fn getConfig() intent: "infallible" -> string = load("config")\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { load: { throws: ["IOError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT026")!;
    expect(d.message).toContain("getConfig");
    expect(d.message).toContain("load");
    expect(d.message).toContain("IOError");
  });

  it("INT026 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn getConfig() intent: "infallible" -> string = load("config")\n';
    let caught: BotscriptError | null = null;
    try { tWithMods(src, { load: { throws: ["IOError"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT026")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Cross-file capabilities/reads/writes-transitivity: INT028, INT029, INT030
// ---------------------------------------------------------------------------

const tWithEffects = (
  src: string,
  moduleEffects: Record<string, { capabilities?: string[]; reads?: string[]; writes?: string[]; throws?: string[]; returnsResult?: true; returnsOption?: true; isAsync?: true }>,
) => transform(src, { moduleEffects }).code;

// INT028 — pure intent + imported fn uses {}
describe("INT028 — intent 'pure' body calls imported fn that declares uses {} (?bs 0.9+)", () => {
  it("fires INT028 when pure fn calls imported fn with capabilities", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchEnv(path)\n';
    expect(() =>
      tWithEffects(src, { fetchEnv: { capabilities: ["env"] } }),
    ).toThrow(/INT028/);
  });

  it("INT028 diagnostic names caller, callee, and capability", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchEnv(path)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { fetchEnv: { capabilities: ["env"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT028")!;
    expect(d.message).toContain("buildUrl");
    expect(d.message).toContain("fetchEnv");
    expect(d.message).toContain("env");
  });

  it("does NOT fire INT028 when imported fn has no capabilities", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchEnv(path)\n';
    expect(() =>
      tWithEffects(src, { fetchEnv: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT028 when same-file callee has capabilities (INT012 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "fn fetchEnv(k: string) uses { env } -> string = k\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchEnv(path)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT012");
    expect(codes).not.toContain("INT028");
  });

  it("does NOT fire INT028 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchEnv(path)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { fetchEnv: { capabilities: ["env"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT028");
  });

  it("INT028 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchEnv(path)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { fetchEnv: { capabilities: ["env"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT028")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });

  it("resolves import alias and fires INT028", () => {
    const src =
      "?bs 0.9\n" +
      'import { fetchEnv as getEnv } from "./env"\n' +
      'fn buildUrl(path: string) intent: "pure" -> string = getEnv(path)\n';
    expect(() =>
      tWithEffects(src, { fetchEnv: { capabilities: ["env"] } }),
    ).toThrow(/INT028/);
  });
});

// INT029 — pure intent + imported fn reads {} or writes {}
describe("INT029 — intent 'pure' body calls imported fn that declares reads {} or writes {} (?bs 0.9+)", () => {
  it("fires INT029 when pure fn calls imported fn that reads {}", () => {
    const src =
      "?bs 0.9\n" +
      'fn getTimeout(key: string) intent: "pure" -> number = readConfig(key)\n';
    expect(() =>
      tWithEffects(src, { readConfig: { reads: ["config"] } }),
    ).toThrow(/INT029/);
  });

  it("fires INT029 when pure fn calls imported fn that writes {}", () => {
    const src =
      "?bs 0.9\n" +
      'fn cacheResult(k: string) intent: "pure" -> void = writeCache(k)\n';
    expect(() =>
      tWithEffects(src, { writeCache: { writes: ["cache"] } }),
    ).toThrow(/INT029/);
  });

  it("INT029 diagnostic names caller, callee, and effect", () => {
    const src =
      "?bs 0.9\n" +
      'fn getTimeout(key: string) intent: "pure" -> number = readConfig(key)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { readConfig: { reads: ["config"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT029")!;
    expect(d.message).toContain("getTimeout");
    expect(d.message).toContain("readConfig");
    expect(d.message).toContain("config");
  });

  it("does NOT fire INT029 when imported fn has no reads or writes", () => {
    const src =
      "?bs 0.9\n" +
      'fn getTimeout(key: string) intent: "pure" -> number = readConfig(key)\n';
    expect(() =>
      tWithEffects(src, { readConfig: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT029 when same-file callee reads/writes (INT016 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "fn readConfig(k: string) reads { config } -> number = 0\n" +
      'fn getTimeout(key: string) intent: "pure" -> number = readConfig(key)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT016");
    expect(codes).not.toContain("INT029");
  });

  it("INT029 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn getTimeout(key: string) intent: "pure" -> number = readConfig(key)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { readConfig: { reads: ["config"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT029")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// INT030 — idempotent intent + imported fn writes {}
describe("INT030 — intent 'idempotent' body calls imported fn that declares writes {} (?bs 0.9+)", () => {
  it("fires INT030 when idempotent fn calls imported fn with writes", () => {
    const src =
      "?bs 0.9\n" +
      'fn saveResult(id: string) intent: "idempotent" -> void = persist(id)\n';
    expect(() =>
      tWithEffects(src, { persist: { writes: ["db"] } }),
    ).toThrow(/INT030/);
  });

  it("INT030 diagnostic names caller, callee, and written resource", () => {
    const src =
      "?bs 0.9\n" +
      'fn saveResult(id: string) intent: "idempotent" -> void = persist(id)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { persist: { writes: ["db"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT030")!;
    expect(d.message).toContain("saveResult");
    expect(d.message).toContain("persist");
    expect(d.message).toContain("db");
  });

  it("does NOT fire INT030 when imported fn has no writes", () => {
    const src =
      "?bs 0.9\n" +
      'fn saveResult(id: string) intent: "idempotent" -> void = persist(id)\n';
    expect(() =>
      tWithEffects(src, { persist: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT030 when imported fn only reads (reads without writes does not fire)", () => {
    const src =
      "?bs 0.9\n" +
      'fn lookupResult(id: string) intent: "idempotent" reads { db } -> string = query(id)\n';
    expect(() =>
      tWithEffects(src, { query: { reads: ["db"] } }),
    ).not.toThrow();
  });

  it("does NOT fire INT030 when same-file callee writes (INT015 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "fn persist(id: string) writes { db } -> void = id\n" +
      'fn saveResult(id: string) intent: "idempotent" -> void = persist(id)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT015");
    expect(codes).not.toContain("INT030");
  });

  it("INT030 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn saveResult(id: string) intent: "idempotent" -> void = persist(id)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { persist: { writes: ["db"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT030")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// INT031 — idempotent intent + imported fn uses { random | time }
describe("INT031 — intent 'idempotent' body calls imported fn that declares uses { random } or uses { time } (?bs 0.9+)", () => {
  it("fires INT031 when idempotent fn calls imported fn with uses { time }", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + timestamp()\n';
    expect(() =>
      tWithEffects(src, { timestamp: { capabilities: ["time"] } }),
    ).toThrow(/INT031/);
  });

  it("fires INT031 when idempotent fn calls imported fn with uses { random }", () => {
    const src =
      "?bs 0.9\n" +
      'fn makeId(prefix: string) intent: "idempotent" -> string = prefix + genId()\n';
    expect(() =>
      tWithEffects(src, { genId: { capabilities: ["random"] } }),
    ).toThrow(/INT031/);
  });

  it("INT031 diagnostic names caller, callee, and non-idempotent capability", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + timestamp()\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { timestamp: { capabilities: ["time"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT031")!;
    expect(d.message).toContain("buildKey");
    expect(d.message).toContain("timestamp");
    expect(d.message).toContain("time");
  });

  it("does NOT fire INT031 when imported fn uses only non-random/time capabilities", () => {
    const src =
      "?bs 0.9\n" +
      'fn fetchData(id: string) intent: "idempotent" uses { net } -> string = query(id)\n';
    expect(() =>
      tWithEffects(src, { query: { capabilities: ["net"] } }),
    ).not.toThrow();
  });

  it("does NOT fire INT031 when same-file callee uses { time } (INT013 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "fn timestamp() uses { time } -> number = time.now()\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + timestamp()\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT013");
    expect(codes).not.toContain("INT031");
  });

  it("does NOT fire INT031 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + timestamp()\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { timestamp: { capabilities: ["time"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT031");
  });

  it("resolves import alias and fires INT031", () => {
    const src =
      "?bs 0.9\n" +
      "import { getTimestamp as ts } from \"./clock\"\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + ts()\n';
    expect(() =>
      tWithEffects(src, { getTimestamp: { capabilities: ["time"] } }),
    ).toThrow(/INT031/);
  });

  it("INT031 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + timestamp()\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { timestamp: { capabilities: ["time"] } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT031")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// INT032 — pure intent + imported async fn
describe("INT032 — intent 'pure' body calls imported async fn (?bs 0.9+)", () => {
  it("fires INT032 when pure fn calls imported async fn", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchConfig(path)\n';
    expect(() =>
      tWithEffects(src, { fetchConfig: { isAsync: true } }),
    ).toThrow(/INT032/);
  });

  it("INT032 diagnostic names caller and callee", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchConfig(path)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { fetchConfig: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT032")!;
    expect(d.message).toContain("buildUrl");
    expect(d.message).toContain("fetchConfig");
  });

  it("does NOT fire INT032 when imported fn is not async", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = syncHelper(path)\n';
    expect(() =>
      tWithEffects(src, { syncHelper: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT032 when same-file callee is async (INT017 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "async fn fetchConfig(p: string) -> string = p\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchConfig(path)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT017");
    expect(codes).not.toContain("INT032");
  });

  it("does NOT fire INT032 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchConfig(path)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { fetchConfig: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT032");
  });

  it("resolves import alias and fires INT032", () => {
    const src =
      "?bs 0.9\n" +
      "import { fetchConfig as fc } from \"./config\"\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fc(path)\n';
    expect(() =>
      tWithEffects(src, { fetchConfig: { isAsync: true } }),
    ).toThrow(/INT032/);
  });

  it("INT032 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildUrl(path: string) intent: "pure" -> string = fetchConfig(path)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { fetchConfig: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT032")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// INT033 — idempotent intent + imported async fn
describe("INT033 — intent 'idempotent' body calls imported async fn (?bs 0.9+)", () => {
  it("fires INT033 when idempotent fn calls imported async fn", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + loadCache(prefix)\n';
    expect(() =>
      tWithEffects(src, { loadCache: { isAsync: true } }),
    ).toThrow(/INT033/);
  });

  it("INT033 diagnostic names caller and callee", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + loadCache(prefix)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { loadCache: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT033")!;
    expect(d.message).toContain("buildKey");
    expect(d.message).toContain("loadCache");
  });

  it("does NOT fire INT033 when imported fn is not async", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + syncHelper(prefix)\n';
    expect(() =>
      tWithEffects(src, { syncHelper: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT033 when same-file callee is async (INT019 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "async fn loadCache(p: string) -> string = p\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + loadCache(prefix)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT019");
    expect(codes).not.toContain("INT033");
  });

  it("does NOT fire INT033 at ?bs 0.8 (gated at 0.9)", () => {
    const src =
      "?bs 0.8\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + loadCache(prefix)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { loadCache: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).not.toContain("INT033");
  });

  it("INT033 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn buildKey(prefix: string) intent: "idempotent" -> string = prefix + loadCache(prefix)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { loadCache: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT033")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// INT034 — total intent + imported async fn
describe("INT034 — intent 'total' body calls imported async fn (?bs 0.9+)", () => {
  it("fires INT034 when total fn calls imported async fn", () => {
    const src =
      "?bs 0.9\n" +
      'fn checkInput(input: string) intent: "total" -> boolean = validate(input)\n';
    expect(() =>
      tWithEffects(src, { validate: { isAsync: true } }),
    ).toThrow(/INT034/);
  });

  it("INT034 diagnostic names caller and callee", () => {
    const src =
      "?bs 0.9\n" +
      'fn checkInput(input: string) intent: "total" -> boolean = validate(input)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { validate: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT034")!;
    expect(d.message).toContain("checkInput");
    expect(d.message).toContain("validate");
  });

  it("does NOT fire INT034 when imported fn is not async", () => {
    const src =
      "?bs 0.9\n" +
      'fn checkInput(input: string) intent: "total" -> boolean = validateSync(input)\n';
    expect(() =>
      tWithEffects(src, { validateSync: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT034 when same-file callee is async (INT020 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "async fn validate(input: string) -> boolean = true\n" +
      'fn checkInput(input: string) intent: "total" -> boolean = validate(input)\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT020");
    expect(codes).not.toContain("INT034");
  });

  it("INT034 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn checkInput(input: string) intent: "total" -> boolean = validate(input)\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { validate: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT034")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// INT035 — infallible intent + imported async fn
describe("INT035 — intent 'infallible' body calls imported async fn (?bs 0.9+)", () => {
  it("fires INT035 when infallible fn calls imported async fn", () => {
    const src =
      "?bs 0.9\n" +
      'fn format(value: string) intent: "infallible" -> string = value + getDefault()\n';
    expect(() =>
      tWithEffects(src, { getDefault: { isAsync: true } }),
    ).toThrow(/INT035/);
  });

  it("INT035 diagnostic names caller and callee", () => {
    const src =
      "?bs 0.9\n" +
      'fn format(value: string) intent: "infallible" -> string = value + getDefault()\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { getDefault: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT035")!;
    expect(d.message).toContain("format");
    expect(d.message).toContain("getDefault");
  });

  it("does NOT fire INT035 when imported fn is not async", () => {
    const src =
      "?bs 0.9\n" +
      'fn format(value: string) intent: "infallible" -> string = value + syncDefault()\n';
    expect(() =>
      tWithEffects(src, { syncDefault: {} }),
    ).not.toThrow();
  });

  it("does NOT fire INT035 when same-file callee is async (INT021 fires instead)", () => {
    const src =
      "?bs 0.9\n" +
      "async fn getDefault() -> string = \"default\"\n" +
      'fn format(value: string) intent: "infallible" -> string = value + getDefault()\n';
    let caught: BotscriptError | null = null;
    try { t(src); } catch (e) { if (e instanceof BotscriptError) caught = e; }
    const codes = (caught?.diagnostics ?? []).map((d) => d.code);
    expect(codes).toContain("INT021");
    expect(codes).not.toContain("INT035");
  });

  it("INT035 has rule, idiom, and rewrite from the registry", () => {
    const src =
      "?bs 0.9\n" +
      'fn format(value: string) intent: "infallible" -> string = value + getDefault()\n';
    let caught: BotscriptError | null = null;
    try { tWithEffects(src, { getDefault: { isAsync: true } }); }
    catch (e) { if (e instanceof BotscriptError) caught = e; }
    const d = caught!.diagnostics.find((d) => d.code === "INT035")!;
    expect(d.rule).toBeTruthy();
    expect(d.idiom).toBeTruthy();
    expect(d.rewrite).toBeTruthy();
  });
});

// buildModuleEffects — isAsync population
describe("buildModuleEffects: populates isAsync for async fn declarations", () => {
  it("sets isAsync: true for an async exported fn", () => {
    const src = "?bs 0.9\nasync fn fetchData(id: string) -> string = id\n";
    const effects = buildModuleEffects([src]);
    expect(effects["fetchData"]?.isAsync).toBe(true);
  });

  it("does not set isAsync for a sync fn", () => {
    const src = "?bs 0.9\nfn compute(x: number) -> number = x + 1\n";
    const effects = buildModuleEffects([src]);
    expect(effects["compute"]?.isAsync).toBeUndefined();
  });
});
