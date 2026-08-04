import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";
import type { ModuleEffects } from "../src/module-effects.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function check(src: string) {
  return transform(src);
}

function checkWithMods(src: string, moduleEffects: ModuleEffects) {
  return transform(src, { moduleEffects });
}

// ---------------------------------------------------------------------------
// RES002 — basic discard detection
// ---------------------------------------------------------------------------

describe("RES002: basic discard detection", () => {
  it("fires when Result-returning fn is called as a bare statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) writes { userDb } -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) writes { userDb } -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });

  it("fires when Option-returning fn is called as a bare statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn findUser(id: string) -> Option<string> { none }\n" +
      "fn process(id: string) -> void {\n" +
      "  findUser(id)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });

  it("does not fire when result is propagated with ?", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) writes { userDb } -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) writes { userDb } -> Result<void, string> {\n" +
      "  saveUser(user)?\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });

  it("does not fire when result is assigned", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) -> void {\n" +
      "  let result = saveUser(user)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });

  it("does not fire when result is used in match", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) -> void {\n" +
      "  match saveUser(user) { _ -> 1 }\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });

  it("does not fire when result is returned", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) -> Result<void, string> {\n" +
      "  return saveUser(user)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });

  it("does not fire when result is passed as argument", () => {
    const src =
      "?bs 0.9\n" +
      "fn save(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn wrap(r: Result<void, string>) -> void { }\n" +
      "fn processUser(user: string) -> void {\n" +
      "  wrap(save(user))\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — version gating
// ---------------------------------------------------------------------------

describe("RES002: version gating", () => {
  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — exclusions
// ---------------------------------------------------------------------------

describe("RES002: test and unsafe block exclusions", () => {
  it("does not fire inside a test block", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "test \"setup\" {\n" +
      "  saveUser(\"alice\")\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });

  it("does not fire inside an unsafe block", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) -> void {\n" +
      "  unsafe \"intentional discard\" { saveUser(user) }\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — non-result-bearing fns do not fire
// ---------------------------------------------------------------------------

describe("RES002: only fires for Result/Option-returning fns", () => {
  it("does not fire for void-returning fn called as statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn logEvent(msg: string) -> void { }\n" +
      "fn process(msg: string) -> void {\n" +
      "  logEvent(msg)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });

  it("does not fire for string-returning fn called as statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn getUser(id: string) -> string = id\n" +
      "fn process(id: string) -> void {\n" +
      "  getUser(id)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — grouping paren transparency
// ---------------------------------------------------------------------------

describe("RES002: grouping paren transparency", () => {
  it("fires for discarded call wrapped in leading grouping parens", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn processUser(user: string) -> void {\n" +
      "  (saveUser(user))\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });

  it("does not fire when grouping-paren-wrapped call result is used as argument", () => {
    // `wrap((save(user)))` — the inner call is wrapped in grouping parens but
    // used as an argument to `wrap`, not discarded as a bare statement.
    // This exercises the grouping-paren transparency path inside an argument position.
    const src =
      "?bs 0.9\n" +
      "fn save(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn wrap(r: Result<void, string>) -> void { }\n" +
      "fn processUser(user: string) -> void {\n" +
      "  wrap((save(user)))\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — nested generic return type label
// ---------------------------------------------------------------------------

describe("RES002: nested generic return type label", () => {
  it("reports correct label for nested generics like Result<Option<string>, E>", () => {
    const src =
      "?bs 0.9\n" +
      "fn findUser(id: string) -> Result<Option<string>, Error> { ok(none) }\n" +
      "fn process(id: string) -> void {\n" +
      "  findUser(id)\n" +
      "}\n";
    const result = check(src);
    const warn = result.warnings.find((w) => w.code === "RES002");
    expect(warn).toBeDefined();
    expect(warn!.message).toContain("Result<Option<string>, Error>");
  });
});

// ---------------------------------------------------------------------------
// RES002 — await transparency
// ---------------------------------------------------------------------------

describe("RES002: await transparency", () => {
  it("fires when Result-returning fn is called as an awaited statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn process(user: string) -> void {\n" +
      "  await saveUser(user)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RES002 — test-with-mocks skip
// ---------------------------------------------------------------------------

describe("RES002: test-with-mocks blocks are excluded", () => {
  it("does not fire inside test ... with mocks { caps } { body } block", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) writes { userDb } -> Result<void, string> { ok(undefined) }\n" +
      "test \"setup\" with mocks { userDb } {\n" +
      "  saveUser(\"alice\")\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — nested fn declarations
// ---------------------------------------------------------------------------

describe("RES002: nested fn declarations participate in check", () => {
  it("fires when a nested Result-returning helper is called and discarded", () => {
    const src =
      "?bs 0.9\n" +
      "fn outer() -> void {\n" +
      "  fn inner(x: string) -> Result<void, string> { ok(undefined) }\n" +
      "  inner(\"hello\")\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RES002 — match as consumption (inline scrutinee)
// ---------------------------------------------------------------------------

describe("RES002: match expression does not suppress call in scrutinee position", () => {
  it("does not fire when result-returning call is the match scrutinee (inline)", () => {
    // `match load(id) { ... }` — load(id) is the scrutinee, not a discarded
    // statement. The match keyword precedes it on the same line, so it is not
    // in statement position.
    const src =
      "?bs 0.9\n" +
      "fn load(id: string) -> Result<string, string> { ok(id) }\n" +
      "fn process(id: string) -> string {\n" +
      "  match load(id) {\n" +
      "    ok { v } -> v\n" +
      "    err { _ } -> \"\"\n" +
      "  }\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — { on next line is a block statement, not match scrutinee
// ---------------------------------------------------------------------------

describe("RES002: block statement brace on next line does not suppress", () => {
  it("fires when a discarded call is followed by a block statement on the next line", () => {
    // `{ ... }` on the next line is a separate block statement, not a match
    // block consuming the result — RES002 must still fire.
    const src =
      "?bs 0.9\n" +
      "fn save(x: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn caller(x: string) -> void {\n" +
      "  save(x)\n" +
      "  { const y = 1 }\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RES002 — same-name ambiguity
// ---------------------------------------------------------------------------

describe("RES002: same-name ambiguity exclusion", () => {
  it("does NOT fire when same name has two Result overloads with different error types (ambiguous scope)", () => {
    // Two fns named `parse` with different Result error arms — scope resolution
    // would be needed to classify the call site. Safe default is silence.
    const src =
      "?bs 0.9\n" +
      "fn parse(s: string) -> Result<void, ErrorA> { ok(undefined) }\n" +
      "fn parse(n: number) -> Result<void, ErrorB> { ok(undefined) }\n" +
      "fn caller(s: string) -> void {\n" +
      "  parse(s)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES002 — } as statement boundary
// ---------------------------------------------------------------------------

describe("RES002: closing brace is a statement boundary", () => {
  it("fires when a discarded call immediately follows a closing brace", () => {
    // A discarded Result call that starts right after a `}` (no newline) is
    // still a statement — `}` is a statement terminator.
    const src =
      "?bs 0.9\n" +
      "fn save(x: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn caller(x: string) -> void {\n" +
      "  if (x) { const y = 1 } save(x)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// RES002 — optional-call syntax
// ---------------------------------------------------------------------------

describe("RES002: optional-call syntax", () => {
  it("fires for optional call f?.(args) in statement position", () => {
    // saveUser?.(user) must warn — `?.` before `(` is still a discarded call.
    const src =
      "?bs 0.9\n" +
      "fn saveUser(u: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn caller(u: string) -> void {\n" +
      "  saveUser?.(u)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
  });

  it("does NOT fire when optional call result is assigned", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(u: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn caller(u: string) -> void {\n" +
      "  const r = saveUser?.(u)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RES003 — cross-file Result/Option discard (imported callees)
// ---------------------------------------------------------------------------

describe("RES003: imported Result-returning fn discarded in statement position", () => {
  it("fires RES003 when imported fn with returnsResult is called as a statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(true);
  });

  it("fires RES003 when imported fn with returnsOption is called as a statement", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(id: string) -> void {\n" +
      "  findUser(id)\n" +
      "}\n";
    const result = checkWithMods(src, { findUser: { returnsOption: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(true);
  });

  it("does not fire RES003 when result is propagated with ?", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(user: string) -> Result<void, string> {\n" +
      "  saveUser(user)?\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(false);
  });

  it("does not fire RES003 when result is assigned", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(user: string) -> void {\n" +
      "  const r = saveUser(user)\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(false);
  });

  it("does not fire RES003 when result is matched", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(user: string) -> void {\n" +
      "  match saveUser(user) { _ -> 1 }\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(false);
  });

  it("does not fire RES003 when inside an unsafe block", () => {
    const src =
      "?bs 0.9\n" +
      'fn caller(user: string) -> void {\n' +
      '  unsafe "intentional discard" { saveUser(user) }\n' +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(false);
  });

  it("does not fire RES003 when no moduleEffects provided", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = check(src);
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(false);
  });

  it("fires RES002 (not RES003) when same-file fn shadows imported name", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n" +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES002")).toBe(true);
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(false);
  });

  it("fires RES003 message containing fn name and Result type label", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    const w = result.warnings.find((w) => w.code === "RES003");
    expect(w).toBeDefined();
    expect(w!.message).toContain("saveUser");
    expect(w!.message).toContain("Result");
  });

  it("fires RES003 message containing Option type label for Option-returning fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(id: string) -> void {\n" +
      "  findUser(id)\n" +
      "}\n";
    const result = checkWithMods(src, { findUser: { returnsOption: true } });
    const w = result.warnings.find((w) => w.code === "RES003");
    expect(w).toBeDefined();
    expect(w!.message).toContain("findUser");
    expect(w!.message).toContain("Option");
  });

  it("fires RES003 for aliased import when moduleEffects uses declared name", () => {
    // `import { saveRow as saveUser }` — local name is "saveUser", declared is "saveRow"
    const src =
      "?bs 0.9\n" +
      'import { saveRow as saveUser } from "./db.bs"\n' +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = checkWithMods(src, { saveRow: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(true);
  });

  it("does not fire RES003 before ?bs 0.9", () => {
    const src =
      "?bs 0.2\n" +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(false);
  });

  it("RES003 diagnostic carries start and end spans", () => {
    const src =
      "?bs 0.9\n" +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = checkWithMods(src, { saveUser: { returnsResult: true } });
    const w = result.warnings.find((w) => w.code === "RES003");
    expect(w).toBeDefined();
    expect(typeof w!.start).toBe("number");
    expect(typeof w!.end).toBe("number");
    expect(w!.end).toBeGreaterThan(w!.start!);
  });
});

// ---------------------------------------------------------------------------
// RES003 — buildModuleEffects integration
// ---------------------------------------------------------------------------

describe("RES003: buildModuleEffects populates returnsResult / returnsOption", () => {
  it("buildModuleEffects sets returnsResult for fns returning Result<>", async () => {
    const { buildModuleEffects } = await import("../src/module-effects.js");
    const src =
      "?bs 0.9\n" +
      "export fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n";
    const effects = buildModuleEffects([src]);
    expect(effects["saveUser"]?.returnsResult).toBe(true);
    expect(effects["saveUser"]?.returnsOption).toBeUndefined();
  });

  it("buildModuleEffects sets returnsOption for fns returning Option<>", async () => {
    const { buildModuleEffects } = await import("../src/module-effects.js");
    const src =
      "?bs 0.9\n" +
      "export fn findUser(id: string) -> Option<string> { none }\n";
    const effects = buildModuleEffects([src]);
    expect(effects["findUser"]?.returnsOption).toBe(true);
    expect(effects["findUser"]?.returnsResult).toBeUndefined();
  });

  it("buildModuleEffects does not set returnsResult for plain return types", async () => {
    const { buildModuleEffects } = await import("../src/module-effects.js");
    const src =
      "?bs 0.9\n" +
      "export fn getName(id: string) -> string = id\n";
    const effects = buildModuleEffects([src]);
    expect(effects["getName"]?.returnsResult).toBeUndefined();
    expect(effects["getName"]?.returnsOption).toBeUndefined();
  });

  it("end-to-end: buildModuleEffects output triggers RES003 in transform", async () => {
    const { buildModuleEffects } = await import("../src/module-effects.js");
    const exportedSrc =
      "?bs 0.9\n" +
      "export fn saveUser(user: string) -> Result<void, string> { ok(undefined) }\n";
    const moduleEffects = buildModuleEffects([exportedSrc]);

    const callerSrc =
      "?bs 0.9\n" +
      "fn caller(user: string) -> void {\n" +
      "  saveUser(user)\n" +
      "}\n";
    const result = transform(callerSrc, { moduleEffects });
    expect(result.warnings.some((w) => w.code === "RES003")).toBe(true);
  });
});
