/**
 * Tests for module-level stdlib alias tracking (?bs 0.8+).
 *
 * A module-level `const t = time` makes `t.now()` equivalent to `time.now()`
 * for all static checks (cap-check, intent-check, uns-check). This prevents
 * the one-liner escape: `const rand = random` bypassing intent or capability
 * enforcement.
 *
 * Alias tracking is gated on ?bs 0.8. Earlier pins are unaffected.
 * Only direct top-level `const <alias> = <stdlib>` bindings are tracked.
 * Non-trivial RHS forms (member access, calls, ternaries) are ignored.
 */

import { describe, expect, it } from "vitest";

import { CapabilityCheckError, transform } from "../src/index.js";
import { collectStdlibAliases } from "../src/passes/_alias.js";
import { lex } from "../src/parser/lex.js";

const t = (src: string) => transform(src).code;

// ---------------------------------------------------------------------------
// cap-check: CAP001 / CAP002 via alias
// ---------------------------------------------------------------------------

describe("stdlib alias tracking — cap-check (?bs 0.8)", () => {
  it("CAP001 fires when an aliased stdlib namespace is called without the capability declared", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn now() -> number = t.now()\n";
    expect(() => t(src)).toThrow(CapabilityCheckError);
    try {
      t(src);
    } catch (e) {
      const err = e as CapabilityCheckError;
      expect(err.capability).toBe("time");
      expect(err.message).toContain("t.now");
      expect(err.message).toContain("alias");
    }
  });

  it("CAP001 does not fire when the capability is declared and alias is used", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn now() uses { time } -> number = t.now()\n";
    expect(() => t(src)).not.toThrow();
  });

  it("CAP002 does not fire when alias provides the only use of a declared capability", () => {
    const src =
      "?bs 0.8\n" +
      "const h = http\n" +
      "fn fetch(url: string) uses { net } -> string = h.get(url)\n";
    expect(() => t(src)).not.toThrow();
  });

  it("CAP001 fires for alias of http (capability: net)", () => {
    const src =
      "?bs 0.8\n" +
      "const h = http\n" +
      "fn fetch(url: string) -> string = h.get(url)\n";
    expect(() => t(src)).toThrow(/CAP001/);
    expect(() => t(src)).toThrow(/net/);
  });

  it("CAP001 fires for alias of random", () => {
    const src =
      "?bs 0.8\n" +
      "const r = random\n" +
      "fn gen() -> number = r.next()\n";
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("CAP001 fires for alias of fs", () => {
    const src =
      "?bs 0.8\n" +
      "const f = fs\n" +
      "fn read(p: string) -> string = f.readFile(p)\n";
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("multiple aliases in the same file are all tracked", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const r = random\n" +
      "fn noDecl() -> number = t.now() + r.next()\n";
    // Both time and random are missing — at least one CAP001 fires.
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("CAP001 fires when direct stdlib is called via optional chaining without declared capability", () => {
    const src =
      "?bs 0.8\n" +
      "fn now() -> number = time?.now()\n";
    expect(() => t(src)).toThrow(CapabilityCheckError);
    try {
      t(src);
    } catch (e) {
      const err = e as CapabilityCheckError;
      expect(err.capability).toBe("time");
    }
  });

  it("CAP001 fires when aliased stdlib is called via optional chaining without declared capability", () => {
    const src =
      "?bs 0.8\n" +
      "const t2 = time\n" +
      "fn now() -> number = t2?.now()\n";
    expect(() => t(src)).toThrow(CapabilityCheckError);
    try {
      t(src);
    } catch (e) {
      const err = e as CapabilityCheckError;
      expect(err.capability).toBe("time");
    }
  });

  it("alias tracking is gated on ?bs 0.8 — earlier pins ignore aliases", () => {
    // On ?bs 0.7, alias tracking is off. `t.now()` is treated as an unknown
    // member call; the token `t` is not recognized as a stdlib namespace.
    // CAP001 does NOT fire because the direct-check pass doesn't see `time`.
    // (The strict check runs from 0.3, but alias resolution is 0.8+.)
    const src =
      "?bs 0.7\n" +
      "const t = time\n" +
      "fn now() -> number = t.now()\n";
    expect(() => t(src)).not.toThrow();
  });

  it("alias inside a fn body is NOT tracked (module-scope only)", () => {
    // `const t = time` inside the fn body is NOT a module-level alias —
    // the alias collector only looks at tokens outside all fn ranges.
    const src =
      "?bs 0.8\n" +
      "fn now() -> number {\n" +
      "  const t = time\n" +
      "  return t.now()\n" +
      "}\n";
    // t.now() inside the fn is not caught by alias tracking.
    // The direct body scan sees `t` as an ident, not `time` — no CAP001.
    expect(() => t(src)).not.toThrow();
  });

  it("trivial alias + declared capability: no error (alias tracked, cap present)", () => {
    // `const t = time` is a tracked alias; `t.now()` resolves to `time.now()`.
    // With `uses { time }` declared, neither CAP001 nor CAP002 fires.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn now() uses { time } -> number = t.now()\n";
    expect(() => t(src)).not.toThrow();
  });

  it("trivial alias with canonical call still works (alias tracked, capability present)", () => {
    // `const t = time` is a tracked alias; direct canonical call `time.now()`
    // with the capability declared is fine — no CAP001, no CAP002.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn uses_t(n: number) uses { time } -> number = time.now() + n\n";
    expect(() => t(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// intent-check: INT001 / INT002 via alias
// ---------------------------------------------------------------------------

describe("stdlib alias tracking — intent-check (?bs 0.8)", () => {
  it("INT002 fires when an aliased call violates pure intent", () => {
    // `const t = time` at module level; `fn ... intent: "pure" -> ... = t.now()`
    // Without alias tracking, t.now() is invisible to INT002. With 0.8, it's caught.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn elapsed() intent: \"pure\" -> number = t.now()\n";
    expect(() => t(src)).toThrow(/INT002/);
  });

  it("INT001 fires when fn with aliased net capability also declares pure intent (header conflict)", () => {
    // `net` capability via alias — alias is resolved to `net`, but INT001
    // fires because of the pure + uses { net } header conflict, not INT002.
    const src =
      "?bs 0.8\n" +
      "const h = http\n" +
      "fn fetch(url: string) uses { net } intent: \"pure\" -> string = h.get(url)\n";
    expect(() => t(src)).toThrow(/INT001/);
  });

  it("alias tracking for intent is gated on ?bs 0.8", () => {
    // On ?bs 0.7, alias bypass is undetected (tracking not active).
    const src =
      "?bs 0.7\n" +
      "const t = time\n" +
      "fn elapsed() intent: \"pure\" -> number = t.now()\n";
    expect(() => t(src)).not.toThrow();
  });

  it("INT002 fires when optional chaining `?.` is used with a canonical stdlib name (pure bypass)", () => {
    // `time?.now()` must be caught by INT002 — optional chaining is not an escape hatch.
    const src =
      "?bs 0.8\n" +
      "fn elapsed() intent: \"pure\" -> number = time?.now()\n";
    expect(() => t(src)).toThrow(/INT002/);
  });

  it("INT002 fires when optional chaining `?.` is used with a stdlib alias (pure bypass)", () => {
    // `const t = time; fn f() intent: "pure" -> ... = t?.now()`
    // Without `?.` support in findFirstCapabilityUse, t?.now() would bypass INT002.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn elapsed() intent: \"pure\" -> number = t?.now()\n";
    expect(() => t(src)).toThrow(/INT002/);
  });

  it("INT004 fires when optional chaining `?.` is used with a stdlib alias (idempotent bypass)", () => {
    // `const r = random; fn f() intent: "idempotent" -> ... = r?.next()`
    // Without `?.` support in findFirstCapabilityUse, r?.next() would bypass INT004.
    const src =
      "?bs 0.8\n" +
      "const r = random\n" +
      "fn token() intent: \"idempotent\" -> number = r?.next()\n";
    expect(() => t(src)).toThrow(/INT004/);
  });

  it("INT002 does NOT fire for `?.` on ?bs 0.7 — version-gate preserved", () => {
    // Optional-chaining detection is gated on ?bs 0.8. Earlier pins keep prior behavior.
    const src =
      "?bs 0.7\n" +
      "fn elapsed() intent: \"pure\" -> number = time?.now()\n";
    expect(() => t(src)).not.toThrow();
  });

  it("CAP001 does NOT fire for `?.` on ?bs 0.7 — version-gate preserved", () => {
    const src =
      "?bs 0.7\n" +
      "fn now() -> number = time?.now()\n";
    expect(() => t(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// uns-check: UNS005 via alias (?bs 0.9)
// ---------------------------------------------------------------------------

describe("stdlib alias tracking — uns-check (?bs 0.9)", () => {
  it("UNS005 fires when an aliased stdlib call lacks a result contract", () => {
    const src =
      "?bs 0.9\n" +
      "const h = http\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      "  const data = h.get(url)\n" +
      "  data\n" +
      "}\n";
    expect(() => t(src)).toThrow(/UNS005/);
  });

  it("UNS005 does not fire when aliased stdlib call is inside match", () => {
    const src =
      "?bs 0.9\n" +
      "const h = http\n" +
      "fn fetch(url: string) uses { net } -> Result<string, string> {\n" +
      "  match h.get(url) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(error)\n" +
      "  }\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// collectStdlibAliases unit tests — non-trivial RHS rejection
// ---------------------------------------------------------------------------

describe("collectStdlibAliases — non-trivial RHS forms are NOT tracked", () => {
  const aliases = (src: string) => collectStdlibAliases(lex(src));

  it("trivial binding is tracked", () => {
    expect(aliases("const t = time\n")).toEqual(new Map([["t", "time"]]));
  });

  it("operator expression on RHS is NOT tracked", () => {
    expect(aliases("const t = time + 1\n")).toEqual(new Map());
  });

  it("member access on RHS is NOT tracked", () => {
    expect(aliases("const t = time.now\n")).toEqual(new Map());
  });

  it("call expression on RHS is NOT tracked", () => {
    expect(aliases("const t = random()\n")).toEqual(new Map());
  });

  it("ternary on RHS is NOT tracked", () => {
    expect(aliases("const t = flag ? time : random\n")).toEqual(new Map());
  });

  it("parenthesized stdlib ident IS tracked (single-paren grouping)", () => {
    expect(aliases("const t = (time)\n")).toEqual(new Map([["t", "time"]]));
  });

  it("parenthesized form with semicolon IS tracked", () => {
    expect(aliases("const t = (random);")).toEqual(new Map([["t", "random"]]));
  });

  it("nested parens are tracked (multi-level paren grouping)", () => {
    // unwrapParenToIdent handles any depth, so `((time))`, `(((time)))` etc.
    // are all equivalent to `(time)` — trivially tracking the stdlib namespace.
    expect(aliases("const t = ((time))\n")).toEqual(new Map([["t", "time"]]));
  });

  it("triple-nested parens are tracked", () => {
    expect(aliases("const t = (((time)))\n")).toEqual(new Map([["t", "time"]]));
  });

  it("nested parens with non-trivial content are NOT tracked", () => {
    // Inner group `(time)` doesn't fill the outer paren — `+ 1` follows.
    expect(aliases("const t = ((time) + 1)\n")).toEqual(new Map());
  });

  it("paren with member access inside is NOT tracked", () => {
    expect(aliases("const t = (time.now)\n")).toEqual(new Map());
  });

  it("paren with expression inside is NOT tracked", () => {
    expect(aliases("const t = (time + 1)\n")).toEqual(new Map());
  });

  it("multiple trivial bindings are all tracked", () => {
    expect(aliases("const t = time\nconst r = random\n")).toEqual(
      new Map([
        ["t", "time"],
        ["r", "random"],
      ]),
    );
  });

  it("trivial binding at end of file (no trailing newline) IS tracked", () => {
    // lex() always appends an eof token; eof must be treated as a valid
    // statement terminator so a file-final alias binding is not silently dropped.
    expect(aliases("const t = time")).toEqual(new Map([["t", "time"]]));
  });

  it("trivial binding followed only by a line comment IS tracked", () => {
    expect(aliases("const t = time // use the alias\n")).toEqual(new Map([["t", "time"]]));
  });

  it("type-annotated binding IS tracked (const t: any = time)", () => {
    expect(aliases("const t: any = time\n")).toEqual(new Map([["t", "time"]]));
  });

  it("type-annotated binding with complex annotation IS tracked (const t: typeof time = time)", () => {
    expect(aliases("const t: typeof time = time\n")).toEqual(new Map([["t", "time"]]));
  });

  it("multi-line RHS split by newline: alias is the part before the newline", () => {
    // botscript newlines are explicit statement terminators (not JS ASI).
    // `const t = time\n.now` is two statements: `const t = time` (tracked)
    // and `.now` (a separate invalid expression). The alias is correctly `time`.
    expect(aliases("const t = time\n.now\n")).toEqual(new Map([["t", "time"]]));
  });
});

// ---------------------------------------------------------------------------
// Alias shadowing tests — module-level alias should not shadow fn params
// ---------------------------------------------------------------------------
describe("stdlib alias tracking — shadowing (fn param same name as module alias)", () => {
  it("fn param named same as module alias does NOT trigger false CAP001 via dot-member access", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn bad(t: string) -> number = t.length\n";
    // t.length — t is a fn param (string), not the time alias.
    // This MUST NOT fire CAP001 as a false positive.
    expect(() => t(src)).not.toThrow();
  });

  it("local const inside fn body named same as module alias does NOT trigger false CAP001", () => {
    // `const t = time` at module level, but fn body rebinds `t` as a local string.
    // `t.length` should NOT be treated as a `time` stdlib call.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f() -> number {\n" +
      "  const t = \"hello\"\n" +
      "  return t.length\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("local let inside fn body named same as module alias does NOT trigger false CAP001", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f() -> number {\n" +
      "  let t = \"hello\"\n" +
      "  return t.length\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("local var inside fn body named same as module alias does NOT trigger false CAP001", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f() -> number {\n" +
      "  var t = \"hello\"\n" +
      "  return t.length\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("object destructuring binding named same as module alias does NOT trigger false CAP001", () => {
    // `const { t } = obj` — `t` is a local binding, not the `time` alias.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(obj: any) -> number {\n" +
      "  const { t } = obj\n" +
      "  return t.length\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("object destructuring rename binding (`key: local`) named same as module alias does NOT trigger false CAP001", () => {
    // `const { foo: t } = obj` — local `t` shadows the `time` alias.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(obj: any) -> number {\n" +
      "  const { foo: t } = obj\n" +
      "  return t.length\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("array destructuring binding named same as module alias does NOT trigger false CAP001", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(arr: any) -> number {\n" +
      "  const [t] = arr\n" +
      "  return t.length\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("fn param named same as module alias with nested generic type (>>) does NOT trigger false CAP001", () => {
    // `fn f(t: Result<Result<number, string>, string>)` — the lexer emits `>>` as a
    // single operator token. fnParamNames must decrement depth by 2 so it correctly
    // identifies `t` as a param and not a module-level alias.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(t: Result<Result<number, string>, string>) -> number = t.length\n";
    expect(() => t(src)).not.toThrow();
  });

  it("fn param named same as module alias with array type ([]) does NOT trigger false CAP001", () => {
    // `[`/`]` are open/close tokens; fnParamNames must include them in depth tracking
    // so `t` in `fn f(t: string[])` is recognized as a param, not a module-level alias.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(t: string[]) -> number = t.length\n";
    expect(() => t(src)).not.toThrow();
  });

  it("canonical stdlib name locally rebound does NOT suppress capability detection (tripwire rule)", () => {
    const src =
      "?bs 0.8\n" +
      "fn f() -> number {\n" +
      "  const time = 42\n" +
      "  return time.now()\n" +
      "}\n";
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("canonical stdlib name as alias key at module scope is NOT collected (tripwire preserved)", () => {
    // `const time = random` — alias skipped because `time` is a canonical name.
    // The `time` tripwire still applies: `time.now()` counts as using the `time`
    // capability. With `capabilities: ["time"]` declared, no CAP001 fires.
    const src =
      "?bs 0.8\n" +
      "const time = random\n" +
      "fn f() capabilities: [\"time\"] -> number {\n" +
      "  return time.now()\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("canonical stdlib name as alias key — undeclared capability still fires CAP001", () => {
    // Without declaring any capability, `time.now()` still fires CAP001 via the
    // canonical `time` tripwire, regardless of the `const time = random` binding.
    const src =
      "?bs 0.8\n" +
      "const time = random\n" +
      "fn f() -> number {\n" +
      "  return time.now()\n" +
      "}\n";
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("const inside nested if-block does NOT suppress CAP001 for t.now() in outer fn scope", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(flag: boolean) -> number {\n" +
      "  if (flag) { const t = \"x\" }\n" +
      "  return t.now()\n" +
      "}\n";
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("nested destructuring binding named same as module alias does NOT trigger false CAP001", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(obj: any) -> number {\n" +
      "  const { foo: { t } } = obj\n" +
      "  return t.length\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("nested fn declaration named same as module alias does NOT trigger false CAP001", () => {
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn outer() -> number {\n" +
      "  fn t() -> number = 42\n" +
      "  return t()\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });
});
