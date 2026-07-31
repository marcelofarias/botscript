/**
 * Tests for SYN034 — location.* access reads ambient URL or triggers navigation,
 * both invisible to callers (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN034 — location.* ambient URL access and navigation I/O (?bs 0.7+)", () => {
  it("fires SYN034 on location.pathname read", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSection() -> string {\n" +
      "  return location.pathname.split('/')[1]\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.href read", () => {
    const src =
      "?bs 0.7\n" +
      "fn currentUrl() -> string {\n" +
      "  return location.href\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.search", () => {
    const src =
      "?bs 0.7\n" +
      "fn getQuery() -> string {\n" +
      "  return location.search\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.hash", () => {
    const src =
      "?bs 0.7\n" +
      "fn getHash() -> string {\n" +
      "  return location.hash\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.hostname", () => {
    const src =
      "?bs 0.7\n" +
      "fn getHost() -> string {\n" +
      "  return location.hostname\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.origin", () => {
    const src =
      "?bs 0.7\n" +
      "fn getOrigin() -> string {\n" +
      "  return location.origin\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.assign() navigation call", () => {
    const src =
      "?bs 0.7\n" +
      "fn goTo(url: string) -> void {\n" +
      "  location.assign(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.replace() navigation call", () => {
    const src =
      "?bs 0.7\n" +
      "fn redirect(url: string) -> void {\n" +
      "  location.replace(url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location.reload()", () => {
    const src =
      "?bs 0.7\n" +
      "fn refresh() -> void {\n" +
      "  location.reload()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("fires SYN034 on location?.pathname optional chain", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPath() -> string {\n" +
      "  return location?.pathname ?? '/'\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(true);
  });

  it("SYN034 message contains fn name and 'location'", () => {
    const src =
      "?bs 0.7\n" +
      "fn isAdminRoute() -> boolean {\n" +
      "  return location.pathname.startsWith('/admin')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN034");
    expect(w).toBeDefined();
    expect(w!.message).toContain("isAdminRoute");
    expect(w!.message).toContain("location");
    expect(w!.message).toContain("pathname");
  });

  it("does NOT fire on window.location.pathname (property access, not global)", () => {
    const src =
      "?bs 0.7\n" +
      "fn getPath(win: any) -> string {\n" +
      "  return win.location.pathname\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on fn declaration named location", () => {
    const src =
      "?bs 0.7\n" +
      "fn location(path: string) -> string {\n" +
      "  return path\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on location.toString() (not in high-concern set)", () => {
    const src =
      "?bs 0.7\n" +
      "fn asString() -> string {\n" +
      "  return location.toString()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn getSection() -> string {\n" +
      '  const path = unsafe "reads location.pathname for routing" { location.pathname }\n' +
      "  return path.split('/')[1]\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire on unsafe fn", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "reads location for routing" fn getSection() -> string {\n' +
      "  return location.pathname.split('/')[1]\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn getSection() -> string {\n" +
      "  return location.pathname.split('/')[1]\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN034")).toBe(false);
  });

  it("fires once per location access in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn buildUrl() -> string {\n" +
      "  return location.origin + location.pathname\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN034").length).toBe(2);
  });

  it("navigation message mentions 'navigation side effect'", () => {
    const src =
      "?bs 0.7\n" +
      "fn goHome() -> void {\n" +
      "  location.assign('/')\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN034");
    expect(w).toBeDefined();
    expect(w!.message).toContain("navigation side effect");
  });
});
