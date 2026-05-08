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
    const src = `?primer
fn slug(s: string) -> string = pure { s.toLowerCase().replaceAll(" ", "-") }

fn loadUser(id: string) uses { net } -> Result<{name: string}, string> {
  let res = http.get(\`/u/\${id}\`)?
  ok({ name: id })
}

test "slug works" {
  assert slug("Hello World") === "hello-world";
}
`;
    const out = t(src);
    expect(out).toMatch(/botscript v0\.1 — primer/);
    expect(out).toContain("function slug(s: string): string");
    expect(out).toContain("function loadUser(id: string)");
    expect(out).toContain("$enter");
    expect(out).toContain("$test");
    expect(out).toContain("$assert");
    expect(out).toContain("__r1");
  });
});
