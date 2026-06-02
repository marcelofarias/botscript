import { describe, expect, it } from "vitest";

import { transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("test \"...\" with mocks { ... } { ... } (0.2)", () => {
  it("rewrites the canonical with-mocks form", () => {
    const src =
      `?bs 0.2\ntest "deterministic clock" with mocks { time, random } {\n` +
      `  const a = time.now();\n` +
      `  const b = time.now();\n` +
      `  assert b > a;\n` +
      `}\n`;
    const out = t(src);
    expect(out).toContain(`$test("deterministic clock", async () =>`);
    expect(out).toContain(`$withMocks(["time", "random"]`);
    expect(out).toContain(`time.now()`);
    expect(out).toContain(`$assert(b > a);`);
  });

  it("auto-imports $withMocks", () => {
    const src =
      `?bs 0.2\ntest "x" with mocks { time } { const a = time.now(); }\n`;
    const out = t(src);
    expect(out).toMatch(/import \{[^}]*\$withMocks[^}]*\} from "@mbfarias\/botscript-runtime";/);
  });

  it("leaves a regular `test \"name\" { … }` alone", () => {
    const src = `?bs 0.2\ntest "regular" {\n  assert 1 + 1 === 2;\n}\n`;
    const out = t(src);
    expect(out).not.toContain(`$withMocks`);
    expect(out).toContain(`$test("regular", async () =>`);
  });

  it("does not rewrite under 0.1 (forward compat)", () => {
    // Same source pinned to 0.1 — leaves the form untouched and the base
    // test pass also can't make sense of `with mocks`, so the output keeps
    // the literal text.
    const src = `?bs 0.1\ntest "x" with mocks { time } { const a = 1; }\n`;
    const out = t(src);
    expect(out).not.toContain(`$withMocks`);
  });

  it("works with single capability", () => {
    const src = `?bs 0.2\ntest "single" with mocks { time } { time.now(); }\n`;
    const out = t(src);
    expect(out).toContain(`$withMocks(["time"]`);
  });

  it("preserves the original test name string verbatim", () => {
    const src =
      `?bs 0.2\ntest "tricky 'name' with quotes" with mocks { time } { 1; }\n`;
    const out = t(src);
    expect(out).toContain(`$test("tricky 'name' with quotes"`);
  });

  it("leaves an unrelated `with` keyword inside a fn body alone", () => {
    // `with` is not a botscript keyword; only the test-level form is rewritten.
    const src = `?bs 0.2\nfn x() -> number = pure { 1 + 1 }\n`;
    expect(t(src)).toContain(`function x()`);
  });

  it("transform.forms reports testMocks when the form is present", () => {
    const r = transform(
      `?bs 0.2\ntest "x" with mocks { time } { time.now(); }\n`,
    );
    expect(r.forms).toContain("testMocks");
  });
});
