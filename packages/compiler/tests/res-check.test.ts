import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function check(src: string) {
  return transform(src);
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

  it("does not fire when wrapped call result is used as argument", () => {
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
      "    ok(v) -> v\n" +
      "    err(_) -> \"\"\n" +
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
