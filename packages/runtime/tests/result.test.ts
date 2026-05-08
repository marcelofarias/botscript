import { describe, expect, it } from "vitest";

import { err, isErr, isOk, mapErr, mapResult, ok, unwrap } from "../src/result.js";

describe("Result", () => {
  it("ok wraps a value", () => {
    const r = ok(1);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    expect(r.value).toBe(1);
  });

  it("err wraps an error", () => {
    const r = err("boom");
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    expect(r.error).toBe("boom");
  });

  it("mapResult only transforms Ok", () => {
    expect(mapResult(ok(1), (n) => n + 1)).toEqual(ok(2));
    expect(mapResult(err("x"), (n: number) => n + 1)).toEqual(err("x"));
  });

  it("mapErr only transforms Err", () => {
    expect(mapErr(err("x"), (s) => s.toUpperCase())).toEqual(err("X"));
    expect(mapErr(ok(1), (s: string) => s.toUpperCase())).toEqual(ok(1));
  });

  it("unwrap throws on Err", () => {
    expect(unwrap(ok(7))).toBe(7);
    expect(() => unwrap(err("x"))).toThrow();
  });
});
