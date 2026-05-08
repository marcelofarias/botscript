import { describe, expect, it } from "vitest";

import { $literalMatch, $match, $tagMatch, $wildcard } from "../src/match.js";

describe("$match", () => {
  it("matches by tag", () => {
    type Shape = { kind: "Circle"; r: number } | { kind: "Square"; side: number };
    const area = (s: Shape): number =>
      $match<Shape, number>(s, [
        [$tagMatch("Circle", ["r"]), ({ r }: { r: number }) => Math.PI * r * r],
        [$tagMatch("Square", ["side"]), ({ side }: { side: number }) => side * side],
      ]);
    expect(area({ kind: "Circle", r: 2 })).toBeCloseTo(Math.PI * 4);
    expect(area({ kind: "Square", side: 3 })).toBe(9);
  });

  it("matches string literals", () => {
    const f = (s: string) =>
      $match<string, number>(s, [
        [$literalMatch("a"), () => 1],
        [$literalMatch("b"), () => 2],
        [$wildcard(), () => 0],
      ]);
    expect(f("a")).toBe(1);
    expect(f("b")).toBe(2);
    expect(f("c")).toBe(0);
  });

  it("throws when no arm matches and no wildcard", () => {
    expect(() => $match("x", [[$literalMatch("y"), () => 1]])).toThrow(/no arm matched/);
  });

  it("matches bare-tag string scrutinee", () => {
    const result = $match<string, string>("ping", [
      [$tagMatch("ping"), () => "pong"],
      [$tagMatch("pong"), () => "ping"],
    ]);
    expect(result).toBe("pong");
  });
});
