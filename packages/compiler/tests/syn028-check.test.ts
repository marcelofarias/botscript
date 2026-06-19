/**
 * Tests for SYN028: navigation API bypass detection (?bs 0.7+).
 *
 * Covers:
 *   - location.href = url  (assignment)
 *   - location.assign(url), location.replace(url), location.reload()  (calls)
 *   - window.open(url), globalThis.open(url), self.open(url)  (ambient-global calls)
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src, {});
}

// ---------------------------------------------------------------------------
// location.href = url
// ---------------------------------------------------------------------------

describe("SYN028 — location.href assignment", () => {
  it("fires on location.href = url", () => {
    const src =
      "?bs 0.7\n" +
      "fn redirectTo(url: string) -> void {\n" +
      "  location.href = url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("does NOT fire on location?.href = url (invalid LHS — optional chaining cannot be an assignment target)", () => {
    // `location?.href = url` is syntactically invalid JS/TS: optional chaining is not
    // allowed on the left-hand side of an assignment. SYN028 must not fire on this form.
    const src =
      "?bs 0.7\n" +
      "fn redirectTo(url: string) -> void {\n" +
      "  location?.href = url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("warning message includes fn name and location.href", () => {
    const src =
      "?bs 0.7\n" +
      "fn redirectTo(url: string) -> void {\n" +
      "  location.href = url\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w).toBeDefined();
    expect(w!.message).toContain("redirectTo");
    expect(w!.message).toContain("location");
    expect(w!.message).toContain("href");
    expect(w!.severity).toBe("warning");
  });

  it("does NOT fire on location.href comparison (==, ===)", () => {
    const src =
      "?bs 0.7\n" +
      "fn isRoot() -> bool {\n" +
      "  return location.href === '/'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire on obj.location.href = url (non-ambient receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn go(ctx: any, url: string) -> void {\n" +
      "  ctx.location.href = url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.1\n" +
      "fn f(url: string) -> void {\n" +
      "  location.href = url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn redirectTo(url: string) -> void {\n" +
      "  unsafe \"redirects to login page\" { location.href = url }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"navigation entry point\" fn redirectTo(url: string) -> void {\n" +
      "  location.href = url\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire on bare location reference (no member access)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getRef() -> any {\n" +
      "  return location\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire on location.search or other non-navigation members", () => {
    const src =
      "?bs 0.7\n" +
      "fn getQuery() -> string {\n" +
      "  return location.search\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// location.assign(), location.replace(), location.reload()
// ---------------------------------------------------------------------------

describe("SYN028 — location method calls", () => {
  it("fires on location.assign(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn goTo(url: string) -> void {\n" +
      "  location.assign(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires on location.replace(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn goTo(url: string) -> void {\n" +
      "  location.replace(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires on location.reload()", () => {
    const src =
      "?bs 0.7\n" +
      "fn refresh() -> void {\n" +
      "  location.reload()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("reload message unsafe suggestion uses () not (url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn refresh() -> void {\n" +
      "  location.reload()\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w).toBeDefined();
    // location.reload() takes no URL argument — the safe-wrap suggestion must not say (url)
    expect(w!.message).toContain("reload()");
    expect(w!.message).not.toContain("reload(url)");
  });

  it("fires on location?.assign(url) — optional-chain receiver", () => {
    const src =
      "?bs 0.7\n" +
      "fn goTo(url: string) -> void {\n" +
      "  location?.assign(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires on location.assign?.(url) — optional-call form", () => {
    const src =
      "?bs 0.7\n" +
      "fn goTo(url: string) -> void {\n" +
      "  location.assign?.(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("warning message includes fn name and method name", () => {
    const src =
      "?bs 0.7\n" +
      "fn goTo(url: string) -> void {\n" +
      "  location.assign(url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w).toBeDefined();
    expect(w!.message).toContain("goTo");
    expect(w!.message).toContain("assign");
    expect(w!.severity).toBe("warning");
  });

  it("does NOT fire on obj.location.assign(url) (non-ambient)", () => {
    const src =
      "?bs 0.7\n" +
      "fn go(ctx: any, url: string) -> void {\n" +
      "  ctx.location.assign(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"navigation entry point\" fn goTo(url: string) -> void {\n" +
      "  location.assign(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire on fn declaration named location", () => {
    const src =
      "?bs 0.7\n" +
      "fn location(url: string) -> void { }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire on function declaration named location", () => {
    const src =
      "?bs 0.7\n" +
      "function location(url: string) { }\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// window.open(), globalThis.open(), self.open()
// ---------------------------------------------------------------------------

describe("SYN028 — window.open() and ambient-global variants", () => {
  it("fires on window.open(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(url: string) -> void {\n" +
      "  window.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires on globalThis.open(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(url: string) -> void {\n" +
      "  globalThis.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires on self.open(url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(url: string) -> void {\n" +
      "  self.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("fires on window?.open(url) — optional-chain receiver", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(url: string) -> void {\n" +
      "  window?.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(true);
  });

  it("warning message includes fn name and window.open", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(url: string) -> void {\n" +
      "  window.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w).toBeDefined();
    expect(w!.message).toContain("openTab");
    expect(w!.message).toContain("window");
    expect(w!.message).toContain("open");
    expect(w!.severity).toBe("warning");
  });

  it("warning message for globalThis.open uses globalThis (not window)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(url: string) -> void {\n" +
      "  globalThis.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w).toBeDefined();
    expect(w!.message).toContain("globalThis");
    expect(w!.message).not.toContain("window.open()");
  });

  it("does NOT fire on obj.window.open(url) (non-ambient receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(ctx: any, url: string) -> void {\n" +
      "  ctx.window.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire on someObj.open(url) (non-ambient receiver)", () => {
    const src =
      "?bs 0.7\n" +
      "fn openFile(fileHandle: any, path: string) -> void {\n" +
      "  fileHandle.open(path)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.1\n" +
      "fn f(url: string) -> void {\n" +
      "  window.open(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn openTab(url: string) -> void {\n" +
      "  unsafe \"opens help window\" { window.open(url, '_blank') }\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });

  it("does NOT fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      "unsafe \"navigation entry point\" fn openTab(url: string) -> void {\n" +
      "  window.open(url, '_blank')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN028")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

describe("SYN028 registry", () => {
  it("carries rule and rewrite from registry", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void { location.href = url }\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN028");
    expect(w?.rule).toBeTruthy();
    expect(w?.rewrite).toBeTruthy();
  });

  it("fires multiple SYN028s when multiple navigation APIs appear in one fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn f(url: string) -> void {\n" +
      "  location.href = url\n" +
      "  window.open(url, '_blank')\n" +
      "  location.assign(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN028").length).toBe(3);
  });
});
