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
