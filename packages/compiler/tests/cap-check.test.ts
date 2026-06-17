import { describe, expect, it } from "vitest";

import { CapabilityCheckError, transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("static capability check (0.2)", () => {
  it("flags a pure fn that reaches for time.now()", () => {
    const src = `?bs 0.2\nfn now() -> number = pure { time.now() }\n`;
    expect(() => t(src)).toThrow(CapabilityCheckError);
    try {
      t(src);
    } catch (e) {
      const err = e as CapabilityCheckError;
      expect(err.fnName).toBe("now");
      expect(err.capability).toBe("time");
      expect(err.namespace).toBe("time");
      expect(err.message).toContain("(none — pure scope)");
      expect(err.message).toContain("uses { time }");
    }
  });

  it("flags an under-declared fn that calls http.get", () => {
    const src = `?bs 0.2\nfn fetchOne(u: string) uses { time } -> string {\n  const r = http.get(u);\n  return "x";\n}\n`;
    expect(() => t(src)).toThrow(/capability 'net'/);
    expect(() => t(src)).toThrow(/uses \{ time, net \}/);
  });

  it("allows a fn that declares the capability it uses", () => {
    const src = `?bs 0.2\nfn now() uses { time } -> number {\n  return time.now();\n}\n`;
    expect(() => t(src)).not.toThrow();
    expect(t(src)).toContain('$enter(["time"] as const');
  });

  it("treats stdlib idents not followed by a dot as ordinary", () => {
    const src =
      `?bs 0.2\nfn shadow() -> number = pure {\n` +
      `  const time = 1;\n` +
      `  return time + 1;\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not flag the outer fn for capabilities consumed only by an inner fn", () => {
    const src =
      `?bs 0.2\nfn outer() -> number = pure {\n` +
      `  const inner = (() => 1);\n` +
      `  return inner();\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not treat `obj.helper(...)` as a call to a same-file `fn helper`", () => {
    // Pre-fix: scanBody only checked `ident` + next `(`, so `obj.helper()`
    // was misclassified as a call to a top-level `fn helper`. If that
    // helper consumed a cap the outer didn't declare, CAP001 would fire
    // even though the call was actually to a method on `obj`.
    const src =
      `?bs 0.3\n` +
      `fn helper() uses { time } -> number { return time.now(); }\n` +
      `fn outer(obj: { helper: () => number }) -> number = pure { obj.helper() }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not treat `obj?.helper(...)` (optional chain) as an intra-module call", () => {
    const src =
      `?bs 0.3\n` +
      `fn helper() uses { time } -> number { return time.now(); }\n` +
      `fn outer(obj: { helper?: () => number } | null) -> number {\n` +
      `  return obj?.helper() ?? 0;\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("same-name fn decls in different scopes don't collide in the records map", () => {
    // Pre-fix: the records Map was keyed by fn name, so two `fn helper`
    // declarations would silently overwrite each other and corrupt
    // inference. Post-fix: records keyed by FnDecl identity; declsByName
    // resolves a call to ANY same-named decl conservatively.
    //
    // Here: two `helper`s, one pure, one consuming `time`. `outer` calls
    // `helper(s)` — the resolver merges both candidates' caps, so `outer`
    // transitively consumes `time` even though it doesn't declare it.
    const src =
      `?bs 0.3\n` +
      `fn outer(s: string) -> string {\n` +
      `  fn helper(s: string) -> string = pure { s.trim() }\n` +
      `  return helper(s);\n` +
      `}\n` +
      `fn elsewhere() uses { time } -> number {\n` +
      `  fn helper() uses { time } -> number { return time.now(); }\n` +
      `  return helper();\n` +
      `}\n`;
    expect(() => t(src)).toThrow(/CAP001/);
  });

  it("excludes a nested `fn` declaration's body from the outer fn's scan", () => {
    // Nested fn declarations must be filtered out of the outer body scan,
    // OR the outer fn would inherit `time` from the inner's body. Pinning
    // this behaviour: cap-check needs to collect ALL fn decls including
    // nested ones (so it can compute `inner` ranges and exclude them),
    // not just top-level fns.
    const src =
      `?bs 0.2\nfn outer() -> number = pure {\n` +
      `  fn inner() uses { time } -> number { return time.now(); }\n` +
      `  return 1;\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not run the static check on 0.1 files (forward compat)", () => {
    // Same source that errors under 0.2; under 0.1 it must compile.
    const src = `?bs 0.1\nfn now() -> number = pure { time.now() }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not run the static check on unpinned files (LATEST is still 0.1)", () => {
    const src = `fn now() -> number = pure { time.now() }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("allows http.get inside an async fn that declares net", () => {
    const src =
      `?bs 0.2\nasync fn loadUser(id: string) uses { net } -> Promise<Response> {\n` +
      `  return http.get(\`/u/\${id}\`);\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("allows fs.readText when fs is declared", () => {
    const src =
      `?bs 0.2\nfn loadConfig(path: string) uses { fs } -> string {\n` +
      `  return fs.readText(path) as unknown as string;\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not treat the `time` literal in the uses clause as a body usage (0.3)", () => {
    // If the `time` token inside `uses { time }` were counted as a stdlib
    // reference, CAP002 would NOT fire here — but it does, proving the uses
    // clause is excluded from body scanning.
    const src =
      `?bs 0.3\nfn now() uses { time } -> number {\n` +
      `  return Date.now();\n` +
      `}\n`;
    expect(() => t(src)).toThrow(/CAP002/);
  });

  it("flags an over-declared capability (CAP002, 0.3)", () => {
    const src = `?bs 0.3\nfn slug(s: string) uses { net } -> string = pure { s.toLowerCase() }\n`;
    expect(() => t(src)).toThrow(/CAP002/);
    expect(() => t(src)).toThrow(/'slug' declares capability 'net'/);
  });

  it("propagates capabilities transitively across calls in the same module (0.3)", () => {
    const src =
      `?bs 0.3\n` +
      `fn doFetch(url: string) uses { net } -> string {\n` +
      `  const res = http.get(url);\n` +
      `  return "x";\n` +
      `}\n` +
      `fn loadOne(url: string) -> string = pure { doFetch(url) }\n`;
    // loadOne is pure but transitively reaches `net` via doFetch.
    expect(() => t(src)).toThrow(/CAP001/);
    expect(() => t(src)).toThrow(/transitively/);
    expect(() => t(src)).toThrow(/loadOne -> doFetch -> http\.get/);
  });

  it("recognises a direct stdlib use through a generic-returning fn (0.4)", () => {
    // Regression: the return-type scanner used to bail at the inner `}` of
    // `Result<{ name: string }, string>`, treating that brace as the body
    // opener. The fn body was effectively never scanned, so cap-check
    // wrongly reported the declared `fs` capability as over-declared.
    const src =
      `?bs 0.4\n` +
      `fn loadConfig(path: string) uses { fs } -> Result<{ name: string }, string> {\n` +
      `  let cfg = fs.readJson<{ name: string }>(path)?\n` +
      `  return ok(cfg);\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("handles nested generic close (>>) in the return type (0.4)", () => {
    const src =
      `?bs 0.4\n` +
      `fn g() uses { fs } -> Map<string, Vec<{ name: string }>> {\n` +
      `  fs.readJson<{ x: number }>("p");\n` +
      `  return new Map();\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("handles a union return type with a leading object literal (0.4)", () => {
    // Outer-level `{...}` followed by `|` — the case-list heuristic
    // would have flagged this brace as the body opener.
    const src =
      `?bs 0.4\n` +
      `fn g() uses { fs } -> { name: string } | string {\n` +
      `  fs.readJson<{ x: number }>("p");\n` +
      `  return "x";\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("accepts a fn whose declared caps match the transitive set (0.3)", () => {
    const src =
      `?bs 0.3\n` +
      `fn doFetch(url: string) uses { net } -> string {\n` +
      `  const res = http.get(url);\n` +
      `  return "x";\n` +
      `}\n` +
      `fn loadOne(url: string) uses { net } -> string {\n` +
      `  return doFetch(url);\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("CAP002 fires when a caller declares more than its callees consume (0.3)", () => {
    const src =
      `?bs 0.3\n` +
      `fn helper(s: string) -> string = pure { s.trim() }\n` +
      `fn outer(s: string) uses { net } -> string {\n` +
      `  return helper(s);\n` +
      `}\n`;
    expect(() => t(src)).toThrow(/CAP002/);
  });

  it("0.2 keeps its original direct-only check — over-declaration is allowed", () => {
    // Forward-compat: a file pinned to 0.2 must continue to compile exactly
    // as it did when 0.2 shipped. The strict checks (CAP002, transitive)
    // are gated at 0.3+.
    const src =
      `?bs 0.2\nfn now() uses { time } -> number {\n` +
      `  return Date.now();\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("0.2 does not propagate capabilities transitively", () => {
    // Same source that errors under 0.3 must compile under 0.2.
    const src =
      `?bs 0.2\n` +
      `fn doFetch(url: string) uses { net } -> string {\n` +
      `  const res = http.get(url);\n` +
      `  return "x";\n` +
      `}\n` +
      `fn loadOne(url: string) -> string = pure { doFetch(url) }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("scans match arms in single-expression body for stdlib refs", () => {
    const src =
      `?bs 0.2\nfn label(x: unknown) -> number = match x {\n` +
      `  "a" -> time.now()\n` +
      `  _   -> 0\n` +
      `}\n`;
    expect(() => t(src)).toThrow(/capability 'time'/);
  });

  it("includes line number in the error message", () => {
    const src = `?bs 0.2\n\nfn now() -> number = pure { time.now() }\n`;
    try {
      t(src);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as CapabilityCheckError).line).toBe(3);
    }
  });

  it("populates start/end code-unit offsets on the diagnostic (direct, 0.2)", () => {
    // Direct usage at 0.2: the diagnostic should anchor at the offending
    // `time` token. start/end are UTF-16 string offsets in post-?bs-
    // stripping coordinates, which is what passes operate on. To assert
    // against the substring, we strip the directive ourselves the same
    // way passVersion does (drop the directive content, keep the trailing
    // newline).
    const src = `?bs 0.2\nfn now() -> number = pure { time.now() }\n`;
    const passSrc = src.replace(/^\?bs [\d.]+/, "");
    try {
      t(src);
      throw new Error("expected throw");
    } catch (e) {
      const d = (e as CapabilityCheckError).diagnostics[0]!;
      expect(d.start).toBeDefined();
      expect(d.end).toBeDefined();
      expect(passSrc.slice(d.start!, d.end!)).toBe("time");
    }
  });

  it("populates start/end on transitive (CAP001) diagnostics — 0.3", () => {
    const src =
      `?bs 0.3\n` +
      `fn doFetch(url: string) uses { net } -> string {\n` +
      `  const res = http.get(url);\n` +
      `  return "x";\n` +
      `}\n` +
      `fn loadOne(url: string) -> string = pure { doFetch(url) }\n`;
    const passSrc = src.replace(/^\?bs [\d.]+/, "");
    try {
      t(src);
      throw new Error("expected throw");
    } catch (e) {
      const d = (e as CapabilityCheckError).diagnostics[0]!;
      expect(d.start).toBeDefined();
      // Transitive errors anchor at the fn header — `fn loadOne`.
      expect(passSrc.slice(d.start!, d.end!)).toBe("fn loadOne");
    }
  });
});

// ---------------------------------------------------------------------------
// Regression: stdlib namespace in parameter type annotation must not fire
// ---------------------------------------------------------------------------

describe("cap-check: no false positive for stdlib namespace in parameter type", () => {
  it("does not fire CAP001 when stdlib namespace appears in parameter type annotation", () => {
    // `http.Client` is a type annotation, not a capability call. Scanning from
    // fn.tokenStart used to flag this as http.x and fire CAP001.
    const src = "?bs 0.9\nfn handleReq(client: http.Client) -> string = \"ok\"\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does not fire CAP001 when stdlib namespace appears only in return type annotation", () => {
    // Return type `http.Client` is a type annotation, not a capability call.
    // No stdlib call in the body — should compile clean.
    const src = "?bs 0.9\nfn makeClient() -> http.Client = \"placeholder\"\n";
    expect(() => t(src)).not.toThrow();
  });

  it("still fires CAP001 when stdlib call is in the body (not the header)", () => {
    // Wrap in match to suppress UNS005 (which runs before cap-check); CAP001 still
    // fires because uses { net } is absent.
    const src =
      "?bs 0.9\nfn fetchData(url: string) -> Result<string, string> {\n" +
      "  match http.get(url) {\n    ok { value } -> ok(value)\n    err { error } -> err(error)\n  }\n}\n";
    expect(() => t(src)).toThrow(/CAP001/);
  });
});

// ---------------------------------------------------------------------------
// clock.sequence() — free namespace, no capability declaration required
// ---------------------------------------------------------------------------

describe("cap-check: clock.sequence() does not require uses { clock }", () => {
  it("does NOT fire CAP001 for clock.sequence() — clock is a free namespace", () => {
    // clock.sequence() provides process-local monotonic ordering without
    // wallclock access. No capability declaration should be needed.
    const src =
      "?bs 0.7\n" +
      "fn tagEvent(name: string) -> string {\n" +
      "  const seq = clock.sequence()\n" +
      "  return `${name}#${seq}`\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });

  it("does NOT fire CAP002 for clock.sequence() — not a declarable capability", () => {
    // Even with an explicit `uses { time }` declaration, clock.sequence() in
    // the body should not cause issues (it's not a capability overshoot).
    const src =
      "?bs 0.7\n" +
      "fn tagWithTime(name: string) uses { time } -> string {\n" +
      "  const seq = clock.sequence()\n" +
      "  const ts = time.now()\n" +
      "  return `${name}#${seq}@${ts}`\n" +
      "}\n";
    expect(() => t(src)).not.toThrow();
  });
});
