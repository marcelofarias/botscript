import { describe, expect, it } from "vitest";

import { formatSource, transform } from "../src/index.js";

describe("formatSource — line-level cleanup", () => {
  it("strips trailing whitespace on each line", () => {
    const src = "?bs 0.4\nfn x() -> number = 1   \n";
    const out = formatSource(src);
    expect(out).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("converts leading tabs to two spaces", () => {
    // Multi-statement body so the brace→expr rewrite doesn't fire and we're
    // really exercising the indent-normalization rule.
    const src = "?bs 0.4\nfn x() -> number {\n\tconst y = 1;\n\treturn y;\n}\n";
    const out = formatSource(src);
    expect(out).toBe(
      "?bs 0.4\nfn x() -> number {\n  const y = 1;\n  return y;\n}\n",
    );
  });

  it("converts mixed tabs+spaces in indentation to spaces", () => {
    const src = "?bs 0.4\nfn x() -> number {\n\t  const y = 1;\n\t  return y;\n}\n";
    const out = formatSource(src);
    // Tab → 2 spaces, plus the original 2 spaces = 4 spaces of indent.
    expect(out).toBe(
      "?bs 0.4\nfn x() -> number {\n    const y = 1;\n    return y;\n}\n",
    );
  });

  it("preserves non-leading whitespace inside comments verbatim", () => {
    const src = "?bs 0.4\n// hello   world\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs 0.4\n// hello   world\nfn x() -> number = 1\n");
  });

  it("strips trailing spaces from line comments", () => {
    const src = "?bs 0.4\n// hello   \nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs 0.4\n// hello\nfn x() -> number = 1\n");
  });

  it("strips trailing CR (CRLF input) from line comments", () => {
    const src = "?bs 0.4\r\n// hello\r\nfn x() -> number = 1\r\n";
    expect(formatSource(src)).toBe("?bs 0.4\n// hello\nfn x() -> number = 1\n");
  });

  it("preserves whitespace inside strings", () => {
    const src = '?bs 0.4\nfn x() -> string = pure { "hello   world" }\n';
    expect(formatSource(src)).toBe(
      '?bs 0.4\nfn x() -> string = pure { "hello   world" }\n',
    );
  });

  it("preserves whitespace inside template literals", () => {
    const src = "?bs 0.4\nfn x() -> string = pure { `a   b` }\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> string = pure { `a   b` }\n");
  });
});

describe("formatSource — blank lines", () => {
  it("collapses runs of 2+ blank lines to a single blank line", () => {
    const src = "?bs 0.4\n\n\n\nfn x() -> number = 1\n";
    const out = formatSource(src);
    expect(out).toBe("?bs 0.4\n\nfn x() -> number = 1\n");
  });

  it("keeps a single blank line as-is", () => {
    const src = "?bs 0.4\n\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe(src);
  });

  it("strips leading blank lines before the first directive", () => {
    const src = "\n\n\n?bs 0.4\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("treats a whitespace-only line as a blank line and strips it", () => {
    const src = "?bs 0.4\nfn a() -> number = 1\n   \nfn b() -> number = 2\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn a() -> number = 1\n\nfn b() -> number = 2\n",
    );
  });
});

describe("formatSource — mid-line whitespace", () => {
  it("collapses runs of multiple spaces between tokens to a single space", () => {
    const src = "?bs 0.4\nfn   x()   ->   number   =   1\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("collapses alignment whitespace inside function bodies", () => {
    const src =
      '?bs 0.4\nfn label(x: unknown) -> string = match x {\n  "a"     -> "x"\n  "bb"    -> "y"\n}\n';
    expect(formatSource(src)).toBe(
      '?bs 0.4\nfn label(x: unknown) -> string = match x {\n  "a" -> "x"\n  "bb" -> "y"\n}\n',
    );
  });
});

describe("formatSource — whitespace insertion", () => {
  it("inserts a space after `,` between args", () => {
    const src = "?bs 0.4\nfn add(a: number,b: number) -> number = a + b\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n",
    );
  });

  it("inserts a space after `:` in type annotations", () => {
    const src = "?bs 0.4\nfn add(a:number, b:number) -> number = a + b\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n",
    );
  });

  it("inserts space on each side of `->`", () => {
    const src = "?bs 0.4\nfn x()->number = 1\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("inserts space on each side of `=>`", () => {
    const src = "?bs 0.4\nconst f = (x: number)=>x + 1;\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nconst f = (x: number) => x + 1;\n",
    );
  });

  it("inserts space on each side of `??`", () => {
    const src = "?bs 0.4\nconst y = a??b;\n";
    expect(formatSource(src)).toBe("?bs 0.4\nconst y = a ?? b;\n");
  });

  it("does not add a space before a closing bracket after `,`", () => {
    const src = "?bs 0.4\nconst xs = [1, 2, 3,];\n";
    expect(formatSource(src)).toBe(src);
  });

  it("preserves JSX attribute syntax (no space around `=` in attributes)", () => {
    // Use expression-body form: brace→expr rewrite (PR #21) would collapse
    // `{ return <a...>; }` to `= <a...>` and the test would stop exercising
    // JSX `=`-spacing; expression-body makes the intent unambiguous.
    const src = '?bs 0.4\nfn Demo() -> any = <a href="x">hi</a>\n';
    expect(formatSource(src)).toBe(src);
  });

  it("inserts space on each side of `=` in let/const declarations", () => {
    const src = "?bs 0.4\nconst x=1;\nlet y=2;\n";
    expect(formatSource(src)).toBe("?bs 0.4\nconst x = 1;\nlet y = 2;\n");
  });

  it("inserts space on each side of `=` in `fn x() -> T = body`", () => {
    const src = "?bs 0.4\nfn x() -> number=42\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 42\n");
  });

  it("inserts space on each side of `=` in tagged-union type aliases", () => {
    const src =
      "?bs 0.4\ntype Shape=Circle { r: number } | Square { side: number };\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\ntype Shape = Circle { r: number } | Square { side: number };\n",
    );
  });

  it("inserts space around `=` in object-destructuring with default", () => {
    const src = "?bs 0.4\nconst { a=1, b=2 } = obj;\n";
    expect(formatSource(src)).toBe("?bs 0.4\nconst { a = 1, b = 2 } = obj;\n");
  });

  it("preserves JSX attribute `=` with `{expr}` value (no space)", () => {
    // canonical: single-return body collapses to `=`-form (RFC #13, PR #21).
    const src =
      '?bs 0.4\nfn Demo() -> any = <button onClick={fn}>x</button>\n';
    expect(formatSource(src)).toBe(src);
  });

  it("preserves JSX attribute `=` across multiple attrs on one tag", () => {
    const src =
      '?bs 0.4\nfn Demo() -> any = <a href="x" target="_blank">hi</a>\n';
    expect(formatSource(src)).toBe(src);
  });

  it("preserves JSX self-closing tag attributes", () => {
    const src = '?bs 0.4\nfn Demo() -> any = <input type="text" />\n';
    expect(formatSource(src)).toBe(src);
  });

  it("preserves JSX `=` when an earlier attr's `{expr}` contains `>`", () => {
    // Regression: `>` inside `onClick={a > b ? x : y}` must NOT close the
    // JSX open-tag state, or the second attribute's `=` gets spaces.
    const src =
      '?bs 0.4\nfn Demo() -> any = <div onClick={a > b ? x : y} title="hi">x</div>\n';
    expect(formatSource(src)).toBe(src);
  });

  it("preserves JSX `=` when an earlier attr's `{expr}` contains `<`", () => {
    const src =
      '?bs 0.4\nfn Demo() -> any = <div data-cmp={a < b} role="x">y</div>\n';
    expect(formatSource(src)).toBe(src);
  });

  it("preserves JSX `=` when `{expr}` contains nested braces", () => {
    const src =
      '?bs 0.4\nfn Demo() -> any = <div style={{ color: "red" }} title="hi">x</div>\n';
    expect(formatSource(src)).toBe(src);
  });

  it("closes JSX open-tag state on the outer `>` after a `{expr}` attr", () => {
    // After the open tag closes, an `=` outside JSX must get spaces again.
    // The `}` of `onClick={fn}` resolves brace depth to 0; the next `>`
    // closes the tag; the `; const x=1` after the JSX must be normalized.
    const src =
      '?bs 0.4\nfn f() -> any {\n  const x=1;\n  return <button onClick={fn} disabled={!ok}>go</button>;\n}\n';
    expect(formatSource(src)).toBe(
      '?bs 0.4\nfn f() -> any {\n  const x = 1;\n  return <button onClick={fn} disabled={!ok}>go</button>;\n}\n',
    );
  });

  it("handles a sibling JSX element after a closing tag (no leak)", () => {
    // The lexer munches `</div>` into `<` + regex token `/div>`; the next
    // `<div className=...>` must still be detected as a JSX open. Mirrors
    // the playground regression CI caught.
    const src =
      '?bs 0.4\nfn f() -> any = (\n  <header>\n    <div>x</div>\n    <div className="y">z</div>\n  </header>\n)\n';
    expect(formatSource(src)).toBe(src);
  });

  it("leaves `<` inside a JSX child expression as a comparison", () => {
    // `<div>{a < b}</div>` — the `<` between idents inside a `{...}`
    // child container is a comparison, NOT a sibling open tag. If it
    // flipped JSX state, subsequent attribute `=` could get spaces.
    const src =
      '?bs 0.4\nfn f() -> any = (\n  <div>{a < b}</div>\n  <span className="y">z</span>\n)\n';
    expect(formatSource(src)).toBe(src);
  });

  it("recognizes JSX inside a child expression when prev is expression position", () => {
    // `cond ? <X/> : <Y/>` and `arr.map((p) => (<Foo />))` are both
    // legitimate JSX opens INSIDE a `{...}` child expression. The
    // expression-position guard (prev is `?`, `:`, `,`, `(`, ...) lets
    // them in.
    const src =
      '?bs 0.4\nfn f() -> any = (\n  <ol>\n    {xs.map((p) => (\n      <li>\n        <a href={p.url}>\n          #{p.number}\n          <span className="x" aria-hidden>up</span>\n        </a>\n      </li>\n    ))}\n  </ol>\n)\n';
    expect(formatSource(src)).toBe(src);
  });

  it("preserves JSX fragments and their attributed children", () => {
    // Fragment open `<>` and close `</>` must increment/decrement
    // nesting; otherwise sibling `<div className="x" />` inside the
    // fragment loses tag detection and `=` gets spaces.
    const src =
      '?bs 0.4\nfn f() -> any = (\n  <>\n    {ok}\n    <div className="x" />\n  </>\n)\n';
    expect(formatSource(src)).toBe(src);
  });

  it("applies normal `=` spacing inside a JSX attribute `{expr}`", () => {
    // The attribute `=` (between attr name and `{...}`) has no space.
    // But inside the `{...}`, regular JS rules apply — a stray
    // assignment-shaped `=` gets canonical spacing. Same for any other
    // `=` token that lands inside an attribute expression.
    const src =
      '?bs 0.4\nfn f() -> any = (\n  <button onClick={() => x=1}>go</button>\n)\n';
    expect(formatSource(src)).toBe(
      '?bs 0.4\nfn f() -> any = (\n  <button onClick={() => x = 1}>go</button>\n)\n',
    );
  });

  it("leaves `<` after a real regex literal as a comparison", () => {
    // A regex literal `/re/` is NOT expression-position for the next
    // token. `x = /re/ < y` is a comparison, NOT a JSX open. If this
    // were misclassified, the formatter could later flip into JSX-open
    // mode and suppress `=` spacing in unrelated assignment-form code.
    const src = '?bs 0.4\nconst hit = /re/.test(s);\nconst ok = a < b;\n';
    expect(formatSource(src)).toBe(src);
  });

  it("leaves `<` after postfix `++` / `--` as a comparison", () => {
    // `a++ < b` and `a-- < b` are comparisons; the postfix increment
    // ends an expression, so the next `<` is not in expression position.
    const src = '?bs 0.4\nconst ok = a++ < b && c-- < d;\n';
    expect(formatSource(src)).toBe(src);
  });

  it("inserts space around `=` in a const that follows JSX (no leak)", () => {
    // The closing `</div>` must reset JSX-tag tracking so the next `=`
    // gets canonical spaces.
    const src =
      '?bs 0.4\nfn f() -> any {\n  const x=1;\n  return <div>x</div>;\n}\n';
    expect(formatSource(src)).toBe(
      '?bs 0.4\nfn f() -> any {\n  const x = 1;\n  return <div>x</div>;\n}\n',
    );
  });

  it("leaves TS generics alone — `Result<T, E>` is not JSX", () => {
    const src = "?bs 0.4\nlet xs: Array<number> = [];\n";
    expect(formatSource(src)).toBe("?bs 0.4\nlet xs: Array<number> = [];\n");
  });

  it("leaves comparison operators alone — `a < b` is not JSX", () => {
    const src = "?bs 0.4\nconst ok = a < b && c > d;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("`<` after member-access `.` is a comparison, not a JSX open", () => {
    // `a.foo < Bar` — the `.` is in `prev` position when `<` fires.
    // `.` must NOT count as expression-position, or `< Bar` would be
    // misclassified as a JSX open tag and leave `inJsxOpenTag` stuck.
    const src = "?bs 0.4\nconst ok = a.foo < Bar;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("is idempotent on `=` rewrites", () => {
    const src = "?bs 0.4\nconst x=1;\nfn f() -> number=2\n";
    const once = formatSource(src);
    expect(formatSource(once)).toBe(once);
  });

  it("collapses RFC #13's three example forms together (whitespace half)", () => {
    // The brace-vs-expression equivalence is a separate phase-2 PR; here we
    // assert that when `=` is already in canonical form, the comma/colon/
    // arrow insertion alone unifies the spacing variants.
    const a = "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n";
    const b = "?bs 0.4\nfn add(a:number,b:number) -> number = a + b\n";
    expect(formatSource(a)).toBe(formatSource(b));
  });
});

describe("formatSource — binary operator spacing", () => {
  // Context-dependent operators (could be unary or binary; classification
  // depends on whether `prev` ends an expression).

  it("inserts a space on each side of binary `+`", () => {
    const src = "?bs 0.4\nfn add(a: number, b: number) -> number = a+b\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n",
    );
  });

  it("inserts a space on each side of binary `-`", () => {
    const src = "?bs 0.4\nfn sub(a: number, b: number) -> number = a-b\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn sub(a: number, b: number) -> number = a - b\n",
    );
  });

  it("inserts a space on each side of binary `*` `/` `%`", () => {
    const src =
      "?bs 0.4\nfn mix(a: number, b: number, c: number) -> number = a*b/c%a\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn mix(a: number, b: number, c: number) -> number = a * b / c % a\n",
    );
  });

  it("leaves unary `-` alone (prev is `=`, expression position)", () => {
    const src = "?bs 0.4\nconst x = -1;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("leaves unary `+` alone after a binary operator", () => {
    const src = "?bs 0.4\nconst x = a + +b;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("leaves unary `!` and `~` alone", () => {
    const src = "?bs 0.4\nconst y = !a;\nconst z = ~b;\n";
    expect(formatSource(src)).toBe(src);
  });

  // Always-binary operators: classification is unconditional, no
  // dependence on `prev`.

  it("inserts spaces around `==`, `===`, `!=`, `!==`", () => {
    const src =
      "?bs 0.4\nconst a = x==y;\nconst b = x===y;\nconst c = x!=y;\nconst d = x!==y;\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nconst a = x == y;\nconst b = x === y;\nconst c = x != y;\nconst d = x !== y;\n",
    );
  });

  it("inserts spaces around `<=` and `>=`", () => {
    const src = "?bs 0.4\nconst a = x<=y;\nconst b = x>=y;\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nconst a = x <= y;\nconst b = x >= y;\n",
    );
  });

  it("inserts spaces around `&&` and `||`", () => {
    const src = "?bs 0.4\nconst a = x&&y||z;\n";
    expect(formatSource(src)).toBe("?bs 0.4\nconst a = x && y || z;\n");
  });

  it("inserts spaces around bitwise `&`, `|`, `^`", () => {
    const src = "?bs 0.4\nconst a = x&y|z^w;\n";
    expect(formatSource(src)).toBe("?bs 0.4\nconst a = x & y | z ^ w;\n");
  });

  it("inserts spaces around `<<` (bit-shift left)", () => {
    const src = "?bs 0.4\nconst a = x<<1;\n";
    expect(formatSource(src)).toBe("?bs 0.4\nconst a = x << 1;\n");
  });

  it("leaves `>>` and `>>>` alone — they overlap with nested TS generics", () => {
    // `>>` and `>>>` are lexed as single tokens, but they also appear as
    // closing brackets of nested generics like `Array<Map<string, T>>` and
    // `Promise<Result<X, E>>`. Adding canonical spacing would corrupt
    // those. The trade-off is documented in the formatter.
    const src = "?bs 0.4\nlet xs: Array<Map<string, number>> = new Map();\n";
    expect(formatSource(src)).toBe(src);
  });

  it("inserts spaces around `**` (exponent)", () => {
    const src = "?bs 0.4\nconst a = x**2;\n";
    expect(formatSource(src)).toBe("?bs 0.4\nconst a = x ** 2;\n");
  });

  it("inserts spaces around compound-assignment operators", () => {
    const src =
      "?bs 0.4\nfn f() -> number {\n  let x = 0;\n  x+=1; x-=1; x*=2; x/=2; x%=2;\n  return x;\n}\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn f() -> number {\n  let x = 0;\n  x += 1; x -= 1; x *= 2; x /= 2; x %= 2;\n  return x;\n}\n",
    );
  });

  // Excluded operators — `<`, `>`, `++`, `--`, `...`, `~`, `!`.

  it("leaves single-char `<` and `>` alone (JSX / TS-generics ambiguity)", () => {
    const src = "?bs 0.4\nconst ok = a<b && c>d;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("leaves postfix `++` and `--` alone", () => {
    const src = "?bs 0.4\nfn f() -> number {\n  let x = 0;\n  x++; --x;\n  return x;\n}\n";
    expect(formatSource(src)).toBe(src);
  });

  it("leaves `...` (spread / rest) alone", () => {
    const src = "?bs 0.4\nconst xs = [...ys];\n";
    expect(formatSource(src)).toBe(src);
  });

  // Special cases.

  it("leaves `function* gen()` alone — generator marker, not binary", () => {
    const src =
      "?bs 0.4\nfn f() -> any = pure {\n  function* gen(): Generator<number> { yield 1; }\n  return gen;\n}\n";
    expect(formatSource(src)).toBe(src);
  });

  it("leaves `import * as ns` alone — namespace import, not binary `*`", () => {
    const src = '?bs 0.4\nimport * as ns from "x";\nconst y = ns.f();\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does not touch operators inside JSX open tags (self-close `/>`, attr-name `data-cmp`)", () => {
    const src =
      '?bs 0.4\nfn Demo() -> any = <input type="text" data-cmp={a-b} aria-hidden />\n';
    expect(formatSource(src)).toBe(src);
  });

  it("is idempotent on binary-operator insertions", () => {
    const src =
      "?bs 0.4\nfn f() -> number {\n  const a=1+2*3;\n  const b=a||0;\n  return a+b;\n}\n";
    const once = formatSource(src);
    expect(formatSource(once)).toBe(once);
  });

  it("collapses RFC #13's three example forms together (with binary `+`)", () => {
    // Phase 2: with binary-`+` spacing in place, the no-space form now
    // canonicalizes to the same output as the spaced form. The
    // brace-vs-expression equivalence (PR #21, merged) closes the third
    // form. All three lower to identical canonical .bs.
    const a = "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n";
    const b = "?bs 0.4\nfn add(a:number,b:number)->number{return a+b}\n";
    const c =
      "?bs 0.4\nfn add(a: number, b: number) -> number { return a + b }\n";
    expect(formatSource(a)).toBe(formatSource(b));
    expect(formatSource(b)).toBe(formatSource(c));
  });
});

describe("formatSource — brace→expression body equivalence", () => {
  it("rewrites `{ return e; }` to `= e` on a single-line body", () => {
    const src = "?bs 0.4\nfn x() -> number { return 1; }\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("rewrites `{ return e }` (no semicolon) to `= e`", () => {
    const src = "?bs 0.4\nfn add(a: number, b: number) -> number { return a + b }\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n",
    );
  });

  it("rewrites a multi-line block when the return is on its own line", () => {
    const src = "?bs 0.4\nfn x() -> number {\n  return 1;\n}\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("rewrites a return whose expression is a balanced object literal", () => {
    const src =
      "?bs 0.4\nfn obj() -> { a: number } { return { a: 1 }; }\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn obj() -> { a: number } = { a: 1 }\n",
    );
  });

  it("does NOT rewrite a multi-statement block", () => {
    const src =
      "?bs 0.4\nfn x() -> number { let y = 1; return y; }\n";
    // Whitespace canonicalization still applies, but the body stays a block.
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT rewrite when there is more than one return", () => {
    const src = "?bs 0.4\nfn x() -> number { return 1; return 2; }\n";
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT rewrite an empty `return;`", () => {
    const src = "?bs 0.4\nfn x() -> void { return; }\n";
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT rewrite when a comment sits before the return (preserves comments)", () => {
    const src = "?bs 0.4\nfn x() -> number {\n  // keep me\n  return 1;\n}\n";
    expect(formatSource(src)).toBe(src);
  });

  it("preserves a single-line block comment between `return` and the value", () => {
    // `return /* keep */ 1;` — the comment sits inside the expression's
    // range, no ASI hazard, and rewriting must not silently drop it.
    const src = "?bs 0.4\nfn x() -> number { return /* keep */ 1; }\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn x() -> number = /* keep */ 1\n",
    );
  });

  it("does NOT rewrite when a multi-line block comment sits between `return` and the value (ASI hazard)", () => {
    // ECMAScript §7.4: a block comment containing a line terminator counts
    // as a line break for ASI, so `return /* \n */ 1;` would emit-as
    // `return; 1;` in TS. The rewrite must bail to keep semantics.
    const src = "?bs 0.4\nfn x() -> number { return /* multi\nline */ 1; }\n";
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT rewrite when there is a newline between `return` and the expression (ASI risk)", () => {
    // ASI in the emitted TypeScript would treat this as `return; 1;`, so
    // rewriting to `= 1` would change semantics.
    const src = "?bs 0.4\nfn x() -> number {\n  return\n  1;\n}\n";
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT rewrite when the expression continues across a line break (ASI risk)", () => {
    const src = "?bs 0.4\nfn x() -> number {\n  return f()\n    + g();\n}\n";
    expect(formatSource(src)).toBe(src);
  });

  it("collapses RFC #13's brace and expression forms together", () => {
    const a = "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n";
    const b = "?bs 0.4\nfn add(a: number, b: number) -> number { return a + b }\n";
    expect(formatSource(a)).toBe(formatSource(b));
  });

  it("rewrites a nested fn's single-return body", () => {
    const src =
      "?bs 0.4\nfn outer() -> number {\n  fn inner() -> number { return 1; }\n  return inner() + 2;\n}\n";
    expect(formatSource(src)).toBe(
      "?bs 0.4\nfn outer() -> number {\n  fn inner() -> number = 1\n  return inner() + 2;\n}\n",
    );
  });
});

describe("formatSource — import reordering", () => {
  it("alphabetizes a contiguous run of top-level imports by module path", () => {
    const src =
      "?bs 0.5\n" +
      'import { c } from "c-mod";\n' +
      'import { a } from "a-mod";\n' +
      'import { b } from "b-mod";\n';
    expect(formatSource(src)).toBe(
      "?bs 0.5\n" +
        'import { a } from "a-mod";\n' +
        'import { b } from "b-mod";\n' +
        'import { c } from "c-mod";\n',
    );
  });

  it("preserves a blank-line gap between two import groups", () => {
    // The user split imports into two groups (npm vs. local) with a blank
    // line. Each group sorts independently; the blank line stays between
    // them. The gap text is captured from the original source so the
    // separator survives the rewrite.
    const src =
      "?bs 0.5\n" +
      'import { useState } from "react";\n' +
      'import { transform } from "@mbfarias/botscript-compiler";\n' +
      "\n" +
      'import { Logo } from "./Logo";\n' +
      'import { snippets } from "./snippets.bs";\n';
    expect(formatSource(src)).toBe(
      "?bs 0.5\n" +
        'import { transform } from "@mbfarias/botscript-compiler";\n' +
        'import { useState } from "react";\n' +
        "\n" +
        'import { Logo } from "./Logo";\n' +
        'import { snippets } from "./snippets.bs";\n',
    );
  });

  it("does NOT sort a run that contains a side-effect import (`import \"x\";` evaluation order is observable)", () => {
    // ESM evaluates side-effect imports in source order — a polyfill that
    // patches a global has to load before the module that uses it.
    // Reordering would break that contract, so the run bails entirely.
    const src =
      "?bs 0.5\n" +
      'import "z-side";\n' +
      'import "a-side";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT sort a run that mixes a side-effect import with named-binding imports", () => {
    // Even one side-effect import in a run is enough to bail the whole
    // run — the named-binding imports' evaluation order is also locked
    // relative to the side-effect import.
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      'import "polyfill";\n' +
      'import { a } from "a";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("sorts a named-binding-only run while leaving a side-effect run alone (separate by blank line)", () => {
    // The side-effect concern is local to a run. A different run, separated
    // by a blank line, can still sort if it's all named-binding imports.
    const src =
      "?bs 0.5\n" +
      'import "z-side";\n' +
      'import "a-side";\n' +
      "\n" +
      'import { c } from "c";\n' +
      'import { a } from "a";\n';
    expect(formatSource(src)).toBe(
      "?bs 0.5\n" +
        'import "z-side";\n' +
        'import "a-side";\n' +
        "\n" +
        'import { a } from "a";\n' +
        'import { c } from "c";\n',
    );
  });

  it("handles `import * as ns from \"...\"` namespace imports", () => {
    const src =
      "?bs 0.5\n" +
      'import * as fs from "node:fs";\n' +
      'import * as a from "a-mod";\n';
    expect(formatSource(src)).toBe(
      "?bs 0.5\n" +
        'import * as a from "a-mod";\n' +
        'import * as fs from "node:fs";\n',
    );
  });

  it("handles `import type { T } from \"...\"` (TS type-only imports)", () => {
    const src =
      "?bs 0.5\n" +
      'import type { B } from "b";\n' +
      'import type { A } from "a";\n';
    expect(formatSource(src)).toBe(
      "?bs 0.5\n" + 'import type { A } from "a";\n' + 'import type { B } from "b";\n',
    );
  });

  it("preserves multi-line bracket-bound bindings during reordering", () => {
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      "import {\n" +
      "  a,\n" +
      "  b,\n" +
      '} from "ab";\n';
    expect(formatSource(src)).toBe(
      "?bs 0.5\n" +
        "import {\n" +
        "  a,\n" +
        "  b,\n" +
        '} from "ab";\n' +
        'import { z } from "z";\n',
    );
  });

  it("does NOT reorder when comments sit between two imports (comment-attachment is ambiguous)", () => {
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      "// comment for a\n" +
      'import { a } from "a";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder when a same-line comment trails the LAST import (trailing-comment bail)", () => {
    // Without the trailing-trivia check, the formatter would sort the run
    // and `// wraps lib` would visually attach to whichever import landed
    // in the last slot — silently re-targeting a comment the user wrote
    // for the explicit lib-wrapping module.
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      'import { a } from "a"; // wraps lib\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder when a comment sits immediately above the FIRST import (leading-comment bail)", () => {
    // Without the leading-trivia check, the formatter would sort the run
    // and the comment would visually attach to whichever import landed
    // in the first slot — silently re-targeting an explanation the user
    // wrote for a specific module.
    const src =
      "?bs 0.5\n" +
      "// comment for z\n" +
      'import { z } from "z";\n' +
      'import { a } from "a";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder ANY import in a region once a comment appears (3+ imports, region-wide bail)", () => {
    // A weaker bail — flushing only the local run and re-sorting the
    // post-comment imports — would leave `// comment for b` next to `a`
    // (the new first item in the post-comment sub-run). The conservative
    // rule is: any inter-import comment in the region taints the whole
    // region, none of its sub-runs reorder.
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      "// comment for b\n" +
      'import { b } from "b";\n' +
      'import { a } from "a";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder across blank-line groups when a comment taints the region", () => {
    // The blank-line gap normally splits a region into two independent
    // sub-runs. But the region-wide comment bail wins: even the post-
    // blank-line run stays put because the region (the whole contiguous
    // import block separated only by trivia) is tainted by the comment.
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      "// note\n" +
      'import { y } from "y";\n' +
      "\n" +
      'import { c } from "c";\n' +
      'import { a } from "a";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder a single import (no run to reorder)", () => {
    const src = "?bs 0.5\n" + 'import { a } from "a";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder when a non-import statement sits between two imports", () => {
    // The user wrote a top-level statement between two imports; treating
    // them as a single run would cross-cut that statement. Each side ends
    // up as a single-import "run" (length-1, no reorder).
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      "const x = 1;\n" +
      'import { a } from "a";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reach into an import nested inside a string template", () => {
    // The lexer captures the whole template as one opaque token, so the
    // formatter never sees the inner `import` ident. The outer `z`
    // import stays put because there's no other top-level import to
    // pair with.
    const src =
      "?bs 0.5\n" +
      'import { z } from "z";\n' +
      "const sample = `?bs 0.5\nimport { a } from \"a\";\n`;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("leaves an already-sorted run untouched (no-op)", () => {
    const src =
      "?bs 0.5\n" +
      'import { a } from "a";\n' +
      'import { b } from "b";\n' +
      'import { c } from "c";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("reordering is idempotent", () => {
    const src =
      "?bs 0.5\n" +
      'import { c } from "c";\n' +
      'import { a } from "a";\n' +
      'import { b } from "b";\n';
    const once = formatSource(src);
    const twice = formatSource(once);
    expect(twice).toBe(once);
  });
});

describe("formatSource — tagged-union member reordering", () => {
  it("alphabetizes tagged-union alternatives by tag name", () => {
    const src = "?bs 0.5\ntype Shape = Square { side: number } | Circle { r: number };\n";
    expect(formatSource(src)).toBe(
      "?bs 0.5\ntype Shape = Circle { r: number } | Square { side: number };\n",
    );
  });

  it("sorts mixed bare and body-bearing alternatives", () => {
    const src =
      "?bs 0.5\ntype Status = Loading | Done { value: string } | Idle | Failed { error: string };\n";
    expect(formatSource(src)).toBe(
      "?bs 0.5\ntype Status = Done { value: string } | Failed { error: string } | Idle | Loading;\n",
    );
  });

  it("preserves the leading-`|` multi-line shape during reorder", () => {
    const src =
      "?bs 0.5\n" +
      "type Shape =\n" +
      "  | Square { side: number }\n" +
      "  | Circle { r: number };\n";
    expect(formatSource(src)).toBe(
      "?bs 0.5\n" +
        "type Shape =\n" +
        "  | Circle { r: number }\n" +
        "  | Square { side: number };\n",
    );
  });

  it("does NOT reorder a plain TS union with no tag idents", () => {
    // `number | string` has no TagIdent, so the rule "every alt is a
    // TagIdent or TagIdent { fields }" fails on the first alt. Left alone.
    const src = "?bs 0.5\ntype N = number | string;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder a literal-type union (\"open\" | \"closed\")", () => {
    // The first alt is a string literal, not an ident. Detection fails.
    const src = '?bs 0.5\ntype Mode = "open" | "closed";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder a tagged-union when no alt has a body", () => {
    // The detection rule requires at least one body-bearing alt. A pure
    // bare-tag union (`Idle | Loading | Done`) would re-order in alpha
    // order if we let it, but it's also indistinguishable from a TS
    // `enum`-as-union pattern where the user is using order to encode
    // priority. Conservative: bail.
    const src = "?bs 0.5\ntype Status = Loading | Idle | Done;\n";
    expect(formatSource(src)).toBe(src);
  });

  it("leaves an already-sorted tagged union untouched", () => {
    const src = "?bs 0.5\ntype Shape = Circle { r: number } | Square { side: number };\n";
    expect(formatSource(src)).toBe(src);
  });

  it("reorder is idempotent", () => {
    const src = "?bs 0.5\ntype Shape = Square { side: number } | Circle { r: number };\n";
    const once = formatSource(src);
    const twice = formatSource(once);
    expect(twice).toBe(once);
  });

  it("does NOT reorder when a line comment sits between two alts", () => {
    // The comment is tied by source proximity to a specific alt;
    // reordering would silently re-attach it to a different one. The
    // formatter bails instead — same conservative rule as imports.
    const src =
      "?bs 0.5\n" +
      "type Shape = Square { side: number }\n" +
      "  // pick this one for round things\n" +
      "  | Circle { r: number };\n";
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT reorder when a block comment sits between two alts", () => {
    const src =
      "?bs 0.5\ntype Shape = Square { side: number } /* round next */ | Circle { r: number };\n";
    expect(formatSource(src)).toBe(src);
  });

  it("does NOT match `type` used as an identifier inside an expression", () => {
    // `const type = "x"` — here `type` is a binding name, not the keyword.
    // Detection bails because `atTypeStmtStart` returns false when the
    // preceding non-trivia token is `const`.
    const src = '?bs 0.5\nconst type = "x";\n';
    expect(formatSource(src)).toBe(src);
  });

  it("collapses two surface forms (whitespace + tagged-union order) together", () => {
    // RFC #13's "one program, one representation" promise: equivalent
    // surface variants of the same logic produce the same canonical form.
    // (The `=` token is intentionally not whitespace-canonicalized — it's
    // ambiguous with JSX attributes — so this test deliberately keeps the
    // `=` spacing identical between the two inputs.)
    const a =
      "?bs 0.5\n" +
      "type Shape = Circle { r: number } | Square { side: number };\n" +
      "fn area(s: Shape) -> number = match s {\n" +
      "  Circle { r } -> Math.PI * r * r\n" +
      "  Square { side } -> side * side\n" +
      "}\n";
    const b =
      "?bs 0.5\n" +
      "type Shape = Square { side:number } | Circle { r:number };\n" +
      "fn area(s:Shape)->number = match s {\n" +
      "  Circle { r } -> Math.PI * r * r\n" +
      "  Square { side } -> side * side\n" +
      "}\n";
    expect(formatSource(a)).toBe(formatSource(b));
  });
});

describe("canonical-form gate — import + tagged-union reordering", () => {
  // Gate is enforced from `?bs 0.4` onward (see the FMT001 tests above).
  // Test at the real boundary so a future regression in version-gating
  // would surface here.
  it("0.4: rejects unsorted top-level imports with FMT001", () => {
    const src =
      "?bs 0.4\n" +
      'import { b } from "b";\n' +
      'import { a } from "a";\n';
    try {
      transform(src);
      expect.unreachable("expected FMT001");
    } catch (e) {
      const diags = (e as { diagnostics?: { code: string }[] }).diagnostics;
      expect(diags?.[0]?.code).toBe("FMT001");
    }
  });

  it("0.4: rejects unsorted tagged-union alternatives with FMT001", () => {
    const src =
      "?bs 0.4\ntype Shape = Square { side: number } | Circle { r: number };\n";
    try {
      transform(src);
      expect.unreachable("expected FMT001");
    } catch (e) {
      const diags = (e as { diagnostics?: { code: string }[] }).diagnostics;
      expect(diags?.[0]?.code).toBe("FMT001");
    }
  });

  it("0.3: still accepts unsorted imports (gate is opt-in via the pin)", () => {
    const src =
      "?bs 0.3\n" +
      'import { b } from "b";\n' +
      'import { a } from "a";\n';
    expect(transform(src).code.length).toBeGreaterThan(0);
  });
});

describe("formatSource — directive normalization", () => {
  it("collapses multiple spaces between `?bs` and the version", () => {
    const src = "?bs   0.4\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("converts a tab between `?bs` and the version to a single space", () => {
    const src = "?bs\t0.4\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("emits `?primer` verbatim", () => {
    const src = "?primer\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?primer\nfn x() -> number = 1\n");
  });

  it("emits bare `?bs` (no trailing space) when the version is missing", () => {
    const src = "?bs\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs\nfn x() -> number = 1\n");
  });

  it("emits bare `?bs` when only whitespace follows the directive name", () => {
    const src = "?bs   \nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs\nfn x() -> number = 1\n");
  });
});

describe("formatSource — line-ending normalization", () => {
  it("normalizes CRLF input to LF", () => {
    const src = "?bs 0.4\r\nfn x() -> number = 1\r\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("normalizes CR-only input to LF without joining lines", () => {
    const src = "?bs 0.4\rfn x() -> number = 1\r";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("collapses CRLF blank-line runs the same as LF runs", () => {
    const src = "?bs 0.4\r\n\r\n\r\n\r\nfn x() -> number = 1\r\n";
    expect(formatSource(src)).toBe("?bs 0.4\n\nfn x() -> number = 1\n");
  });

  it("preserves a `//` line comment on CR-only input (does not swallow following lines)", () => {
    const src = "?bs 0.4\r// hi\rfn x() -> number = 1\r";
    expect(formatSource(src)).toBe("?bs 0.4\n// hi\nfn x() -> number = 1\n");
  });
});

describe("formatSource — trailing newline", () => {
  it("adds a trailing newline if missing", () => {
    const src = "?bs 0.4\nfn x() -> number = 1";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("collapses multiple trailing newlines to exactly one", () => {
    const src = "?bs 0.4\nfn x() -> number = 1\n\n\n\n";
    expect(formatSource(src)).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("leaves an empty file empty", () => {
    expect(formatSource("")).toBe("");
  });

  it("treats a whitespace-only file as empty", () => {
    expect(formatSource("   \n\n   \n")).toBe("");
  });
});

describe("formatSource — variation collapse (RFC #13)", () => {
  it("two surface forms with the same line breaks produce identical output", () => {
    const a = "?bs 0.4\nfn add(a: number,  b: number)  ->  number  =  a + b\n";
    const b = "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n";
    expect(formatSource(a)).toBe(formatSource(b));
  });

  it("formatting an already-canonical file is a no-op", () => {
    const canonical = "?bs 0.4\nfn x() -> number = 1\n";
    expect(formatSource(canonical)).toBe(canonical);
  });
});

describe("formatSource — idempotence", () => {
  const samples = [
    "?bs 0.4\nfn x() -> number = 1\n",
    "?bs 0.4\n\n\n\nfn   x()   ->   number   =   1   \n\n\n",
    "?bs 0.4\nfn label(x: unknown) -> string = match x {\n  \"a\" -> \"x\"\n  _ -> \"y\"\n}\n",
    '?bs 0.4\nfn x() -> string = pure { "  spaces  " }\n',
    "?bs 0.4\n\tfn x() -> number {\n\t\treturn 1;\n\t}\n",
    "// no directive\nfn x() -> number = 1\n",
  ];

  for (const [idx, sample] of samples.entries()) {
    it(`is idempotent on sample ${idx}`, () => {
      const once = formatSource(sample);
      const twice = formatSource(once);
      expect(twice).toBe(once);
    });
  }
});

describe("formatSource — semantic preservation", () => {
  // Property: formatSource is the one-and-only path from a non-canonical
  // 0.4 source to something the compiler will accept. Under RFC #13's
  // canonical-form gate, transform() refuses non-canonical input; passing
  // it through formatSource first must produce code that compiles.
  const samples = [
    "?bs 0.4\nfn x() -> number = 1\n",
    "?bs 0.4\nfn   add(a: number,b: number)->number=a+b\n",
    "?bs 0.4\nfn label(x: unknown) -> string = match x {\n  \"a\" -> \"x\"\n  _ -> \"y\"\n}\n",
    "?bs 0.2\nfn now() uses { time } -> number = pure { time.now() }\n",
  ];

  for (const [idx, sample] of samples.entries()) {
    it(`formatSource produces something compilable on sample ${idx}`, () => {
      const after = transform(formatSource(sample));
      expect(after.code.length).toBeGreaterThan(0);
    });
  }
});

describe("canonical-form gate (FMT001)", () => {
  // From `?bs 0.4` on, transform() refuses non-canonical input. Older pins
  // keep accepting any whitespace.
  it("0.4: accepts canonical input", () => {
    const src = "?bs 0.4\nfn x() -> number = 1\n";
    expect(transform(src).code.length).toBeGreaterThan(0);
  });

  it("0.4: rejects extra spaces with FMT001", () => {
    const src = "?bs 0.4\nfn   x() -> number = 1\n";
    try {
      transform(src);
      expect.unreachable("expected FMT001");
    } catch (e) {
      const diags = (e as { diagnostics?: { code: string }[] }).diagnostics;
      expect(diags?.[0]?.code).toBe("FMT001");
    }
  });

  it("0.4: rejects non-canonical directive (?bs   0.4)", () => {
    const src = "?bs   0.4\nfn x() -> number = 1\n";
    try {
      transform(src);
      expect.unreachable("expected FMT001");
    } catch (e) {
      const diags = (e as { diagnostics?: { code: string }[] }).diagnostics;
      expect(diags?.[0]?.code).toBe("FMT001");
    }
  });

  it("0.3: still accepts non-canonical input (gate is opt-in via the pin)", () => {
    const src = "?bs 0.3\nfn   x() -> number = 1\n";
    expect(transform(src).code.length).toBeGreaterThan(0);
  });

  it("FMT001 points at the first differing line", () => {
    const src = "?bs 0.4\nfn x() -> number = 1\nfn  y() -> number = 2\n";
    try {
      transform(src);
      expect.unreachable("expected FMT001");
    } catch (e) {
      const d = (e as { diagnostics: { code: string; line: number }[] }).diagnostics[0]!;
      expect(d.code).toBe("FMT001");
      expect(d.line).toBe(3);
    }
  });

  it("0.4: rejects a brace-body that should be expression-form (FMT001)", () => {
    // `{ return e; }` collapses to `= e` under RFC #13 — the gate must reject
    // the brace form so canonical-form drift is caught at compile time.
    const src = "?bs 0.4\nfn x() -> number { return 1; }\n";
    try {
      transform(src);
      expect.unreachable("expected FMT001");
    } catch (e) {
      const diags = (e as { diagnostics?: { code: string }[] }).diagnostics;
      expect(diags?.[0]?.code).toBe("FMT001");
    }
  });

  it("0.4: rejects missing space around `=` in declarations (FMT001)", () => {
    const src = "?bs 0.4\nconst x=1;\n";
    try {
      transform(src);
      expect.unreachable("expected FMT001");
    } catch (e) {
      const diags = (e as { diagnostics?: { code: string }[] }).diagnostics;
      expect(diags?.[0]?.code).toBe("FMT001");
    }
  });

  it("0.3: still accepts `const x=1` (=-whitespace gate is opt-in via the pin)", () => {
    const src = "?bs 0.3\nconst x=1;\nfn y() -> number = 2\n";
    expect(transform(src).code.length).toBeGreaterThan(0);
  });

  it("0.4: still accepts JSX `name=\"value\"` attributes", () => {
    // The `=`-whitespace rule must NOT fire inside JSX open tags.
    // Use expression-body form because the brace-to-expr canonical-form
    // rewrite (PR #21) would reject `fn ... { return <a/>; }` at FMT001
    // for a reason unrelated to this test's intent.
    const src = '?bs 0.4\nfn Demo() -> any = <a href="x">hi</a>\n';
    expect(transform(src).code.length).toBeGreaterThan(0);
  });
});
