import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

/**
 * UNS006: @ts-ignore / @ts-expect-error suppression comment.
 *
 * Fires at any version >= 0.5. No suppression mechanism.
 */
describe("UNS006: TypeScript suppression comment (?bs 0.5+)", () => {
  // ── FIRES ──────────────────────────────────────────────────────────────────

  it("fires on // @ts-ignore", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          "fn run(x: unknown) -> string {\n" +
          "  // @ts-ignore\n" +
          "  x\n" +
          "}\n",
      ),
    ).toThrow("UNS006");
  });

  it("fires on // @ts-expect-error", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          "fn run(x: unknown) -> string {\n" +
          "  // @ts-expect-error\n" +
          "  x\n" +
          "}\n",
      ),
    ).toThrow("UNS006");
  });

  it("fires on @ts-ignore with trailing text", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          "fn run(x: unknown) -> string {\n" +
          "  // @ts-ignore some explanation\n" +
          "  x\n" +
          "}\n",
      ),
    ).toThrow("UNS006");
  });

  it("fires at 0.5 (minimum version)", () => {
    expect(() =>
      transform(
        "?bs 0.5\n" +
          "// @ts-ignore\n",
      ),
    ).toThrow("UNS006");
  });

  // ── DOES NOT FIRE ──────────────────────────────────────────────────────────

  it("does not fire on @ts-ignore inside a string literal", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run() -> string { "@ts-ignore" }\n',
      ),
    ).not.toThrow("UNS006");
  });

  it("does not fire at version 0.4 (below minVersion)", () => {
    expect(() =>
      transform(
        "?bs 0.4\n" +
          "// @ts-ignore\n",
      ),
    ).not.toThrow("UNS006");
  });
});
