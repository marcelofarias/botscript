/**
 * TypeScript suppression comment check (botscript 0.5+).
 *
 *   UNS006  A `// @ts-ignore` or `// @ts-expect-error` comment appears in
 *           a botscript source file. These TypeScript pragma comments silence
 *           type errors on the next line without requiring any written reason
 *           or explicit escape-hatch annotation. A model that can't satisfy
 *           the type system will reach for them rather than fixing the
 *           underlying problem, defeating botscript's safety net silently.
 *
 * Detection: scan comment tokens from the lexer. Both `// @ts-ignore text`
 * and `/* @ts-ignore *\/` forms are caught. The check is exact — the pragma
 * text must appear inside a comment token, not inside a string literal or
 * other non-comment construct.
 *
 * Suppression: there is no safe suppression for these comments. Fix the
 * underlying type error, or wrap the offending statement in
 * `unsafe "<reason>" { ... }` to make the escape hatch explicit.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { locationOf } from "./_location.js";

const SUPPRESS_PRAGMAS = ["@ts-ignore", "@ts-expect-error"] as const;

export function passTsSuppress(src: string): string {
  const tokens = lex(src);
  const diagnostics: Diagnostic[] = [];
  const entry = getErrorCode("UNS006")!;

  for (const t of tokens) {
    if (t.kind !== "lineComment" && t.kind !== "blockComment") continue;

    for (const pragma of SUPPRESS_PRAGMAS) {
      if (!t.text.includes(pragma)) continue;

      const loc = locationOf(src, t.start);
      diagnostics.push({
        code: "UNS006",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: t.start,
        end: t.end,
        message:
          `\`${pragma}\` suppression comment bypasses TypeScript type checking — ` +
          `fix the underlying type error, or wrap the statement in ` +
          `\`unsafe "<reason>" { ... }\` to make the escape hatch explicit`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite: entry.rewrite,
      });
      break;
    }
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}
