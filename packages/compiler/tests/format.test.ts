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
    const src =
      '?bs 0.4\nfn Demo() -> any { return <a href="x">hi</a>; }\n';
    expect(formatSource(src)).toBe(src);
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
});
