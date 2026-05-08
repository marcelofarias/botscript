import { describe, expect, it } from "vitest";

import {
  isNone,
  isSome,
  mapOption,
  none,
  optionFromNullable,
  some,
  unwrapOption,
  unwrapOr,
} from "../src/option.js";

describe("Option", () => {
  it("some wraps a value", () => {
    const o = some("hi");
    expect(isSome(o)).toBe(true);
    expect(isNone(o)).toBe(false);
  });

  it("none is the empty case", () => {
    expect(isNone(none)).toBe(true);
    expect(isSome(none)).toBe(false);
  });

  it("optionFromNullable", () => {
    expect(optionFromNullable(null)).toEqual(none);
    expect(optionFromNullable(undefined)).toEqual(none);
    expect(optionFromNullable(0)).toEqual(some(0));
    expect(optionFromNullable("")).toEqual(some(""));
  });

  it("mapOption only transforms Some", () => {
    expect(mapOption(some(1), (n) => n + 1)).toEqual(some(2));
    expect(mapOption(none, (n: number) => n + 1)).toEqual(none);
  });

  it("unwrapOr falls back on None", () => {
    expect(unwrapOr(some("a"), "z")).toBe("a");
    expect(unwrapOr(none as ReturnType<typeof some<string>>, "z")).toBe("z");
  });

  it("unwrapOption throws on None", () => {
    expect(unwrapOption(some(1))).toBe(1);
    expect(() => unwrapOption(none)).toThrow();
  });
});
