/**
 * Generics in fn signatures — ?bs 0.4 only.
 *
 * The 0.1/0.2/0.3 fn parser bails on the first unrecognized token after the
 * name, which means `fn id<T>(…)` silently passes through unrewritten. From
 * 0.4 the parser accepts an optional `<…>` block between the name and args
 * and emits it verbatim into the desugared TypeScript output.
 */
import { describe, expect, it } from "vitest";

import { transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("generics in fn signatures (0.4)", () => {
  it("rewrites fn id<T>(x: T) -> T = pure { x }", () => {
    const out = t(`?bs 0.4\nfn id<T>(x: T) -> T = pure { x }\n`);
    expect(out).toContain("function id<T>(x: T): T {");
    expect(out).toContain("$enter([] as const");
    expect(out).toContain("return x;");
  });

  it("supports multiple type parameters", () => {
    const out = t(`?bs 0.4\nfn pair<A, B>(a: A, b: B) -> [A, B] = pure { [a, b] }\n`);
    expect(out).toContain("function pair<A, B>(a: A, b: B): [A, B] {");
  });

  it("supports `extends` constraints", () => {
    const out = t(`?bs 0.4\nfn typed<T extends number>(x: T) -> T = pure { x }\n`);
    expect(out).toContain("function typed<T extends number>(x: T): T {");
  });

  it("supports default type parameters", () => {
    const out = t(`?bs 0.4\nfn dflt<T = string>(x: T) -> T = pure { x }\n`);
    expect(out).toContain("function dflt<T = string>(x: T): T {");
  });

  it("supports nested generics in args and return", () => {
    const out = t(
      `?bs 0.4\nfn nested<T>(x: Array<Map<string, T>>) -> Array<T> = pure { [] as Array<T> }\n`,
    );
    expect(out).toContain("function nested<T>(x: Array<Map<string, T>>): Array<T> {");
  });

  it("supports generics on async fn", () => {
    // Body uses http.get so the declared `net` is justified under 0.4
    // strict cap-check (which now sees generic fns thanks to allowGenerics).
    const out = t(
      `?bs 0.4\nasync fn fetchOne<T>(url: string) uses { net } -> Promise<T> {\n` +
      `  const r = http.get(url);\n` +
      `  return r as T;\n` +
      `}\n`,
    );
    expect(out).toMatch(/async function fetchOne<T>\(url: string\): Promise<T> \{/);
    expect(out).toMatch(/\$enter\(\["net"\] as const, async \(\) => \{/);
  });

  it("cap-check at 0.4 sees generic fns and flags over-declaration on them", () => {
    // The fix Copilot flagged: pre-fix, parseProgram was called without
    // allowGenerics, so a generic fn was silently dropped from the call
    // graph and CAP002 never fired. Post-fix, this MUST throw.
    const src =
      `?bs 0.4\nfn id<T>(x: T) uses { net } -> T = pure { x }\n`;
    expect(() => t(src)).toThrow(/CAP002/);
  });

  it("supports generics on a fn with a block body and uses clause", () => {
    // Multi-statement body: a single `return e;` would be normalized to the
    // expression-body form `= e` by the canonical formatter (RFC #13), so a
    // two-statement body keeps this exercising the block-body code path.
    const out = t(
      `?bs 0.4\nfn first<T>(xs: Array<T>) uses { } -> T {\n  const head = xs[0]!;\n  return head;\n}\n`,
    );
    expect(out).toContain("function first<T>(xs: Array<T>): T {");
    expect(out).toContain("$enter([] as const");
  });

  it("0.3 still bails on fn id<T>(…) — generics are 0.4 only", () => {
    // Forward-compat: under 0.3 the parser doesn't recognize the `<` after
    // the name and the fn is left unrewritten. This is the documented 0.3
    // limitation — the test exists to prove 0.4's added behaviour is gated.
    const out = t(`?bs 0.3\nfn id<T>(x: T) -> T = pure { x }\n`);
    expect(out).not.toContain("function id<T>");
    expect(out).toContain("fn id<T>");
  });

  it("a fn without generics under 0.4 emits identically to 0.3", () => {
    const src300 = `?bs 0.3\nfn slug(s: string) -> string = pure { s.toLowerCase() }\n`;
    const src400 = `?bs 0.4\nfn slug(s: string) -> string = pure { s.toLowerCase() }\n`;
    // Same emission path, only difference is the version directive.
    const out300 = t(src300).replace("?bs 0.3", "");
    const out400 = t(src400).replace("?bs 0.4", "");
    expect(out400).toBe(out300);
  });

  it("does not consume `<` that isn't a type-parameter block", () => {
    // `fn cmp(a: number, b: number) -> boolean = pure { a < b }` has `<`
    // inside the body, NOT after the name. The fn parser shouldn't try to
    // pick that up as generics.
    const out = t(`?bs 0.4\nfn cmp(a: number, b: number) -> boolean = pure { a < b }\n`);
    expect(out).toContain("function cmp(a: number, b: number): boolean {");
    expect(out).toContain("return a < b;");
  });
});
