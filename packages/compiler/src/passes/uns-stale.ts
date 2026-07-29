/**
 * Stale unsafe block check (botscript 0.9+).
 *
 *   UNS007  An `unsafe "<reason>" { body }` expression block whose body
 *           contains no identifier tokens — only numeric/string literals,
 *           operators, and punctuation.
 *
 *           The rule gives `unsafe` the same self-proving property as
 *           `@ts-expect-error`: if the escape hatch cannot possibly be needed
 *           (no ident = no cast, no capability call, no throw, no fn call of
 *           any kind), the annotation is provably dead justification.
 *
 *           The check is intentionally conservative: any ident in the body —
 *           even `true`, `false`, `null`, a local variable, or a Result-
 *           returning fn call — suppresses UNS007. This avoids false positives
 *           in common patterns like RES002-suppression (`unsafe "discard" {
 *           saveUser(id) }`), SYN002/SYN003 suppression, etc. Only bodies that
 *           are PURELY literal expressions (numbers, strings, arithmetic) with
 *           no identifiers of any kind can be proven stale.
 *
 *           Examples that fire:
 *             unsafe "stale" { 42 }
 *             unsafe "stale" { 1 + 2 }
 *             unsafe "stale" { "hello" }
 *
 *           Examples that do NOT fire:
 *             unsafe "needed" { data as User }         -- ident `as`
 *             unsafe "needed" { http.get(url) }        -- stdlib call
 *             unsafe "needed" { throw new Error("x") } -- ident `throw`
 *             unsafe "needed" { console.log("x") }     -- ident `console`
 *             unsafe "needed" { saveUser(id) }         -- local fn (may be RES002)
 *             unsafe "needed" { null }                 -- ident `null`
 *             unsafe "needed" { true }                 -- ident `true`
 *
 *           `unsafe "reason" fn` declarations are not checked — those are
 *           declaration-level escape hatches outside this pass's scope.
 *
 *           Suppression: none. Remove the unnecessary wrapper.
 *
 *   pre-0.9  This pass is not run.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex, type Token } from "../parser/lex.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";
import { nextSignificant } from "./_callgraph.js";

export function passUnsStale(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const tokens = lex(src);
  const diagnostics: Diagnostic[] = [];
  const entry = getErrorCode("UNS007")!;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;

    // Find the reason string.
    const j = nextSignificant(tokens, i + 1);
    const head = tokens[j];
    if (!head || head.kind !== "string") continue;

    // Skip `unsafe "reason" fn` and `unsafe "reason" async fn` declarations.
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
    const bodyStart = k + 1;

    if (!bodyHasIdent(tokens, bodyStart, closeIdx)) {
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
          `unsafe block body contains no identifiers — the escape hatch is ` +
          `provably unnecessary; remove the \`unsafe\` wrapper`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite: entry.rewrite,
      });
    }

    i = closeIdx;
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

/**
 * Returns true if any `ident` token appears in the body range
 * [bodyStart, closeIdx). An `ident` token indicates that the body contains
 * a variable reference, function call, type assertion, or bypass pattern —
 * any of which could justify the unsafe wrapper.
 *
 * Template literals are treated as single tokens by the lexer. They may
 * contain `${expr}` interpolations that reference idents, but since the
 * template content is opaque at the token level, a template token does NOT
 * suppress UNS007. Callers who interpolate idents in template literals inside
 * unsafe blocks are uncommon; the diagnostic still applies to pure template
 * bodies (e.g. `unsafe "stale" { \`hello\` }`).
 */
function bodyHasIdent(tokens: Token[], bodyStart: number, closeIdx: number): boolean {
  for (let i = bodyStart; i < closeIdx; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (t.kind === "ident") return true;
    // A keyword inside the body (e.g., `new`, `return`, `await` if they lex as
    // keywords) is also a strong signal that the body is non-trivial.
    if (t.kind === "keyword") return true;
  }
  return false;
}
