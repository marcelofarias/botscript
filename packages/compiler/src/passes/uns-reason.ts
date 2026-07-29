/**
 * Weak unsafe-reason string check (botscript 0.9+).
 *
 *   UNS009  An `unsafe "<reason>" { body }` expression block or
 *           `unsafe "<reason>" fn` declaration whose reason string is too
 *           weak to justify the escape hatch.
 *
 *           A reason is considered weak when it is:
 *             — empty: `unsafe "" { ... }`
 *             — whitespace-only: `unsafe "   " { ... }`
 *             — a known-weak single-word deferral (case-insensitive):
 *               TODO, legacy, temp, temporary, workaround, fixme,
 *               hack, ignore, wip
 *
 *           The rule is intentionally narrow: a single-word reason that is
 *           NOT in the weak list is not flagged (e.g. "performance" or
 *           "migration" are allowed — not ideal, but not UNS009). The goal
 *           is to catch the clearly-degenerate cases where the author
 *           pressed through the gate without recording anything meaningful.
 *
 *           Examples that fire:
 *             unsafe "" { http.get(url) }
 *             unsafe "TODO" { data as User }
 *             unsafe "legacy" { eval(code) }
 *             unsafe "hack" fn process(...) -> ...
 *
 *           Examples that do NOT fire:
 *             unsafe "third-party SDK returns any; upstream #42" { ... }
 *             unsafe "migration from JS; owner: team-alpha" { ... }
 *             unsafe "performance" { ... }     -- single word, not in list
 *             unsafe "test fixture" { ... }    -- multi-word, not in list
 *
 *           Suppression: none. Write a real reason.
 *
 *   pre-0.9  This pass is not run.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";
import { nextSignificant } from "./_callgraph.js";

/**
 * Known-weak single-word reason strings (lower-cased for comparison).
 * These are deferrals with no scope — they record that someone bypassed
 * the gate, not why.
 */
const WEAK_REASONS: ReadonlySet<string> = new Set([
  "todo",
  "legacy",
  "temp",
  "temporary",
  "workaround",
  "fixme",
  "hack",
  "ignore",
  "wip",
  "fix",
  "xxx",
]);

/**
 * Returns true when the reason string value (inner content, quotes stripped)
 * is too weak to justify an unsafe escape hatch.
 */
function isWeakReason(raw: string): boolean {
  // raw includes outer quotes, e.g. `"TODO"` or `'legacy'`
  if (raw.length < 2) return true; // malformed — no closing quote
  const inner = raw.slice(1, -1).trim();
  if (inner.length === 0) return true; // empty or whitespace-only
  return WEAK_REASONS.has(inner.toLowerCase());
}

export function passUnsReason(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const tokens = lex(src);
  const diagnostics: Diagnostic[] = [];
  const entry = getErrorCode("UNS009")!;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (t.kind !== "keyword" || t.text !== "unsafe") continue;

    // Next significant token must be a string literal (the reason).
    const reasonIdx = nextSignificant(tokens, i + 1);
    const reasonTok = tokens[reasonIdx];
    if (!reasonTok || reasonTok.kind !== "string") continue;

    if (!isWeakReason(reasonTok.text)) continue;

    const loc = locationOf(src, t.start);
    const inner = reasonTok.text.slice(1, -1).trim();
    const display = inner.length === 0 ? "(empty)" : JSON.stringify(inner);

    diagnostics.push({
      code: "UNS009",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: t.start,
      end: reasonTok.end,
      message:
        `unsafe reason string ${display} is too weak — ` +
        `describe what the bypass does and why it is necessary`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: entry.rewrite,
    });
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}
