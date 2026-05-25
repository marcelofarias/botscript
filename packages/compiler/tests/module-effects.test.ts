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
import { buildModuleEffects } from "../src/module-effects.js";
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

// ---------------------------------------------------------------------------
// buildModuleEffects: the shared builder behind the CLI + Vite plugin.
// Locks the contract those integrations depend on so it can't silently drift.
// ---------------------------------------------------------------------------

describe("buildModuleEffects builder", () => {
  it("extracts declared reads/writes/throws keyed by fn name", () => {
    const effects = buildModuleEffects([
      "?bs 0.9\n" +
        "fn fetchRow(id: string) reads { userDb } throws { NetworkError } -> Result<string, string> = unsafe(id)\n",
    ]);
    expect(effects.fetchRow).toEqual({ reads: ["userDb"], throws: ["NetworkError"] });
  });

  it("merges same-name declarations across sources instead of clobbering", () => {
    const effects = buildModuleEffects([
      "?bs 0.9\nfn save(x: string) reads { db } -> Result<string, string> = unsafe(x)\n",
      "?bs 0.9\nfn save(x: string) writes { cache } -> Result<string, string> = unsafe(x)\n",
    ]);
    expect(effects.save).toEqual({ reads: ["db"], writes: ["cache"] });
  });

  it("skips malformed sources so checking degrades gracefully", () => {
    const effects = buildModuleEffects([
      "this is not botscript {{{",
      "?bs 0.9\nfn ok(x: string) reads { db } -> Result<string, string> = unsafe(x)\n",
    ]);
    expect(Object.keys(effects)).toEqual(["ok"]);
  });

  it("is immune to prototype-pollution via adversarial fn names", () => {
    const effects = buildModuleEffects([
      "?bs 0.9\nfn __proto__(x: string) reads { db } -> Result<string, string> = unsafe(x)\n",
    ]);
    // The polluted key must not leak onto Object.prototype.
    expect(({} as Record<string, unknown>).db).toBeUndefined();
    expect(Object.hasOwn(effects, "__proto__")).toBe(true);
  });

  it("omits fns with no declared effects", () => {
    const effects = buildModuleEffects([
      "?bs 0.9\nfn pure(x: string) -> string = x\n",
    ]);
    expect(Object.keys(effects)).toEqual([]);
  });

  it("includes only exported fns when the source has export statements", () => {
    const src =
      "?bs 0.9\n" +
      "fn _priv(x: string) reads { secretDb } -> string = unsafe(x)\n" +
      "fn pub(x: string) reads { userDb } -> string = unsafe(x)\n" +
      "export { pub }\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "pub")).toBe(true);
    expect(Object.hasOwn(effects, "_priv")).toBe(false);
  });

  it("includes all fns when the source has no export statements (script mode)", () => {
    const src =
      "?bs 0.9\n" +
      "fn a(x: string) reads { db } -> string = unsafe(x)\n" +
      "fn b(x: string) writes { cache } -> string = unsafe(x)\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "a")).toBe(true);
    expect(Object.hasOwn(effects, "b")).toBe(true);
  });

  it("handles inline export fn syntax", () => {
    const src =
      "?bs 0.9\n" +
      "export fn fetchUser(id: string) reads { userDb } -> string = unsafe(id)\n" +
      "fn helper(x: string) reads { secretDb } -> string = unsafe(x)\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "fetchUser")).toBe(true);
    expect(Object.hasOwn(effects, "helper")).toBe(false);
  });

  it("does not treat export type { ... } as an export-presence signal", () => {
    // A file with only type exports should behave like a script (include all fns)
    const src =
      "?bs 0.9\n" +
      "fn internal(x: string) reads { db } -> string = unsafe(x)\n" +
      "export type { Config }\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "internal")).toBe(true);
  });

  it("recognises export with block-comment trivia before the export list", () => {
    // `export /* comment */ { pub }` — skipWs must skip block comments
    const src =
      "?bs 0.9\n" +
      "fn priv(x: string) reads { secretDb } -> string = unsafe(x)\n" +
      "fn pub(x: string) reads { userDb } -> string = unsafe(x)\n" +
      "export /* trailing list */ { pub }\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "pub")).toBe(true);
    expect(Object.hasOwn(effects, "priv")).toBe(false);
  });

  it("treats export const … as an export-presence signal (module mode)", () => {
    // A value export that isn't `fn` / `{ … }` must still flip hasExport so
    // non-exported helper fns are excluded from the effect map.
    const src =
      "?bs 0.9\n" +
      "fn helper(x: string) reads { secretDb } -> string = unsafe(x)\n" +
      "export const VERSION = '1.0.0'\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "helper")).toBe(false);
  });

  it("handles export async fn syntax", () => {
    const src =
      "?bs 0.9\n" +
      "export async fn fetchUser(id: string) reads { userDb } -> string = unsafe(id)\n" +
      "fn helper(x: string) reads { secretDb } -> string = unsafe(x)\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "fetchUser")).toBe(true);
    expect(Object.hasOwn(effects, "helper")).toBe(false);
  });

  it("handles export unsafe \"reason\" fn syntax", () => {
    const src =
      "?bs 0.9\n" +
      "export unsafe \"legacy\" fn fetchRow(id: string) reads { userDb } -> string = unsafe(id)\n" +
      "fn helper(x: string) reads { secretDb } -> string = unsafe(x)\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "fetchRow")).toBe(true);
    expect(Object.hasOwn(effects, "helper")).toBe(false);
  });

  it("handles export async unsafe \"reason\" fn syntax", () => {
    const src =
      "?bs 0.9\n" +
      "export async unsafe \"legacy\" fn fetchRow(id: string) reads { userDb } -> string = unsafe(id)\n" +
      "fn helper(x: string) reads { secretDb } -> string = unsafe(x)\n";
    const effects = buildModuleEffects([src]);
    expect(Object.hasOwn(effects, "fetchRow")).toBe(true);
    expect(Object.hasOwn(effects, "helper")).toBe(false);
  });

  it("does not merge private helpers across files with the same name", () => {
    const fileA =
      "?bs 0.9\n" +
      "fn helper(x: string) reads { secretDb } -> string = unsafe(x)\n" +
      "fn pubA(x: string) reads { aDb } -> string = helper(x)\n" +
      "export { pubA }\n";
    const fileB =
      "?bs 0.9\n" +
      "fn helper(x: string) reads { otherDb } -> string = unsafe(x)\n" +
      "fn pubB(x: string) reads { bDb } -> string = helper(x)\n" +
      "export { pubB }\n";
    const effects = buildModuleEffects([fileA, fileB]);
    // private helpers should be excluded; no merged "helper" entry
    expect(Object.hasOwn(effects, "helper")).toBe(false);
    expect(effects.pubA).toEqual({ reads: ["aDb"] });
    expect(effects.pubB).toEqual({ reads: ["bDb"] });
  });
});
