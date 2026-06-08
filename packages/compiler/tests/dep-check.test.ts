/**
 * Tests for reads {} / writes {} transitivity enforcement (?bs 0.9+).
 *
 * DEP001: fn A calls fn B which reads { x }, but A doesn't declare reads { x }.
 * DEP002: fn A calls fn B which writes { x }, but A doesn't declare writes { x }.
 * DEP003: fn declares reads { x } but no callee (transitively) reads { x }.
 * DEP004: fn declares writes { x } but no callee (transitively) writes { x }.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// DEP001: reads transitivity
// ---------------------------------------------------------------------------

describe("DEP001: reads under-declared (0.9+)", () => {
  it("fires when a caller omits a direct callee's reads label", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) -> string = getFromCache(id)\n";
    expect(() => compile(src)).toThrow("DEP001");
    expect(() => compile(src)).toThrow(/getFromCache.*reads \{ cache \}/);
  });

  it("fires when a caller omits a transitive (multi-hop) reads label", () => {
    const src =
      "?bs 0.9\n" +
      "fn readDb(id: string) reads { db } -> string = id\n" +
      "fn getUser(id: string) reads { db } -> string = readDb(id)\n" +
      "fn loadUser(id: string) -> string = getUser(id)\n";
    expect(() => compile(src)).toThrow("DEP001");
    expect(() => compile(src)).toThrow(/loadUser/);
  });

  it("passes when the caller declares the missing reads label", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) reads { cache } -> string = getFromCache(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes when the caller over-declares (extra labels are fine)", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) reads { cache, db } -> string = getFromCache(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes for a fn that reads directly with no callees", () => {
    const src =
      "?bs 0.9\n" +
      "fn loadUser(id: string) reads { cache } -> string = id\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("passes for a fn with no reads or writes calling a fn with no reads or writes", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = id\n" +
      "fn caller(id: string) -> string = helper(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) -> string = getFromCache(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("reports multiple missing labels", () => {
    const src =
      "?bs 0.9\n" +
      "fn getData(id: string) reads { cache, db } -> string = id\n" +
      "fn loadUser(id: string) -> string = getData(id)\n";
    expect(() => compile(src)).toThrow("DEP001");
  });

  it("does not flag property-access calls as same-file callee (obj.helper)", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper(id: string) reads { cache } -> string = id\n" +
      "fn caller(obj: { helper: (id: string) => string }, id: string) -> string = obj.helper(id)\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("call inside a closure expression in a fn body is still tracked", () => {
    const src =
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn outer(id: string) -> string {\n" +
      "  const inner = (x: string): string => getFromCache(x);\n" +
      "  return inner(id);\n" +
      "}\n";
    // getFromCache appears in outer's body token stream — dep-check fires.
    // Consistent with cap-check: closure expressions don't create a new fn scope
    // from dep-check's perspective.
    expect(() => compile(src)).toThrow("DEP001");
  });
});

// ---------------------------------------------------------------------------
// DEP002: writes transitivity
// ---------------------------------------------------------------------------

describe("DEP002: writes under-declared (0.9+)", () => {
  it("fires when a caller omits a direct callee's writes label", () => {
    const src =
      "?bs 0.9\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) -> void { updateMetrics(id); }\n";
    expect(() => compile(src)).toThrow("DEP002");
    expect(() => compile(src)).toThrow(/updateMetrics.*writes \{ metrics \}/);
  });

  it("fires when a caller omits a transitive writes label", () => {
    const src =
      "?bs 0.9\n" +
      "fn writeAudit(id: string) writes { audit } -> void { }\n" +
      "fn logEvent(id: string) writes { audit } -> void { writeAudit(id); }\n" +
      "fn recordEvent(id: string) -> void { logEvent(id); }\n";
    expect(() => compile(src)).toThrow("DEP002");
    expect(() => compile(src)).toThrow(/recordEvent/);
  });

  it("passes when the caller declares the missing writes label", () => {
    const src =
      "?bs 0.9\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) writes { metrics } -> void { updateMetrics(id); }\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) -> void { updateMetrics(id); }\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Mixed reads + writes
// ---------------------------------------------------------------------------

describe("DEP001 + DEP002 mixed", () => {
  it("fires DEP001 when reads are missing, even when writes are correct", () => {
    const src =
      "?bs 0.9\n" +
      "fn syncData(id: string) reads { cache } writes { db } -> void { }\n" +
      "fn process(id: string) writes { db } -> void { syncData(id); }\n";
    expect(() => compile(src)).toThrow("DEP001");
  });

  it("fires DEP002 when writes are missing, even when reads are correct", () => {
    const src =
      "?bs 0.9\n" +
      "fn syncData(id: string) reads { cache } writes { db } -> void { }\n" +
      "fn process(id: string) reads { cache } -> void { syncData(id); }\n";
    expect(() => compile(src)).toThrow("DEP002");
  });

  it("passes when both reads and writes are correctly declared", () => {
    const src =
      "?bs 0.9\n" +
      "fn syncData(id: string) reads { cache } writes { db } -> void { }\n" +
      "fn process(id: string) reads { cache } writes { db } -> void { syncData(id); }\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Self-recursive fns
// ---------------------------------------------------------------------------

describe("recursive fns", () => {
  it("does not infinitely loop on a self-recursive fn", () => {
    const src =
      "?bs 0.9\n" +
      "fn countdown(n: number) reads { store } -> void {\n" +
      "  if (n > 0) countdown(n - 1);\n" +
      "}\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Parameter-default false-positive regression (issue #70)
// collectCallees now starts from bodyTokenStart, skipping both the parameter
// list (including defaults) and the return-type annotation. The return-type
// exclusion is implicitly covered by the same mechanism — botscript return
// types don't support call-syntax idents, so no separate test is needed.
// ---------------------------------------------------------------------------

describe("parameter-default exclusion (issue #70)", () => {
  it("does not fire DEP001 when callee appears only in a parameter default, not the body", () => {
    // `helper` is called in the parameter default of `caller` (evaluated at the
    // call site), not in caller's body. collectCallees must not pick it up.
    const src =
      "?bs 0.9\n" +
      "fn helper() reads { cache } -> string = \"x\"\n" +
      "fn caller(x: string = helper()) -> string = x\n";
    expect(() => compile(src)).not.toThrow();
  });

  it("still fires DEP001 when callee is called inside the body", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper() reads { cache } -> string = \"x\"\n" +
      "fn caller() -> string { helper() }\n";
    expect(() => compile(src)).toThrow("DEP001");
  });
});

// ---------------------------------------------------------------------------
// DEP003: reads over-declared
// ---------------------------------------------------------------------------

describe("DEP003: reads over-declared (0.9+)", () => {
  it("fires when a fn declares reads { x } but no callee declares reads { x }", () => {
    const src =
      "?bs 0.9\n" +
      "fn formatName(s: string) -> string = s\n" +
      "fn getUserName(id: string) reads { userDb } -> string = formatName(\"Alice\")\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
    expect(result.warnings.find((w) => w.code === "DEP003")!.message).toContain("userDb");
  });

  it("does NOT fire when the declared label is justified by a same-file callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn getUser(id: string) reads { userDb } -> string = id\n" +
      "fn getUserName(id: string) reads { userDb } -> string = getUser(id)\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("does NOT fire when the declared label is justified transitively", () => {
    const src =
      "?bs 0.9\n" +
      "fn readDb(id: string) reads { userDb } -> string = id\n" +
      "fn getUser(id: string) reads { userDb } -> string = readDb(id)\n" +
      "fn getUserName(id: string) reads { userDb } -> string = getUser(id)\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("fires a single warning listing all over-declared labels when multiple are stale", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f() reads { db, cache } -> string = helper()\n";
    const result = transform(src);
    const dep3warns = result.warnings.filter((w) => w.code === "DEP003");
    expect(dep3warns).toHaveLength(1);
    expect(dep3warns[0]!.message).toContain("db");
    expect(dep3warns[0]!.message).toContain("cache");
  });

  it("fires warning with severity 'warning'", () => {
    const src =
      "?bs 0.9\n" +
      "fn noop() -> string = \"ok\"\n" +
      "fn f() reads { x } -> string = noop()\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "DEP003");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn helper() -> string = \"ok\"\n" +
      "fn f() reads { x } -> string = helper()\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("does not throw — DEP003 is non-blocking", () => {
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"Alice\"\n" +
      "fn f() reads { userDb } -> string = helper()\n";
    expect(() => compile(src)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// DEP004: writes over-declared
// ---------------------------------------------------------------------------

describe("DEP004: writes over-declared (0.9+)", () => {
  it("fires when a fn declares writes { x } but no callee declares writes { x }", () => {
    const src =
      "?bs 0.9\n" +
      "fn noop(msg: string) -> void { }\n" +
      "fn logEvent(msg: string) writes { auditLog } -> void { noop(msg); }\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(true);
    expect(result.warnings.find((w) => w.code === "DEP004")!.message).toContain("auditLog");
  });

  it("does NOT fire when the declared label is justified by a same-file callee", () => {
    const src =
      "?bs 0.9\n" +
      "fn writeAudit(msg: string) writes { auditLog } -> void { }\n" +
      "fn logEvent(msg: string) writes { auditLog } -> void { writeAudit(msg) }\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(false);
  });

  it("fires with severity 'warning' and does not throw", () => {
    const src =
      "?bs 0.9\n" +
      "fn noop(msg: string) -> void { }\n" +
      "fn logEvent(msg: string) writes { auditLog } -> void { noop(msg); }\n";
    expect(() => compile(src)).not.toThrow();
    const result = transform(src);
    expect(result.warnings.find((w) => w.code === "DEP004")!.severity).toBe("warning");
  });

  it("does not fire below ?bs 0.9", () => {
    const src =
      "?bs 0.8\n" +
      "fn noop(msg: string) -> void { }\n" +
      "fn logEvent(msg: string) writes { auditLog } -> void { noop(msg); }\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DEP003/DEP004: self-recursive fns and callback parameter justification
// ---------------------------------------------------------------------------

describe("DEP003/DEP004: transitive callee justification", () => {
  it("does NOT fire DEP003 when a multi-hop callee chain justifies the label", () => {
    // f reads { db } calls g, g calls h, h reads { db }.
    // The DFS must reach h through g to find the justification.
    const src =
      "?bs 0.9\n" +
      "fn h() reads { db } -> string = \"row\"\n" +
      "fn g() reads { db } -> string = h()\n" +
      "fn f() reads { db } -> string = g()\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("does NOT fire DEP003 when a callee (leaf) declares the same label", () => {
    // f reads { db } calls g, g reads { db } (leaf). f is justified by g.
    const src =
      "?bs 0.9\n" +
      "fn g() reads { db } -> string = \"row\"\n" +
      "fn f() reads { db } -> string = g()\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });
});

describe("DEP003/DEP004: self-recursive fn exclusion", () => {
  it("does not fire DEP003 for a self-recursive fn — treated as leaf/access-point", () => {
    const src =
      "?bs 0.9\n" +
      "fn countdown(n: number) reads { store } -> void {\n" +
      "  if (n > 0) countdown(n - 1);\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("does not fire DEP004 for a self-recursive fn — treated as leaf/access-point", () => {
    const src =
      "?bs 0.9\n" +
      "fn accumulate(n: number) writes { store } -> void {\n" +
      "  if (n > 0) accumulate(n - 1);\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(false);
  });
});

describe("DEP003/DEP004: callback parameter justification", () => {
  it("does not fire DEP003 when reads label is justified by a callback parameter annotation", () => {
    const src =
      "?bs 0.9\n" +
      "fn noop() -> void { }\n" +
      "fn withCache(loader: () reads { cache } -> string) reads { cache } -> string {\n" +
      "  noop();\n" +
      "  loader()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("does not fire DEP004 when writes label is justified by a callback parameter annotation", () => {
    const src =
      "?bs 0.9\n" +
      "fn noop() -> void { }\n" +
      "fn withAudit(cb: () writes { auditLog } -> void) writes { auditLog } -> void {\n" +
      "  noop();\n" +
      "  cb()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DEP003/DEP004: opaque external call suppression
// ---------------------------------------------------------------------------

describe("DEP003/DEP004: opaque external call suppression", () => {
  it("does not fire DEP003 when fn also calls an unlisted external helper", () => {
    // localHelper is tracked (same-file), unknownHelper is NOT in allCalleeNames.
    // DEP003 must be suppressed because unknownHelper may be the actual reader.
    const src =
      "?bs 0.9\n" +
      "fn localHelper() -> string = \"x\"\n" +
      "fn f() reads { db } -> string { localHelper(); unknownHelper() }\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("does not fire DEP004 when fn also calls an unlisted external helper", () => {
    const src =
      "?bs 0.9\n" +
      "fn localHelper() -> void { }\n" +
      "fn f() writes { db } -> void { localHelper(); unknownHelper() }\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(false);
  });

  it("fires DEP003 when all callees are tracked and none declare the label", () => {
    const src =
      "?bs 0.9\n" +
      "fn localHelper() -> string = \"x\"\n" +
      "fn f() reads { db } -> string = localHelper()\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
  });

  it("fires DEP003 even when fn body contains if/while control flow", () => {
    // `if (cond)` must not be treated as an opaque function call — it's
    // control flow, not an external callee.
    const src =
      "?bs 0.9\n" +
      "fn localHelper(x: number) -> string = \"ok\"\n" +
      "fn f(flag: bool) reads { db } -> string {\n" +
      "  if (flag) localHelper(1);\n" +
      "  localHelper(2)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
  });

  it("fires DEP004 even when fn body contains while control flow", () => {
    const src =
      "?bs 0.9\n" +
      "fn step(n: number) -> void { }\n" +
      "fn f(n: number) writes { log } -> void {\n" +
      "  while (n > 0) step(n);\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(true);
  });

  it("does not fire DEP003 when fn calls an unknown namespace object method", () => {
    // `dbClient.query()` is a member call on an unknown namespace import.
    // hasOpaqueCall must treat it as opaque so DEP003 is suppressed.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> void { }\n" +
      "fn f() reads { db } -> string {\n" +
      "  helper();\n" +
      "  dbClient.query()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("does not fire DEP004 when fn calls an unknown namespace object method", () => {
    const src =
      "?bs 0.9\n" +
      "fn step() -> void { }\n" +
      "fn f() writes { log } -> void {\n" +
      "  step();\n" +
      "  logger.write()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(false);
  });

  it("does not suppress DEP003 for stdlib namespace method calls (time.now)", () => {
    // Stdlib namespaces are excluded from opaque detection — they are handled
    // by cap-check, not by DEP003 suppression.
    // Use `unsafe` to suppress UNS005 so the DEP003 check is reached.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> void { }\n" +
      "fn f() uses { time } reads { db } -> number {\n" +
      "  helper();\n" +
      "  unsafe \"known\" { time.now() }\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
  });

  it("fires DEP003 even when fn calls a method on a string parameter (name.trim())", () => {
    // `name.trim()` is a method call on a fn parameter — it is NOT an opaque
    // external import. hasOpaqueCall must exclude parameter names from the
    // namespace-receiver check so DEP003 is not incorrectly suppressed.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f(name: string) reads { db } -> string {\n" +
      "  helper();\n" +
      "  name.trim()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
  });

  it("fires DEP004 even when fn calls a method on an array parameter (items.map())", () => {
    const src =
      "?bs 0.9\n" +
      "fn step() -> void { }\n" +
      "fn f(items: string[]) writes { log } -> void {\n" +
      "  step();\n" +
      "  items.map(step)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP004")).toBe(true);
  });

  it("fires DEP003 even when fn calls a method on a local const binding (name.trim())", () => {
    // Local `const name = ...` followed by `name.trim()` is NOT an opaque external call.
    // Without collectFnBodyLocalNames, `name` is absent from localNames and name.trim()
    // incorrectly suppresses DEP003.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f() reads { db } -> string {\n" +
      "  const name = helper();\n" +
      "  name.trim()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
  });

  it("fires DEP003 even when fn constructs an error type (err(NetworkError{...})) as an arg", () => {
    // CapCase error-type constructors inside err(...) must NOT suppress DEP003.
    // Standalone CapCase calls like `LoadUser()` SHOULD suppress (opaque external).
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f() reads { db } -> string {\n" +
      "  helper();\n" +
      "  err(NotFoundError { msg: \"x\" })\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
  });

  it("suppresses DEP003 when fn calls an unknown CapCase external function (LoadUser())", () => {
    // A CapCase function call that is NOT inside err(...) is a genuine opaque
    // external and should suppress DEP003 — the external may perform the read.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f() reads { db } -> string {\n" +
      "  helper();\n" +
      "  LoadUser()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("suppresses DEP003 when param has object type annotation — inner idents are not param names", () => {
    // `opts: { dbClient: string }` — `dbClient` is a property name in the type
    // annotation, not an actual fn parameter. Before the brace-depth fix,
    // collectTopLevelParamNames would add `dbClient` to localNames, causing
    // `dbClient.query()` in the body to look like a local param method call
    // rather than an opaque external call, which incorrectly allowed DEP003 to fire.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> void { }\n" +
      "fn f(opts: { dbClient: string }) reads { db } -> void {\n" +
      "  helper();\n" +
      "  dbClient.query()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("suppresses DEP003 when fn uses optional bare call to unknown external fn?.()", () => {
    // `externalLib?.()` is an optional call to a function not declared in this file — opaque,
    // so DEP003 must be suppressed (the external may perform the read).
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f() reads { db } -> void {\n" +
      "  helper();\n" +
      "  externalLib?.()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("suppresses DEP003 when fn calls an unknown namespace via optional member call obj.method?.()", () => {
    // `db.read?.()` — optional method call on an unknown namespace object.
    // hasOpaqueCall must detect the call pattern even with the `?.` operator.
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f() reads { db } -> void {\n" +
      "  helper();\n" +
      "  externalDb.read?.()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(false);
  });

  it("fires DEP003 when fn uses err(new TypeName(...)) — new-form error construction is not opaque", () => {
    // `err(new NetworkError(...))` is the botscript `new`-form error constructor.
    // It must NOT suppress DEP003 — the error construction is not an external read.
    // (throws { NetworkError } declared so THR002 does not fire independently)
    const src =
      "?bs 0.9\n" +
      "fn helper() -> string = \"x\"\n" +
      "fn f() reads { db } throws { NetworkError } -> Result<string, string> {\n" +
      "  helper();\n" +
      "  return err(new NetworkError(\"failed\"))\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "DEP003")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// STDLIB_NAMESPACES / STDLIB_TO_CAP consistency
// ---------------------------------------------------------------------------

import { STDLIB_NAMESPACES } from "../src/passes/_callgraph.js";
import { STDLIB_TO_CAP } from "../src/passes/cap-check.js";

describe("STDLIB_NAMESPACES vs STDLIB_TO_CAP consistency", () => {
  it("STDLIB_NAMESPACES and STDLIB_TO_CAP have the same keys", () => {
    // These two structures must stay in sync: _callgraph.ts is the canonical
    // list of stdlib namespace names; cap-check.ts maps each name to its
    // capability label. A drift here means hasOpaqueCall would incorrectly
    // treat a stdlib namespace call as opaque (or cap-check would miss a new
    // namespace). Direct import from cap-check.ts in _callgraph.ts is not
    // possible (circular dep), so this test is the sync guard.
    const capKeys = new Set(Object.keys(STDLIB_TO_CAP));
    for (const name of STDLIB_NAMESPACES) {
      expect(capKeys.has(name), `STDLIB_NAMESPACES has "${name}" but STDLIB_TO_CAP does not`).toBe(true);
    }
    for (const name of capKeys) {
      expect(STDLIB_NAMESPACES.has(name), `STDLIB_TO_CAP has "${name}" but STDLIB_NAMESPACES does not`).toBe(true);
    }
    expect(STDLIB_NAMESPACES.size).toBe(capKeys.size);
  });
});
