/**
 * Stale unsafe block check (botscript 0.9+).
 *
 *   UNS007  An `unsafe "<reason>" { body }` expression block whose body
 *           contains neither an `as` type cast (UNS004) nor a stdlib
 *           capability call (UNS005) — the two escape hatches the unsafe
 *           block is designed to justify.
 *
 *           An unsafe block that needs neither is dead justification: the
 *           reason string makes a claim the body no longer supports. This
 *           gives `unsafe` the same self-proving property as
 *           `@ts-expect-error` — if the escape is not needed, the annotation
 *           itself becomes an error.
 *
 *           Detection fires when ALL of the following are true for a block:
 *             1. The body has no `as` ident in expression position.
 *             2. The body has no stdlib namespace (http, fs, time, ...) that
 *                is immediately followed by `.method(` or `?.method(`.
 *             3. The body contains NO identifier tokens at all (pure literals
 *                only). UNS008 handles the population with identifiers but
 *                no bypass pattern.
 *
 *           `unsafe "reason" fn` declarations are not checked here — those
 *           are declaration-level escape hatches whose body may contain
 *           arbitrary TypeScript; their staleness cannot be inferred from
 *           token shapes alone.
 *
 *           Suppression: none. Remove the unnecessary wrapper.
 *
 *   pre-0.9  This pass is not run.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";
import { STDLIB_TO_CAP } from "./_stdlib.js";
import { nextSignificant } from "./_callgraph.js";

const STDLIB_CAPS = new Set(Object.keys(STDLIB_TO_CAP));

export function passUnsStale(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const tokens = lex(src);
  const diagnostics: Diagnostic[] = [];
  const entry = getErrorCode("UNS007");

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;

    // Find the reason string.
    const j = nextSignificant(tokens, i + 1);
    const head = tokens[j];
    if (!head || head.kind !== "string") continue;

    // Skip `unsafe "reason" fn` and `unsafe "reason" async fn` (declaration-level).
    const k = nextSignificant(tokens, j + 1);
    const openOrFn = tokens[k];
    if (!openOrFn) continue;
    if (openOrFn.kind === "keyword" && openOrFn.keyword === "fn") continue;
    if (openOrFn.kind === "keyword" && openOrFn.keyword === "async") {
      const m = nextSignificant(tokens, k + 1);
      const fnTok = tokens[m];
      if (fnTok && fnTok.kind === "keyword" && fnTok.keyword === "fn") continue;
    }

    // Must be `unsafe "reason" { body }`.
    if (!openOrFn || openOrFn.kind !== "open" || openOrFn.text !== "{") continue;
    if (openOrFn.matchedAt === undefined) continue;
    const closeIdx = openOrFn.matchedAt;
    const bodyStart = k + 1; // token after `{`

    // Scan body tokens: pure-literal body (no ident tokens at all) = UNS007.
    // Bodies with idents but no bypass pattern are UNS008's domain.
    let hasIdent = false;
    let hasJustification = false;

    for (let b = bodyStart; b < closeIdx; b++) {
      const bt = tokens[b];
      if (!bt) continue;

      if (bt.kind === "ident") {
        hasIdent = true;

        // `as` ident — type cast in expression position.
        if (bt.text === "as" && looksLikeCast(tokens, b)) {
          hasJustification = true;
          break;
        }

        // stdlib namespace followed by `.method(` or `?.method(`.
        if (STDLIB_CAPS.has(bt.text)) {
          const dotIdx = nextSignificant(tokens, b + 1);
          const dotTok = tokens[dotIdx];
          if (dotTok && (dotTok.kind === "punct" && dotTok.text === "." || dotTok.kind === "questionDot")) {
            const memberIdx = nextSignificant(tokens, dotIdx + 1);
            const memberTok = tokens[memberIdx];
            if (memberTok && memberTok.kind === "ident") {
              const parenIdx = nextSignificant(tokens, memberIdx + 1);
              const parenTok = tokens[parenIdx];
              if (parenTok && parenTok.kind === "open" && parenTok.text === "(") {
                hasJustification = true;
                break;
              }
            }
          }
        }
      }

      // Jump past matched inner blocks.
      if (bt.kind === "open" && bt.text === "{" && bt.matchedAt !== undefined) {
        b = bt.matchedAt;
      }
    }

    // UNS007 fires only on pure-literal bodies (no idents). UNS008 covers
    // the case where idents exist but no bypass pattern.
    if (!hasJustification && !hasIdent) {
      const loc = locationOf(src, t.start);
      diagnostics.push({
        code: "UNS007",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: t.start,
        end: tokens[closeIdx]!.end,
        message:
          `unsafe block body contains no \`as\` cast or stdlib capability call — ` +
          `the escape hatch is no longer needed; remove the \`unsafe\` wrapper`,
        rule: entry?.rule ?? "",
        idiom: entry?.idiom ?? "",
        rewrite: entry?.rewrite ?? "",
      });
    }

    // Advance past the closing brace.
    i = closeIdx;
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }
  return src;
}

function isTrivia(kind: string): boolean {
  return (
    kind === "whitespace" ||
    kind === "newline" ||
    kind === "lineComment" ||
    kind === "blockComment"
  );
}

function looksLikeCast(tokens: ReturnType<typeof lex>, idx: number): boolean {
  // Backward: find previous significant token.
  let prev = idx - 1;
  while (prev >= 0 && isTrivia(tokens[prev]!.kind)) prev--;
  if (prev < 0) return false;

  // Forward: must be followed by a type-looking token.
  const j = nextSignificant(tokens, idx + 1);
  if (j < 0 || j >= tokens.length) return false;
  const next = tokens[j];
  if (!next) return false;

  return (
    next.kind === "ident" ||
    (next.kind === "open" && (next.text === "{" || next.text === "[" || next.text === "("))
  );
}
