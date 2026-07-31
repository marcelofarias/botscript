/**
 * Tests for SYN035 — history.* access mutates browser history or reads ambient
 * navigation state, both invisible to callers (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/index.js";

function compile(src: string) {
  return transform(src);
}

describe("SYN035 — history.* history mutation and ambient navigation state (?bs 0.7+)", () => {
  it("fires SYN035 on history.pushState()", () => {
    const src =
      "?bs 0.7\n" +
      "fn navigate(url: string) -> void {\n" +
      "  history.pushState(null, '', url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history.replaceState()", () => {
    const src =
      "?bs 0.7\n" +
      "fn redirect(url: string) -> void {\n" +
      "  history.replaceState(null, '', url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history.back()", () => {
    const src =
      "?bs 0.7\n" +
      "fn goBack() -> void {\n" +
      "  history.back()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history.forward()", () => {
    const src =
      "?bs 0.7\n" +
      "fn goForward() -> void {\n" +
      "  history.forward()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history.go()", () => {
    const src =
      "?bs 0.7\n" +
      "fn goRelative(delta: number) -> void {\n" +
      "  history.go(delta)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history.length ambient read", () => {
    const src =
      "?bs 0.7\n" +
      "fn stackDepth() -> number {\n" +
      "  return history.length\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history.state ambient read", () => {
    const src =
      "?bs 0.7\n" +
      "fn currentState() -> unknown {\n" +
      "  return history.state\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history.scrollRestoration ambient read", () => {
    const src =
      "?bs 0.7\n" +
      "fn scrollMode() -> string {\n" +
      "  return history.scrollRestoration\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("fires SYN035 on history?.pushState optional chain", () => {
    const src =
      "?bs 0.7\n" +
      "fn safeNavigate(url: string) -> void {\n" +
      "  history?.pushState(null, '', url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(true);
  });

  it("SYN035 message contains fn name and 'history'", () => {
    const src =
      "?bs 0.7\n" +
      "fn goTo(path: string) -> void {\n" +
      "  history.pushState(null, '', path)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w).toBeDefined();
    expect(w!.message).toContain("goTo");
    expect(w!.message).toContain("history");
    expect(w!.message).toContain("pushState");
  });

  it("mutation message mentions 'mutates the browser history stack'", () => {
    const src =
      "?bs 0.7\n" +
      "fn push(url: string) -> void {\n" +
      "  history.pushState({}, '', url)\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w).toBeDefined();
    expect(w!.message).toContain("mutates the browser history stack");
  });

  it("ambient-read message mentions 'ambient navigation state'", () => {
    const src =
      "?bs 0.7\n" +
      "fn depth() -> number {\n" +
      "  return history.length\n" +
      "}\n";
    const result = compile(src);
    const w = result.warnings.find((w) => w.code === "SYN035");
    expect(w).toBeDefined();
    expect(w!.message).toContain("ambient navigation state");
  });

  it("does NOT fire on obj.history.pushState (property access, not global)", () => {
    const src =
      "?bs 0.7\n" +
      "fn push(win: any) -> void {\n" +
      "  win.history.pushState(null, '', '/')\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on fn declaration named history", () => {
    const src =
      "?bs 0.7\n" +
      "fn history(path: string) -> string {\n" +
      "  return path\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on history.toString() (not in high-concern set)", () => {
    const src =
      "?bs 0.7\n" +
      "fn asString() -> string {\n" +
      "  return history.toString()\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn navigate(url: string) -> void {\n" +
      '  unsafe "pushes history for client-side routing" { history.pushState(null, \'\', url) }\n' +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire on unsafe fn", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "manages browser history" fn navigate(url: string) -> void {\n' +
      "  history.pushState(null, '', url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("does NOT fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "fn navigate(url: string) -> void {\n" +
      "  history.pushState(null, '', url)\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.some((w) => w.code === "SYN035")).toBe(false);
  });

  it("fires once per history access in same fn", () => {
    const src =
      "?bs 0.7\n" +
      "fn navAndCheck(url: string) -> number {\n" +
      "  history.pushState(null, '', url)\n" +
      "  return history.length\n" +
      "}\n";
    const result = compile(src);
    expect(result.warnings.filter((w) => w.code === "SYN035").length).toBe(2);
  });
});
