/**
 * Tests for SYN057: eval/Function used as a tagged-template tag bypasses SYN004 (?bs 0.7+).
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

describe("SYN057: eval/Function tagged-template bypass (0.7+)", () => {
  // ── eval`...` ─────────────────────────────────────────────────────────────

  it("fires on eval`code` in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(true);
  });

  it("fires on eval with a no-substitution template", () => {
    const src =
      "?bs 0.7\n" +
      "fn run() -> any {\n" +
      "  return eval`1 + 2`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(true);
  });

  // ── Function`...` ─────────────────────────────────────────────────────────

  it("fires on Function`body` in fn body", () => {
    const src =
      "?bs 0.7\n" +
      "fn build() -> any {\n" +
      "  return Function`return 42`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(true);
  });

  it("fires on Function`body` called immediately", () => {
    const src =
      "?bs 0.7\n" +
      "fn build() -> any {\n" +
      "  return Function`return 42`()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(true);
  });

  // ── suppression ───────────────────────────────────────────────────────────

  it("does not fire inside an unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      '  return unsafe "legacy eval" { eval`${code}` }\n' +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(false);
  });

  it("does not fire inside an unsafe fn body", () => {
    const src =
      "?bs 0.7\n" +
      'unsafe "calls eval" fn run(code: string) -> any {\n' +
      "  return eval`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(false);
  });

  // ── non-firing cases ──────────────────────────────────────────────────────

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.2\n" +
      "fn run(code) {\n" +
      "  return eval`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(false);
  });

  it("does not fire on obj.eval as tagged template (member call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(sandbox: any, code: string) -> any {\n" +
      "  return sandbox.eval`${code}`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(false);
  });

  it("does not fire on obj.Function as tagged template (member call)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(sandbox: any) -> any {\n" +
      "  return sandbox.Function`return 1`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(false);
  });

  it("does not fire on a regular string-tagged template like html`...`", () => {
    const src =
      "?bs 0.7\n" +
      "fn render(name: string) -> string {\n" +
      "  return html`<p>${name}</p>`\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(false);
  });

  // ── SYN004 still fires for normal call form ────────────────────────────────

  it("SYN004 still fires on eval() (not SYN057)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN004")).toBe(true);
    expect(result.warnings.some((w) => w.code === "SYN057")).toBe(false);
  });
});
