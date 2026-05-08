import { describe, expect, it } from "vitest";

import {
  BotscriptError,
  CapabilityCheckError,
  formatDiagnostic,
  transform,
} from "../src/index.js";

describe("BotscriptError + Diagnostic", () => {
  it("malformed ?bs directive throws BS001 with rule/idiom/rewrite", () => {
    try {
      transform(`?bs nope\n`);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(BotscriptError);
      const err = e as BotscriptError;
      expect(err.diagnostics).toHaveLength(1);
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("BS001");
      expect(d.severity).toBe("error");
      expect(d.message).toContain("malformed");
      expect(d.idiom).toMatch(/\?bs 0\.1/);
      expect(d.rewrite).toMatch(/\?bs 0\.1/);
      expect(d.line).toBe(1);
    }
  });

  it("unsupported version throws BS002", () => {
    try {
      transform(`?bs 99.0\n`);
      throw new Error("expected throw");
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.code).toBe("BS002");
      expect(err.diagnostics[0]!.message).toContain("unsupported version");
    }
  });

  it("CAP001 carries fn/cap/namespace fields and structured diagnostic", () => {
    const src = `?bs 0.2\nfn now() -> number = pure { time.now() }\n`;
    try {
      transform(src);
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toBeInstanceOf(CapabilityCheckError);
      expect(e).toBeInstanceOf(BotscriptError);
      const err = e as CapabilityCheckError;
      expect(err.fnName).toBe("now");
      expect(err.capability).toBe("time");
      expect(err.namespace).toBe("time");
      expect(err.diagnostics).toHaveLength(1);
      const d = err.diagnostics[0]!;
      expect(d.code).toBe("CAP001");
      expect(d.line).toBe(2);
      expect(d.rule).toContain("uses");
      expect(d.rewrite).toContain("uses { time }");
    }
  });

  it("attaches the filename when transform was called with one", () => {
    const src = `?bs 0.2\nfn now() -> number = pure { time.now() }\n`;
    try {
      transform(src, { filename: "/tmp/foo.bs" });
      throw new Error("expected throw");
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.file).toBe("/tmp/foo.bs");
      expect(err.message).toContain("/tmp/foo.bs:2:");
    }
  });

  it("does not attach filename when none is passed", () => {
    const src = `?bs nope\n`;
    try {
      transform(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]!.file).toBeNull();
    }
  });

  it("formatDiagnostic produces the canonical text rendering", () => {
    const out = formatDiagnostic({
      code: "X001",
      severity: "error",
      file: "a.bs",
      line: 3,
      column: 7,
      message: "thing exploded",
      rule: "things should not explode",
      idiom: "use a non-explody thing",
      rewrite: "thing.safe()",
    });
    expect(out).toContain("botscript[X001]: thing exploded (a.bs:3:7)");
    expect(out).toContain("Rule:    things should not explode");
    expect(out).toContain("Idiom:   use a non-explody thing");
    expect(out).toContain("Rewrite: thing.safe()");
  });

  it("BotscriptError diagnostics are JSON-serializable", () => {
    try {
      transform(`?bs 0.2\nfn now() -> number = pure { time.now() }\n`, {
        filename: "x.bs",
      });
    } catch (e) {
      const err = e as BotscriptError;
      const json = JSON.stringify({ ok: false, diagnostics: err.diagnostics });
      const parsed = JSON.parse(json);
      expect(parsed.ok).toBe(false);
      expect(parsed.diagnostics[0].code).toBe("CAP001");
      expect(parsed.diagnostics[0].file).toBe("x.bs");
    }
  });
});
