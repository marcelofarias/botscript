/**
 * Tests for the shared type-string scanner (_type-parser.ts).
 */

import { describe, expect, it } from "vitest";
import {
  splitTopLevelPipe,
  topLevelCommaIndex,
  matchingAngleClose,
  isTopLevelResult,
  extractResultArgs,
  extractOutermostGenericContent,
  stripArraySuffix,
} from "../src/passes/_type-parser.js";

describe("splitTopLevelPipe", () => {
  it("splits simple union", () => {
    expect(splitTopLevelPipe("A | B | C")).toEqual(["A", "B", "C"]);
  });

  it("does not split pipe inside generics", () => {
    expect(splitTopLevelPipe("Result<A | B, E>")).toEqual(["Result<A | B, E>"]);
  });

  it("does not split pipe inside brackets", () => {
    expect(splitTopLevelPipe("[A | B]")).toEqual(["[A | B]"]);
  });

  it("does not split pipe inside parens", () => {
    expect(splitTopLevelPipe("(A | B)")).toEqual(["(A | B)"]);
  });

  it("does not split pipe inside braces", () => {
    expect(splitTopLevelPipe("{ err: A | B }")).toEqual(["{ err: A | B }"]);
  });

  it("handles -> inside generics (does not mis-track depth)", () => {
    expect(splitTopLevelPipe("Result<(x: string) -> string, ParseError> | OtherError")).toEqual([
      "Result<(x: string) -> string, ParseError>",
      "OtherError",
    ]);
  });

  it("handles => inside generics (does not mis-track depth)", () => {
    expect(splitTopLevelPipe("Result<(x: string) => string, ParseError> | OtherError")).toEqual([
      "Result<(x: string) => string, ParseError>",
      "OtherError",
    ]);
  });

  it("returns whole string when no top-level pipe", () => {
    expect(splitTopLevelPipe("ParseError")).toEqual(["ParseError"]);
  });
});

describe("topLevelCommaIndex", () => {
  it("finds comma in Result<T, E>", () => {
    const s = "T, E";
    expect(topLevelCommaIndex(s)).toBe(1);
  });

  it("does not find comma inside generics", () => {
    expect(topLevelCommaIndex("Map<K, V>")).toBe(-1);
  });

  it("does not find comma inside brackets", () => {
    expect(topLevelCommaIndex("[A, B]")).toBe(-1);
  });

  it("handles -> before the comma", () => {
    const s = "(x: string) -> string, ParseError";
    expect(topLevelCommaIndex(s)).toBe(21);
  });

  it("handles => before the comma", () => {
    const s = "(x: string) => string, ParseError";
    expect(topLevelCommaIndex(s)).toBe(21);
  });

  it("returns -1 when no comma", () => {
    expect(topLevelCommaIndex("ParseError")).toBe(-1);
  });
});

describe("matchingAngleClose", () => {
  it("finds matching > for simple generic", () => {
    const s = "<T>";
    expect(matchingAngleClose(s, 0)).toBe(2);
  });

  it("handles nested generics", () => {
    const s = "<Map<K, V>>";
    expect(matchingAngleClose(s, 0)).toBe(10);
  });

  it("does not treat > in -> as close", () => {
    const s = "<(x: string) -> string>";
    expect(matchingAngleClose(s, 0)).toBe(s.length - 1);
  });

  it("does not treat > in => as close", () => {
    const s = "<(x: string) => string>";
    expect(matchingAngleClose(s, 0)).toBe(s.length - 1);
  });

  it("returns -1 for unmatched", () => {
    expect(matchingAngleClose("<unclosed", 0)).toBe(-1);
  });

  it("returns -1 when openIdx is negative", () => {
    expect(matchingAngleClose("Result<T, E>", -1)).toBe(-1);
  });

  it("returns -1 when openIdx does not point at <", () => {
    expect(matchingAngleClose("Result<T, E>", 3)).toBe(-1);
  });

  it("returns -1 when openIdx is out of bounds", () => {
    expect(matchingAngleClose("Result<T, E>", 100)).toBe(-1);
  });
});

describe("isTopLevelResult", () => {
  it("recognizes Result<T, E>", () => {
    expect(isTopLevelResult("Result<T, E>")).toBe(true);
  });

  it("recognizes Result with leading whitespace", () => {
    expect(isTopLevelResult("  Result<T, E>")).toBe(true);
  });

  it("recognizes Result with space before <", () => {
    expect(isTopLevelResult("Result <T, E>")).toBe(true);
  });

  it("does not recognize wrapped Result", () => {
    expect(isTopLevelResult("Wrapper<Result<T, E>>")).toBe(false);
  });

  it("does not recognize Promise<Result<T, E>>", () => {
    expect(isTopLevelResult("Promise<Result<T, E>>")).toBe(false);
  });

  it("rejects Result<T, E> | Other (trailing union arm)", () => {
    expect(isTopLevelResult("Result<T, E> | Other")).toBe(false);
  });

  it("rejects Result<T, E> & Extra (trailing intersection)", () => {
    expect(isTopLevelResult("Result<T, E> & Extra")).toBe(false);
  });
});

describe("extractResultArgs", () => {
  it("extracts T and E from Result<T, E>", () => {
    expect(extractResultArgs("Result<string, ParseError>")).toEqual(["string", "ParseError"]);
  });

  it("extracts T and E from Promise<Result<T, E>>", () => {
    expect(extractResultArgs("Promise<Result<string, ParseError>>")).toEqual(["string", "ParseError"]);
  });

  it("handles Result with space before <", () => {
    expect(extractResultArgs("Result <string, ParseError>")).toEqual(["string", "ParseError"]);
  });

  it("extracts union error type", () => {
    expect(extractResultArgs("Result<string, ParseError | NetworkError>")).toEqual([
      "string",
      "ParseError | NetworkError",
    ]);
  });

  it("handles -> inside the success type", () => {
    expect(extractResultArgs("Result<(x: string) -> string, ParseError>")).toEqual([
      "(x: string) -> string",
      "ParseError",
    ]);
  });

  it("handles => inside the success type", () => {
    expect(extractResultArgs("Result<(x: string) => string, ParseError>")).toEqual([
      "(x: string) => string",
      "ParseError",
    ]);
  });

  it("handles tuple success type (comma inside [])", () => {
    expect(extractResultArgs("Result<[A, B], ParseError>")).toEqual(["[A, B]", "ParseError"]);
  });

  it("handles record success type (comma inside {})", () => {
    expect(extractResultArgs("Result<{ x: number, y: number }, ParseError>")).toEqual([
      "{ x: number, y: number }",
      "ParseError",
    ]);
  });

  it("returns null for non-Result type", () => {
    expect(extractResultArgs("string")).toBeNull();
  });

  it("returns null for Wrapper<Result<T, E>>", () => {
    expect(extractResultArgs("Wrapper<Result<string, ParseError>>")).toBeNull();
  });

  it("returns null for Result<T, E> | Other (top-level union)", () => {
    expect(extractResultArgs("Result<string, ParseError> | Other")).toBeNull();
  });

  it("returns null for Promise<Result<T, E>> | Other (Promise union)", () => {
    expect(extractResultArgs("Promise<Result<string, ParseError>> | Other")).toBeNull();
  });

  it("returns null for Result<A, B, C> (more than two type args)", () => {
    expect(extractResultArgs("Result<A, B, C>")).toBeNull();
  });
});

describe("extractOutermostGenericContent", () => {
  it("extracts content of Outer<A, B>", () => {
    expect(extractOutermostGenericContent("Outer<A, B>")).toBe("A, B");
  });

  it("handles nested generics", () => {
    expect(extractOutermostGenericContent("Outer<Inner<X>, Y>")).toBe("Inner<X>, Y");
  });

  it("handles -> inside", () => {
    expect(extractOutermostGenericContent("Promise<(x: string) -> string>")).toBe("(x: string) -> string");
  });

  it("returns null for non-generic type", () => {
    expect(extractOutermostGenericContent("string")).toBeNull();
  });
});

describe("stripArraySuffix", () => {
  it("returns ident for plain type", () => {
    expect(stripArraySuffix("ParseError")).toBe("ParseError");
  });

  it("returns ident for generic type", () => {
    expect(stripArraySuffix("ParseError<T>")).toBe("ParseError");
  });

  it("returns '' for array type ParseError[]", () => {
    expect(stripArraySuffix("ParseError[]")).toBe("");
  });

  it("returns '' for ParseError [] with trivia", () => {
    expect(stripArraySuffix("ParseError []")).toBe("");
  });

  it("returns '' for generic array ParseError<T>[]", () => {
    expect(stripArraySuffix("ParseError<T>[]")).toBe("");
  });

  it("handles leading/trailing whitespace", () => {
    expect(stripArraySuffix("  ParseError  ")).toBe("ParseError");
  });

  it("returns '' for non-identifier", () => {
    expect(stripArraySuffix("[A, B]")).toBe("");
  });

  it("returns ident for indexed-access type Foo[\"bar\"]", () => {
    expect(stripArraySuffix('Foo["bar"]')).toBe("Foo");
  });

  it("returns ident for indexed-access type Foo[Bar]", () => {
    expect(stripArraySuffix("Foo[Bar]")).toBe("Foo");
  });

  it("returns '' for indexed-access with trailing array suffix Foo[\"bar\"][]", () => {
    expect(stripArraySuffix('Foo["bar"][]')).toBe("");
  });

  it("returns '' for indexed-access with trailing array suffix Foo[Bar][]", () => {
    expect(stripArraySuffix("Foo[Bar][]")).toBe("");
  });

  it("returns '' for qualified array type Errors.ParseError[]", () => {
    expect(stripArraySuffix("Errors.ParseError[]")).toBe("");
  });
});
