/**
 * Intent-vs-capability consistency check.
 *
 *   ?bs 0.7  Enabled. Every `fn` whose header carries an `intent: "..."` clause
 *            is checked against its declared capabilities (the `uses { ... }`
 *            clause). Body-shape verification is not implemented yet — the
 *            current rule is a header-level consistency check.
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
import { parseProgram } from "../parser/parse.js";
import { atLeast, type VersionInfo } from "./version.js";

export function passIntentCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.7")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const diagnostics: Diagnostic[] = [];

  for (const slot of program.fns) {
    const decl = slot.decl;

    // Use === undefined (not falsiness) so an explicitly empty intent: ""
    // is still treated as an intent clause being present.
    if (decl.intent === undefined) continue;

    // INT001: intent claims "pure" but the function has capability declarations.
    if (containsPureClaim(decl.intent) && decl.capabilities.length > 0) {
      const entry = getErrorCode("INT001")!;
      // intentStart is always set when intent is set (parseFn assigns them
      // together); the non-null assertion is safe.
      const intentStart = decl.intentStart!;
      const loc = locationOf(src, intentStart);
      const capsStr = decl.capabilities.join(", ");

      const diagnostic: Diagnostic = {
        code: "INT001",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent.length + 2, // +2 for surrounding quotes
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
  // Case-insensitive: "Pure", "PURE", "pure function" all carry the same claim.
  return /(?<![a-zA-Z0-9_-])pure(?![a-zA-Z0-9_-])/i.test(intent);
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
