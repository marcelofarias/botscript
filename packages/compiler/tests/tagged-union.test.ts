import { describe, expect, it } from "vitest";

import { transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("tagged-union sugar (0.2)", () => {
  it("rewrites the canonical Shape declaration", () => {
    const src = `?bs 0.2\ntype Shape = Circle { r: number } | Square { side: number };\n`;
    const out = t(src);
    expect(out).toContain(
      `type Shape = { kind: "Circle"; r: number } | { kind: "Square"; side: number };`,
    );
  });

  it("rewrites bare-tag alternatives alongside field-bearing ones", () => {
    const src =
      `?bs 0.2\ntype Status = Idle | Loading | Done { value: string };\n`;
    const out = t(src);
    expect(out).toContain(
      `type Status = { kind: "Idle" } | { kind: "Loading" } | { kind: "Done"; value: string };`,
    );
  });

  it("supports `export type`", () => {
    const src = `?bs 0.2\nexport type Shape = Circle { r: number } | Square { side: number };\n`;
    const out = t(src);
    expect(out).toMatch(/^\s*export type Shape = \{ kind: "Circle"; r: number \} \| \{ kind: "Square"; side: number \};/m);
  });

  it("supports generics in the type header", () => {
    const src =
      `?bs 0.2\ntype Tree<T> = Leaf | Node { value: T; left: Tree<T>; right: Tree<T> };\n`;
    const out = t(src);
    expect(out).toContain(`type Tree<T> = { kind: "Leaf" } | { kind: "Node"; value: T; left: Tree<T>; right: Tree<T> };`);
  });

  it("handles multiple fields with mixed `;`/`,` separators", () => {
    const src =
      `?bs 0.2\ntype Pt = Cartesian { x: number, y: number } | Polar { r: number; theta: number };\n`;
    const out = t(src);
    expect(out).toContain(`{ kind: "Cartesian"; x: number, y: number }`);
    expect(out).toContain(`{ kind: "Polar"; r: number; theta: number }`);
  });

  it("leaves a plain TS union (no Tag {…} forms) untouched", () => {
    const src = `?bs 0.2\ntype Color = "red" | "blue" | "green";\n`;
    expect(t(src)).toContain(`type Color = "red" | "blue" | "green";`);
  });

  it("leaves a TS type alias to existing types alone", () => {
    // `Foo | Bar` could be a tagged union or just a TS type union of two
    // named types. Without any `Tag {…}` form, we conservatively don't rewrite.
    const src = `?bs 0.2\ntype FooOrBar = Foo | Bar;\n`;
    expect(t(src)).toContain(`type FooOrBar = Foo | Bar;`);
  });

  it("leaves a single-object type alias alone", () => {
    const src = `?bs 0.2\ntype Box = { value: number };\n`;
    expect(t(src)).toContain(`type Box = { value: number };`);
  });

  it("does not run on 0.1 files (forward compat)", () => {
    const src = `?bs 0.1\ntype Shape = Circle { r: number } | Square { side: number };\n`;
    // Under 0.1 the source is left alone — TS would reject `Circle { r: number }`,
    // but the compiler's job is just to pass it through unchanged.
    expect(t(src)).toContain(`type Shape = Circle { r: number } | Square { side: number };`);
  });

  it("does not trigger on `obj.type = ...` or other non-declaration `type`", () => {
    const src = `?bs 0.2\nconst x = obj.type;\n`;
    expect(t(src)).toContain(`const x = obj.type;`);
  });

  it("interoperates with match: declared via sugar, dispatched via match", () => {
    const src =
      `?bs 0.2\ntype Shape = Circle { r: number } | Square { side: number };\n` +
      `fn area(s: Shape) -> number = match s {\n` +
      `  Circle { r } -> Math.PI * r * r\n` +
      `  Square { side } -> side * side\n` +
      `}\n`;
    const out = t(src);
    expect(out).toContain(`{ kind: "Circle"; r: number }`);
    expect(out).toContain(`$tagMatch("Circle", ["r"])`);
    expect(out).toContain(`$tagMatch("Square", ["side"])`);
  });

  it("supports an empty body `Tag { }` form", () => {
    const src = `?bs 0.2\ntype X = Empty { } | Full { value: number };\n`;
    expect(t(src)).toContain(`type X = { kind: "Empty" } | { kind: "Full"; value: number };`);
  });

  it("appears in transform.forms when a rewrite happens", () => {
    const r = transform(`?bs 0.2\ntype Shape = Circle { r: number } | Square { side: number };\n`);
    expect(r.forms).toContain("taggedUnion");
  });

  it("supports the TS leading-pipe multi-line idiom", () => {
    const src =
      `?bs 0.2\nexport type Shape =\n` +
      `  | Circle { r: number }\n` +
      `  | Square { side: number }\n` +
      `  | Triangle { base: number; height: number };\n`;
    const out = t(src);
    expect(out).toContain(
      `{ kind: "Circle"; r: number } | { kind: "Square"; side: number } | { kind: "Triangle"; base: number; height: number }`,
    );
  });
});

describe("match arm with brace-block body (issue #23 probes B/C)", () => {
  it("lowers a multi-statement block-body arm to an arrow with a brace block (probe B)", () => {
    const src =
      `?bs 0.4\n\n` +
      `type Status = Done { value: string } | Idle;\n\n` +
      `fn handle(s: Status) -> string {\n` +
      `  return match s {\n` +
      `    Idle -> "idle"\n` +
      `    Done { value } -> {\n` +
      `      let prefix = "got: "\n` +
      `      prefix + value\n` +
      `    }\n` +
      `  }\n` +
      `}\n`;
    const out = t(src);
    // Must NOT emit `let` inside a parenthesized expression body.
    expect(out).not.toMatch(/=>\s*\(\s*\{?\s*let\b/);
    // Must NOT emit `return let ...`.
    expect(out).not.toMatch(/return\s+let\b/);
    // The arm should be emitted as an arrow with a brace block.
    expect(out).toMatch(/\(\{\s*value\s*\}: any\)\s*=>\s*\{[\s\S]*let prefix = "got: "[\s\S]*return\s+prefix \+ value\s*;[\s\S]*\}/);
  });

  it("lowers a `return`-bearing block-body arm to an arrow with a brace block (probe C)", () => {
    const src =
      `?bs 0.4\n\n` +
      `type Outcome = Err { error: string } | Ok { value: string };\n\n` +
      `fn process(o: Outcome) -> string {\n` +
      `  return match o {\n` +
      `    Ok { value } -> {\n` +
      `      return ok(value)\n` +
      `    }\n` +
      `    Err { error } -> error\n` +
      `  }\n` +
      `}\n`;
    const out = t(src);
    // Must NOT emit `(return ...)` — `return` inside a parenthesized expression is invalid TS.
    expect(out).not.toMatch(/=>\s*\(\s*return\b/);
    expect(out).not.toMatch(/\(\s*return\s+ok\(/);
    // The Ok arm should be a brace-block arrow with the explicit return passed through.
    expect(out).toMatch(/\(\{\s*value\s*\}: any\)\s*=>\s*\{[\s\S]*return\s+ok\(value\)\s*;?\s*\}/);
    // The Err arm — single expression — keeps the existing parenthesized form.
    expect(out).toMatch(/\(\{\s*error\s*\}: any\)\s*=>\s*\(error\)/);
  });

  it("single-expression arm bodies still use the parenthesized arrow form (no regression)", () => {
    const out = t(
      `const r = match s { Circle { r } -> Math.PI * r * r; Square { side } -> side * side };\n`,
    );
    expect(out).toContain(`({ r }: any) => (Math.PI * r * r)`);
    expect(out).toContain(`({ side }: any) => (side * side)`);
  });

  it("brace-block arm body whose first child is a template with a nested template inside ${...} (probe G)", () => {
    // Marcelo's edge case: match arm body is a brace block whose body contains
    // a template literal with a nested template inside `${...}` whose inner
    // content includes a literal `}` character. The body-scanner must track
    // the nested template AND its `${...}` interpolations as opaque, so the
    // `}` inside the inner template doesn't decrement the outer brace depth.
    const src =
      `?bs 0.4\n\n` +
      `type Msg = Greet { name: string };\n\n` +
      `fn render(m: Msg) -> string {\n` +
      `  return match m {\n` +
      `    Greet { name } -> {\n` +
      `      let r = ` + "`outer ${`inner } with brace`}`" + `\n` +
      `      r\n` +
      `    }\n` +
      `  }\n` +
      `}\n`;
    const out = t(src);
    // The arm body must take the brace-block IIFE path, NOT the parenthesized
    // fallback that emits `({ let x = ... })` invalid TS.
    expect(out).not.toMatch(/=>\s*\(\s*\{?\s*let\b/);
    expect(out).not.toMatch(/return\s+let\b/);
    // Confirm the brace-block arrow form fired:
    expect(out).toMatch(/\(\{\s*name\s*\}: any\)\s*=>\s*\{[\s\S]*let r =[\s\S]*return\s+r\s*;[\s\S]*\}/);
  });
});
