/**
 * Tests for tagged-template bypass of alias SYN checks (SYN044/046/048/050/051/053/055).
 *
 * SYN057 guards eval/Function used directly as tagged-template tags (`eval\`code\``).
 * But when the dangerous global is first aliased to a local name and THEN used as a
 * tagged-template tag, SYN057 does not fire (it only matches the literal token). Before
 * this fix, `const e = eval; e\`code\`` produced no warning. The fix extends each alias
 * check's "is this a call?" predicate to also match `kind === "template"` — the same
 * token kind SYN057 uses for direct tagged templates.
 *
 * Each section corresponds to one alias SYN code extended:
 *   SYN044 — module-scope const/let/var alias
 *   SYN046 — module-scope destructuring rename alias
 *   SYN048 — fn-body-local const/let/var alias
 *   SYN050 — fn-body-local destructuring rename alias
 *   SYN051 — module-scope assignment-expression alias
 *   SYN053 — fn-body assignment-expression alias
 *   SYN055 — default-parameter alias
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

// ─── SYN044: module-scope const/let/var alias ─────────────────────────────────

describe("SYN044 — tagged-template bypass via module-scope alias", () => {
  it("fires on const e = eval; e`code` in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const e = eval\n" +
      "fn run(code: string) -> any {\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("fires on const F = Function; F`return 42`() in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const F = Function\n" +
      "fn build() -> any {\n" +
      "  return F`return 42`()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("fires on let e = eval; e`code` (let binding)", () => {
    const src =
      "?bs 0.7\n" +
      "let e = eval\n" +
      "fn run(code: string) -> any {\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("still fires on paren call (regression: paren call still caught)", () => {
    const src =
      "?bs 0.7\n" +
      "const e = eval\n" +
      "fn run(code: string) -> any {\n" +
      "  return e(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN044")).toBe(true);
  });

  it("does not fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "const e = eval\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "legacy" { e`${code}` }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN044")).toBe(false);
  });
});

// ─── SYN046: module-scope destructuring rename ────────────────────────────────

describe("SYN046 — tagged-template bypass via module-scope destructuring rename", () => {
  it("fires on const { eval: e } = globalThis; e`code` in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const { eval: e } = globalThis\n" +
      "fn run(code: string) -> any {\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN046")).toBe(true);
  });

  it("fires on const { Function: F } = globalThis; F`body`() in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "const { Function: F } = globalThis\n" +
      "fn build() -> any {\n" +
      "  return F`return 42`()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN046")).toBe(true);
  });
});

// ─── SYN048: fn-body-local const/let/var alias ────────────────────────────────

describe("SYN048 — tagged-template bypass via fn-body-local alias", () => {
  it("fires on fn-body const e = eval; e`code`", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const e = eval\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("fires on fn-body const F = Function; F`body`()", () => {
    const src =
      "?bs 0.7\n" +
      "fn build() -> any {\n" +
      "  const F = Function\n" +
      "  return F`return 42`()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("still fires on paren call (regression)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const e = eval\n" +
      "  return e(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN048")).toBe(true);
  });

  it("does not fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const e = eval\n" +
      '  return unsafe "legacy" { e`${code}` }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN048")).toBe(false);
  });
});

// ─── SYN050: fn-body-local destructuring rename ───────────────────────────────

describe("SYN050 — tagged-template bypass via fn-body-local destructuring rename", () => {
  it("fires on fn-body const { eval: e } = globalThis; e`code`", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  const { eval: e } = globalThis\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN050")).toBe(true);
  });
});

// ─── SYN051: module-scope assignment-expression alias ─────────────────────────

describe("SYN051 — tagged-template bypass via module-scope assignment alias", () => {
  it("fires on let e; e = eval; e`code` in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "let e: any\n" +
      "e = eval\n" +
      "fn run(code: string) -> any {\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN051")).toBe(true);
  });
});

// ─── SYN053: fn-body assignment-expression alias ──────────────────────────────

describe("SYN053 — tagged-template bypass via fn-body assignment alias", () => {
  it("fires on fn-body let e; e = eval; e`code`", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  let e: any\n" +
      "  e = eval\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN053")).toBe(true);
  });
});

// ─── SYN055: default-parameter alias ─────────────────────────────────────────

describe("SYN055 — tagged-template bypass via default-parameter alias", () => {
  it("fires on fn run(e = eval) { e`code` }", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string, e = eval) -> any {\n" +
      "  return e`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN055")).toBe(true);
  });

  it("fires on fn run(F = Function) { F`body`() }", () => {
    const src =
      "?bs 0.7\n" +
      "fn build(F = Function) -> any {\n" +
      "  return F`return 42`()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN055")).toBe(true);
  });
});
