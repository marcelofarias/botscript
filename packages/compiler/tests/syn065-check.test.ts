/**
 * Tests for SYN065: bracket access on an alias of a dangerous global receiver (?bs 0.7+).
 *
 * SYN043 guards `globalThis['fetch']` (string-literal bracket) and SYN064 guards
 * `globalThis[key]` (dynamic bracket) on direct receiver tokens. SYN045/SYN049/SYN052/
 * SYN054/SYN056 catch dot-member access on aliases (`g.fetch()`). When an alias is used
 * with bracket notation, none of those checks fire. SYN065 closes the gap across all five
 * alias binding forms.
 *
 * Fires on:
 *   - alias['dangerousMember'] — string-literal key naming a SYN041_DANGEROUS_MEMBERS entry
 *   - alias[dynamicKey]        — non-literal key (member name unresolvable)
 *
 * Does NOT fire on:
 *   - alias['safeMember']      — string-literal key NOT in SYN041_DANGEROUS_MEMBERS
 *   - alias[42]                — number-literal key (not a member name)
 *   - direct receivers         — globalThis['fetch'] fires SYN043, not SYN065
 *   - obj.alias['fetch']       — alias is itself a property target
 *   - unsafe { alias['fetch'] } — suppressed
 */

import { describe, expect, it } from "vitest";
import { transform } from "../src/transform.js";

// ─── helper ───────────────────────────────────────────────────────────────────
function fires(src: string): boolean {
  return transform(src).warnings.some((w) => w.code === "SYN065");
}

// ─── module-scope const/let alias ─────────────────────────────────────────────
describe("SYN065 — module-scope const/let alias", () => {
  it("fires on const g = globalThis; g['fetch'](url)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      "fn run(url: string) -> any {\n" +
      "  return g['fetch'](url)\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("fires on const g = globalThis; g[key]()", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      "fn run(key: string) -> any {\n" +
      "  return g[key]()\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("fires on const w = window; w['eval'](code)", () => {
    const src =
      "?bs 0.7\n" +
      "const w = window;\n" +
      "fn run(code: string) -> any {\n" +
      "  return w['eval'](code)\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("fires on let s = self; s[name]()", () => {
    const src =
      "?bs 0.7\n" +
      "let s = self;\n" +
      "fn run(name: string) -> any {\n" +
      "  return s[name]()\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("does not fire on alias['safeMember'] — 'Date' is not in SYN041_DANGEROUS_MEMBERS", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      "fn run() -> any {\n" +
      "  return g['Date']\n" +
      "}\n";
    expect(fires(src)).toBe(false);
  });

  it("does not fire on alias[42] (number literal key)", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      "fn run() -> any {\n" +
      "  return g[42]\n" +
      "}\n";
    expect(fires(src)).toBe(false);
  });
});

// ─── module-scope assignment alias ────────────────────────────────────────────
describe("SYN065 — module-scope assignment alias", () => {
  it("fires on let g; g = globalThis; g['fetch']()", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any;\n" +
      "g = globalThis;\n" +
      "fn run(url: string) -> any {\n" +
      "  return g['fetch'](url)\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("fires on let g; g = globalThis; g[key]()", () => {
    const src =
      "?bs 0.7\n" +
      "let g: any;\n" +
      "g = globalThis;\n" +
      "fn run(key: string) -> any {\n" +
      "  return g[key]()\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });
});

// ─── fn-body const/let alias ──────────────────────────────────────────────────
describe("SYN065 — fn-body const/let alias", () => {
  it("fires on const g = globalThis inside fn body; g['WebSocket'](url)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string) -> any {\n" +
      "  const g = globalThis;\n" +
      "  return g['WebSocket'](url)\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("fires on const w = window inside fn body; w[key]()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  const w = window;\n" +
      "  return w[key]()\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });
});

// ─── fn-body assignment alias ─────────────────────────────────────────────────
describe("SYN065 — fn-body assignment alias", () => {
  it("fires on let g; g = globalThis inside fn body; g['eval'](code)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  let g: any;\n" +
      "  g = globalThis;\n" +
      "  return g['eval'](code)\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("fires on let g; g = globalThis inside fn body; g[key]()", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  let g: any;\n" +
      "  g = globalThis;\n" +
      "  return g[key]()\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });
});

// ─── default-parameter alias ──────────────────────────────────────────────────
describe("SYN065 — default-parameter alias", () => {
  it("fires on fn run(g = globalThis) { g['fetch']() }", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(url: string, g = globalThis) -> any {\n" +
      "  return g['fetch'](url)\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });

  it("fires on fn run(g = globalThis) { g[key]() }", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string, g = globalThis) -> any {\n" +
      "  return g[key]()\n" +
      "}\n";
    expect(fires(src)).toBe(true);
  });
});

// ─── exclusions ───────────────────────────────────────────────────────────────
describe("SYN065 — exclusions", () => {
  it("does not fire on direct receiver (SYN043/SYN064, not SYN065)", () => {
    const src =
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return globalThis[key]()\n" +
      "}\n";
    const result = transform(src);
    expect(result.warnings.some((w) => w.code === "SYN065")).toBe(false);
    expect(result.warnings.some((w) => w.code === "SYN064")).toBe(true);
  });

  it("suppresses inside unsafe block", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      'fn run(key: string) -> any {\n' +
      '  return unsafe "needed for dynamic dispatch" { g[key]() }\n' +
      "}\n";
    expect(fires(src)).toBe(false);
  });

  it("does not fire when alias is itself a property target (obj.g['fetch'])", () => {
    const src =
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      "fn run() -> any {\n" +
      "  return obj.g['fetch']()\n" +
      "}\n";
    expect(fires(src)).toBe(false);
  });

  it("does not fire below ?bs 0.7", () => {
    const src =
      "?bs 0.6\n" +
      "const g = globalThis;\n" +
      "fn run(key: string) -> any {\n" +
      "  return g[key]()\n" +
      "}\n";
    expect(fires(src)).toBe(false);
  });
});
