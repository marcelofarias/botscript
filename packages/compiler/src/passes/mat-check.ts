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
 * Over-exhaustive matches (all explicit variant arms plus a trailing wildcard) emit
 * MAT004 — the wildcard is unreachable dead code.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { parseMatch, type MatchExpr } from "../parser/parse-match.js";
import { locationOf } from "./_location.js";
import { nextSignificant } from "./_callgraph.js";
import { atLeast, type VersionInfo } from "./version.js";
import { collectTaggedUnionTypes, type Alt } from "./tagged-union.js";

// Built-in tag vocabularies — MAT001/MAT002 handle these; MAT003 skips them.
const BUILTIN_TAGS = new Set(["ok", "err", "some", "none"]);

/**
 * Scan backwards through the match expression's token range to find the `_`
 * wildcard arm token at the top level of the match arms block (depth 0).
 * Tracks `{}` depth so that `_ ->` sequences inside nested match bodies are
 * not mistaken for the trailing arm wildcard.
 */
function findTrailingWildcardToken(tokens: ReturnType<typeof lex>, expr: MatchExpr): number {
  // expr.end - 1 is the closing `}` of the arms block; start inside it.
  let depth = 0;
  for (let i = expr.end - 2; i >= expr.start; i--) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.kind === "close" && tok.text === "}") { depth++; continue; }
    if (tok.kind === "open" && tok.text === "{") { depth--; continue; }
    if (depth !== 0) continue;
    if (tok.kind !== "ident" || tok.text !== "_") continue;
    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];
    if (next && next.kind === "arrow") return i;
  }
  return expr.start;
}

export function passMatCheck(
  src: string,
  version: VersionInfo,
): string | { code: string; warnings: ReadonlyArray<Diagnostic> } {
  if (!atLeast(version.resolved, "0.9")) return src;

  const tokens = lex(src);
  const mat001 = getErrorCode("MAT001")!;
  const mat002 = getErrorCode("MAT002")!;
  const mat003 = getErrorCode("MAT003")!;
  const mat004 = getErrorCode("MAT004")!;

  // Pre-collect all user-defined tagged union declarations in this file.
  // Pass the already-lexed tokens to avoid lexing the source a second time.
  const knownUnions = collectTaggedUnionTypes(tokens);
  const warnings: Diagnostic[] = [];

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

    const lastArm = expr.arms[expr.arms.length - 1];
    const hasTrailingWildcard = lastArm?.pattern.kind === "wildcard";

    for (const arm of expr.arms) {
      if (arm.pattern.kind === "wildcard") { hasWildcard = true; continue; }
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

    const matchStart = tokens[expr.start]!.start;

    if ((hasOk || hasErr) && !(hasOk && hasErr)) {
      if (hasWildcard) continue;
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
      if (hasWildcard) continue;
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

    // MAT003/MAT004: user-defined tagged union exhaustiveness.
    // Only consider arm tags that are not built-in (ok/err/some/none).
    // If any non-tag arm (literal, binding, etc.) is present, the match is not
    // exclusively a tagged-union match — suppress MAT003/MAT004 to avoid false positives.
    // Tagged union variants in botscript are always CapCase. Lowercase tags
    // are binding patterns or non-union arms — exclude them from MAT003/MAT004 so we
    // don't fire on patterns like `foo -> ...` (which are variable bindings).
    const userArmTags = armTags.filter(
      (tag) => !BUILTIN_TAGS.has(tag) && /^[A-Z]/.test(tag),
    );
    if (userArmTags.length === 0) continue;
    if (hasNonTagArm) continue;
    // Mixed match: built-in Result/Option tags alongside user-defined CapCase
    // variant arms. These are not a pure tagged-union match — MAT003/MAT004 should not
    // fire, as the match is not exclusively over a single user-defined union.
    if (hasOk || hasErr || hasSome || hasNone) continue;

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

    if (missingAlts.length === 0) {
      // MAT004: match is already fully exhaustive — trailing wildcard is dead code.
      // Only fires when the wildcard is the last arm; a non-trailing `_` is reachable.
      if (hasTrailingWildcard) {
        const wildcardTokIdx = findTrailingWildcardToken(tokens, expr);
        const wildcardTok = tokens[wildcardTokIdx];
        const diagStart = wildcardTok ? wildcardTok.start : matchStart;
        const { line, column } = locationOf(src, diagStart);
        warnings.push({
          code: "MAT004",
          severity: "warning",
          file: null,
          line,
          column,
          start: diagStart,
          end: wildcardTok ? wildcardTok.end : tokens[expr.start]!.end,
          message:
            `match on '${union.name}' covers all ${union.alts.length} variant(s) — ` +
            `wildcard '_ -> ...' is unreachable dead code; remove it so future variants are caught by MAT003`,
          rule: mat004.rule,
          idiom: mat004.idiom,
          rewrite: mat004.rewrite,
        });
      }
      continue;
    }

    if (hasWildcard) continue;

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

  return warnings.length > 0 ? { code: src, warnings } : src;
}
