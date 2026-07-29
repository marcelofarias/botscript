import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

/**
 * UNS007: stale unsafe block — pure literal body (no ident tokens).
 *
 * Fires at ?bs 0.9+. No suppression mechanism. UNS008 covers the separate
 * population where idents exist but no bypass pattern does.
 */
describe("UNS007: stale unsafe block with pure literal body (?bs 0.9+)", () => {
  // ── FIRES ──────────────────────────────────────────────────────────────────

  it("fires on a numeric literal body", () => {
    expect(() =>
      transform(
        '?bs 0.9\nconst x = unsafe "magic number" { 42 };\n',
      ),
    ).toThrow("UNS007");
  });

  it("fires on a string literal body", () => {
    expect(() =>
      transform(
        '?bs 0.9\nconst x = unsafe "reason" { "hello" };\n',
      ),
    ).toThrow("UNS007");
  });

  it("fires on a boolean literal body", () => {
    expect(() =>
      transform(
        '?bs 0.9\nconst x = unsafe "reason" { true };\n',
      ),
    ).toThrow("UNS007");
  });

  // ── DOES NOT FIRE ──────────────────────────────────────────────────────────

  it("does not fire when body has an `as` cast", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: unknown) -> string { unsafe "cast" { x as string } }\n',
      ),
    ).not.toThrow("UNS007");
  });

  it("does not fire when body has a stdlib capability call", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(url: string) uses { net } -> string { unsafe "net" { http.get(url) } }\n',
      ),
    ).not.toThrow("UNS007");
  });

  it("does not fire when body has idents — UNS008 fires instead", () => {
    // UNS007 only targets pure-literal bodies. Ident bodies are UNS008's domain.
    expect(() =>
      transform(
        '?bs 0.9\nfn run(x: string) -> string { unsafe "stale" { x } }\n',
      ),
    ).toThrow("UNS008");
  });

  it("does not fire for unsafe fn declarations", () => {
    expect(() =>
      transform(
        '?bs 0.9\nunsafe "reason" fn run() -> number { 42 }\n',
      ),
    ).not.toThrow("UNS007");
  });

  it("does not fire below version 0.9", () => {
    expect(() =>
      transform(
        '?bs 0.8\nconst x = unsafe "reason" { 42 };\n',
      ),
    ).not.toThrow("UNS007");
  });
});
