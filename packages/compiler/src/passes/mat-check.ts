/**
 * Match exhaustiveness check (?bs 0.9+).
 *
 * Enforces that any match expression explicitly handling the `ok` or `err`
 * tag vocabulary also handles the opposing tag (or has a wildcard arm).
 *
 *   MAT001  non-exhaustive Result match: a match has an `ok` arm but no
 *           `err` arm (or vice versa) and no wildcard `_` arm.
 *
 * The check is scoped to the `ok`/`err` tag vocabulary — it fires only when
 * at least one of those tags is explicitly named in an arm. User-defined
 * tagged unions with different tag names are not affected.
 *
 * Over-exhaustive matches (both ok and err arms plus wildcard) are clean.
 */

import { BotscriptError } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { parseMatch } from "../parser/parse-match.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";

export function passMatCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const tokens = lex(src);
  const entry = getErrorCode("MAT001")!;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "match") continue;
    const expr = parseMatch(tokens, i);
    if (!expr) continue;

    let hasOk = false;
    let hasErr = false;
    let hasWildcard = false;

    for (const arm of expr.arms) {
      if (arm.pattern.kind === "wildcard") { hasWildcard = true; break; }
      if (arm.pattern.kind === "tag") {
        if (arm.pattern.tag === "ok") hasOk = true;
        if (arm.pattern.tag === "err") hasErr = true;
      }
    }

    if (hasWildcard) continue;
    if (!hasOk && !hasErr) continue;
    if (hasOk && hasErr) continue;

    const matchStart = tokens[expr.start]!.start;
    const { line, column } = locationOf(src, matchStart);
    const missing = hasOk ? "err" : "ok";

    throw new BotscriptError([{
      code: "MAT001",
      severity: "error",
      file: null,
      line,
      column,
      start: matchStart,
      end: tokens[expr.end - 1]?.end ?? matchStart,
      message: `match on Result is missing '${missing}' arm — add '${missing} { ... } -> ...' or a wildcard '_ -> ...' arm`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: entry.rewrite,
    }]);
  }

  return src;
}
