import { describe, expect, it } from "vitest";

import { formatExplain, getErrorCode, listErrorCodes } from "../src/index.js";

describe("error-code registry", () => {
  it("has an entry for every code the compiler currently emits", () => {
    const codes = listErrorCodes().map((e) => e.code);
    // If the compiler grows a new diagnostic, add it to error-codes.ts AND to this list.
    for (const code of ["CAP001", "CAP002", "CAP003", "EFF002", "FMT001", "INT001", "INT002", "RES001", "SYN001", "UNS001", "UNS002", "UNS003", "UNS004"]) {
      expect(codes).toContain(code);
    }
  });

  it("returns undefined for an unknown code", () => {
    expect(getErrorCode("ZZZ999")).toBeUndefined();
  });

  it("formats explain output with rule/idiom/rewrite and an example block", () => {
    const entry = getErrorCode("CAP001")!;
    const out = formatExplain(entry);
    expect(out).toMatch(/botscript\[CAP001\]:/);
    expect(out).toMatch(/Rule:/);
    expect(out).toMatch(/Idiom:/);
    expect(out).toMatch(/Rewrite:/);
    expect(out).toMatch(/Example:/);
  });

  it("entries are sorted by code in the listing", () => {
    const codes = listErrorCodes().map((e) => e.code);
    const sorted = [...codes].sort();
    expect(codes).toEqual(sorted);
  });
});
