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
