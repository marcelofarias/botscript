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

  it("does not auto-import user-facing names like `ok`", () => {
    const out = t(`fn x() -> Result<number, string> { return ok(1); }\n`);
    // `ok` is a user-facing name — the compiler does not import it for you.
    expect(out).not.toMatch(/import \{[^}]*\bok\b[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("does not double-import when user already imports compiler helpers explicitly", () => {
    const out = t(
      `import { $enter } from "@mbfarias/botscript-runtime";\nfn x() uses { net } -> void { }\n`,
    );
    const matches = out.match(/from "@mbfarias\/botscript-runtime"/g) ?? [];
    expect(matches.length).toBe(1);
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
  });
});
