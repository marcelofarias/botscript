/**
 * Tests for ALI001: stdlib namespace aliased via a non-trivial expression.
 *
 * ALI001 is a warning (non-blocking) that fires when a module-level const
 * binding has a stdlib namespace identifier as the first token of the RHS,
 * but the form is non-trivial — static alias tracking is NOT guaranteed.
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
    // `((time))` is not tracked (only single-paren grouping is), and `.now`
    // makes it non-trivial — ALI001 should fire to flag the untracked form.
    const src = "?bs 0.8\nconst t = ((time)).now\n";
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

  it("does not fire for ternary where first token is non-stdlib (const t = flag ? time : null)", () => {
    const src = "?bs 0.8\nconst t = flag ? time : null\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "ALI001");
    expect(warns).toHaveLength(0);
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
});
