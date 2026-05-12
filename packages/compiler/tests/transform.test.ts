import { describe, expect, it } from "vitest";

import { transform } from "../src/index.js";

const t = (src: string) => transform(src).code;
const v = (src: string) => transform(src).version;

describe("?primer", () => {
  it("strips the directive and prepends a primer comment", () => {
    const out = t(`?primer\nconst x = 1;\n`);
    expect(out).toMatch(/botscript v0\.1 — primer/);
    // The directive itself must not appear at line-start outside the comment block.
    expect(out).not.toMatch(/^\s*\?primer\s*$/m);
    expect(out).toMatch(/const x = 1;/);
  });

  it("only triggers when ?primer is the first non-comment line", () => {
    const out = t(`const x = 1;\n?primer\n`);
    expect(out).toContain("?primer");
    expect(out).not.toMatch(/botscript v0\.1 — primer/);
  });
});

describe("test", () => {
  it("rewrites test \"name\" { body } to $test(...)", () => {
    const out = t(`test "lowercases" { expect(s.toLowerCase()).toBe("a"); }\n`);
    expect(out).toMatch(/\$test\("lowercases", async \(\) => \{[^}]*\}\);/);
  });

  it("supports single-quoted name", () => {
    const out = t(`test 'a' { 1; }\n`);
    expect(out).toContain(`$test('a', async () => `);
  });

  it("leaves identifier `test` alone if not followed by string", () => {
    const out = t(`function test() { return 1; }\n`);
    expect(out).toContain("function test()");
  });
});

describe("fn", () => {
  it("rewrites fn with uses { } -> Type { body } to $enter wrapper", () => {
    const out = t(`fn ping() uses { net } -> string { return "pong"; }\n`);
    expect(out).toMatch(/function ping\(\): string \{[\s\S]*\$enter\(\["net"\] as const/);
    expect(out).toContain('return "pong";');
  });

  it("supports empty uses (== pure)", () => {
    const out = t(`fn ident(x: number) -> number { return x; }\n`);
    expect(out).toContain("function ident(x: number): number");
    expect(out).toContain("$enter([] as const");
  });

  it("supports = pure { expr } shorthand", () => {
    const out = t(`fn slug(s: string) -> string = pure { s.toLowerCase() }\n`);
    expect(out).toContain("function slug(s: string): string");
    expect(out).toContain("$enter([] as const");
    expect(out).toContain("return s.toLowerCase();");
  });

  it("propagates capabilities to $enter call", () => {
    const out = t(`fn x() uses { net, fs, time } -> void { }\n`);
    expect(out).toMatch(/\$enter\(\["net", "fs", "time"\] as const/);
  });

  it("supports = match s { … } single-expression body", () => {
    const out = t(
      `fn area(s: Shape) -> number = match s {\n  Circle { r } -> Math.PI * r * r;\n  Square { side } -> side * side\n}\n`,
    );
    expect(out).toContain("function area(s: Shape): number");
    // The match should be inside the wrapped body (which gets transformed by the match pass).
    expect(out).toContain("$match(s,");
    expect(out).not.toMatch(/^fn /m);
  });

  it("supports = arbitrary single-expression body", () => {
    const out = t(`fn double(n: number) -> number = n * 2\n`);
    expect(out).toContain("function double(n: number): number");
    expect(out).toContain("return n * 2;");
  });

  it("emits async () => for the inner $enter callback when fn is async", () => {
    const out = t(
      `async fn loadUser(id: string) uses { net } -> Promise<User> {\n  const r = await fetch(id);\n  return r as User;\n}\n`,
    );
    // Outer `async function` survives because it sat in the prefix; inner
    // arrow MUST be async so `await` doesn't blow up.
    expect(out).toMatch(/async function loadUser/);
    expect(out).toMatch(/\$enter\(\["net"\] as const, async \(\) => \{/);
  });

  it("supports object literal return types", () => {
    const out = t(
      `fn make() -> { code: string; error: string | null } {\n  return { code: "x", error: null };\n}\n`,
    );
    expect(out).toContain("function make(): { code: string; error: string | null }");
    expect(out).toContain('return { code: "x", error: null };');
    // The body block, not the type, gets the $enter wrapper.
    expect(out).toMatch(/error: string \| null \} \{[\s\S]*\$enter/);
  });

  it("non-async fn keeps a sync inner arrow", () => {
    const out = t(`fn id<T>(x: T) -> T = pure { x }\n`);
    expect(out).toMatch(/\$enter\(\[\] as const, \(\) => \{/);
    expect(out).not.toMatch(/async \(\) =>/);
  });
});

describe("blocks", () => {
  it("pure { expr } at expression position becomes $enter([], () => expr)", () => {
    const out = t(`const x = pure { 1 + 2 };\n`);
    expect(out).toContain("$enter([] as const, () => { return 1 + 2; })");
  });

  it("io { expr } becomes IIFE", () => {
    const out = t(`const x = io { fetchSomething() };\n`);
    expect(out).toMatch(/\(\(\) => \{ return fetchSomething\(\); \}\)\(\)/);
  });

  it("pure { let stmt; tail expr } lowers each statement and returns the tail (probe A)", () => {
    const src = `fn classify(s: string) -> string = pure {\n  let lower = s.toLowerCase()\n  lower\n}\n`;
    const out = t(src);
    // Must NOT emit `return let ...` (invalid TS).
    expect(out).not.toMatch(/return\s+let\b/);
    expect(out).not.toMatch(/return\s+const\b/);
    expect(out).not.toMatch(/return\s+var\b/);
    // The `let` declaration must remain a top-level statement,
    // and the tail expression must be `return`-wrapped.
    expect(out).toContain("let lower = s.toLowerCase()");
    expect(out).toMatch(/return\s+lower\s*;/);
  });

  it("pure { let stmt; tail expr } at bare expression position lowers correctly", () => {
    const src = `const x = pure {\n  let a = 1\n  a + 2\n};\n`;
    const out = t(src);
    expect(out).not.toMatch(/return\s+let\b/);
    expect(out).toMatch(/let a = 1\s*;/);
    expect(out).toMatch(/return\s+a \+ 2\s*;/);
  });

  it("pure { single expr } still emits a single `return expr;` (no regression)", () => {
    const out = t(`const x = pure { 1 + 2 };\n`);
    expect(out).toContain("$enter([] as const, () => { return 1 + 2; })");
  });

  it("pure { let m = /regex with slashes/.test(x); m } handles regex literals (probe E)", () => {
    const src =
      `?bs 0.4\n\n` +
      `fn match_url(x: string) -> boolean = pure {\n` +
      `  let m = /https?:\\/\\//.test(x)\n` +
      `  m\n` +
      `}\n`;
    const out = t(src);
    // Must NOT emit `return let ...` (invalid TS).
    expect(out).not.toMatch(/return\s+let\b/);
    // The regex literal must survive intact — its inner `//` must not be
    // mis-read as a line comment that swallows `.test(x)` and beyond.
    expect(out).toContain("/https?:\\/\\//.test(x)");
    // The `let` line is a top-level statement; `m` is the return.
    expect(out).toMatch(/let m = \/https\?:\\\/\\\/\/\.test\(x\)\s*;/);
    expect(out).toMatch(/return\s+m\s*;/);
  });

  it("pure { let p = /regex containing slashes/; tail-stmt } splits regex from next stmt (probe E2)", () => {
    // Variant of probe E where nothing trails the regex on its line. The
    // body-splitter must still recognize the newline as a statement
    // boundary even though the regex's inner `//` would otherwise be
    // mis-read as a line comment that runs to EOL (and whose last char `/`
    // is a continuation token that suppresses the split).
    const src =
      `?bs 0.4\n\n` +
      `fn ext(s: string) -> boolean = pure {\n` +
      `  let p = /\\/\\//\n` +
      `  p.test(s)\n` +
      `}\n`;
    const out = t(src);
    // The let line and the p.test(s) line MUST be split into two
    // statements. The tail must be return-wrapped.
    expect(out).toMatch(/let p = \/\\\/\\\/\/\s*;/);
    expect(out).toMatch(/return\s+p\.test\(s\)\s*;/);
    // And the `let` keyword must not bleed into the return.
    expect(out).not.toMatch(/return\s+let\b/);
  });

  it("pure { let total = a + // comment\\n b; total } skips trailing line comments (probe F)", () => {
    const src =
      `?bs 0.4\n\n` +
      `fn add(a: number, b: number) -> number = pure {\n` +
      `  let total = a + // running sum\n` +
      `    b\n` +
      `  total\n` +
      `}\n`;
    const out = t(src);
    // Must NOT emit `return let ...` (invalid TS).
    expect(out).not.toMatch(/return\s+let\b/);
    // The `+\n    b` must be treated as a continuation, not a split:
    // when `lastSignificantChar` walks back past a trailing line comment,
    // it should land on `+`, recognize the line as continuing, and not
    // split. The buggy behavior emits `b` as its own segment, producing
    // `let total = a + // running sum; b; return total;` — invalid TS
    // (`let total = a + ` with the rest swallowed by the line comment).
    // The fix should produce `let total = a + b;` as a single statement.
    expect(out).not.toMatch(/;\s*b\s*;/);
    // The buggy splitter emitted everything on one line, putting a literal
    // `;` immediately after the `// running sum` comment so the `;`
    // intended to terminate the let statement got swallowed. The fix
    // preserves the original newline so the comment ends naturally.
    expect(out).not.toMatch(/\+ \/\/ running sum;/);
    // The `let total = a + b` must compile as valid TS; the closing `;` of
    // the let statement appears on a line where the line-comment scanner
    // has already exited.
    expect(out).toMatch(/let total = a \+[\s\S]*?\bb\b\s*;/);
    // `total` is the tail expression and gets return-wrapped.
    expect(out).toMatch(/return\s+total\s*;/);
  });
});

describe("match", () => {
  it("rewrites tag-with-binds patterns", () => {
    const out = t(
      `const r = match s { Circle { r } -> Math.PI * r * r; Square { side } -> side * side };\n`,
    );
    expect(out).toContain("$match(s,");
    expect(out).toContain('$tagMatch("Circle", ["r"])');
    expect(out).toContain('$tagMatch("Square", ["side"])');
  });

  it("supports wildcard arm", () => {
    const out = t(`const r = match x { "a" -> 1; _ -> 0 };\n`);
    expect(out).toContain('$literalMatch("a")');
    expect(out).toContain("$wildcard()");
  });

  it("supports parenthesized scrutinee with object literal", () => {
    const out = t(`const r = match (foo({a: 1})) { Tag -> 1 };\n`);
    expect(out).toContain("$match(foo({a: 1})");
  });
});

describe("? unwrap", () => {
  it("rewrites let x = expr?", () => {
    const out = t(`let x = doStuff()?\n`);
    expect(out).toContain("const __r1 = doStuff();");
    expect(out).toMatch(/if \(__r1\.kind === "err"\) return __r1;/);
    expect(out).toContain("let x = __r1.value;");
  });

  it("rewrites const x = expr?", () => {
    const out = t(`const x = doStuff()?\n`);
    expect(out).toContain("const x = __r1.value;");
  });

  it("rewrites return expr?", () => {
    const out = t(`return doStuff()?\n`);
    expect(out).toContain("return __r1.value;");
  });

  it("rewrites bare expr?", () => {
    const out = t(`doStuff()?\n`);
    expect(out).toMatch(/const __r1 = doStuff\(\);[\s\S]*if \(__r1\.kind === "err"\) return __r1;/);
    expect(out).not.toMatch(/= __r1\.value/);
  });

  it("ignores optional chaining like foo?.bar", () => {
    const out = t(`const x = foo?.bar;\n`);
    expect(out).toContain("foo?.bar");
    expect(out).not.toContain("__r1");
  });

  it("uses fresh ids for multiple unwraps", () => {
    const out = t(`let a = f()?\nlet b = g()?\n`);
    expect(out).toContain("__r1");
    expect(out).toContain("__r2");
  });

  it("ignores `?` inside JSX text content", () => {
    // Regression: the lexer doesn't pair `<` and `>`, so the walk-back from
    // `?` would cross into JSX text and the classifier would treat the
    // surrounding markup as an unwrappable expression, leaking
    // `if (__r1.kind === "err") return __r1;` into the rendered DOM.
    const out = t(
      `?bs 0.4\nfn Demo() -> any = (\n    <p>why not just stricter TypeScript?</p>\n  )\n`,
    );
    expect(out).not.toContain("__r1");
    expect(out).toContain("why not just stricter TypeScript?");
  });

  it("ignores `?` at the end of a JSX text line followed by a closing tag", () => {
    // Multi-line JSX where the `?` ends a text line and the closing tag
    // sits on the next line — the shape from the live botscript.org link.
    const out = t(
      `?bs 0.4\nfn Demo() -> any = (\n    <a href="x">\n      why not just stricter TypeScript?\n    </a>\n  )\n`,
    );
    expect(out).not.toContain("__r1");
    expect(out).not.toMatch(/kind === "err"/);
  });
});

describe("assert", () => {
  it("rewrites assert expr to $assert(expr)", () => {
    const out = t(`assert 1 + 1 === 2;\n`);
    expect(out).toContain("$assert(1 + 1 === 2);");
  });

  it("only triggers in statement position", () => {
    const out = t(`obj.assert = true;\n`);
    expect(out).toContain("obj.assert = true;");
    expect(out).not.toContain("$assert");
  });
});

describe("imports", () => {
  it("auto-prepends import for emitted helpers", () => {
    const out = t(`fn x() uses { net } -> void { }\n`);
    expect(out).toMatch(/^import \{ \$enter \} from "@mbfarias\/botscript-runtime";/m);
  });

  it("does not auto-import user-facing names like `ok` (pre-0.6 behaviour)", () => {
    // No version pin -> resolved to 0.1; stdlib auto-import only kicks in at 0.6+.
    const out = t(`fn x() -> Result<number, string> { return ok(1); }\n`);
    expect(out).not.toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("auto-imports Result (as type) and ok (as value) at ?bs 0.6", () => {
    // `Result` is a runtime-exported TS type — it must land in an
    // `import type { ... }` so the output is safe under verbatimModuleSyntax.
    // `ok` is a value, so it sits in the regular value import.
    const out = t(`?bs 0.6\nfn x() -> Result<number, string> = ok(1)\n`);
    expect(out).toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).toMatch(/import type \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // Result must NOT appear in the value-import bag.
    expect(out).not.toMatch(/import \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("auto-imports http, Result, and ok together at ?bs 0.6 — types and values split", () => {
    const src =
      `?bs 0.6\n` +
      `async fn loadUser(id: string) uses { net } -> Promise<Result<{name: string}, Error>> {\n` +
      `  let res = (await http.get(\`/u/\${id}\`))?\n` +
      `  return ok({ name: id })\n` +
      `}\n`;
    const out = t(src);
    // Values land in the value import.
    expect(out).toMatch(/import \{[^}]*\bhttp\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // Result lands in the type import — not in the value import.
    expect(out).toMatch(/import type \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).not.toMatch(/import \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // Two import statements: one value, one type.
    const matches = out.match(/from "@mbfarias\/botscript-runtime"/g) ?? [];
    expect(matches.length).toBe(2);
    // Value import comes ABOVE the type import. (Convention used across
    // the codebase and the PR description.) The two lines are the only
    // runtime imports in the file, so positional comparison is unambiguous.
    const valuePos = out.search(/^import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/m);
    const typePos = out.search(/^import type \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/m);
    expect(valuePos).toBeGreaterThan(-1);
    expect(typePos).toBeGreaterThan(-1);
    expect(valuePos).toBeLessThan(typePos);
  });

  it("does not double-import stdlib symbols when user already has a runtime import at 0.6", () => {
    const src =
      `?bs 0.6\n` +
      `import { ok, Result } from "@mbfarias/botscript-runtime";\n` +
      `fn x() -> Result<number, string> = ok(1)\n`;
    const out = t(src);
    // The user's pre-existing import is preserved as-is (we merge into it but
    // do not split their existing entries). Auto-import only adds NEW
    // missing symbols; in this snippet `ok` and `Result` are both present in
    // the user's import so nothing new is added.
    const matches = out.match(/from "@mbfarias\/botscript-runtime"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("does not double-import when user already imports compiler helpers explicitly", () => {
    const out = t(
      `import { $enter } from "@mbfarias/botscript-runtime";\nfn x() uses { net } -> void { }\n`,
    );
    const matches = out.match(/from "@mbfarias\/botscript-runtime"/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it("does not spuriously import `err`/`ok` from compiler-emitted string literals (false-positive guard)", () => {
    // The `?` desugaring emits `kind === "err"` and `kind === "ok"` as string
    // literals in the compiled TS. Without blanking string content before
    // scanning, those would cause `err` and `ok` to be auto-imported even when
    // the user never referenced them directly.
    const src =
      `?bs 0.6\n` +
      `async fn check(id: string) uses { net } -> Promise<Result<boolean, Error>> {\n` +
      `  let res = await http.get(\`/u/\${id}\`)?\n` +
      `  ok(true)\n` +
      `}\n`;
    const out = t(src);
    // `ok` and `http` should be imported because the USER wrote them.
    expect(out).toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).toMatch(/import \{[^}]*\bhttp\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // `err` should NOT be imported — it only appears in the compiler-emitted
    // `kind === "err"` check string, not in the user's source.
    expect(out).not.toMatch(/import \{[^}]*\berr\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // The source references the `Result` type, so we expect ONE value import
    // ($enter, http, ok) plus ONE type import (Result).
    expect(out).toMatch(/import type \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    const matches = out.match(/from "@mbfarias\/botscript-runtime"/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it("detects stdlib symbols used inside template-literal ${} interpolations", () => {
    // The scanner blanks the literal-text segments of templates but keeps
    // the contents of `${...}` interpolations — those are real expressions.
    // Here `ok(1)` lives only inside an interpolation; auto-import must
    // still pick `ok` up.
    const out = t(
      `?bs 0.6\nfn x() -> string = pure { \`r=\${ok(1).kind}\` }\n`,
    );
    expect(out).toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("does not collapse a type-only symbol into the user's existing value import", () => {
    // The user has only `ok` imported (a value). The source introduces a
    // new use of the `Result` type. Auto-import must emit a SEPARATE
    // `import type { Result }` line rather than appending Result to the
    // user's value bag (which would break verbatimModuleSyntax).
    const src =
      `?bs 0.6\n` +
      `import { ok } from "@mbfarias/botscript-runtime";\n` +
      `fn x() -> Result<number, string> = ok(1)\n`;
    const out = t(src);
    expect(out).toMatch(/import type \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).not.toMatch(/import \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("recognises a pre-existing `import type` line and does not duplicate it", () => {
    // User already imports Result via `import type` — the matcher must
    // see that and skip re-adding it.
    const src =
      `?bs 0.6\n` +
      `import type { Result } from "@mbfarias/botscript-runtime";\n` +
      `fn x() -> Result<number, string> = ok(1)\n`;
    const out = t(src);
    // Exactly one type-import line for Result (the user's), plus one value
    // import for the newly-needed `ok`.
    const typeImports = out.match(/import type \{[^}]*\} from "@mbfarias\/botscript-runtime"/g) ?? [];
    expect(typeImports.length).toBe(1);
    expect(out).toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("strings nested inside template ${} interpolations don't leak stdlib names", () => {
    // The scanner recursively blanks strings/comments inside `${...}`, so
    // `${"err"}` should NOT trigger an `err` auto-import — the literal
    // "err" never reaches the symbol scan. The user-written `ok(1)` outside
    // the interpolation, plus the interpolated `some(2)`, are still seen.
    const out = t(
      `?bs 0.6\nfn x() -> string = pure { \`hint=\${"err"} v=\${some(2).kind} \${ok(1).kind}\` }\n`,
    );
    expect(out).toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).toMatch(/import \{[^}]*\bsome\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // `err` only appears as a string literal inside an interpolation; it
    // must not be auto-imported.
    expect(out).not.toMatch(/import \{[^}]*\berr\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("identifier suffixes like `ok_value` do NOT trigger a spurious stdlib import", () => {
    // The scanner uses `(?<![A-Za-z0-9_$.])sym(?![A-Za-z0-9_$])` for both
    // boundaries. `_` is part of the negated class, so `ok_value` and
    // `Result_t` must not look like uses of `ok` / `Result`.
    const src =
      `?bs 0.6\n` +
      `fn x() -> number = pure {\n` +
      `  let ok_value = 1\n` +
      `  let Result_t = 2\n` +
      `  ok_value + Result_t\n` +
      `}\n`;
    const out = t(src);
    expect(out).not.toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).not.toMatch(/\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("aliased import does NOT suppress auto-importing the unaliased name", () => {
    // `import { ok as myOk } ...` binds `myOk`, not `ok`. A later use of
    // `ok(…)` is therefore unbound and must be auto-imported, not skipped.
    const src =
      `?bs 0.6\n` +
      `import { ok as myOk } from "@mbfarias/botscript-runtime";\n` +
      `fn x() -> Result<number, string> = ok(1)\n`;
    const out = t(src);
    // The merged import should contain both `myOk` (preserving the alias)
    // and a fresh `ok` so `ok(...)` resolves at runtime.
    expect(out).toMatch(/import \{[^}]*\bok\s+as\s+myOk\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).toMatch(/import \{[^}]*(?<![\w])ok(?![\w])[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("a commented-out runtime import is NOT mistaken for a real one", () => {
    // A user comment that mentions `import { ok } from "..."` must not
    // suppress the real auto-import. Without filtering comments out of the
    // existing-import probe, the regex would match and skip emitting.
    const src =
      `?bs 0.6\n` +
      `// example: import { ok } from "@mbfarias/botscript-runtime";\n` +
      `fn x() -> Result<number, string> = ok(1)\n`;
    const out = t(src);
    expect(out).toMatch(/^import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/m);
  });

  it("strings hidden inside regex literals don't leak stdlib names", () => {
    // The blanker recognises `/.../` regex literals heuristically so an
    // identifier-looking sequence inside a regex body doesn't trigger
    // auto-import. (`http` inside `/http:/` should NOT be detected.)
    const src =
      `?bs 0.6\n` +
      `fn x() -> boolean = pure { /http:\\/.+/.test("a") }\n`;
    const out = t(src);
    expect(out).not.toMatch(/import \{[^}]*\bhttp\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("is gated at ?bs 0.6 — 0.4 / 0.5 files keep their frozen, narrower import", () => {
    // 0.1 … 0.5 are SHIPPED; their emitted TS must not change because of
    // the stdlib auto-import. Only $-prefixed helpers are auto-imported
    // for those pins; stdlib names stay user-managed.
    // 0.4 still allows bare `as`; 0.5 requires `unsafe { ... }` for casts.
    // Use a 0.4-shaped source for 0.4 and an unsafe-wrapped form for 0.5
    // so both versions actually parse.
    const src04 =
      `?bs 0.4\nasync fn fetchOne(url: string) uses { net } -> Promise<string> {\n  return await http.get(url) as unknown as string\n}\n`;
    const src05 =
      `?bs 0.5\nasync fn fetchOne(url: string) uses { net } -> Promise<string> {\n  return unsafe "caller validated" { (await http.get(url)) as unknown as string }\n}\n`;
    for (const src of [src04, src05]) {
      const out = t(src);
      expect(out).not.toMatch(/import \{[^}]*\bhttp\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
      // $enter still auto-imports as before.
      expect(out).toMatch(/import \{[^}]*\$enter[^}]*\} from "@mbfarias\/botscript-runtime"/);
    }
  });
});

describe("?bs version directive", () => {
  it("defaults to latest when no directive", () => {
    expect(v(`const x = 1;\n`)).toEqual({ declared: null, resolved: "0.1" });
  });

  it("parses ?bs 0.1", () => {
    const r = transform(`?bs 0.1\nconst x = 1;\n`);
    expect(r.version).toEqual({ declared: "0.1", resolved: "0.1" });
    expect(r.code).not.toMatch(/\?bs/);
    expect(r.code).toMatch(/const x = 1;/);
  });

  it("works alongside ?primer", () => {
    const r = transform(`?bs 0.1\n?primer\nconst x = 1;\n`);
    expect(r.version.declared).toBe("0.1");
    expect(r.code).toMatch(/botscript v0\.1 — primer/);
    expect(r.code).not.toMatch(/^\s*\?bs\s/m);
  });

  it("throws on unsupported version", () => {
    expect(() => transform(`?bs 99.0\n`)).toThrow(/unsupported version/);
  });

  it("throws on malformed version", () => {
    expect(() => transform(`?bs nope\n`)).toThrow(/malformed/);
  });
});

describe("integration", () => {
  it("transforms a full example end-to-end", () => {
    // Uses async fn + await so http.get (Promise<Result>) composes with ?.
    const src = `?primer
fn slug(s: string) -> string = pure { s.toLowerCase().replaceAll(" ", "-") }

async fn loadUser(id: string) uses { net } -> Promise<Result<{name: string}, Error>> {
  let res = await http.get(\`/u/\${id}\`)?
  return ok({ name: id })
}

test "slug works" {
  assert slug("Hello World") === "hello-world";
}
`;
    const out = t(src);
    expect(out).toMatch(/botscript v0\.1 — primer/);
    expect(out).toContain("function slug(s: string): string");
    expect(out).toMatch(/async function loadUser/);
    expect(out).toContain("$enter");
    expect(out).toContain("$test");
    expect(out).toContain("$assert");
    expect(out).toContain("__r1");
  });

  it("await expr? correctly desugars await before unwrap", () => {
    // Verifies that `let x = await someAsyncResult()?` emits `await` as
    // part of the captured expression so it executes inside the async arrow.
    const src =
      `async fn fetch(url: string) uses { net } -> Promise<Result<string, Error>> {\n` +
      `  let res = await http.get(url)?\n` +
      `  return ok("done")\n` +
      `}\n`;
    const out = t(src);
    // The `await` must be part of the captured expression, not silently dropped.
    expect(out).toContain("const __r1 = await http.get(url);");
    expect(out).toMatch(/if \(__r1\.kind === "err"\) return __r1;/);
    expect(out).toContain("let res = __r1.value;");
    // The captured `await` must live INSIDE the `$enter(..., async () => { ... })`
    // arrow body. If the desugar accidentally hoisted `__r1 = await http.get(url)`
    // out of the arrow, the assertions above would still pass but the program
    // would be broken (await at sync top of an async function wrapper) and the
    // `net` capability frame would be wrong. Lock the structural invariant.
    const arrowStart = out.indexOf("async () => {");
    const arrowEnd = out.indexOf("})", arrowStart);
    const r1Pos = out.indexOf("const __r1 = await http.get(url);");
    expect(arrowStart).toBeGreaterThan(-1);
    expect(arrowEnd).toBeGreaterThan(arrowStart);
    expect(r1Pos).toBeGreaterThan(arrowStart);
    expect(r1Pos).toBeLessThan(arrowEnd);
  });

  it("primer loadUser idiom at ?bs 0.6 compiles without manual import preamble", () => {
    // Mirrors the primer's first canonical idiom. The user copies this verbatim
    // (no explicit import statement) and expects it to compile — stdlib
    // auto-import at 0.6 is what makes that work.
    const src =
      `?bs 0.6\n` +
      `async fn loadUser(id: string) uses { net } -> Promise<Result<string, Error>> {\n` +
      `  let res = (await http.get(\`/users/\${id}\`))?\n` +
      `  return ok(unsafe "shape validated" { res as string })\n` +
      `}\n`;
    const out = t(src);
    // stdlib values auto-imported — no manual import in the source above.
    expect(out).toMatch(/import \{[^}]*\bhttp\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    expect(out).toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // Result is a type-only export.
    expect(out).toMatch(/import type \{[^}]*\bResult\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
    // Structural transforms still applied.
    expect(out).toMatch(/async function loadUser/);
    expect(out).toContain(`$enter(["net"] as const`);
    expect(out).toContain("const __r1 = (await http.get(`/users/");
    expect(out).toMatch(/if \(__r1\.kind === "err"\) return __r1;/);
  });
});
