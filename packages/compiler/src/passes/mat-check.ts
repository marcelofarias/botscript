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
 *   MAT003  non-exhaustive match on a user-defined tagged union: a match
 *           whose arm tags all belong to the same known tagged union is
 *           missing at least one variant arm and has no wildcard `_` arm.
 *           Only fires when the arm tags uniquely identify a single known
 *           union (no ambiguity across multiple unions with overlapping names).
 *
 * Both MAT001/MAT002 are scoped to their respective tag vocabulary — they only
 * fire when at least one of the pair's tags is explicitly named in an arm.
 *
 * Over-exhaustive matches (all arms plus wildcard) are clean.
 */

import { BotscriptError } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { parseMatch } from "../parser/parse-match.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";
import { collectTaggedUnionTypes, type Alt } from "./tagged-union.js";

// Built-in tag vocabularies — MAT001/MAT002 handle these; MAT003 skips them.
const BUILTIN_TAGS = new Set(["ok", "err", "some", "none"]);

export function passMatCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const tokens = lex(src);
  const mat001 = getErrorCode("MAT001")!;
  const mat002 = getErrorCode("MAT002")!;
  const mat003 = getErrorCode("MAT003")!;

  // Pre-collect all user-defined tagged union declarations in this file.
  // Pass the already-lexed tokens to avoid lexing the source a second time.
  const knownUnions = collectTaggedUnionTypes(tokens);

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
    let hasNonTagArm = false;
    const armTags: string[] = [];

    for (const arm of expr.arms) {
      if (arm.pattern.kind === "wildcard") { hasWildcard = true; break; }
      if (arm.pattern.kind === "tag") {
        const tag = arm.pattern.tag;
        if (tag === "ok") hasOk = true;
        if (tag === "err") hasErr = true;
        if (tag === "some") hasSome = true;
        if (tag === "none") hasNone = true;
        armTags.push(tag);
        // Lowercase non-builtin tags are binding patterns (catch-alls), not union
        // variant names. Treat them as non-tag arms so MAT003 is suppressed when
        // a binding arm appears alongside CapCase union arms.
        if (!/^[A-Z]/.test(tag) && !BUILTIN_TAGS.has(tag)) {
          hasNonTagArm = true;
        }
      } else {
        hasNonTagArm = true;
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

    // MAT003: user-defined tagged union exhaustiveness.
    // Only consider arm tags that are not built-in (ok/err/some/none).
    // If any non-tag arm (literal, binding, etc.) is present, the match is not
    // exclusively a tagged-union match — suppress MAT003 to avoid false positives.
    // Tagged union variants in botscript are always CapCase. Lowercase tags
    // are binding patterns or non-union arms — exclude them from MAT003 so we
    // don't fire on patterns like `foo -> ...` (which are variable bindings).
    const userArmTags = armTags.filter(
      (tag) => !BUILTIN_TAGS.has(tag) && /^[A-Z]/.test(tag),
    );
    if (userArmTags.length === 0) continue;
    if (hasNonTagArm) continue;

    const userArmTagSet = new Set(userArmTags);

    // Find unions where ALL user arm tags are a subset of the union's variants.
    // This ensures we only fire when the match is unambiguously against a specific union.
    const matchingUnions: Array<{ name: string; alts: Alt[] }> = [];
    for (const [name, alts] of knownUnions) {
      const variantSet = new Set(alts.map((a) => a.tag));
      if (userArmTags.every((tag) => variantSet.has(tag))) {
        matchingUnions.push({ name, alts });
      }
    }

    // Only fire when exactly one union matches (no ambiguity).
    if (matchingUnions.length !== 1) continue;

    const union = matchingUnions[0]!;
    const missingAlts = union.alts.filter((a) => !userArmTagSet.has(a.tag));
    if (missingAlts.length === 0) continue;

    const { line, column } = locationOf(src, matchStart);
    const missingList = missingAlts.map((a) => `'${a.tag}'`).join(", ");
    const armWord = missingAlts.length === 1 ? "arm" : "arms";
    // Use `'Tag { ... } -> ...'` for variants with a field block; `'Tag -> ...'` for bare-tag variants.
    const rewriteArms = missingAlts
      .map((a) => (a.body !== null ? `'${a.tag} { ... } -> ...'` : `'${a.tag} -> ...'`))
      .join(", ");
    throw new BotscriptError([{
      code: "MAT003",
      severity: "error",
      file: null,
      line,
      column,
      start: matchStart,
      end: tokens[expr.start]!.end,
      message:
        `non-exhaustive match on '${union.name}' — ${armWord} for ${missingList} missing; ` +
        `add the missing arm(s) or a wildcard '_ -> ...' arm`,
      rule: mat003.rule,
      idiom: mat003.idiom,
      rewrite: `add ${rewriteArms} or a '_ -> ...' wildcard`,
    }]);
  }

  return src;
}
