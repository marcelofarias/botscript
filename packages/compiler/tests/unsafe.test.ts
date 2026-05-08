import { describe, expect, it } from "vitest";

import { BotscriptError, transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("unsafe (0.3)", () => {
  it("rewrites unsafe \"reason\" { body } into an IIFE with the reason preserved", () => {
    const src = `?bs 0.3\nconst u = unsafe "Response.json() returns any" { value as User };\n`;
    const out = t(src);
    expect(out).toContain('/* unsafe: "Response.json() returns any" */');
    expect(out).toContain("(() => { return value as User; })()");
  });

  it("supports a body with explicit return", () => {
    const src = `?bs 0.3\nconst u = unsafe "explicit" { return value as User; };\n`;
    const out = t(src);
    expect(out).toContain("(() => { return value as User; })()");
  });

  it("rejects unsafe { body } with no justification (UNS001)", () => {
    const src = `?bs 0.3\nconst u = unsafe { value as User };\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]?.code).toBe("UNS001");
    }
  });

  it("rejects unsafe \"\" { body } with empty justification (UNS002)", () => {
    const src = `?bs 0.3\nconst u = unsafe "" { value as User };\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]?.code).toBe("UNS002");
    }
  });

  it("rejects unsafe \"reason\" with no body (UNS003)", () => {
    const src = `?bs 0.3\nconst u = unsafe "fix later";\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]?.code).toBe("UNS003");
    }
  });

  it("does not run on 0.1 files", () => {
    const src = `?bs 0.1\nconst u = unsafe { value as User };\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not run on 0.2 files (forward-compat)", () => {
    // The unsafe pass is gated at 0.3+. A 0.2 file with bare `unsafe { ... }`
    // continues to compile exactly as it did when 0.2 shipped.
    const src = `?bs 0.2\nconst u = unsafe { value as User };\n`;
    expect(() => t(src)).not.toThrow();
  });
});
