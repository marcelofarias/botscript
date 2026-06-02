/**
 * Tests for ALI001: stdlib namespace aliased via a non-trivial expression.
 *
 * ALI001 is a warning (non-blocking) that fires when a module-level const
 * binding has a stdlib namespace identifier anywhere in the RHS but the form
 * is non-trivial — static alias tracking is NOT guaranteed.
 *
 * Gated on ?bs 0.8.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

// ---------------------------------------------------------------------------
// ALI001 fires on non-trivial RHS forms
// ---------------------------------------------------------------------------

describe("ALI001: fires on non-trivial RHS forms", () => {
  it("fires for member access on RHS (time.now)", () => {
    const src = "?bs 0.8\nconst t = time.now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toContain("time");
    expect(warns[0]!.message).toContain("non-trivial");
  });

  it("fires for operator expression on RHS (time + 1)", () => {
    const src = "?bs 0.8\nconst t = time + 1\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toContain("time");
  });

  it("fires for call expression on RHS (time())", () => {
    const src = "?bs 0.8\nconst t = time()\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toContain("time");
  });

  it("warning message contains the alias name and stdlib name", () => {
    const src = "?bs 0.8\nconst myAlias = time.now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("myAlias");
    expect(warns[0]!.message).toContain("time");
    expect(warns[0]!.message).toMatch(/const myAlias = time/);
  });

  it("warning is non-blocking — compilation succeeds", () => {
    const src = "?bs 0.8\nconst t = time.now\n";
    expect(() => transform(src)).not.toThrow();
  });

  it("fires for parenthesized non-trivial form (const t = (time.now))", () => {
    // `(time.now)` inside parens still names a member, not the namespace —
    // ALI001 must fire even with the outer parens.
    const src = "?bs 0.8\nconst t = (time.now)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toContain("time");
  });

  it("fires for doubly-nested paren form with continuation (const t = ((time)).now)", () => {
    // `((time))` is tracked, but `.now` makes the full RHS non-trivial —
    // collectStdlibAliases rejects it (non-clean end-of-statement) and
    // collectAliasWarningCandidates emits ALI001.
    const src = "?bs 0.8\nconst t = ((time)).now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("fires for deeply-nested parens with non-trivial inner content (const t = (((time) + 1)))", () => {
    // `((time) + 1)` — the inner `(time)` doesn't fill the middle paren.
    // isParenWrappedStdlib correctly returns null; ALI001 fires.
    const src = "?bs 0.8\nconst t = (((time) + 1))\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });
});

// ---------------------------------------------------------------------------
// ALI001 does NOT fire on trivially-tracked or unrelated forms
// ---------------------------------------------------------------------------

describe("ALI001: does NOT fire on trivial or unrelated bindings", () => {
  it("does not fire for direct binding (const t = time)", () => {
    const src = "?bs 0.8\nconst t = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(0);
  });

  it("does not fire for parenthesized direct binding (const t = (time))", () => {
    const src = "?bs 0.8\nconst t = (time)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(0);
  });

  it("does not fire for type-annotated direct binding (const t: any = time)", () => {
    const src = "?bs 0.8\nconst t: any = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(0);
  });

  it("does not fire when RHS does not start with a stdlib ident (const t = 42)", () => {
    const src = "?bs 0.8\nconst t = 42\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(0);
  });

  it("fires for ternary where stdlib appears as non-leading RHS token (const t = flag ? time : null)", () => {
    // `time` is in the RHS but not the first token — alias is untracked, ALI001 fires.
    const src = "?bs 0.8\nconst t = flag ? time : null\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("fires for parenthesized ternary containing stdlib (const t = (flag ? time : null))", () => {
    // Paren wraps a ternary with stdlib in the non-leading position — ALI001 fires.
    const src = "?bs 0.8\nconst t = (flag ? time : null)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("fires for doubly-parenthesized ternary containing stdlib (const t = ((flag ? time : null)))", () => {
    // Double-paren wrapping a ternary — stdlib appears inside, ALI001 fires.
    const src = "?bs 0.8\nconst t = ((flag ? time : null))\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("does NOT fire for trivially double-parenthesized stdlib (const t = ((time)))", () => {
    // `((time))` is trivially double-grouped — equivalent to `(time)`.
    // It should be treated as a tracked alias, not an ALI001 warning.
    const src = "?bs 0.8\nconst t = ((time))\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(0);
  });

  it("DOES fire for doubly-parenthesized member access (const t = ((time.now)))", () => {
    // `((time.now))` is NOT a trivial grouping — it wraps a member expression.
    // ALI001 must fire because this is a non-trivial form.
    const src = "?bs 0.8\nconst t = ((time.now))\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("DOES fire for doubly-parenthesized operator expression (const t = ((time + 1)))", () => {
    // `((time + 1))` is a non-trivial expression — ALI001 must fire.
    const src = "?bs 0.8\nconst t = ((time + 1))\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("DOES fire when inner (stdlib) is followed by more content in outer parens (const t = ((time) + 1))", () => {
    // Inner `(time)` is trivially tracked, but the outer parens contain more —
    // `((time) + 1)` must fire ALI001, not be silently treated as tracked.
    const src = "?bs 0.8\nconst t = ((time) + 1)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("DOES fire when inner (stdlib) is followed by member access in outer parens (const t = ((time).now))", () => {
    // `((time).now)` — inner parens trivially wrap `time` but outer wraps a
    // member expression; must fire ALI001.
    const src = "?bs 0.8\nconst t = ((time).now)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toContain("time");
  });
});

// ---------------------------------------------------------------------------
// Version gate — silent below ?bs 0.8
// ---------------------------------------------------------------------------

describe("ALI001: version gate", () => {
  it("does not fire below ?bs 0.8", () => {
    const src = "?bs 0.7\nconst t = time.now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(0);
  });

  it("fires at exactly ?bs 0.8", () => {
    const src = "?bs 0.8\nconst t = time.now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
  });

  it("fires at ?bs 0.9", () => {
    const src = "?bs 0.9\nconst t = time.now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Warning fields
// ---------------------------------------------------------------------------

describe("ALI001: warning fields", () => {
  it("has rule, idiom, and rewrite fields from the error code registry", () => {
    const src = "?bs 0.8\nconst t = time.now\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI001")!;
    expect(warn.rule).toBeTruthy();
    expect(warn.idiom).toBeTruthy();
    expect(warn.rewrite).toBeTruthy();
  });

  it("has a start offset pointing to the const keyword", () => {
    const src = "?bs 0.8\nconst t = time.now\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI001")!;
    // After the version directive is stripped, const appears at offset 0
    expect(typeof warn.start).toBe("number");
    expect(warn.start).toBeGreaterThanOrEqual(0);
  });

  it("end offset covers the full RHS expression, not just the first non-trivial token", () => {
    // For `const t = time.now`, the range must span the full binding (18 chars),
    // not stop at the `.` between `time` and `now`.
    const src = "?bs 0.8\nconst t = time.now\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI001")!;
    expect(warn.end).toBeGreaterThan(warn.start);
    // "const t = time.now" is 18 chars; the range must be at least that wide
    expect(warn.end - warn.start).toBeGreaterThanOrEqual(18);
  });
});

// ---------------------------------------------------------------------------
// ALI002: alias-of-alias chain warnings
// ---------------------------------------------------------------------------

describe("ALI002: fires on alias-of-alias chains", () => {
  it("fires when const x = t and t is a tracked stdlib alias", () => {
    // `const t = time` tracked; `const x = t` is a chain alias — ALI002 fires.
    const src = "?bs 0.8\nconst t = time\nconst x = t\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toContain("x");
    expect(warns[0]!.message).toContain("t");
    expect(warns[0]!.message).toContain("time");
    expect(warns[0]!.message).toContain("chain");
  });

  it("message contains the chain alias name, the intermediate alias, and the canonical stdlib name", () => {
    const src = "?bs 0.8\nconst rng = random\nconst myRng = rng\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI002")!;
    expect(warn.message).toContain("myRng");
    expect(warn.message).toContain("rng");
    expect(warn.message).toContain("random");
    expect(warn.message).toMatch(/const myRng = random/);
  });

  it("warning is non-blocking — compilation succeeds", () => {
    const src = "?bs 0.8\nconst t = time\nconst x = t\n";
    expect(() => transform(src)).not.toThrow();
  });

  it("does not fire when the RHS is a direct stdlib name (const x = time)", () => {
    // Direct binding — ALI001 would not fire, and ALI002 should not either.
    const src = "?bs 0.8\nconst x = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(0);
  });

  it("does not fire when const x = t and t is not a tracked alias", () => {
    // `t` is not in the alias map (it was not `const t = <stdlib>`).
    const src = "?bs 0.8\nconst t = 42\nconst x = t\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(0);
  });

  it("does not fire when const x = t is inside a fn body (not module scope)", () => {
    // Chain alias inside fn body — not at module scope, so ALI002 does not fire.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "fn f() -> number {\n" +
      "  const x = t\n" +
      "  return x.now()\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(0);
  });

  it("both ALI002 and ALI001 can fire in the same file", () => {
    // `const t = time` (tracked), `const x = t` (ALI002), `const y = time.now` (ALI001).
    const src = "?bs 0.8\nconst t = time\nconst x = t\nconst y = time.now\n";
    const result = transform(src);
    const ali001 = result.warnings.filter((w) => w.code === "ALI001");
    const ali002 = result.warnings.filter((w) => w.code === "ALI002");
    expect(ali001).toHaveLength(1);
    expect(ali002).toHaveLength(1);
  });

  it("does not fire below ?bs 0.8 (version gate)", () => {
    const src = "?bs 0.7\nconst t = time\nconst x = t\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(0);
  });

  it("has rule, idiom, and rewrite fields from the error code registry", () => {
    const src = "?bs 0.8\nconst t = time\nconst x = t\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI002")!;
    expect(warn.rule).toBeTruthy();
    expect(warn.idiom).toBeTruthy();
    expect(warn.rewrite).toBeTruthy();
  });

  it("ALI002 fires for type-annotated chain alias `const x: any = t`", () => {
    // `const x: any = t` where `t` is a tracked stdlib alias must still warn.
    // The type annotation should not let the chain slip past ALI002.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const x: any = t\n" +
      "fn now() uses { time } -> number = t.now()\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("x");
    expect(warns[0]!.message).toContain("t");
  });

  it("ALI002 fires for parenthesized chain alias `const x = (t)`", () => {
    // `const x = (t)` where `t` is a tracked stdlib alias must warn.
    // Trivial paren grouping is the same form as the direct binding.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const x = (t)\n" +
      "fn now() uses { time } -> number = t.now()\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("x");
  });

  it("ALI002 does NOT fire on `const x = time` when `const time = time` is in the file", () => {
    // `const time = time` is a no-op binding whose alias name is itself a stdlib
    // canonical name. collectStdlibAliases must skip it so it doesn't pollute the
    // alias map, and ALI002 must not fire on a legitimate direct binding `const x = time`.
    const src =
      "?bs 0.8\n" +
      "const time = time\n" +
      "const x = time\n" +
      "fn now() uses { time } -> number = x.now()\n";
    const result = transform(src);
    const ali002 = result.warnings.filter((w) => w.code === "ALI002");
    expect(ali002).toHaveLength(0);
  });

  it("ALI002 fires for doubly-parenthesized chain alias `const x = ((t))`", () => {
    // `const x = ((t))` where `t` is a tracked stdlib alias — double paren wrapping
    // is trivial and must still be recognized as a chain alias that fires ALI002.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const x = ((t))\n" +
      "fn now() uses { time } -> number = t.now()\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("x");
    expect(warns[0]!.message).toContain("t");
  });

  it("ALI002 fires for triply-parenthesized chain alias `const x = (((t)))`", () => {
    // Triple paren wrapping must also be recursively unwrapped.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const x = (((t)))\n" +
      "fn now() uses { time } -> number = t.now()\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("x");
  });

  it("ALI002 does NOT fire for `const x = ((nonAlias))`", () => {
    // `nonAlias` is not a tracked stdlib alias, so even with double parens,
    // no ALI002 should fire.
    const src =
      "?bs 0.8\n" +
      "const x = ((nonAlias))\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(0);
  });

  it("ALI002 does NOT fire for `const x = ((t) + 1)` — outer parens contain more than the alias", () => {
    // `((t) + 1)` is not a trivial alias of `t` — the outer parens contain more.
    // This was a false positive before the unwrapParenToIdent outer-content check.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const x = ((t) + 1)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(0);
  });

  it("ALI002 does NOT fire for `const x = ((t).now)` — outer parens contain a member expression", () => {
    // `((t).now)` is a member expression, not a chain alias.
    const src =
      "?bs 0.8\n" +
      "const t = time\n" +
      "const x = ((t).now)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI002");
    expect(warns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ALI003: stdlib namespace destructuring
// ---------------------------------------------------------------------------

describe("ALI003 — stdlib namespace destructuring (?bs 0.8)", () => {
  it("ALI003 fires for `const { now } = time`", () => {
    const src = "?bs 0.8\nconst { now } = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("ALI003 fires for `const { get, post } = http`", () => {
    const src = "?bs 0.8\nconst { get, post } = http\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("http");
  });

  it("ALI003 fires for `const { next } = random`", () => {
    const src = "?bs 0.8\nconst { next } = random\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBeGreaterThanOrEqual(1);
  });

  it("ALI003 does NOT fire below ?bs 0.8", () => {
    const src = "?bs 0.7\nconst { now } = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns).toHaveLength(0);
  });

  it("ALI003 does NOT fire for plain namespace alias `const t = time`", () => {
    const src = "?bs 0.8\nconst t = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns).toHaveLength(0);
  });

  it("ALI003 does NOT fire for array destructuring `const [a, b] = someArray`", () => {
    const src = "?bs 0.8\nconst [a, b] = someArray\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns).toHaveLength(0);
  });

  it("ALI003 does NOT fire for object destructuring from a non-stdlib ident", () => {
    const src = "?bs 0.8\nconst { x } = myObj\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns).toHaveLength(0);
  });

  it("ALI003 does NOT fire when destructuring is inside a fn body", () => {
    const src =
      "?bs 0.8\n" +
      "fn f() -> number {\n" +
      "  const { now } = time\n" +
      "  return now()\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns).toHaveLength(0);
  });

  it("ALI003 warning has correct code, severity, and message fields", () => {
    const src = "?bs 0.8\nconst { now } = time\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI003");
    expect(warn).toBeDefined();
    expect(warn!.severity).toBe("warning");
    expect(warn!.message).toContain("time");
    expect(warn!.rule).toBeTruthy();
    expect(warn!.idiom).toBeTruthy();
    expect(warn!.rewrite).toBeTruthy();
  });

  it("ALI003 and ALI001 can co-fire in the same file", () => {
    const src =
      "?bs 0.8\n" +
      "const { now } = time\n" +
      "const t = time.method\n";
    const result = transform(src);
    const ali003 = result.warnings.filter((w) => w.code === "ALI003");
    const ali001 = result.warnings.filter((w) => w.code === "ALI001");
    expect(ali003.length).toBeGreaterThanOrEqual(1);
    expect(ali001.length).toBeGreaterThanOrEqual(1);
  });

  it("ALI003 fires for paren-wrapped RHS `const { now } = (time)`", () => {
    const src = "?bs 0.8\nconst { now } = (time)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBe(1);
    expect(warns[0]?.message).toContain("time");
  });

  it("ALI003 fires for type-annotated destructuring `const { now }: any = time`", () => {
    const src = "?bs 0.8\nconst { now }: any = time\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBe(1);
    expect(warns[0]?.message).toContain("time");
  });

  it("ALI003 fires for type-annotated destructuring with paren-wrapped RHS", () => {
    const src = "?bs 0.8\nconst { now }: any = (time)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBe(1);
    expect(warns[0]?.message).toContain("time");
  });

  it("ALI003 fires when RHS is a tracked stdlib alias (`const t = time; const { now } = t`)", () => {
    // t is a tracked alias for time; destructuring t extracts the same untracked
    // member reference. ALI003 should fire with the canonical stdlib name 'time'.
    const src = "?bs 0.8\nconst t = time\nconst { now } = t\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]?.message).toContain("time");
  });

  it("ALI003 fires when RHS is a paren-wrapped tracked alias (`const t = time; const { now } = (t)`)", () => {
    // Same as above but the alias is trivially parenthesized on the RHS.
    const src = "?bs 0.8\nconst t = time\nconst { now } = (t)\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI003");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]?.message).toContain("time");
  });
});

// ---------------------------------------------------------------------------
// ALI001 via tracked alias (alias bypass)
// ---------------------------------------------------------------------------

describe("ALI001: fires when leading RHS ident is a tracked alias", () => {
  it("fires for `const now = t.now` when t is a tracked alias for time", () => {
    // `const t = time` is tracked; `const now = t.now` extracts a bare member
    // reference via the alias — ALI001 fires with the canonical stdlib name.
    const src = "?bs 0.8\nconst t = time\nconst now = t.now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("fires for `const f = (t).now` when t is a tracked alias", () => {
    // Paren-wrapped alias followed by member access — same bypass, must warn.
    const src = "?bs 0.8\nconst t = time\nconst f = (t).now\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns.length).toBeGreaterThanOrEqual(1);
    expect(warns[0]!.message).toContain("time");
  });

  it("does NOT fire for `const x = t` (trivial alias chain — caught by ALI002 instead)", () => {
    // Direct chain alias: ALI002 handles this, ALI001 must not double-warn.
    const src = "?bs 0.8\nconst t = time\nconst x = t\n";
    const result = transform(src);
    const ali001 = result.warnings.filter((w) => w.code === "ALI001");
    expect(ali001).toHaveLength(0);
  });

  it("does NOT fire for `const now = t.now` when t is NOT a tracked alias", () => {
    // `t` is an arbitrary ident, not a stdlib alias — no ALI001 false positive.
    const src = "?bs 0.8\nconst t = 42\nconst now = t.now\n";
    const result = transform(src);
    const ali001 = result.warnings.filter((w) => w.code === "ALI001");
    expect(ali001).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ALI002 false-positive fix: skip when binding name is canonical stdlib
// ---------------------------------------------------------------------------

describe("ALI002: does NOT fire when binding name is itself a canonical stdlib namespace", () => {
  it("does NOT fire for `const time = t` when t is a tracked alias for time", () => {
    // Re-binding a canonical stdlib name — `time.member()` is still a tracked
    // tripwire, so ALI002 would be misleading and must not fire.
    const src = "?bs 0.8\nconst t = time\nconst time = t\n";
    const result = transform(src);
    const ali002 = result.warnings.filter((w) => w.code === "ALI002");
    expect(ali002).toHaveLength(0);
  });

  it("does NOT fire for `const random = t` when t is a tracked alias for random", () => {
    const src = "?bs 0.8\nconst t = random\nconst random = t\n";
    const result = transform(src);
    const ali002 = result.warnings.filter((w) => w.code === "ALI002");
    expect(ali002).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// ALI001 range: non-leading RHS extends to end of statement
// ---------------------------------------------------------------------------

describe("ALI001 range: non-leading and paren-wrapped non-leading RHS", () => {
  it("range covers full ternary `const x = flag ? time : null`", () => {
    const src = "?bs 0.8\nconst x = flag ? time : null\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI001")!;
    expect(warn).toBeDefined();
    // Range must extend past `time` to cover ` : null`
    const binding = "const x = flag ? time : null";
    expect(warn.end - warn.start).toBeGreaterThanOrEqual(binding.length);
  });

  it("range covers full paren-wrapped ternary `const x = (flag ? time : null)`", () => {
    const src = "?bs 0.8\nconst x = (flag ? time : null)\n";
    const result = transform(src);
    const warn = result.warnings.find((w) => w.code === "ALI001")!;
    expect(warn).toBeDefined();
    const binding = "const x = (flag ? time : null)";
    expect(warn.end - warn.start).toBeGreaterThanOrEqual(binding.length);
  });
});
