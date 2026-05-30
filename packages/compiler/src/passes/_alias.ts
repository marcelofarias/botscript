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
 * Tokens inside any braced block are excluded — brace depth is tracked as
 * we scan, so fn bodies, `test "..." {}` blocks, `unsafe "..." {}` blocks,
 * and any other `{...}` construct are all skipped. Only tokens at depth 0
 * (true module scope) are considered.
 *
 * Accepted forms:
 *   const t = time              — bare stdlib ident
 *   const t = (time)            — paren grouping (any depth: `(time)`, `((time))`, etc.)
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
export function collectStdlibAliases(tokens: Token[]): Map<string, string> {
  const aliases = new Map<string, string>();
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.kind === "open" && tok.text === "{") { depth++; continue; }
    if (tok.kind === "close" && tok.text === "}") { if (depth > 0) depth--; continue; }
    if (tok.kind !== "ident" || tok.text !== "const") continue;
    if (depth !== 0) continue;

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
      // Skip type annotation: scan for `=` at nesting depth 0, stopping at newline/eof.
      // Use a separate counter (typeDepth) to avoid shadowing the outer module-brace `depth`.
      // Note: `<`/`>` are emitted as `operator` tokens by the lexer, not `open`/`close`.
      let typeDepth = 0;
      for (let j = afterNameIdx + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) break;
        if (t.kind === "newline" || t.kind === "eof") break;
        if (
          (t.kind === "open" && t.text === "(") ||
          (t.kind === "operator" && t.text === "<")
        ) {
          typeDepth++;
        } else if (
          (t.kind === "close" && t.text === ")") ||
          (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
        ) {
          // `>>` and `>>>` are lexed as single tokens; each char closes one generic level.
          const closes = t.text.length;
          typeDepth = Math.max(0, typeDepth - closes);
        } else if (t.kind === "eq" && typeDepth === 0) {
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
    //   const t = (time)        — paren grouping (any depth: `(time)`, `((time))`, etc.)
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
      // paren grouping: const t = (time), ((time)), (((time))), etc.
      // unwrapParenToIdent verifies each paren level wraps ONLY the inner group,
      // so `((time) + 1)` and `(time.now)` are correctly rejected here.
      const unwrapped = unwrapParenToIdent(tokens, rawRhsIdx);
      if (!unwrapped || !STDLIB_NAMES.has(unwrapped.tok.text)) continue;
      stdlibTok = unwrapped.tok;
      afterStdlibIdx = unwrapped.tokenEnd;
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

    // Skip if the alias name itself is a canonical stdlib namespace.
    // Canonical names must remain unconditional tripwires — recording `time → random`
    // would cause later passes to mis-attribute `time.now()` as a `random` call.
    if (STDLIB_NAMES.has(nameTok.text)) continue;

    aliases.set(nameTok.text, stdlibTok.text);
  }

  return aliases;
}

/**
 * Collect module-level const bindings where the RHS contains a stdlib namespace
 * ident in a non-trivial form that the alias collector can't track.
 *
 * These are ALI001 candidates — the author may have intended to alias the namespace
 * but the form is unsound for static tracking. This includes both leading-stdlib
 * forms (`const t = time.now`) and non-leading forms (`const t = flag ? time : null`)
 * where the stdlib ident appears somewhere in the RHS expression.
 *
 * Like collectStdlibAliases, uses brace depth to exclude tokens inside any
 * braced block (fn bodies, test/unsafe blocks, etc.) — only module-scope bindings.
 */
export function collectAliasWarningCandidates(
  tokens: Token[],
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

    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (!nameTok || nameTok.kind !== "ident") continue;

    const afterNameIdx = nextSignificant(tokens, nameIdx + 1);
    const afterNameTok = tokens[afterNameIdx];
    let eqIdx = -1;
    if (afterNameTok && afterNameTok.kind === "punct" && afterNameTok.text === ":") {
      let typeDepth = 0;
      for (let j = afterNameIdx + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) break;
        if (t.kind === "newline" || t.kind === "eof") break;
        if (
          (t.kind === "open" && t.text === "(") ||
          (t.kind === "operator" && t.text === "<")
        ) {
          typeDepth++;
        } else if (
          (t.kind === "close" && t.text === ")") ||
          (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
        ) {
          const closes = t.text.length;
          typeDepth = Math.max(0, typeDepth - closes);
        } else if (t.kind === "eq" && typeDepth === 0) {
          eqIdx = j;
          break;
        }
      }
    } else if (afterNameTok && afterNameTok.kind === "eq") {
      eqIdx = afterNameIdx;
    }
    if (eqIdx === -1) continue;

    const rawRhsIdx = nextSignificant(tokens, eqIdx + 1);
    const rawRhsTok = tokens[rawRhsIdx];
    if (!rawRhsTok) continue;

    let stdlibName: string;
    let afterStdlibIdx: number;

    if (rawRhsTok.kind === "ident" && STDLIB_NAMES.has(rawRhsTok.text)) {
      stdlibName = rawRhsTok.text;
      afterStdlibIdx = rawRhsIdx + 1;
    } else if (rawRhsTok.kind === "open" && rawRhsTok.text === "(") {
      // Paren-wrapped RHS: find the first significant token inside.
      // Only warn when that leading token IS a stdlib namespace (not arbitrary exprs).
      const innerIdx = nextSignificant(tokens, rawRhsIdx + 1);
      const innerTok = tokens[innerIdx];
      if (innerTok?.kind === "open" && innerTok.text === "(") {
        // Doubly-nested paren: `const t = ((…))`.
        // Only treat as trivially tracked when the inner `(stdlib)` is the
        // ENTIRE content of the outer parens — i.e. the token immediately
        // after the inner close paren IS the outer close paren.
        // `((time) + 1)` and `((time).now)` must NOT be treated as tracked.
        const trivialStdlib = isParenWrappedStdlib(tokens, innerIdx);
        const innerCloseIdx = (innerTok as { matchedAt?: number }).matchedAt;
        const outerCloseIdx = rawRhsTok.matchedAt;
        const innerFillsOuter =
          trivialStdlib !== null &&
          innerCloseIdx !== undefined &&
          outerCloseIdx !== undefined &&
          nextSignificant(tokens, innerCloseIdx + 1) === outerCloseIdx;
        if (innerFillsOuter && trivialStdlib) {
          // `((time))` — trivially tracked, fall through to end-of-statement check.
          stdlibName = trivialStdlib;
          afterStdlibIdx = outerCloseIdx + 1;
        } else {
          // Non-trivial outer parens. Determine the stdlib name to report:
          //   - `trivialStdlib` is set when inner `(stdlib)` exists but outer has more
          //     content: `((time) + 1)`, `((time).now)`.
          //   - Otherwise fall back to leadingStdlibAfterParens for deeply nested forms.
          //   - `((flag ? time : null))`: no stdlib leading, but scan full content.
          const nestedStdlib =
            trivialStdlib ?? leadingStdlibAfterParens(tokens, innerIdx) ?? scanRhsForStdlib(tokens, rawRhsIdx + 1)?.stdlibName;
          if (nestedStdlib) {
            const matchedCloseIdx = rawRhsTok.matchedAt;
            const matchedClose = matchedCloseIdx !== undefined ? tokens[matchedCloseIdx] : undefined;
            candidates.push({
              name: nameTok.text,
              stdlibName: nestedStdlib,
              start: constStart,
              end: matchedClose?.end ?? rawRhsTok.end,
            });
          }
          continue;
        }
      } else if (!innerTok || innerTok.kind !== "ident" || !STDLIB_NAMES.has(innerTok.text)) {
        // First significant token inside the paren is neither a stdlib ident nor
        // another `(`. Scan the paren content for a non-leading stdlib name.
        // e.g. `(flag ? time : null)` — `time` appears but is not the leading token.
        const found = scanRhsForStdlib(tokens, rawRhsIdx + 1);
        if (found) {
          const matchedClose = rawRhsTok.matchedAt !== undefined ? tokens[rawRhsTok.matchedAt] : undefined;
          candidates.push({
            name: nameTok.text,
            stdlibName: found.stdlibName,
            start: constStart,
            end: matchedClose?.end ?? found.end,
          });
        }
        continue;
      } else {
        // innerTok is a bare stdlib ident inside single parens.
        const closeIdx = nextSignificant(tokens, innerIdx + 1);
        const closeTok = tokens[closeIdx];
        if (!closeTok || closeTok.kind !== "close" || closeTok.text !== ")") {
          // Non-trivial paren: e.g. `const t = (time.now)` — emit ALI001.
          const matchedClose = rawRhsTok.matchedAt !== undefined ? tokens[rawRhsTok.matchedAt] : undefined;
          const diagEnd = matchedClose?.end ?? closeTok?.end ?? rawRhsTok.end;
          candidates.push({
            name: nameTok.text,
            stdlibName: innerTok.text,
            start: constStart,
            end: diagEnd,
          });
          continue;
        }
        stdlibName = innerTok.text;
        afterStdlibIdx = closeIdx + 1;
      }
    } else {
      // RHS starts with a non-stdlib, non-paren token.
      // Scan the full statement for any stdlib ident (e.g. `flag ? time : null`).
      const found = scanRhsForStdlib(tokens, rawRhsIdx);
      if (found) {
        candidates.push({
          name: nameTok.text,
          stdlibName: found.stdlibName,
          start: constStart,
          end: found.end,
        });
      }
      continue;
    }

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

    if (isTrivial) continue;

    candidates.push({
      name: nameTok.text,
      stdlibName,
      start: constStart,
      end: afterRhs.end,
    });
  }

  return candidates;
}

/**
 * Collect module-level `const { … } = <stdlib_namespace>` destructuring bindings.
 *
 * These are ALI003 candidates — extracting method references from a stdlib
 * namespace produces idents that no static check follows. `const { now } = time`
 * means `now()` is called without a receiver, so the `time` tripwire never fires
 * (CAP001, INT002, UNS005 all miss it).
 *
 * Only object-destructuring `const { … } = <stdlib>` is flagged; array
 * destructuring `const [a, b] = someArray` is not a stdlib bypass and is ignored.
 * Bindings inside fn bodies are excluded via brace-depth tracking.
 */
export function collectDestructuringWarningCandidates(
  tokens: Token[],
): Array<{ stdlibName: string; start: number; end: number }> {
  const candidates: Array<{ stdlibName: string; start: number; end: number }> = [];
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.kind === "open" && tok.text === "{") { depth++; continue; }
    if (tok.kind === "close" && tok.text === "}") { if (depth > 0) depth--; continue; }
    if (depth !== 0) continue;
    if (tok.kind !== "ident" || tok.text !== "const") continue;

    const constStart = tok.start;

    // Next significant token must be `{` (object destructuring pattern).
    const patternOpenIdx = nextSignificant(tokens, i + 1);
    const patternOpenTok = tokens[patternOpenIdx];
    if (!patternOpenTok || patternOpenTok.kind !== "open" || patternOpenTok.text !== "{") continue;

    // Skip to the matching `}` of the destructuring pattern.
    const matchedCloseIdx = (patternOpenTok as { matchedAt?: number }).matchedAt;
    if (matchedCloseIdx === undefined) continue;
    const closeTok = tokens[matchedCloseIdx];
    if (!closeTok) continue;

    // Find `=`. If the next significant token after `}` is `:`, skip the type
    // annotation (same logic as collectStdlibAliases) to find `=` at depth 0.
    const afterCloseIdx = nextSignificant(tokens, matchedCloseIdx + 1);
    const afterCloseTok = tokens[afterCloseIdx];
    let eqIdx = -1;
    if (afterCloseTok && afterCloseTok.kind === "eq") {
      eqIdx = afterCloseIdx;
    } else if (afterCloseTok && afterCloseTok.kind === "punct" && afterCloseTok.text === ":") {
      let typeDepth = 0;
      for (let j = afterCloseIdx + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) break;
        if (t.kind === "newline" || t.kind === "eof") break;
        if (
          (t.kind === "open" && t.text === "(") ||
          (t.kind === "operator" && t.text === "<")
        ) { typeDepth++; }
        else if (
          (t.kind === "close" && t.text === ")") ||
          (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
        ) { typeDepth = Math.max(0, typeDepth - t.text.length); }
        else if (t.kind === "eq" && typeDepth === 0) { eqIdx = j; break; }
      }
    }
    if (eqIdx === -1) continue;

    // RHS must be a direct stdlib namespace ident, optionally paren-wrapped.
    const rawRhsIdx = nextSignificant(tokens, eqIdx + 1);
    const rawRhsTok = tokens[rawRhsIdx];
    if (!rawRhsTok) continue;

    let stdlibTok: Token;
    let rhsTokenEnd: number;
    if (rawRhsTok.kind === "ident" && STDLIB_NAMES.has(rawRhsTok.text)) {
      stdlibTok = rawRhsTok;
      rhsTokenEnd = rawRhsIdx + 1;
    } else if (rawRhsTok.kind === "open" && rawRhsTok.text === "(") {
      const unwrapped = unwrapParenToIdent(tokens, rawRhsIdx);
      if (!unwrapped || !STDLIB_NAMES.has(unwrapped.tok.text)) continue;
      stdlibTok = unwrapped.tok;
      rhsTokenEnd = unwrapped.tokenEnd;
    } else {
      continue;
    }

    // Confirm clean end-of-statement after the RHS.
    let afterIdx = rhsTokenEnd;
    while (
      afterIdx < tokens.length &&
      (tokens[afterIdx]?.kind === "whitespace" || tokens[afterIdx]?.kind === "blockComment")
    ) {
      afterIdx++;
    }
    const afterRhs = tokens[afterIdx];
    const isClean =
      !afterRhs ||
      afterRhs.kind === "newline" ||
      afterRhs.kind === "lineComment" ||
      afterRhs.kind === "eof" ||
      (afterRhs.kind === "punct" && afterRhs.text === ";");
    if (!isClean) continue;

    candidates.push({ stdlibName: stdlibTok.text, start: constStart, end: stdlibTok.end });
  }

  return candidates;
}

/**
 * Collect module-level `const x = <alias>` bindings where `<alias>` is already
 * in the tracked alias map (i.e., alias-of-alias chains).
 *
 * Example: `const t = time` (tracked), `const x = t` (chain — NOT tracked).
 * `x.now()` would not be caught by cap/intent/uns checks. ALI002 warns so
 * the author knows to use `const x = time` directly.
 *
 * Uses brace depth to restrict to module scope only.
 */
export function collectChainAliasWarningCandidates(
  tokens: Token[],
  aliases: Map<string, string>,
): Array<{ name: string; aliasName: string; stdlibName: string; start: number; end: number }> {
  const candidates: Array<{ name: string; aliasName: string; stdlibName: string; start: number; end: number }> = [];
  if (aliases.size === 0) return candidates;

  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!tok) continue;
    if (tok.kind === "open" && tok.text === "{") { depth++; continue; }
    if (tok.kind === "close" && tok.text === "}") { if (depth > 0) depth--; continue; }
    if (depth !== 0) continue;
    if (tok.kind !== "ident" || tok.text !== "const") continue;

    const constStart = tok.start;

    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (!nameTok || nameTok.kind !== "ident") continue;

    // Accept `const x = <alias>`, `const x: T = <alias>`, and `const x = (<alias>)`.
    // Note: paren-unwrapping here accepts any depth via unwrapParenToIdent,
    // whereas collectStdlibAliases only accepts a single paren level.
    const afterNameIdx = nextSignificant(tokens, nameIdx + 1);
    const afterNameTok = tokens[afterNameIdx];
    let eqIdx = -1;
    if (afterNameTok && afterNameTok.kind === "punct" && afterNameTok.text === ":") {
      // Type-annotated: skip to the `=` at nesting depth 0.
      // Note: `<`/`>` are `operator` tokens in the lexer, not `open`/`close`.
      let typeDepth = 0;
      for (let j = afterNameIdx + 1; j < tokens.length; j++) {
        const t = tokens[j];
        if (!t) break;
        if (t.kind === "newline" || t.kind === "eof") break;
        if ((t.kind === "open" && t.text === "(") || (t.kind === "operator" && t.text === "<")) {
          typeDepth++;
        } else if (
          (t.kind === "close" && t.text === ")") ||
          (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
        ) {
          // `>>` and `>>>` are lexed as single tokens; each char closes one generic level.
          const closes = t.text.length;
          typeDepth = Math.max(0, typeDepth - closes);
        } else if (t.kind === "eq" && typeDepth === 0) {
          eqIdx = j;
          break;
        }
      }
    } else if (afterNameTok && afterNameTok.kind === "eq") {
      eqIdx = afterNameIdx;
    }
    if (eqIdx === -1) continue;

    const rawRhsIdx = nextSignificant(tokens, eqIdx + 1);
    const rawRhsTok = tokens[rawRhsIdx];
    if (!rawRhsTok) continue;

    let rhsTok: Token;
    let rhsCharEnd: number; // character offset for diagnostic `end`
    let rhsTokenEnd: number; // token index for end-of-statement check

    if (rawRhsTok.kind === "ident") {
      rhsTok = rawRhsTok;
      rhsCharEnd = rawRhsTok.end;
      rhsTokenEnd = rawRhsIdx + 1;
    } else if (rawRhsTok.kind === "open" && rawRhsTok.text === "(") {
      // Trivial grouping: `const x = (t)`, `((t))`, `(((t)))`, etc.
      // Recursively unwrap any depth of paren wrapping around a single ident.
      const unwrapped = unwrapParenToIdent(tokens, rawRhsIdx);
      if (!unwrapped) continue;
      rhsTok = unwrapped.tok;
      rhsCharEnd = unwrapped.charEnd;
      rhsTokenEnd = unwrapped.tokenEnd;
    } else {
      continue;
    }

    // The RHS must be a tracked alias (not a stdlib name directly).
    const stdlibName = aliases.get(rhsTok.text);
    if (!stdlibName) continue;

    // Confirm end-of-statement after the RHS.
    let afterIdx = rhsTokenEnd;
    while (
      afterIdx < tokens.length &&
      (tokens[afterIdx]?.kind === "whitespace" || tokens[afterIdx]?.kind === "blockComment")
    ) {
      afterIdx++;
    }
    const afterRhs = tokens[afterIdx];
    const isClean =
      !afterRhs ||
      afterRhs.kind === "newline" ||
      afterRhs.kind === "lineComment" ||
      afterRhs.kind === "eof" ||
      (afterRhs.kind === "punct" && afterRhs.text === ";");
    if (!isClean) continue;

    candidates.push({
      name: nameTok.text,
      aliasName: rhsTok.text,
      stdlibName,
      start: constStart,
      end: rhsCharEnd,
    });
  }

  return candidates;
}

/**
 * Recursively unwrap paren groups around a single ident, returning the inner
 * ident token, its char-end, and the outer close-paren token index + 1.
 *
 * Handles `(t)`, `((t))`, `(((t)))` — any depth of trivial paren wrapping
 * around a single bare ident. Returns null if the content is not a single ident
 * (e.g. `(t.x)`, `((t + 1))`, `()`).
 *
 * `openIdx` must point to an `(` token.
 */
function unwrapParenToIdent(
  tokens: Token[],
  openIdx: number,
): { tok: Token & { kind: "ident" }; charEnd: number; tokenEnd: number } | null {
  const innerIdx = nextSignificant(tokens, openIdx + 1);
  const innerTok = tokens[innerIdx];
  if (!innerTok) return null;
  if (innerTok.kind === "open" && innerTok.text === "(") {
    // Recursively unwrap another paren level.
    const inner = unwrapParenToIdent(tokens, innerIdx);
    if (!inner) return null;
    // Verify the inner group is the ONLY content of the outer parens:
    // the next significant token after the inner close must be the outer close.
    const outerCloseIdx = (tokens[openIdx] as { matchedAt?: number }).matchedAt;
    if (outerCloseIdx === undefined) return null;
    if (nextSignificant(tokens, inner.tokenEnd) !== outerCloseIdx) return null;
    const outerClose = tokens[outerCloseIdx];
    if (!outerClose) return null;
    return { tok: inner.tok, charEnd: outerClose.end, tokenEnd: outerCloseIdx + 1 };
  }
  if (innerTok.kind !== "ident") return null;
  const closeIdx = nextSignificant(tokens, innerIdx + 1);
  const closeTok = tokens[closeIdx];
  if (!closeTok || closeTok.kind !== "close" || closeTok.text !== ")") return null;
  return { tok: innerTok as Token & { kind: "ident" }, charEnd: closeTok.end, tokenEnd: closeIdx + 1 };
}

/**
 * Return the set of parameter names declared in `fn`'s signature.
 * These names shadow any module-level alias, so alias resolution must skip them.
 *
 * Scans tokens from `fn.tokenStart` to `fn.bodyTokenStart` (exclusive), finds
 * the outer `(…)` parameter list, and collects idents at depth 1 that are
 * immediately followed by `:`.
 *
 * Depth tracking includes `{` / `}` so that object/record type annotations
 * (e.g. `opts: { x: number }`) don't contribute inner idents as param names.
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

    // Note: `<`/`>` are emitted as `operator` tokens by the lexer, not `open`/`close`.
    // `[`/`]` are `open`/`close` tokens and appear in array type annotations.
    // `>>`/`>>>` are single operator tokens that close multiple generic levels.
    if ((tok.kind === "open" && (tok.text === "(" || tok.text === "{" || tok.text === "[")) ||
        (tok.kind === "operator" && tok.text === "<")) {
      depth++;
    } else if (tok.kind === "close" && tok.text === ")") {
      depth--;
      if (depth === 0) break;
    } else if (
      (tok.kind === "close" && (tok.text === "}" || tok.text === "]")) ||
      (tok.kind === "operator" && (tok.text === ">" || tok.text === ">>" || tok.text === ">>>"))
    ) {
      const closes = tok.kind === "operator" ? tok.text.length : 1;
      depth = Math.max(0, depth - closes);
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

/**
 * Scan tokens from `from` to the first newline/eof/lineComment at paren depth 0
 * and return the first stdlib namespace ident found, along with its end offset.
 * Returns null if no stdlib ident appears before the statement terminator.
 *
 * Used by `collectAliasWarningCandidates` to catch non-leading stdlib names such
 * as `flag ? time : null` or `(flag ? time : null)`.
 */
function scanRhsForStdlib(
  tokens: Token[],
  from: number,
): { stdlibName: string; end: number } | null {
  let parenDepth = 0;
  for (let i = from; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (t.kind === "open" && (t.text === "(" || t.text === "[")) { parenDepth++; continue; }
    if (t.kind === "close" && (t.text === ")" || t.text === "]")) { if (parenDepth > 0) parenDepth--; continue; }
    if (parenDepth === 0) {
      if (t.kind === "newline" || t.kind === "eof" || t.kind === "lineComment") break;
      if (t.kind === "punct" && t.text === ";") break;
    }
    if (t.kind === "ident" && STDLIB_NAMES.has(t.text)) {
      return { stdlibName: t.text, end: t.end };
    }
  }
  return null;
}

/**
 * Return the set of names bound by `const`/`let`/`var` declarations in
 * `fn`'s immediate body. Tokens inside nested fn bodies are excluded — a
 * binding in an inner fn only shadows at that inner scope, not here.
 *
 * Handles simple bindings (`const t = ...`) and destructuring patterns
 * (`const { a, b: c } = ...`, `const [a, b] = ...`) so that any local
 * identifier that could shadow a module-level alias is captured.
 *
 * `nestedFns` should be the list of fn declarations whose token ranges fall
 * entirely within `fn`'s range. When empty (default), no ranges are excluded.
 */
export function fnBodyLocalNames(tokens: Token[], fn: FnDecl, nestedFns: FnDecl[] = []): Set<string> {
  const names = new Set<string>();
  const start = fn.bodyTokenStart ?? fn.tokenStart;
  const end = fn.tokenEnd;

  // Sort nested fns by start so we can advance a cursor rather than re-scan.
  const sorted = [...nestedFns].sort((a, b) => a.tokenStart - b.tokenStart);
  const open: FnDecl[] = [];
  let nextNested = 0;

  // Track brace depth within the fn body (not counting nested fn bodies, which
  // are skipped by the `open` cursor above). braceDepth === 1 means we are
  // directly inside the fn's own `{ }` — i.e. not inside any nested block.
  // `const`/`let` are block-scoped, so we only collect them at braceDepth === 1
  // (or 0 for expression-bodied fns that have no outer braces).
  // `var` is function-scoped, so it is collected at any depth.
  let braceDepth = 0;

  for (let i = start; i < end; i++) {
    // Maintain cursor: pop fns whose range has passed, push fns that have started.
    while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
    while (nextNested < sorted.length && sorted[nextNested]!.tokenStart <= i) {
      open.push(sorted[nextNested]!);
      nextNested++;
    }
    if (open.length > 0) continue; // inside a nested fn — skip

    const tok = tokens[i];
    if (!tok) continue;

    // Track brace depth (only outside nested fns, handled above).
    if (tok.kind === "open" && tok.text === "{") { braceDepth++; continue; }
    if (tok.kind === "close" && tok.text === "}") { braceDepth--; continue; }

    if (tok.kind !== "ident") continue;
    if (tok.text !== "const" && tok.text !== "let" && tok.text !== "var") continue;

    // `const`/`let` are block-scoped; `var` is function-scoped.
    // KNOWN LIMITATION: we collect block-scoped names only at the fn's
    // immediate scope (braceDepth <= 1). A nested-block binding such as
    // `if (flag) { const t = "x"; t.length }` will not suppress the module
    // alias for tokens INSIDE that block — `t.length` may fire a false CAP001.
    // True scope-aware shadowing requires range tracking, not a flat set.
    // Filed as a follow-up (issue to track: nested-block alias shadowing).
    const isBlockScoped = tok.text === "const" || tok.text === "let";
    if (isBlockScoped && braceDepth > 1) continue;

    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (!nameTok) continue;

    if (nameTok.kind === "ident") {
      // Simple binding: `const x = ...`
      names.add(nameTok.text);
    } else if (nameTok.kind === "open" && (nameTok.text === "{" || nameTok.text === "[")) {
      // Destructuring pattern: collect bound names from `{ ... }` or `[ ... ]`.
      collectDestructuredNames(tokens, nameIdx, end, names);
    }
  }

  return names;
}

/**
 * Scan a destructuring pattern starting at the opening `{` or `[` token and
 * add all locally-bound identifier names to `out`.
 *
 * For object patterns: `{ a, b: c, d = x }` → `a`, `c`, `d`
 *   (after `:`, the next ident is the local name; otherwise the ident itself is)
 * For array patterns: `[ a, b ]` → `a`, `b`
 *
 * Nested patterns (`{ key: { nested } }`, `{ key: [a, b] }`) are handled
 * recursively so all bound names at every depth are collected.
 */
function collectDestructuredNames(tokens: Token[], openIdx: number, end: number, out: Set<string>): void {
  const openTok = tokens[openIdx];
  if (!openTok) return;
  const isObject = openTok.text === "{";
  let depth = 1;

  let i = openIdx + 1;
  while (i < end && depth > 0) {
    const t = tokens[i];
    if (!t) { i++; continue; }

    if (t.kind === "open" && (t.text === "{" || t.text === "[")) {
      if (depth === 1) {
        // Nested pattern as a direct element: `[{a, b}]`, `[[a, b]]`, or `{ key: {…} }`
        // where the key: branch hasn't already advanced past this token.
        // Recurse so nested bindings are collected at any depth.
        collectDestructuredNames(tokens, i, end, out);
        const matchedClose = (t as { matchedAt?: number }).matchedAt;
        if (matchedClose !== undefined) { i = matchedClose + 1; continue; }
      }
      depth++; i++; continue;
    }
    if (t.kind === "close" && (t.text === "}" || t.text === "]")) {
      depth--;
      i++;
      continue;
    }
    if (depth > 1) { i++; continue; }

    if (t.kind !== "ident") { i++; continue; }

    if (isObject) {
      // In an object pattern, peek at the next significant token.
      // If it's `:`, this ident is a key — the binding name (or nested pattern) follows.
      // If it's `,`/`}`/`=`, this ident is the binding name.
      const peekIdx = nextSignificant(tokens, i + 1);
      const peek = tokens[peekIdx];
      if (peek?.kind === "punct" && peek.text === ":") {
        const localIdx = nextSignificant(tokens, peekIdx + 1);
        const local = tokens[localIdx];
        if (local?.kind === "ident") {
          // `key: localName` — simple rename binding.
          out.add(local.text);
          i = localIdx + 1;
        } else if (local && local.kind === "open" && (local.text === "{" || local.text === "[")) {
          // `key: { nested }` or `key: [nested]` — recurse into the nested pattern.
          collectDestructuredNames(tokens, localIdx, end, out);
          // Advance past the nested pattern in the outer depth tracking.
          let nd = 1;
          let j = localIdx + 1;
          while (j < end && nd > 0) {
            const jt = tokens[j];
            if (!jt) { j++; continue; }
            if (jt.kind === "open" && (jt.text === "{" || jt.text === "[")) nd++;
            if (jt.kind === "close" && (jt.text === "}" || jt.text === "]")) nd--;
            j++;
          }
          i = j;
        } else {
          i = localIdx !== undefined ? localIdx + 1 : peekIdx + 1;
        }
      } else {
        // `shorthand` or `shorthand = default` — the ident is the binding.
        out.add(t.text);
        i++;
      }
    } else {
      // Array pattern: each ident is a binding.
      out.add(t.text);
      i++;
    }
  }
}

/**
 * Build a per-fn alias map that accounts for local shadowing.
 *
 * Filters `moduleAliases` to remove entries whose alias name is shadowed by
 * a parameter, local `const`/`let`/`var` binding, or nested fn declaration
 * in `fn`. Canonical stdlib names (`time`, `random`, etc.) are never in
 * `moduleAliases` — they are tripwires at every call site, even when locally
 * rebound, so no sentinel is needed.
 *
 * Nested fn ranges are computed from `allDecls` to avoid collecting shadows
 * from inner fn bodies that don't affect the outer fn's scope.
 */
export function aliasesForFn(
  tokens: Token[],
  fn: FnDecl,
  allDecls: FnDecl[],
  moduleAliases: Map<string, string>,
): Map<string, string> {
  const nestedFns = allDecls.filter(
    (g) => g !== fn && g.tokenStart >= fn.tokenStart && g.tokenEnd <= fn.tokenEnd,
  );
  // Direct-child nested fn names (not contained within another nested fn)
  // introduce local bindings in `fn`'s scope that shadow module aliases.
  const directNestedFnNames = nestedFns
    .filter((g) => !nestedFns.some(
      (other) => other !== g && other.tokenStart < g.tokenStart && other.tokenEnd > g.tokenEnd,
    ))
    .map((g) => g.name);
  const paramNs = fnParamNames(tokens, fn);
  const localNs = fnBodyLocalNames(tokens, fn, nestedFns);
  const shadows = new Set([...paramNs, ...localNs, ...directNestedFnNames]);
  if (shadows.size === 0) return moduleAliases;

  // Only filter module-level alias entries whose key is locally shadowed.
  // Canonical stdlib names are not in moduleAliases, so they remain tripwires
  // in STDLIB_TO_CAP lookups regardless of local rebinding.
  return new Map([...moduleAliases].filter(([k]) => !shadows.has(k)));
}


/**
 * Return the stdlib name if `openIdx` (`(`) wraps ONLY a bare stdlib ident,
 * possibly through multiple paren levels.  Returns null otherwise.
 *
 *   (time)         → "time"
 *   ((time))       → "time"
 *   (time.now)     → null   (has a continuation after the ident)
 *   ((flag?time:null)) → null   (leading token is not stdlib)
 *
 * `openIdx` must point to an `(` token.
 */
function isParenWrappedStdlib(tokens: Token[], openIdx: number): string | null {
  const innerIdx = nextSignificant(tokens, openIdx + 1);
  const innerTok = tokens[innerIdx];
  if (!innerTok) return null;
  if (innerTok.kind === "open" && innerTok.text === "(") {
    const result = isParenWrappedStdlib(tokens, innerIdx);
    if (result === null) return null;
    // Verify the inner group is the ONLY content of the outer parens:
    // the token after the inner close must be the outer close.
    // Without this, `((time) + 1)` would return "time" even though it's non-trivial.
    const innerCloseIdx = (innerTok as { matchedAt?: number }).matchedAt;
    const outerCloseIdx = (tokens[openIdx] as { matchedAt?: number }).matchedAt;
    if (innerCloseIdx === undefined || outerCloseIdx === undefined) return null;
    if (nextSignificant(tokens, innerCloseIdx + 1) !== outerCloseIdx) return null;
    return result;
  }
  if (innerTok.kind !== "ident" || !STDLIB_NAMES.has(innerTok.text)) return null;
  const closeIdx = nextSignificant(tokens, innerIdx + 1);
  const closeTok = tokens[closeIdx];
  return closeTok?.kind === "close" && closeTok.text === ")" ? innerTok.text : null;
}

/**
 * Recursively unwrap leading parentheses and return the stdlib name if the
 * leading token (after peeling any `(…)` nesting) is a bare stdlib namespace
 * identifier; otherwise return null.
 *
 * `openIdx` must point to an `(` token. Only the LEADING token inside each
 * paren level is inspected — `((flag ? time : null))` returns null because
 * after unwrapping one level the leading token is `flag`, not stdlib.
 */
function leadingStdlibAfterParens(tokens: Token[], openIdx: number): string | null {
  const innerIdx = nextSignificant(tokens, openIdx + 1);
  const innerTok = tokens[innerIdx];
  if (!innerTok) return null;
  if (innerTok.kind === "open" && innerTok.text === "(") {
    return leadingStdlibAfterParens(tokens, innerIdx);
  }
  if (innerTok.kind === "ident" && STDLIB_NAMES.has(innerTok.text)) return innerTok.text;
  return null;
}

