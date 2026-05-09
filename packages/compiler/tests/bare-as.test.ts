import { describe, expect, it } from "vitest";

import { BotscriptError, transform } from "../src/index.js";

const t = (src: string) => transform(src).code;

/**
 * UNS004 — bare `as` cast outside an `unsafe "<reason>" { ... }` block.
 *
 * The check fires only on `?bs 0.5` and later. Files pinned to 0.4 or earlier
 * keep their existing behaviour byte-identical (AGENTS.md rule 4).
 */

describe("UNS004 — bare `as` cast outside unsafe (0.5+)", () => {
  // ── rewrites X (the rule fires) ────────────────────────────────────────

  it("rejects a bare `as` cast at `?bs 0.5`", () => {
    const src = `?bs 0.5\nconst u = data as User;\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      const err = e as BotscriptError;
      expect(err.diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects a bare `as` cast in a return statement", () => {
    const src = `?bs 0.5\nfn f(x: unknown) -> User { return x as User; }\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects `as any`", () => {
    const src = `?bs 0.5\nconst u = data as any;\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects `as const`", () => {
    const src = `?bs 0.5\nconst u = [1, 2, 3] as const;\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects a chained cast `(x as unknown) as User`", () => {
    const src = `?bs 0.5\nconst u = (x as unknown) as User;\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects a cast inside a call argument", () => {
    const src = `?bs 0.5\nf(x as Bar);\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  // ── leaves Y alone (the rule does not fire) ────────────────────────────

  it("accepts `as` inside an unsafe \"<reason>\" { ... } block", () => {
    const src =
      `?bs 0.5\n` +
      `const u = unsafe "third-party Response.json() returns any" { data as User };\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("accepts a cast nested inside a deeper unsafe block", () => {
    const src =
      `?bs 0.5\n` +
      `fn cast(raw: unknown) -> User {\n` +
      `  return unsafe "JSON payload was already validated upstream" {\n` +
      `    (raw as { name: string }) as User\n` +
      `  };\n` +
      `}\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("accepts `import * as ns from \"...\"` (the `as` is the namespace keyword, not a cast)", () => {
    const src = `?bs 0.5\nimport * as path from "node:path";\nconst x = path.join("a", "b");\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("accepts `import { foo as bar } from \"...\"` (named-binding rename)", () => {
    const src = `?bs 0.5\nimport { foo as bar } from "x";\nbar();\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("accepts `export * as ns from \"...\"`", () => {
    const src = `?bs 0.5\nexport * as ns from "x";\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("rejects `export const u = data as User;` (export const evades wholesale-skip)", () => {
    const src = `?bs 0.5\nexport const u = data as User;\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects `export default value as Foo;` (export default with bare cast)", () => {
    const src = `?bs 0.5\nexport default value as Foo;\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects `export let x = y as any;` (export let with bare cast)", () => {
    const src = `?bs 0.5\nexport let x = y as any;\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("rejects `export function f() { return x as Y; }` (cast inside exported function body)", () => {
    const src = `?bs 0.5\nexport function f() { return x as Y; }\n`;
    expect(() => t(src)).toThrow(BotscriptError);
    try {
      t(src);
    } catch (e) {
      expect((e as BotscriptError).diagnostics[0]?.code).toBe("UNS004");
    }
  });

  it("accepts `export { foo as bar } from \"...\"` (re-export rename)", () => {
    const src = `?bs 0.5\nexport { foo as bar } from "x";\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("accepts `export { foo as bar }` (local re-export rename)", () => {
    const src = `?bs 0.5\nconst foo = 1;\nexport { foo as bar };\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("accepts an identifier whose name happens to start with `as`", () => {
    // Defensive: `assert`, `assign`, `aside` should all parse cleanly. The
    // lexer already treats them as a single ident, so this is just belt-and-
    // braces — confirm we don't somehow snag them.
    const src = `?bs 0.5\nconst aside = 1; const assign = 2;\n`;
    expect(() => t(src)).not.toThrow();
  });

  // ── forward-compat (rule does NOT fire on older pins) ───────────────────

  it("does not fire on `?bs 0.4` (forward-compat)", () => {
    const src = `?bs 0.4\nconst u = data as User;\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not fire on `?bs 0.3` (forward-compat)", () => {
    const src = `?bs 0.3\nconst u = data as User;\n`;
    expect(() => t(src)).not.toThrow();
  });

  it("does not fire on `?bs 0.1` (forward-compat)", () => {
    const src = `?bs 0.1\nconst u = data as User;\n`;
    expect(() => t(src)).not.toThrow();
  });

  // ── integration with existing 0.5 features ──────────────────────────────

  it("still rewrites the unsafe block correctly at 0.5", () => {
    const src =
      `?bs 0.5\n` +
      `const u = unsafe "Response.json() returns any" { data as User };\n`;
    const out = t(src);
    expect(out).toContain('/* unsafe: "Response.json() returns any" */');
    expect(out).toContain("(() => { return data as User; })()");
  });
});
