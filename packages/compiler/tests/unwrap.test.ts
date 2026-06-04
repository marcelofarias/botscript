/**
 * Tests for the `?` postfix unwrap operator (passUnwrap).
 *
 * `expr?` is sugar for:
 *   const __r = expr;
 *   if (__r.kind === "err") return __r;
 *   // __r.value is the Ok value
 *
 * Three forms are supported:
 *   const x = expr?          — let-binding form: binds Ok value to x
 *   return expr?             — return form: returns Ok value or propagates Err
 *   expr?                    — bare form: evaluates expr, propagates Err, discards Ok
 *
 * The pass is version-agnostic (runs on all ?bs versions).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

function compile(src: string): string {
  return transform(src).code;
}

// ---------------------------------------------------------------------------
// Let-binding form: `const x = expr?`
// ---------------------------------------------------------------------------

describe("? operator — let-binding form", () => {
  it("emits const temp, guard, then binds Ok value", () => {
    // fs.readText returns Result<string, string> synchronously — valid ? source
    const src =
      "?bs 0.6\n" +
      "fn readId(path: string) uses { fs } -> string {\n" +
      "  const raw = fs.readText(path)?;\n" +
      "  return raw;\n" +
      "}\n";
    const out = compile(src);
    expect(out).toContain('__r1');
    expect(out).toContain('kind === "err"');
    expect(out).toContain('return __r1;');
    expect(out).toContain('__r1.value');
    expect(out).toContain('const raw');
  });

  it("supports let binder", () => {
    const src =
      "?bs 0.6\n" +
      "fn readId() uses { fs } -> string {\n" +
      "  let x = fs.readText('/a')?;\n" +
      "  return x;\n" +
      "}\n";
    const out = compile(src);
    expect(out).toContain('let x');
    expect(out).toContain('__r1.value');
  });

  it("supports type annotation on binding", () => {
    const src =
      "?bs 0.6\n" +
      "fn readId() uses { fs } -> string {\n" +
      "  const raw: string = fs.readText('/a')?;\n" +
      "  return raw;\n" +
      "}\n";
    const out = compile(src);
    // Assert the binding line specifically, not just any ': string' in the output
    expect(out).toContain('raw: string');
    expect(out).toContain('__r1.value');
  });

  it("normalizes var binder to let in output", () => {
    const src =
      "?bs 0.6\n" +
      "fn readId() uses { fs } -> string {\n" +
      "  var raw = fs.readText('/a')?;\n" +
      "  return raw;\n" +
      "}\n";
    const out = compile(src);
    // passUnwrap normalises `var` → `let`
    expect(out).toContain('let raw');
    expect(out).toContain('__r1.value');
  });

  it("chains multiple ?s with incremented counter", () => {
    const src =
      "?bs 0.6\n" +
      "fn readUser(path: string) uses { fs } -> string {\n" +
      "  const name = fs.readText(`${path}/name`)?;\n" +
      "  const bio = fs.readText(`${path}/bio`)?;\n" +
      "  return bio;\n" +
      "}\n";
    const out = compile(src);
    expect(out).toContain('__r1');
    expect(out).toContain('__r2');
  });

  it("does not rewrite ? in ternary position", () => {
    const src =
      "?bs 0.6\n" +
      "fn test(x: number) -> string {\n" +
      "  return x > 0 ? 'pos' : 'neg';\n" +
      "}\n";
    const out = compile(src);
    expect(out).not.toContain('kind === "err"');
    expect(out).toContain('? \'pos\' : \'neg\'');
  });
});

// ---------------------------------------------------------------------------
// Return form: `return expr?`
// ---------------------------------------------------------------------------

describe("? operator — return form", () => {
  it("emits const temp, guard, then returns Ok value", () => {
    // Use a multi-statement body so the single-return canonical form gate does
    // not fire (canonical form at 0.6+ requires single-return fns to use = expr).
    // fs.readText returns Result<string, string> synchronously — valid ? source.
    const src =
      "?bs 0.6\n" +
      "fn readId(flag: boolean) uses { fs } -> string {\n" +
      "  if (flag) return 'early';\n" +
      "  return fs.readText('/a')?;\n" +
      "}\n";
    const out = compile(src);
    expect(out).toContain('__r1');
    expect(out).toContain('kind === "err"');
    // `return __r1;` (with semicolon) specifically matches the short-circuit branch,
    // not `return __r1.value;` which is the success path.
    expect(out).toContain('return __r1;');
    expect(out).toContain('return __r1.value');
  });
});

// ---------------------------------------------------------------------------
// Bare form: `expr?`
// ---------------------------------------------------------------------------

describe("? operator — bare form", () => {
  it("emits const temp and guard, no value binding", () => {
    // fs.writeText returns Result<void, string> synchronously — valid bare ? source.
    const src =
      "?bs 0.6\n" +
      "fn writeConfig() uses { fs } -> void {\n" +
      "  fs.writeText('/cfg', 'data')?;\n" +
      "}\n";
    const out = compile(src);
    expect(out).toContain('__r1');
    expect(out).toContain('kind === "err"');
    expect(out).toContain('return __r1;');
    // No value binding after guard
    expect(out).not.toContain('__r1.value');
  });
});

// ---------------------------------------------------------------------------
// await + ? composition
// ---------------------------------------------------------------------------

describe("? operator — await composition", () => {
  it("handles (await expr)? inside async fn", () => {
    // passUnwrap is a text transformation; it does not type-check.
    // `-> Promise<Result<string, string>>` makes the propagation path consistent:
    // the error branch emits `return __r1` (a Result), which is assignable to
    // Promise<Result<string,string>> via the async wrapper.
    const src =
      "?bs 0.6\n" +
      "async fn fetchId() uses { net } -> Promise<Result<string, string>> {\n" +
      "  const raw = (await http.get('/a'))?;\n" +
      "  return raw;\n" +
      "}\n";
    const out = compile(src);
    expect(out).toContain('await');
    expect(out).toContain('kind === "err"');
    expect(out).toContain('const raw');
  });
});

// ---------------------------------------------------------------------------
// Indentation preservation
// ---------------------------------------------------------------------------

describe("? operator — indentation", () => {
  it("preserves leading indentation of the original statement", () => {
    const src =
      "?bs 0.6\n" +
      "fn readId() uses { fs } -> string {\n" +
      "  const raw = fs.readText('/a')?;\n" +
      "  return raw;\n" +
      "}\n";
    const out = compile(src);
    // All generated lines should be indented at least 2 spaces
    const guardLine = out.split('\n').find((l) => l.includes('kind === "err"'));
    expect(guardLine).toBeDefined();
    expect(guardLine!.startsWith('  ')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bare form — explicit semicolon
// ---------------------------------------------------------------------------

describe("? operator — bare form with semicolon", () => {
  it("consumes trailing semicolon after bare ?", () => {
    const src =
      "?bs 0.6\n" +
      "fn writeConfig() uses { fs } -> void {\n" +
      "  fs.writeText('/cfg', 'data')? ;\n" +
      "}\n";
    const out = compile(src);
    expect(out).toContain('__r1');
    expect(out).toContain('kind === "err"');
    // The semicolon should be consumed; guard is emitted instead
    expect(out).not.toContain('__r1.value');
  });
});

// ---------------------------------------------------------------------------
// Counter isolation: each compile() call resets the counter
// ---------------------------------------------------------------------------

describe("? operator — counter isolation", () => {
  it("each transform() call starts the counter at 1", () => {
    const src =
      "?bs 0.6\n" +
      "fn readId() uses { fs } -> string {\n" +
      "  const raw = fs.readText('/a')?;\n" +
      "  return raw;\n" +
      "}\n";
    const out1 = compile(src);
    const out2 = compile(src);
    expect(out1).toContain('__r1');
    expect(out2).toContain('__r1');
    // No bleed: __r2 must not appear when there's only one ? per call
    expect(out1).not.toContain('__r2');
    expect(out2).not.toContain('__r2');
  });
});

// ---------------------------------------------------------------------------
// Versioning: ? works on all supported pins
// ---------------------------------------------------------------------------

describe("? operator — version agnostic", () => {
  it("rewrites ? on ?bs 0.1", () => {
    const src = "?bs 0.1\nfn f() -> string { const x = doThing()?; return x; }\n";
    const out = compile(src);
    expect(out).toContain('kind === "err"');
  });

  it("rewrites ? on ?bs 0.5", () => {
    const src = "?bs 0.5\nfn f() -> string { const x = doThing()?; return x; }\n";
    const out = compile(src);
    expect(out).toContain('kind === "err"');
  });

  it("rewrites ? on ?bs 0.9", () => {
    const src = "?bs 0.9\nfn f() -> string { const x = doThing()?; return x; }\n";
    const out = compile(src);
    expect(out).toContain('kind === "err"');
  });
});
