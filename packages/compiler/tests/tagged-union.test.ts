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
