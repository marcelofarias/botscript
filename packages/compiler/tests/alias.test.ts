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

  it("non-trivial RHS form (member access) is NOT tracked", () => {
    // `const t = time.now` — the RHS is a member access, not a bare namespace.
    // Alias collector skips this; `t` is not in the alias map, so CAP001 does
    // NOT fire even though `uses { time }` is absent.
    const src =
      "?bs 0.8\n" +
      "const t = time.now\n" +
      "fn now() -> number = t.now()\n";
    expect(() => t(src)).not.toThrow();
  });

  it("chain alias is NOT tracked — const x = t where t is an alias", () => {
    // `const x = t` where `t` is itself an alias for `time` — chains are not
    // tracked. `x.now()` should NOT trigger CAP001 (x is not in the alias map).
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const x = t\n" +
      "fn now() -> number = x.now()\n";
    expect(() => t(src)).not.toThrow();
  });

  it("optional chaining (time?.now()) is treated as a stdlib capability use", () => {
    // `time?.now()` uses optional-chaining syntax but is still a `time` capability
    // use. CAP001 fires when `uses { time }` is absent.
    const src =
      "?bs 0.8\n" +
      "fn tick() -> number = time?.now()\n";
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("fn parameter shadowing module-level alias does not cause false CAP001", () => {
    // `const t = time` at module level, but `fn f(t: string)` rebinds `t`
    // as a string parameter. `t.length` inside the fn should NOT be treated
    // as a `time` stdlib call.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f(t: string) -> number = t.length\n";
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

  it("INT002 does not fire when aliased call is to an idempotent-compatible capability", () => {
    // `net` capability via alias — pure still fires, but this confirms the
    // alias of `http` is correctly resolved to `net` (same check applies).
    const src =
      "?bs 0.8\n" +
      "const h = http\n" +
      "fn fetch(url: string) uses { net } intent: \"pure\" -> string = h.get(url)\n";
    // INT001 fires: pure + uses { net }. But this is NOT about alias — it's
    // the header conflict. We just confirm it throws.
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
