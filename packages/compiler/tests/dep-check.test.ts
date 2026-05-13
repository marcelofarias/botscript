/**
 * Tests for reads {} / writes {} transitivity enforcement (?bs 0.9+).
 *
 * DEP001: fn A calls fn B which reads { x }, but A doesn't declare reads { x }.
 * DEP002: fn A calls fn B which writes { x }, but A doesn't declare writes { x }.
 *
 * Enforcement only activates at ?bs 0.9. Earlier pins are unaffected.
 * Over-declaration is intentionally allowed (no DEP003/DEP004).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";
import { formatSource } from "../src/format/format.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format + compile a botscript source string. Throws on diagnostic. */
function compile(src: string): string {
  return transform(formatSource(src)).code;
}

function expectDep(src: string, code: "DEP001" | "DEP002", fragment?: string): void {
  expect(() => compile(src)).toThrow(new RegExp(`\\[${code}\\]`));
  if (fragment) {
    expect(() => compile(src)).toThrow(fragment);
  }
}

// ---------------------------------------------------------------------------
// DEP001 — reads under-declared
// ---------------------------------------------------------------------------

describe("DEP001 — reads transitivity", () => {
  it("fires when caller does not declare a reads label its callee declares", () => {
    expectDep(
      `?bs 0.9
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string) reads { cache } -> string = fetchFromDb(id)
`,
      "DEP001",
      "loadUser",
    );
  });

  it("fires when caller has no reads annotation at all and callee declares reads", () => {
    expectDep(
      `?bs 0.9
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string) -> string = fetchFromDb(id)
`,
      "DEP001",
    );
  });

  it("passes when caller declares a superset of callee's reads", () => {
    expect(() =>
      compile(
        `?bs 0.9
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string) reads { cache, db } -> string = fetchFromDb(id)
`,
      ),
    ).not.toThrow();
  });

  it("passes when caller's reads exactly matches callee's reads", () => {
    expect(() =>
      compile(
        `?bs 0.9
fn readStore(key: string) reads { store } -> string = key
fn lookup(key: string) reads { store } -> string = readStore(key)
`,
      ),
    ).not.toThrow();
  });

  it("enforces transitivity through a three-level chain", () => {
    // A -> B -> C; C reads { db }; B declares reads { db }; A must too.
    expectDep(
      `?bs 0.9
fn queryDb(id: string) reads { db } -> string = id
fn fetchWithCache(id: string) reads { cache, db } -> string = queryDb(id)
fn loadUser(id: string) reads { cache } -> string = fetchWithCache(id)
`,
      "DEP001",
      "loadUser",
    );
  });

  it("passes for a correctly declared three-level chain", () => {
    expect(() =>
      compile(
        `?bs 0.9
fn queryDb(id: string) reads { db } -> string = id
fn fetchWithCache(id: string) reads { cache, db } -> string = queryDb(id)
fn loadUser(id: string) reads { cache, db } -> string = fetchWithCache(id)
`,
      ),
    ).not.toThrow();
  });

  it("does not fire on fns with no reads annotations", () => {
    expect(() =>
      compile(
        `?bs 0.9
fn helper(x: string) -> string = x
fn outer(x: string) -> string = helper(x)
`,
      ),
    ).not.toThrow();
  });

  it("over-declaration is allowed (no DEP003)", () => {
    // caller declares more reads than needed — this is fine
    expect(() =>
      compile(
        `?bs 0.9
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string) reads { cache, db, extra } -> string = fetchFromDb(id)
`,
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// DEP002 — writes under-declared
// ---------------------------------------------------------------------------

describe("DEP002 — writes transitivity", () => {
  it("fires when caller does not declare a writes label its callee declares", () => {
    expectDep(
      `?bs 0.9
fn persistUser(id: string) writes { db } -> void { }
fn saveUser(id: string) writes { cache } -> void { persistUser(id) }
`,
      "DEP002",
      "saveUser",
    );
  });

  it("fires when caller has no writes annotation at all and callee declares writes", () => {
    expectDep(
      `?bs 0.9
fn persistUser(id: string) writes { db } -> void { }
fn saveUser(id: string) -> void { persistUser(id) }
`,
      "DEP002",
    );
  });

  it("passes when caller declares a superset of callee's writes", () => {
    expect(() =>
      compile(
        `?bs 0.9
fn persistUser(id: string) writes { db } -> void { }
fn saveUser(id: string) writes { cache, db } -> void { persistUser(id) }
`,
      ),
    ).not.toThrow();
  });

  it("enforces writes transitivity through a chain", () => {
    expectDep(
      `?bs 0.9
fn writeLog(msg: string) writes { log } -> void { }
fn recordAudit(msg: string) writes { audit, log } -> void { writeLog(msg) }
fn process(msg: string) writes { audit } -> void { recordAudit(msg) }
`,
      "DEP002",
      "process",
    );
  });
});

// ---------------------------------------------------------------------------
// Mixed reads + writes
// ---------------------------------------------------------------------------

describe("mixed reads and writes", () => {
  it("fires DEP001 when reads is missing but writes is correctly declared", () => {
    expectDep(
      `?bs 0.9
fn doWork(id: string) reads { db } writes { cache } -> void { }
fn orchestrate(id: string) writes { cache } -> void { doWork(id) }
`,
      "DEP001",
    );
  });

  it("fires DEP002 when writes is missing but reads is correctly declared", () => {
    expectDep(
      `?bs 0.9
fn doWork(id: string) reads { db } writes { cache } -> void { }
fn orchestrate(id: string) reads { db } -> void { doWork(id) }
`,
      "DEP002",
    );
  });

  it("passes when both reads and writes are fully declared", () => {
    expect(() =>
      compile(
        `?bs 0.9
fn doWork(id: string) reads { db } writes { cache } -> void { }
fn orchestrate(id: string) reads { db } writes { cache } -> void { doWork(id) }
`,
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Version gating — pre-0.9 files are unaffected
// ---------------------------------------------------------------------------

describe("version gating", () => {
  it("does not enforce at ?bs 0.8", () => {
    expect(() =>
      compile(
        `?bs 0.8
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string) reads { cache } -> string = fetchFromDb(id)
`,
      ),
    ).not.toThrow();
  });

  it("does not enforce at ?bs 0.7", () => {
    expect(() =>
      compile(
        `?bs 0.7
fn helper(id: string) reads { db } -> string = id
fn outer(id: string) -> string = helper(id)
`,
      ),
    ).not.toThrow();
  });

  it("enforces at ?bs 0.9", () => {
    expectDep(
      `?bs 0.9
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string) -> string = fetchFromDb(id)
`,
      "DEP001",
    );
  });

  it("ignores property accesses that happen to share a fn name", () => {
    // `obj.fetchFromDb(...)` is a method call on `obj`, not a same-file fn
    // call. Even though `fetchFromDb` is also the name of a top-level fn
    // declaring reads { db }, the property-access guard must skip it.
    expect(() =>
      compile(
        `?bs 0.9
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string, obj: { fetchFromDb: (s: string) => string }) -> string =
  obj.fetchFromDb(id)
`,
      ),
    ).not.toThrow();
  });

  it("ignores optional-chaining property accesses (?.) too", () => {
    expect(() =>
      compile(
        `?bs 0.9
fn fetchFromDb(id: string) reads { db } -> string = id
fn loadUser(id: string, obj: { fetchFromDb?: (s: string) => string } | null) -> string | undefined =
  obj?.fetchFromDb(id)
`,
      ),
    ).not.toThrow();
  });
});
