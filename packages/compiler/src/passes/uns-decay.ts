/**
 * Decay-stale unsafe block check (botscript 0.9+).
 *
 *   UNS008  An `unsafe "<reason>" { body }` expression block whose body
 *           contains identifier tokens but NONE of the patterns the
 *           botscript checker suite would flag — no `as` type cast (UNS004),
 *           no stdlib capability call (UNS005), no `throw` (SYN002), no
 *           `console.*` call (SYN003), no function call of any kind, and
 *           none of the other known bypass identifiers.
 *
 *           UNS007 catches "born-stale" blocks (pure literal bodies — no
 *           identifiers at all). UNS008 catches "decay-stale" blocks: the
 *           body still has variable references, but the reasons those
 *           references needed an unsafe wrapper no longer exist.
 *
 *           Common decay patterns:
 *             — The stdlib call was wrapped in `match`, leaving only
 *               a local variable reference in the body.
 *             — The `as` cast moved upstream; the unsafe block now
 *               contains just the typed variable.
 *             — `throw new Error(...)` was replaced with `return err(...)`,
 *               leaving the error string as a plain expression.
 *
 *           The check is intentionally conservative in the function-call
 *           direction: any function call in the body (ident immediately
 *           followed by `(`) suppresses UNS008, because the call might be
 *           suppressing a RES002 diagnostic for which we lack subtree
 *           context. False negatives are preferred over false positives here.
 *
 *           Examples that fire:
 *             unsafe "cast moved up" { data }
 *             unsafe "unused" { user.email }
 *             unsafe "stale" { result }
 *
 *           Examples that do NOT fire:
 *             unsafe "needed" { http.get(url) }     -- stdlib call
 *             unsafe "needed" { data as User }      -- as cast
 *             unsafe "needed" { throw new Error() } -- throw keyword
 *             unsafe "needed" { console.log(x) }   -- console bypass
 *             unsafe "needed" { saveUser(id) }      -- function call
 *             unsafe "stale" { 42 }                 -- caught by UNS007
 *             unsafe "needed" { process.env.X }     -- bypass ident
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
import { STDLIB_TO_CAP } from "./_stdlib.js";

/**
 * Identifiers that justify an unsafe block even without a function call.
 * These are the roots of bypass patterns that syn-check, uns-check, and
 * res-check flag at the statement or expression level.
 *
 * NOTE: In botscript's lexer, only the small set {fn, uses, pure, io, match,
 * test, assert, async, unsafe} are keyword tokens. Everything else —
 * including `as`, `throw`, `const`, `new`, `typeof`, etc. — is lexed as an
 * ident token. `as` and `throw` appear here as idents, not keywords.
 */
const BYPASS_IDENTS: ReadonlySet<string> = new Set([
  // stdlib namespaces (UNS005)
  ...Object.keys(STDLIB_TO_CAP),
  // UNS004: `as` type cast (lexed as ident in botscript)
  "as",
  // SYN002: native throw statement (lexed as ident in botscript)
  "throw",
  // SYN003: console.log / console.error / console.warn
  "console",
  // SYN004: eval(...) / new Function(...)
  "eval",
  "Function",
  // SYN005/SYN006: process.env / process.exit
  "process",
  // SYN007: fetch(url)
  "fetch",
  // SYN008: new WebSocket(url)
  "WebSocket",
  // SYN010/SYN016: Worker / SharedWorker
  "Worker",
  "SharedWorker",
  // SYN019: crypto.getRandomValues
  "crypto",
  // SYN023: navigator.userAgent / navigator.onLine
  "navigator",
]);

export function passUnsDecay(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const tokens = lex(src);
  const diagnostics: Diagnostic[] = [];
  const entry = getErrorCode("UNS008")!;

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

    // UNS007 handles pure-literal bodies (no idents). UNS008 handles the
    // complementary case: idents present but no bypass patterns.
    const bodyKind = classifyBody(tokens, bodyStart, closeIdx);
    if (bodyKind === "no-ident") continue; // UNS007's domain
    if (bodyKind === "has-bypass") {
      // Body is justified — contains a stdlib call, as cast, throw, or other
      // bypass pattern. Skip.
      i = closeIdx;
      continue;
    }

    // bodyKind === "decay-stale": has idents, no bypass patterns.
    const loc = locationOf(src, t.start);
    diagnostics.push({
      code: "UNS008",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: t.start,
      end: tokens[closeIdx]!.end,
      message:
        `unsafe block body has no cast, capability call, or bypass pattern — ` +
        `the escape hatch is unnecessary; remove the \`unsafe\` wrapper`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: entry.rewrite,
    });

    i = closeIdx;
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

type BodyKind = "no-ident" | "has-bypass" | "decay-stale";

/**
 * Classifies the body of an unsafe block:
 *
 *   "no-ident"    — no identifier tokens at all (UNS007's domain, not ours)
 *   "has-bypass"  — contains at least one pattern that justifies the unsafe
 *                   block: a bypass ident, an `as` keyword, a `throw` keyword,
 *                   or any function call (ident immediately followed by `(`)
 *   "decay-stale" — has idents but none of the bypass patterns; the block
 *                   is a candidate for UNS008
 */
function classifyBody(
  tokens: Token[],
  bodyStart: number,
  closeIdx: number,
): BodyKind {
  let hasAnyIdent = false;

  for (let i = bodyStart; i < closeIdx; i++) {
    const t = tokens[i];
    if (!t) continue;

    if (t.kind === "keyword") {
      // Botscript keywords are: fn, uses, pure, io, match, test, assert,
      // async, unsafe. None of these are bypass patterns — but their presence
      // means the body has substantive content (e.g. a nested fn declaration
      // or an io block). Mark ident present; don't classify as bypass.
      hasAnyIdent = true;
      continue;
    }

    if (t.kind !== "ident") continue;

    hasAnyIdent = true;

    // Known bypass identifiers.
    if (BYPASS_IDENTS.has(t.text)) return "has-bypass";

    // Function call pattern: ident immediately followed by `(`.
    // Catches RES002 suppressions, non-stdlib capability calls, and all
    // SYN-flagged global method calls (console.log, eval, fetch, etc.)
    // that are called by reference through a local alias.
    const next = nextSignificant(tokens, i + 1);
    const nextTok = tokens[next];
    if (nextTok && nextTok.kind === "open" && nextTok.text === "(") {
      return "has-bypass";
    }
  }

  return hasAnyIdent ? "decay-stale" : "no-ident";
}
