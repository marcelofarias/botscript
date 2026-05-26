/**
 * Module-level stdlib alias tracking.
 *
 * Scans module-level tokens for `const <name> = <stdlib_namespace>` bindings.
 * Only trivial, direct bindings are tracked (e.g. `const t = time`). Non-trivial
 * forms (ternaries, calls, member accesses on the RHS) are ignored — the
 * canonical-name tripwire still applies for those.
 *
 * Gated on ?bs 0.8. Callers skip collection for earlier pins.
 */

import type { Token } from "../parser/lex.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { STDLIB_TO_CAP } from "./_stdlib.js";
import { nextSignificant } from "./_callgraph.js";

const STDLIB_NAMES = new Set(Object.keys(STDLIB_TO_CAP));

/**
 * Collect module-level `const <alias> = <stdlib_namespace>` bindings.
 *
 * Returns a map from alias name → canonical stdlib namespace (e.g. `"t" → "time"`).
 * Tokens inside any fn range are excluded — this is module-scope only.
 */
export function collectStdlibAliases(tokens: Token[], fnRanges: FnDecl[]): Map<string, string> {
  const aliases = new Map<string, string>();

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident" || tok.text !== "const") continue;
    if (insideAnyFn(i, fnRanges)) continue;

    // const <name> = <rhs>
    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (!nameTok || nameTok.kind !== "ident") continue;

    const eqIdx = nextSignificant(tokens, nameIdx + 1);
    const eqTok = tokens[eqIdx];
    if (!eqTok || eqTok.kind !== "eq") continue;

    const rhsIdx = nextSignificant(tokens, eqIdx + 1);
    const rhsTok = tokens[rhsIdx];
    if (!rhsTok || rhsTok.kind !== "ident" || !STDLIB_NAMES.has(rhsTok.text)) continue;

    // Accept only a clean end-of-statement after the stdlib ident.
    // Skip whitespace and block comments, then require newline, line comment,
    // or semicolon. This rejects operators (`time + 1`), member access
    // (`time.now`), calls (`time()`), ternaries, and any other continuation.
    let afterIdx = rhsIdx + 1;
    while (
      afterIdx < tokens.length &&
      (tokens[afterIdx]?.kind === "whitespace" ||
        tokens[afterIdx]?.kind === "blockComment")
    ) {
      afterIdx++;
    }
    const afterRhs = tokens[afterIdx];
    if (
      afterRhs &&
      afterRhs.kind !== "newline" &&
      afterRhs.kind !== "lineComment" &&
      !(afterRhs.kind === "punct" && afterRhs.text === ";")
    ) {
      continue;
    }

    aliases.set(nameTok.text, rhsTok.text);
  }

  return aliases;
}

/**
 * Resolve a token's text through the alias map to its canonical stdlib namespace.
 * Returns the canonical name if `name` is a tracked alias, or `name` itself otherwise.
 */
export function resolveAlias(name: string, aliases: Map<string, string>): string {
  return aliases.get(name) ?? name;
}

function insideAnyFn(tokenIdx: number, fns: FnDecl[]): boolean {
  for (const fn of fns) {
    if (tokenIdx >= fn.tokenStart && tokenIdx < fn.tokenEnd) return true;
  }
  return false;
}
