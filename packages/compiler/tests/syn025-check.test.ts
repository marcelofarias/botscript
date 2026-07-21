/**
 * Tests for SYN025: document.cookie access in fn bodies (?bs 0.7+).
 *
 * SYN025 fires when a fn body accesses `document.cookie` or `document?.cookie`.
 * SYN025 is a non-blocking warning — transform must not throw.
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN025: document.cookie ambient browser capability detection", () => {
  // ── Fires ────────────────────────────────────────────────────────────────

  it("fires on document.cookie read", () => {
    const src =
      "?bs 0.7\n" +
      "fn isLoggedIn() -> boolean {\n" +
      "  return document.cookie.includes('auth=')\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("fires on document.cookie assignment (write)", () => {
    const src =
      "?bs 0.7\n" +
      "fn setSession(id: string) -> void {\n" +
      "  document.cookie = 'sessionId=' + id\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("fires on document?.cookie (optional chain)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getCookies() -> string {\n" +
      "  return document?.cookie ?? ''\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("fires on bare document.cookie reference (no call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn dump() -> string {\n" +
      "  const c = document.cookie\n" +
      "  return c\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("fires inside an async fn", () => {
    const src =
      "?bs 0.7\n" +
      "async fn getAuth() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(true);
  });

  it("reports the correct code in the warning", () => {
    const src =
      "?bs 0.7\n" +
      "fn check() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    const result = transform(src);
    const w = result.warnings.find((w) => w.code === "SYN025");
    expect(w).toBeDefined();
    expect(w!.severity).toBe("warning");
  });

  // ── Suppressed by unsafe ──────────────────────────────────────────────────

  it("does not fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn check() -> string {\n" +
      "  return unsafe \"reads cookie for auth\" { document.cookie }\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does not fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"wraps cookie access\" fn check() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  // ── Exclusions ────────────────────────────────────────────────────────────

  it("does not fire on obj.document.cookie (member access on local binding)", () => {
    const src =
      "?bs 0.7\n" +
      "fn check(win: any) -> string {\n" +
      "  return win.document.cookie\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does not fire on bare document identifier (no .cookie follow)", () => {
    const src =
      "?bs 0.7\n" +
      "fn check(doc: any) -> any {\n" +
      "  return doc\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does not fire on document.title (non-cookie member)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getTitle() -> string {\n" +
      "  return document.title\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does not fire on fn named document", () => {
    const src =
      "?bs 0.7\n" +
      "fn document(cookie: string) -> string {\n" +
      "  return cookie\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn check() -> string {\n" +
      "  return document.cookie\n" +
      "}\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });

  it("does not fire outside a fn body (module-level)", () => {
    const src =
      "?bs 0.7\n" +
      "const cookieStr = document.cookie\n";
    expect(transform(src).warnings.some((w) => w.code === "SYN025")).toBe(false);
  });
});
