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
 *
 * Accepted forms:
 *   const t = time              — bare stdlib ident
 *   const t = (time)            — single-paren grouping (trivially equivalent)
 *   const t: SomeType = time    — type-annotated binding (annotation skipped)
 *   const t: typeof time = time — complex type annotation (scan forward to `=`)
 *
 * Rejected forms (stay on the canonical-name tripwire):
 *   const t = time.now     — member access
 *   const t = time + 1     — operator expression
 *   const t = time()       — call
 *   const t = flag ? time : random  — ternary
 *
 * Note: botscript newlines are explicit statement terminators (not JS ASI),
 * so `const t = time\n.now` is two statements — the newline ends the binding
 * and `.now` is a separate (invalid) expression. The statement-end check here
 * is correct for botscript source.
 */
export function collectStdlibAliases(tokens: Token[], fnRanges: FnDecl[]): Map<string, string> {
  const aliases = new Map<string, string>();
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.kind === "open" && tok.text === "{") { depth++; continue; }
    if (tok.kind === "close" && tok.text === "}") { if (depth > 0) depth--; continue; }
    if (depth !== 0) continue;
    if (tok.kind !== "ident" || tok.text !== "const") continue;

    // const <name>[: <type>] = <rhs>
    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (!nameTok || nameTok.kind !== "ident") continue;

    // Find the `=` token, skipping over an optional type annotation.
    // If the next significant token after the name is `:`, scan forward
    // until we hit `=` at nesting depth 0 (skipping `<>` generics and `()` parens).
    const afterNameIdx = nextSignificant(tokens, nameIdx + 1);
    const afterNameTok = tokens[afterNameIdx];
    let eqIdx = -1;
    if (afterNameTok && afterNameTok.kind === "punct" && afterNameTok.text === ":") {
      // Skip type annotation: scan for `=` at depth 0, stopping at newline/eof.
      let depth = 0;
      for (let j = afterNameIdx + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) break;
        if (t.kind === "newline" || t.kind === "eof") break;
        if (
          (t.kind === "open" && (t.text === "(" || t.text === "<")) ||
          (t.kind === "punct" && t.text === "<")
        ) {
          depth++;
        } else if (
          (t.kind === "close" && (t.text === ")" || t.text === ">")) ||
          (t.kind === "punct" && t.text === ">")
        ) {
          if (depth > 0) depth--;
        } else if (t.kind === "eq" && depth === 0) {
          eqIdx = j;
          break;
        }
      }
    } else if (afterNameTok && afterNameTok.kind === "eq") {
      // No type annotation — next significant must be `=`.
      eqIdx = afterNameIdx;
    }
    if (eqIdx === -1) continue;

    // Resolve the RHS to a bare stdlib ident, accepting either:
    //   const t = time          — direct ident
    //   const t = (time)        — single-paren grouping
    const rawRhsIdx = nextSignificant(tokens, eqIdx + 1);
    const rawRhsTok = tokens[rawRhsIdx];
    if (!rawRhsTok) continue;

    let stdlibTok: Token;
    let afterStdlibIdx: number;

    if (rawRhsTok.kind === "ident" && STDLIB_NAMES.has(rawRhsTok.text)) {
      // bare: const t = time
      stdlibTok = rawRhsTok;
      afterStdlibIdx = rawRhsIdx + 1;
    } else if (rawRhsTok.kind === "open" && rawRhsTok.text === "(") {
      // grouping: const t = (time)
      // The open-paren token carries the index of its matching close-paren.
      const innerIdx = nextSignificant(tokens, rawRhsIdx + 1);
      const innerTok = tokens[innerIdx];
      if (!innerTok || innerTok.kind !== "ident" || !STDLIB_NAMES.has(innerTok.text)) continue;
      // The close-paren must follow immediately (no other tokens inside).
      const closeIdx = nextSignificant(tokens, innerIdx + 1);
      const closeTok = tokens[closeIdx];
      if (!closeTok || closeTok.kind !== "close" || closeTok.text !== ")") continue;
      stdlibTok = innerTok;
      afterStdlibIdx = closeIdx + 1;
    } else {
      continue;
    }

    // Accept only a clean end-of-statement after the stdlib ident (or closing paren).
    // This rejects operators (`time + 1`), member access (`time.now`), calls (`time()`),
    // ternaries, and any other continuation.
    let afterIdx = afterStdlibIdx;
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
      afterRhs.kind !== "eof" &&
      !(afterRhs.kind === "punct" && afterRhs.text === ";")
    ) {
      continue;
    }

    aliases.set(nameTok.text, stdlibTok.text);
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

/**
 * Collect module-level const bindings where the RHS starts with a stdlib namespace
 * ident but is in a non-trivial form that the alias collector can't track.
 *
 * These are ALI001 candidates — the author may have intended to alias the namespace
 * but the form is unsound for static tracking.
 */
export function collectAliasWarningCandidates(
  tokens: Token[],
  fnRanges: FnDecl[],
): Array<{ name: string; stdlibName: string; start: number; end: number }> {
  const candidates: Array<{ name: string; stdlibName: string; start: number; end: number }> = [];
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.kind === "open" && tok.text === "{") { depth++; continue; }
    if (tok.kind === "close" && tok.text === "}") { if (depth > 0) depth--; continue; }
    if (depth !== 0) continue;
    if (tok.kind !== "ident" || tok.text !== "const") continue;

    const constStart = tok.start;

    // const <name>[: <type>] = <rhs>
    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (!nameTok || nameTok.kind !== "ident") continue;

    // Find the `=` token, skipping over an optional type annotation.
    const afterNameIdx = nextSignificant(tokens, nameIdx + 1);
    const afterNameTok = tokens[afterNameIdx];
    let eqIdx = -1;
    if (afterNameTok && afterNameTok.kind === "punct" && afterNameTok.text === ":") {
      let depth = 0;
      for (let j = afterNameIdx + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) break;
        if (t.kind === "newline" || t.kind === "eof") break;
        if (
          (t.kind === "open" && (t.text === "(" || t.text === "<")) ||
          (t.kind === "punct" && t.text === "<")
        ) {
          depth++;
        } else if (
          (t.kind === "close" && (t.text === ")" || t.text === ">")) ||
          (t.kind === "punct" && t.text === ">")
        ) {
          if (depth > 0) depth--;
        } else if (t.kind === "eq" && depth === 0) {
          eqIdx = j;
          break;
        }
      }
    } else if (afterNameTok && afterNameTok.kind === "eq") {
      eqIdx = afterNameIdx;
    }
    if (eqIdx === -1) continue;

    // Look at the RHS
    const rawRhsIdx = nextSignificant(tokens, eqIdx + 1);
    const rawRhsTok = tokens[rawRhsIdx];
    if (!rawRhsTok) continue;

    let stdlibName: string;
    let afterStdlibIdx: number;

    if (rawRhsTok.kind === "ident" && STDLIB_NAMES.has(rawRhsTok.text)) {
      // bare: const t = time...
      stdlibName = rawRhsTok.text;
      afterStdlibIdx = rawRhsIdx + 1;
    } else if (rawRhsTok.kind === "open" && rawRhsTok.text === "(") {
      // grouping form: const t = (time...)
      const innerIdx = nextSignificant(tokens, rawRhsIdx + 1);
      const innerTok = tokens[innerIdx];
      if (!innerTok || innerTok.kind !== "ident" || !STDLIB_NAMES.has(innerTok.text)) continue;
      // Check if the close-paren follows immediately (trivial) or not (non-trivial)
      const closeIdx = nextSignificant(tokens, innerIdx + 1);
      const closeTok = tokens[closeIdx];
      if (!closeTok || closeTok.kind !== "close" || closeTok.text !== ")") {
        // Non-trivial paren form: e.g. `const t = (time.now)` — emit ALI001.
        if (closeTok) {
          candidates.push({
            name: nameTok.text,
            stdlibName: innerTok.text,
            start: constStart,
            end: closeTok.end,
          });
        }
        continue;
      }
      // It IS the single-paren grouping form — check if it's trivial (clean end)
      stdlibName = innerTok.text;
      afterStdlibIdx = closeIdx + 1;
    } else {
      continue;
    }

    // Check if the form is trivial (would be tracked by collectStdlibAliases)
    // Trivial: after the stdlib ident (or closing paren), next non-ws/blockComment
    // is newline, lineComment, eof, or semicolon.
    let afterIdx = afterStdlibIdx;
    while (
      afterIdx < tokens.length &&
      (tokens[afterIdx]?.kind === "whitespace" || tokens[afterIdx]?.kind === "blockComment")
    ) {
      afterIdx++;
    }
    const afterRhs = tokens[afterIdx];
    const isTrivial =
      !afterRhs ||
      afterRhs.kind === "newline" ||
      afterRhs.kind === "lineComment" ||
      afterRhs.kind === "eof" ||
      (afterRhs.kind === "punct" && afterRhs.text === ";");

    if (isTrivial) {
      // This is already tracked by collectStdlibAliases — skip
      continue;
    }

    // Non-trivial form — this is an ALI001 candidate
    // The end should be the end of the first non-trivial RHS token (afterRhs)
    candidates.push({
      name: nameTok.text,
      stdlibName,
      start: constStart,
      end: afterRhs.end,
    });
  }

  return candidates;
}

function insideAnyFn(tokenIdx: number, fns: FnDecl[]): boolean {
  for (const fn of fns) {
    if (tokenIdx >= fn.tokenStart && tokenIdx < fn.tokenEnd) return true;
  }
  return false;
}

/**
 * Return the set of parameter names declared in `fn`'s signature.
 * These names shadow any module-level alias, so alias resolution must skip them.
 *
 * Scans tokens from `fn.tokenStart` to `fn.bodyTokenStart` (exclusive), finds
 * the outer `(…)` parameter list, and collects idents at depth 1 that are
 * immediately followed by `:`.
 */
export function fnParamNames(tokens: Token[], fn: FnDecl): Set<string> {
  const names = new Set<string>();
  const end = fn.bodyTokenStart ?? fn.tokenEnd;
  let depth = 0;

  for (let i = fn.tokenStart; i < end; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.kind === "whitespace" || tok.kind === "newline" || tok.kind === "lineComment" || tok.kind === "blockComment") continue;

    if (depth === 0) {
      if (tok.kind === "open" && tok.text === "(") depth = 1;
      continue;
    }

    if ((tok.kind === "open" && (tok.text === "(" || tok.text === "<")) ||
        (tok.kind === "punct" && tok.text === "<")) {
      depth++;
    } else if ((tok.kind === "close" && (tok.text === ")" || tok.text === ">")) ||
               (tok.kind === "punct" && tok.text === ">")) {
      depth--;
      if (depth === 0) break;
    } else if (depth === 1 && tok.kind === "ident") {
      const next = nextNonTrivia(tokens, i + 1, end);
      if (next && next.kind === "punct" && next.text === ":") {
        names.add(tok.text);
      }
    }
  }

  return names;
}

function nextNonTrivia(tokens: Token[], from: number, end: number): Token | undefined {
  for (let i = from; i < end; i++) {
    const t = tokens[i];
    if (!t) return undefined;
    if (t.kind !== "whitespace" && t.kind !== "newline" && t.kind !== "lineComment" && t.kind !== "blockComment") return t;
  }
  return undefined;
}
