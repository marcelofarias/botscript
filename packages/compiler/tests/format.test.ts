import { describe, expect, it } from "vitest";

import { formatSource, transform } from "../src/index.js";

describe("formatSource — line-level cleanup", () => {
  it("strips trailing whitespace on each line", () => {
    const src = "?bs 0.4\nfn x() -> number = 1   \n";
    const out = formatSource(src);
    expect(out).toBe("?bs 0.4\nfn x() -> number = 1\n");
  });

  it("converts leading tabs to two spaces", () => {
    const src = "?bs 0.4\nfn x() -> number {\n\treturn 1;\n}\n";
    const out = formatSource(src);
    expect(out).toBe("?bs 0.4\nfn x() -> number {\n  return 1;\n}\n");
  });

  it("converts mixed tabs+spaces in indentation to spaces", () => {
    const src = "?bs 0.4\nfn x() -> number {\n\t  return 1;\n}\n";
    const out = formatSource(src);
    // Tab → 2 spaces, plus the original 2 spaces = 4 spaces of indent.
    expect(out).toBe("?bs 0.4\nfn x() -> number {\n    return 1;\n}\n");
  });

  it("preserves non-leading whitespace inside comments verbatim", () => {
    const src = "?bs 0.4\n// hello   world\nfn x() -> number = 1\n";
    expect(formatSource(src)).toBe("?bs 0.4\n// hello   world\nfn x() -> number = 1\n");
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
  // Property: if `transform(src)` succeeds, then `transform(formatSource(src))`
  // also succeeds. Stronger property (byte-equality of TS output) does NOT
  // hold — passes that emit verbatim slices of the source pick up our
  // whitespace changes — but the parsed program is equivalent.
  const samples = [
    "?bs 0.4\nfn x() -> number = 1\n",
    "?bs 0.4\nfn   add(a: number,b: number)->number=a+b\n",
    "?bs 0.4\nfn label(x: unknown) -> string = match x {\n  \"a\" -> \"x\"\n  _ -> \"y\"\n}\n",
    "?bs 0.2\nfn now() uses { time } -> number = pure { time.now() }\n",
  ];

  for (const [idx, sample] of samples.entries()) {
    it(`preserves compileability on sample ${idx}`, () => {
      const before = transform(sample);
      const after = transform(formatSource(sample));
      expect(after.version.resolved).toBe(before.version.resolved);
      // Both outputs must be non-empty strings; the formatter's whitespace
      // changes propagate through string-slicing passes, so byte-equality
      // is not guaranteed.
      expect(after.code.length).toBeGreaterThan(0);
      expect(before.code.length).toBeGreaterThan(0);
    });
  }
});
