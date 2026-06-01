/**
 * Tests for VER001 / VER002 / VER003: unenforced annotations below their
 * enforcement floors.
 *
 * All three codes are warnings (non-blocking). Compilation succeeds; warnings
 * are returned in TransformResult.warnings.
 *
 *   VER001  reads {} / writes {} present but DEP001/DEP002 is not enforced
 *           (file pinned below ?bs 0.9).
 *   VER002  throws {} present but THR001 is not enforced (file pinned
 *           below ?bs 0.9).
 *   VER003  intent: "..." present but INT001–INT005 is not enforced (file
 *           pinned below ?bs 0.7).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

// ---------------------------------------------------------------------------
// VER001 — reads / writes unenforced
// ---------------------------------------------------------------------------

describe("VER001: fires as a warning for reads/writes below 0.9", () => {
  it("emits VER001 for non-empty reads at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) reads { db } -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toMatch(/loadUser/);
    expect(warns[0]!.message).toMatch(/reads \{ db \}/);
    expect(warns[0]!.message).toMatch(/0\.8/);
    expect(warns[0]!.message).toMatch(/DEP001\/DEP002/);
    expect(warns[0]!.message).toMatch(/unenforced/);
  });

  it("emits VER001 for non-empty writes at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn saveUser(id: string) writes { db } -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toMatch(/writes \{ db \}/);
  });

  it("includes both reads and writes in message when both present", () => {
    const src =
      "?bs 0.8\n" +
      "fn syncUser(id: string) reads { cache } writes { db } -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toMatch(/reads \{ cache \}/);
    expect(warns[0]!.message).toMatch(/writes \{ db \}/);
  });

  it("does not throw — compilation succeeds", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) reads { db } -> string {\n" +
      "  id\n" +
      "}\n";
    expect(() => transform(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// VER002 — throws unenforced
// ---------------------------------------------------------------------------

describe("VER002: fires as a warning for throws below 0.9", () => {
  it("emits VER002 for non-empty throws at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) throws { NetworkError } -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER002");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toMatch(/loadUser/);
    expect(warns[0]!.message).toMatch(/throws \{ NetworkError \}/);
    expect(warns[0]!.message).toMatch(/0\.8/);
    expect(warns[0]!.message).toMatch(/THR001/);
    expect(warns[0]!.message).toMatch(/unenforced/);
  });

  it("does not throw — compilation succeeds", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) throws { NetworkError } -> string {\n" +
      "  id\n" +
      "}\n";
    expect(() => transform(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Both VER001 and VER002 together
// ---------------------------------------------------------------------------

describe("VER001 + VER002: fires both when fn has reads/writes and throws", () => {
  it("emits both warnings for a fn with reads and throws", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) reads { db } throws { NetworkError } -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const v1 = result.warnings.filter((w) => w.code === "VER001");
    const v2 = result.warnings.filter((w) => w.code === "VER002");
    expect(v1).toHaveLength(1);
    expect(v2).toHaveLength(1);
  });

  it("fires one warning per fn, one fn per code", () => {
    const src =
      "?bs 0.8\n" +
      "fn fnA(x: string) reads { db } -> string {\n" +
      "  x\n" +
      "}\n" +
      "fn fnB(x: string) throws { NetworkError } -> string {\n" +
      "  x\n" +
      "}\n";
    const result = transform(src);
    const v1 = result.warnings.filter((w) => w.code === "VER001");
    const v2 = result.warnings.filter((w) => w.code === "VER002");
    expect(v1).toHaveLength(1);
    expect(v1[0]!.message).toMatch(/fnA/);
    expect(v2).toHaveLength(1);
    expect(v2[0]!.message).toMatch(/fnB/);
  });
});

// ---------------------------------------------------------------------------
// Empty clauses — no false positives
// ---------------------------------------------------------------------------

describe("VER001 / VER002: empty clauses do not fire", () => {
  it("does not warn for empty reads at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) reads {} -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001");
    expect(warns).toHaveLength(0);
  });

  it("does not warn for empty writes at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn saveUser(id: string) writes {} -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001");
    expect(warns).toHaveLength(0);
  });

  it("does not warn for empty throws at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) throws {} -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER002");
    expect(warns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Version gate — silent at ?bs 0.9+
// ---------------------------------------------------------------------------

describe("VER001 / VER002: silent at ?bs 0.9", () => {
  it("does not warn for reads at ?bs 0.9 (enforcement is active)", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) reads { db } -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001" || w.code === "VER002");
    expect(warns).toHaveLength(0);
  });

  it("does not warn for throws at ?bs 0.9 (enforcement is active)", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) throws { NetworkError } -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001" || w.code === "VER002");
    expect(warns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Nested fn declarations
// ---------------------------------------------------------------------------

describe("VER001 / VER002: warns on nested fn declarations", () => {
  it("emits VER001 for nested fn with reads below 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn outer(id: string) -> string {\n" +
      "  fn inner(x: string) reads { db } -> string { x }\n" +
      "  inner(id)\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toMatch(/inner/);
    expect(warns[0]!.message).toMatch(/reads \{ db \}/);
  });

  it("emits VER002 for nested fn with throws below 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn outer(id: string) -> string {\n" +
      "  fn inner(x: string) throws { NetworkError } -> string { x }\n" +
      "  inner(id)\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER002");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toMatch(/inner/);
    expect(warns[0]!.message).toMatch(/throws \{ NetworkError \}/);
  });
});

// ---------------------------------------------------------------------------
// No false positives for fns without effect annotations
// ---------------------------------------------------------------------------

describe("VER001 / VER002: no false positives", () => {
  it("does not warn for plain fn at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn add(a: number, b: number) -> number = pure { a + b }\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001" || w.code === "VER002");
    expect(warns).toHaveLength(0);
  });

  it("does not warn for fn with only uses clause at ?bs 0.8", () => {
    const src =
      "?bs 0.8\n" +
      "fn fetch(url: string) uses { net } -> string {\n" +
      "  http.get(url)\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER001" || w.code === "VER002");
    expect(warns).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// VER003 — intent: unenforced
// ---------------------------------------------------------------------------

describe("VER003: fires as a warning for intent: below 0.7", () => {
  it("emits VER003 for intent: \"pure\" at ?bs 0.6", () => {
    const src =
      "?bs 0.6\n" +
      "fn slug(s: string) intent: \"pure\" -> string {\n" +
      "  s\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER003");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.severity).toBe("warning");
    expect(warns[0]!.message).toMatch(/slug/);
    expect(warns[0]!.message).toMatch(/intent: "pure"/);
    expect(warns[0]!.message).toMatch(/0\.6/);
    expect(warns[0]!.message).toMatch(/INT001/);
    expect(warns[0]!.message).toMatch(/unenforced/);
  });

  it("emits VER003 for intent: \"idempotent\" at ?bs 0.6", () => {
    const src =
      "?bs 0.6\n" +
      "fn doWork(id: string) intent: \"idempotent\" -> string {\n" +
      "  id\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER003");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toMatch(/idempotent/);
  });

  it("does not throw — compilation succeeds", () => {
    const src =
      "?bs 0.6\n" +
      "fn slug(s: string) intent: \"pure\" -> string {\n" +
      "  s\n" +
      "}\n";
    expect(() => transform(src)).not.toThrow();
  });

  it("fires one warning per fn with intent:", () => {
    const src =
      "?bs 0.6\n" +
      "fn fnA(x: string) intent: \"pure\" -> string { x }\n" +
      "fn fnB(x: string) intent: \"idempotent\" -> string { x }\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER003");
    expect(warns).toHaveLength(2);
    const names = warns.map((w) => w.message).join(" ");
    expect(names).toMatch(/fnA/);
    expect(names).toMatch(/fnB/);
  });

  it("does NOT fire at ?bs 0.7 — enforcement is active", () => {
    const src =
      "?bs 0.7\n" +
      "fn slug(s: string) intent: \"pure\" -> string {\n" +
      "  s\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER003");
    expect(warns).toHaveLength(0);
  });

  it("does NOT fire for fn without intent: at ?bs 0.6", () => {
    const src =
      "?bs 0.6\n" +
      "fn add(a: number, b: number) -> number = pure { a + b }\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER003");
    expect(warns).toHaveLength(0);
  });

  it("fires for nested fn with intent: below 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn outer(id: string) -> string {\n" +
      "  fn inner(x: string) intent: \"pure\" -> string { x }\n" +
      "  inner(id)\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER003");
    expect(warns).toHaveLength(1);
    expect(warns[0]!.message).toMatch(/inner/);
  });
});

// ---------------------------------------------------------------------------
// VER003 is silent at ?bs 0.8 — VER001/VER002 can still fire below 0.9
// ---------------------------------------------------------------------------

describe("VER003: silent at ?bs 0.8 (enforcement floor is 0.7, not 0.9)", () => {
  it("does not fire VER003 at ?bs 0.8 — intent is enforced at 0.7+", () => {
    const src =
      "?bs 0.8\n" +
      "fn slug(s: string) intent: \"pure\" -> string {\n" +
      "  s\n" +
      "}\n";
    const result = transform(src);
    const warns = result.warnings.filter((w) => w.code === "VER003");
    expect(warns).toHaveLength(0);
  });
});
