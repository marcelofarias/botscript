import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

/**
 * UNS008: decay-stale unsafe block — body has identifiers but no bypass pattern.
 *
 * The check fires when an unsafe block's body contains identifier tokens but
 * none of the patterns the botscript checker suite would flag: no stdlib call,
 * no `as` cast, no `throw`, no known bypass ident, and no function call
 * (which could be suppressing RES002).
 */
describe("UNS008: decay-stale unsafe block (?bs 0.9+)", () => {
  // ── FIRES ──────────────────────────────────────────────────────────────────

  it("fires on a body with a bare variable reference", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(data: string) -> string { unsafe "stale" { data } }\n',
      ),
    ).toThrow("UNS008");
  });

  it("fires on a body with a member access (no call)", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(user: User) -> string { unsafe "stale" { user.email } }\n',
      ),
    ).toThrow("UNS008");
  });

  it("fires on a body with only a variable assignment target", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(x: number) -> number { unsafe "stale" { x } }\n',
      ),
    ).toThrow("UNS008");
  });

  it("fires on a body with const declaration but no bypass", () => {
    // `const` is an ident in botscript — not in BYPASS_IDENTS, no call pattern.
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run() -> void { unsafe "stale" { const x = 1 } }\n',
      ),
    ).toThrow("UNS008");
  });

  it("fires when body has multiple non-bypass idents", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(a: string, b: string) -> string { unsafe "stale" { a } }\n',
      ),
    ).toThrow("UNS008");
  });

  it("does NOT fire on ?bs 0.8 (check is 0.9+)", () => {
    expect(() =>
      transform(
        "?bs 0.8\n" +
          'fn run(data: string) -> string { unsafe "stale" { data } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  // ── DOES NOT FIRE ──────────────────────────────────────────────────────────

  it("does NOT fire when body contains an as cast", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(data: unknown) -> string { unsafe "cast" { data as string } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains a stdlib call", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(url: string) uses { net } -> void { unsafe "needed" { http.get(url) } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains a throw", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run() -> void { unsafe "needed" { throw new Error("x") } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains a console call", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(msg: string) -> void { unsafe "debug" { console.log(msg) } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains any function call (RES002 safety)", () => {
    // Function calls might be suppressing RES002 — we lack subtree context.
    expect(() =>
      transform(
        "?bs 0.9\n" +
          "fn save(id: string) -> void {}\n" +
          'fn run(id: string) -> void { unsafe "discard" { save(id) } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains a method call", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(arr: string[]) -> void { unsafe "needed" { arr.push("x") } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains process.env (bypass ident)", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run() -> string { unsafe "env" { process.env.DB_URL } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains fetch (bypass ident)", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(url: string) -> void { unsafe "native" { fetch(url) } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire when body contains eval (bypass ident)", () => {
    expect(() =>
      transform(
        "?bs 0.9\n" +
          'fn run(code: string) -> void { unsafe "eval" { eval(code) } }\n',
      ),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire on pure literal body (no idents — UNS008 only targets bodies with idents)", () => {
    // A body of pure literals has no idents; UNS008 classifies it as "no-ident"
    // and skips it. UNS007 (on its own branch) would catch this case.
    expect(() =>
      transform("?bs 0.9\nfn run() -> void { unsafe \"stale\" { 42 } }\n"),
    ).not.toThrow("UNS008");
  });

  it("does NOT fire on unsafe fn declarations", () => {
    // `unsafe "reason" fn` is a declaration-level escape hatch, not an
    // expression block — UNS008 doesn't apply.
    expect(() =>
      transform(
        "?bs 0.9\n" +
          "unsafe \"legacy\" fn run(data: unknown) -> string {\n" +
          "  data\n" +
          "}\n",
      ),
    ).not.toThrow("UNS008");
  });

  it("fires with correct error code in the diagnostic", () => {
    try {
      transform(
        "?bs 0.9\n" +
          'fn run(data: string) -> string { unsafe "stale" { data } }\n',
      );
      expect.fail("should have thrown");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toMatch(/UNS008/);
    }
  });

  it("fires with correct line number in the diagnostic", () => {
    try {
      transform(
        "?bs 0.9\n" +
          'fn run(data: string) -> string { unsafe "stale" { data } }\n',
      );
      expect.fail("should have thrown");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Error);
      expect((e as Error).message).toMatch(/line 2/);
    }
  });
});
