import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

/**
 * UNS009: weak unsafe reason string.
 *
 * Fires when the `unsafe "<reason>"` justification string is too weak:
 * empty, whitespace-only, or a known-weak deferral (TODO, legacy, temp,
 * temporary, workaround, fixme, hack, ignore, wip, fix, xxx).
 *
 * Applies to both block form and fn form.
 */
describe("UNS009: weak unsafe reason string (?bs 0.9+)", () => {
  // ── FIRES ──────────────────────────────────────────────────────────────────

  it("fires on empty reason string — block form", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run() uses { net } -> string { unsafe "" { http.get("u") } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on whitespace-only reason string", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run() uses { net } -> string { unsafe "   " { http.get("u") } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on TODO (case-insensitive)", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "TODO" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on todo (lowercase)", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "todo" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on legacy", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "legacy" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on LEGACY (uppercase)", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "LEGACY" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on temp", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "temp" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on temporary", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "temporary" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on workaround", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "workaround" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on fixme", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "fixme" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on hack", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "hack" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on ignore", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "ignore" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on wip", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "wip" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on xxx", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "xxx" { x as string } }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on unsafe fn with empty reason", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'unsafe "" fn run(x: any) uses { net } -> string { http.get("u") }\n',
      ),
    ).toThrow("UNS009");
  });

  it("fires on unsafe fn with TODO reason", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'unsafe "TODO" fn run(x: any) uses { net } -> string { http.get("u") }\n',
      ),
    ).toThrow("UNS009");
  });

  it("diagnostic code is UNS009", () => {
    try {
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "legacy" { x as string } }\n',
      );
      throw new Error("expected throw");
    } catch (e: unknown) {
      const err = e as { diagnostics?: Array<{ code?: string }> };
      expect(err.diagnostics?.[0]?.code).toBe("UNS009");
    }
  });

  // ── DOES NOT FIRE ──────────────────────────────────────────────────────────

  it("does not fire on a specific descriptive reason", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) uses { net } -> string { unsafe "third-party SDK returns any" { http.get("u") } }\n',
      ),
    ).not.toThrow("UNS009");
  });

  it("does not fire on a single-word reason not in the weak list", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "performance" { x as string } }\n',
      ),
    ).not.toThrow("UNS009");
  });

  it("does not fire on a multi-word reason not in the weak list", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "migration from untyped JS module" { x as string } }\n',
      ),
    ).not.toThrow("UNS009");
  });

  it("does not fire at ?bs 0.8 (pre-enforcement)", () => {
    expect(() =>
      transform(
        "?bs 0.8\n" +
          'fn run(x: any) -> string { unsafe "TODO" { x as string } }\n',
      ),
    ).not.toThrow("UNS009");
  });

  it("does not fire on a reason with mixed case that is not in the weak list", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: any) -> string { unsafe "TypeMismatch" { x as string } }\n',
      ),
    ).not.toThrow("UNS009");
  });
});
