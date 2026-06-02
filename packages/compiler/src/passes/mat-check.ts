/**
 * Match exhaustiveness check (?bs 0.9+).
 *
 * Enforces that any match expression explicitly handling the `ok`/`err` or
 * `some`/`none` tag vocabulary also handles the opposing tag (or has a
 * wildcard arm).
 *
 *   MAT001  non-exhaustive Result match: a match has an `ok` arm but no
 *           `err` arm (or vice versa) and no wildcard `_` arm.
 *
 *   MAT002  non-exhaustive Option match: a match has a `some` arm but no
 *           `none` arm (or vice versa) and no wildcard `_` arm.
 *
 * Both checks are scoped to their respective tag vocabulary — they only fire
 * when at least one of the pair's tags is explicitly named in an arm.
 * User-defined tagged unions with different tag names are not affected.
 *
 * Over-exhaustive matches (both arms plus wildcard) are clean.
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
  const mat001 = getErrorCode("MAT001")!;
  const mat002 = getErrorCode("MAT002")!;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "match") continue;
    const expr = parseMatch(tokens, i);
    if (!expr) continue;

    let hasOk = false;
    let hasErr = false;
    let hasSome = false;
    let hasNone = false;
    let hasWildcard = false;

    for (const arm of expr.arms) {
      if (arm.pattern.kind === "wildcard") { hasWildcard = true; break; }
      if (arm.pattern.kind === "tag") {
        if (arm.pattern.tag === "ok") hasOk = true;
        if (arm.pattern.tag === "err") hasErr = true;
        if (arm.pattern.tag === "some") hasSome = true;
        if (arm.pattern.tag === "none") hasNone = true;
      }
    }

    if (hasWildcard) continue;

    const matchStart = tokens[expr.start]!.start;

    if ((hasOk || hasErr) && !(hasOk && hasErr)) {
      const { line, column } = locationOf(src, matchStart);
      const missing = hasOk ? "err" : "ok";
      const missingPattern = missing === "err" ? "'err { e } -> ...'" : "'ok { v } -> ...'";
      throw new BotscriptError([{
        code: "MAT001",
        severity: "error",
        file: null,
        line,
        column,
        start: matchStart,
        end: tokens[expr.start]!.end,
        message: `non-exhaustive match with ok/err arms: missing '${missing}' arm — add '${missing} { ... } -> ...' or a wildcard '_ -> ...' arm`,
        rule: mat001.rule,
        idiom: mat001.idiom,
        rewrite: `add ${missingPattern} arm or a '_ -> ...' wildcard`,
      }]);
    }

    if ((hasSome || hasNone) && !(hasSome && hasNone)) {
      const { line, column } = locationOf(src, matchStart);
      const missing = hasSome ? "none" : "some";
      const missingPattern = missing === "none" ? "'none -> ...'" : "'some { v } -> ...'";
      throw new BotscriptError([{
        code: "MAT002",
        severity: "error",
        file: null,
        line,
        column,
        start: matchStart,
        end: tokens[expr.start]!.end,
        message: `non-exhaustive match with some/none arms: missing '${missing}' arm — add '${missing}${missing === "some" ? " { ... }" : ""} -> ...' or a wildcard '_ -> ...' arm`,
        rule: mat002.rule,
        idiom: mat002.idiom,
        rewrite: `add ${missingPattern} arm or a '_ -> ...' wildcard`,
      }]);
    }
  }

  return src;
}
