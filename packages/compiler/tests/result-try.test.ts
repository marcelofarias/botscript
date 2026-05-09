import { describe, expect, it } from "vitest";

import { BotscriptError, transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("Result.try (0.3)", () => {
  it("rewrites Result.try { expr } to $resultTry helper", () => {
    const src = `?bs 0.3\nconst r = Result.try { JSON.parse(input) };\n`;
    const out = t(src);
    expect(out).toContain("$resultTry(() => { return JSON.parse(input); })");
  });

  it("rewrites Result.tryAsync { expr } to async helper", () => {
    const src = `?bs 0.3\nconst r = Result.tryAsync { fetch(url) };\n`;
    const out = t(src);
    expect(out).toContain("$resultTryAsync(async () => { return fetch(url); })");
  });

  it("respects an explicit return inside the body", () => {
    const src = `?bs 0.3\nconst r = Result.try { return JSON.parse(input); };\n`;
    const out = t(src);
    expect(out).toContain("$resultTry(() => { return JSON.parse(input); })");
  });

  it("auto-imports $resultTry from the runtime", () => {
    const src = `?bs 0.3\nconst r = Result.try { JSON.parse(input) };\n`;
    const out = t(src);
    expect(out).toMatch(/import \{[^}]*\$resultTry[^}]*\} from "@mbfarias\/botscript-runtime"/);
  });

  it("leaves a Result.try(...) function call alone", () => {
    const src = `?bs 0.3\nconst r = Result.try(() => 1);\n`;
    const out = t(src);
    expect(out).toContain("Result.try(() => 1)");
    expect(out).not.toContain("$resultTry");
  });

  it("does not run on 0.1 files", () => {
    const src = `?bs 0.1\nconst r = Result.try { foo() };\n`;
    const out = t(src);
    expect(out).not.toContain("$resultTry");
  });

  it("does not run on 0.2 files (forward-compat)", () => {
    // Result.try is a 0.3 feature; 0.2 files keep their original behavior.
    const src = `?bs 0.2\nconst r = Result.try { foo() };\n`;
    const out = t(src);
    expect(out).not.toContain("$resultTry");
  });

  it("composes with the ? unwrap operator", () => {
    const src = `?bs 0.3\nfn parse(s: string) -> Result<unknown, string> {\n  let v = Result.try { JSON.parse(s) }?\n  return ok(v);\n}\n`;
    const out = t(src);
    // `?` unwrap rewrite should still fire on the let line.
    expect(out).toMatch(/__r1.*\$resultTry/s);
    expect(out).toMatch(/if \(__r1\.kind === "err"\)/);
  });

  it("lowers Result.try { let stmt; tail expr } correctly (probe D)", () => {
    const src =
      `?bs 0.4\n\n` +
      `fn parse(input: string) -> Result<unknown, string> {\n` +
      `  return Result.try {\n` +
      `    let trimmed = input.trim()\n` +
      `    JSON.parse(trimmed)\n` +
      `  }\n` +
      `}\n`;
    const out = t(src);
    // Must NOT emit `return let ...`.
    expect(out).not.toMatch(/return\s+let\b/);
    // The let statement is preserved, the tail expr is return-wrapped.
    expect(out).toMatch(/let trimmed = input\.trim\(\)\s*;/);
    expect(out).toMatch(/return\s+JSON\.parse\(trimmed\)\s*;/);
    expect(out).toContain("$resultTry(() => {");
  });
});
