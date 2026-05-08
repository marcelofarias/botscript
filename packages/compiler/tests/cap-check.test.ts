import { describe, expect, it } from "vitest";

import { CapabilityCheckError, transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

describe("static capability check (0.2)", () => {
  it("flags a pure fn that reaches for time.now()", () => {
    const src = `?bs 0.2\nfn now() -> number = pure { time.now() }\n`;
    expect(() => t(src)).toThrow(CapabilityCheckError);
    try {
      t(src);
    } catch (e) {
      const err = e as CapabilityCheckError;
      expect(err.fnName).toBe("now");
      expect(err.capability).toBe("time");
      expect(err.namespace).toBe("time");
      expect(err.message).toContain("(none — pure scope)");
      expect(err.message).toContain("uses { time }");
    }
  });

  it("flags an under-declared fn that calls http.get", () => {
    const src = `?bs 0.2\nfn fetchOne(u: string) uses { time } -> string {\n  const r = http.get(u);\n  return "x";\n}\n`;
    expect(() => t(src)).toThrow(/capability 'net'/);
    expect(() => t(src)).toThrow(/uses \{ time, net \}/);
  });

  it("allows a fn that declares the capability it uses", () => {
    const src = `?bs 0.2\nfn now() uses { time } -> number {\n  return time.now();\n}\n`;
    expect(() => t(src)).not.toThrow();
    expect(t(src)).toContain('$enter(["time"] as const');
  });

  it("treats stdlib idents not followed by a dot as ordinary", () => {
    const src =
      `?bs 0.2\nfn shadow() -> number = pure {\n` +
      `  const time = 1;\n` +
      `  return time + 1;\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not flag the outer fn for capabilities consumed only by an inner fn", () => {
    const src =
      `?bs 0.2\nfn outer() -> number = pure {\n` +
      `  const inner = (() => 1);\n` +
      `  return inner();\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not run the static check on 0.1 files (forward compat)", () => {
    // Same source that errors under 0.2; under 0.1 it must compile.
    const src = `?bs 0.1\nfn now() -> number = pure { time.now() }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not run the static check on unpinned files (LATEST is still 0.1)", () => {
    const src = `fn now() -> number = pure { time.now() }\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("allows http.get inside an async fn that declares net", () => {
    const src =
      `?bs 0.2\nasync fn loadUser(id: string) uses { net } -> Promise<Response> {\n` +
      `  return http.get(\`/u/\${id}\`);\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("allows fs.readText when fs is declared", () => {
    const src =
      `?bs 0.2\nfn loadConfig(path: string) uses { fs } -> string {\n` +
      `  return fs.readText(path) as unknown as string;\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not flag the uses clause itself (the literal `time` identifier)", () => {
    // The cap-check must skip its own declaration — `uses { time }` shouldn't
    // count as a stdlib reference.
    const src =
      `?bs 0.2\nfn now() uses { time } -> number {\n` +
      `  return Date.now();\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("scans match arms in single-expression body for stdlib refs", () => {
    const src =
      `?bs 0.2\nfn label(x: unknown) -> number = match x {\n` +
      `  "a" -> time.now()\n` +
      `  _   -> 0\n` +
      `}\n`;
    expect(() => t(src)).toThrow(/capability 'time'/);
  });

  it("includes line number in the error message", () => {
    const src = `?bs 0.2\n\nfn now() -> number = pure { time.now() }\n`;
    try {
      t(src);
      throw new Error("expected throw");
    } catch (e) {
      expect((e as CapabilityCheckError).line).toBe(3);
    }
  });
});
