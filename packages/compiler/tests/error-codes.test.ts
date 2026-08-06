import { describe, expect, it } from "vitest";

import { formatExplain, getErrorCode, listErrorCodes } from "../src/index.js";

describe("error-code registry", () => {
  it("has an entry for every code the compiler currently emits", () => {
    const codes = listErrorCodes().map((e) => e.code);
    // Exhaustive allowlist — add here AND to error-codes.ts when introducing a new diagnostic.
    const expected = [
      "ALI001", "ALI002", "ALI003",
      "CAP001", "CAP002", "CAP003",
      "DEP001", "DEP002", "DEP003", "DEP004",
      "EFF002", "EFF003", "EFF004",
      "FMT001",
      "INT001", "INT002", "INT003", "INT004", "INT005", "INT006", "INT007", "INT008", "INT009", "INT010", "INT011", "INT012", "INT013", "INT014", "INT015", "INT016", "INT017", "INT018", "INT019", "INT020", "INT021", "INT022", "INT023", "INT024", "INT025", "INT026", "INT027", "INT028", "INT029", "INT030", "INT031", "INT032", "INT033", "INT034", "INT035",
      "MAT001", "MAT002", "MAT003", "MAT004", "MAT005", "MAT006",
      "RES001", "RES002", "RES003",
      "SYN001", "SYN002", "SYN003", "SYN004", "SYN005", "SYN006", "SYN007", "SYN008", "SYN009", "SYN010", "SYN011", "SYN012", "SYN013", "SYN014", "SYN015", "SYN016", "SYN017", "SYN018", "SYN019", "SYN020", "SYN021", "SYN022", "SYN023", "SYN024", "SYN025", "SYN026", "SYN027", "SYN028", "SYN029", "SYN030", "SYN031", "SYN032", "SYN033", "SYN034", "SYN035", "SYN036", "SYN037", "SYN038", "SYN039", "SYN040", "SYN041", "SYN042", "SYN043", "SYN044", "SYN045", "SYN046", "SYN047", "SYN048", "SYN049", "SYN050",
      "THR001", "THR002", "THR003", "THR004",
      "UNS001", "UNS002", "UNS003", "UNS004", "UNS005", "UNS006", "UNS007", "UNS008", "UNS009",
      "VER001", "VER002", "VER003",
    ];
    for (const code of expected) {
      expect(codes).toContain(code);
    }
    // Every registered code must also appear in the allowlist above.
    for (const code of codes) {
      expect(expected).toContain(code);
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
