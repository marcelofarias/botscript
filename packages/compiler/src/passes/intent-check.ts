/**
 * Intent-vs-capability consistency check.
 *
 *   ?bs 0.7  Enabled. Every `fn` whose header carries an `intent: "..."` clause
 *            is checked against its capability declarations and body shape.
 *
 *            Currently enforced claims:
 *
 *              INT001  intent contains "pure" but the function has one or more
 *                      capability declarations in its `uses { ... }` clause.
 *                      A pure function is deterministic and side-effect-free;
 *                      any external resource access contradicts that claim.
 *
 *            Planned for future versions: idempotent, total, monotonic, …
 *            (mechanical vocabulary grows one INT code at a time).
 *
 *   pre-0.7  This pass is not run. Files on earlier pins may parse `intent:`
 *            without triggering any check.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { parseFn } from "../parser/parse-fn.js";
import { atLeast, type VersionInfo } from "./version.js";

export function passIntentCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.7")) return src;

  const tokens = lex(src);
  const diagnostics: Diagnostic[] = [];
  const allowGenerics = atLeast(version.resolved, "0.4");

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "fn") continue;

    const decl = parseFn(tokens, i, { allowGenerics });
    if (!decl) continue;

    // Skip to end of this declaration to avoid re-parsing inner fns.
    i = decl.tokenEnd - 1;

    if (!decl.intent) continue;

    // INT001: intent claims "pure" but the function has capability declarations.
    if (containsPureClaim(decl.intent) && decl.capabilities.length > 0) {
      const entry = getErrorCode("INT001")!;
      const loc = locationOf(src, decl.intentStart ?? decl.fnKeywordStart);
      const capsStr = decl.capabilities.join(", ");

      const diagnostic: Diagnostic = {
        code: "INT001",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: decl.intentStart ?? decl.fnKeywordStart,
        end: (decl.intentStart ?? decl.fnKeywordStart) + decl.intent.length + 2, // +2 for quotes
        message:
          `fn '${decl.name}' intent claims 'pure' but declares capabilities { ${capsStr} } — ` +
          `pure functions may not consume external resources`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite:
          `// remove uses clause:\nfn ${decl.name}(...) intent: "pure" -> ...\n` +
          `// or remove the pure intent claim:\nfn ${decl.name}(...) uses { ${capsStr} } -> ...`,
      };
      diagnostics.push(diagnostic);
    }
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

/**
 * True when the intent string contains the word "pure" as a whole token.
 * Matches: "pure", "pure function", "idempotent and pure", etc.
 * Does NOT match: "impure", "not-pure".
 */
function containsPureClaim(intent: string): boolean {
  return /(?<![a-zA-Z0-9_-])pure(?![a-zA-Z0-9_-])/.test(intent);
}

function locationOf(src: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}
