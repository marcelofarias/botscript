/**
 * Cross-file effect transitivity via moduleEffects option (?bs 0.9+).
 *
 * DEP001/DEP002/THR001 normally only cross-check same-file calls.  When the
 * caller passes `moduleEffects`, the compiler treats listed external fns as if
 * their declarations were in the same file: a caller that omits a required
 * reads/writes/throws label gets the same diagnostic.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";
import type { ModuleEffects } from "../src/module-effects.js";

function compile(src: string, moduleEffects?: ModuleEffects): string {
  return transform(src, { moduleEffects }).code;
}

// ---------------------------------------------------------------------------
// DEP001: cross-file reads transitivity
// ---------------------------------------------------------------------------

describe("DEP001: cross-file reads via moduleEffects", () => {
  it("fires when caller omits reads label declared in moduleEffects", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) -> string = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"] } };
    expect(() => compile(src, mods)).toThrow("DEP001");
    expect(() => compile(src, mods)).toThrow(/fetchRow.*reads \{ userDb \}/);
    // Direct external call: must say "calls" not "transitively calls",
    // and the call path must include the caller name.
    expect(() => compile(src, mods)).toThrow(/fn 'loadUser' calls 'fetchRow'/);
    expect(() => compile(src, mods)).toThrow(/call path: loadUser -> fetchRow/);
  });

  it("passes when caller declares the reads label from moduleEffects", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) reads { userDb } -> string = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"] } };
    expect(() => compile(src, mods)).not.toThrow();
  });

  it("fires through same-file chain when leaf calls external fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn getUser(id: string) reads { userDb } -> string = fetchRow(id)\n" +
      "fn loadUser(id: string) -> string = getUser(id)\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"] } };
    expect(() => compile(src, mods)).toThrow("DEP001");
    expect(() => compile(src, mods)).toThrow(/loadUser/);
  });

  it("passes when no moduleEffects are provided (opaque external calls)", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) -> string = fetchRow(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("ignores moduleEffects entries not called by any fn in the file", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) -> string = id\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"] } };
    expect(() => compile(src, mods)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) -> string = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"] } };
    expect(() => compile(src, mods)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// DEP002: cross-file writes transitivity
// ---------------------------------------------------------------------------

describe("DEP002: cross-file writes via moduleEffects", () => {
  it("fires when caller omits writes label declared in moduleEffects", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(id: string) -> string = persistRow(id)\n";
    const mods: ModuleEffects = { persistRow: { writes: ["userDb"] } };
    expect(() => compile(src, mods)).toThrow("DEP002");
    expect(() => compile(src, mods)).toThrow(/persistRow.*writes \{ userDb \}/);
    expect(() => compile(src, mods)).toThrow(/fn 'saveUser' calls 'persistRow'/);
    expect(() => compile(src, mods)).toThrow(/call path: saveUser -> persistRow/);
  });

  it("passes when caller declares the writes label from moduleEffects", () => {
    const src =
      "?bs 0.9\n" +
      "fn saveUser(id: string) writes { userDb } -> string = persistRow(id)\n";
    const mods: ModuleEffects = { persistRow: { writes: ["userDb"] } };
    expect(() => compile(src, mods)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// THR001: cross-file throws transitivity
// ---------------------------------------------------------------------------

describe("THR001: cross-file throws via moduleEffects", () => {
  it("fires when caller omits throws type declared in moduleEffects", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) -> Result<string, string> = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { throws: ["NetworkError"] } };
    expect(() => compile(src, mods)).toThrow("THR001");
    expect(() => compile(src, mods)).toThrow(/fetchRow.*throws \{ NetworkError \}/);
    expect(() => compile(src, mods)).toThrow(/fn 'loadUser' calls 'fetchRow'/);
    expect(() => compile(src, mods)).toThrow(/call path: loadUser -> fetchRow/);
  });

  it("passes when caller declares the throws type from moduleEffects", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) throws { NetworkError } -> Result<string, string> = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { throws: ["NetworkError"] } };
    expect(() => compile(src, mods)).not.toThrow();
  });

  it("fires through same-file chain when leaf calls external fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn getUser(id: string) throws { NetworkError } -> Result<string, string> = fetchRow(id)\n" +
      "fn loadUser(id: string) -> Result<string, string> = getUser(id)\n";
    const mods: ModuleEffects = { fetchRow: { throws: ["NetworkError"] } };
    expect(() => compile(src, mods)).toThrow("THR001");
    expect(() => compile(src, mods)).toThrow(/loadUser/);
  });

  it("passes when no moduleEffects are provided (opaque external calls)", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) -> Result<string, string> = fetchRow(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn loadUser(id: string) -> Result<string, string> = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { throws: ["NetworkError"] } };
    expect(() => compile(src, mods)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Combined reads + throws from the same external fn
// ---------------------------------------------------------------------------

describe("combined reads and throws from one external fn", () => {
  it("fires DEP001 when reads is missing (throws also declared)", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) throws { NetworkError } -> Result<string, string> = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"], throws: ["NetworkError"] } };
    expect(() => compile(src, mods)).toThrow("DEP001");
  });

  it("fires THR001 when throws is missing (reads also declared)", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) reads { userDb } -> Result<string, string> = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"], throws: ["NetworkError"] } };
    expect(() => compile(src, mods)).toThrow("THR001");
  });

  it("passes when all labels are covered", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) reads { userDb } throws { NetworkError } -> Result<string, string> = fetchRow(id)\n";
    const mods: ModuleEffects = { fetchRow: { reads: ["userDb"], throws: ["NetworkError"] } };
    expect(() => compile(src, mods)).not.toThrow();
  });
});
