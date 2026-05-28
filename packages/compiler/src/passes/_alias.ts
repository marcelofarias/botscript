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

    // Skip if the alias name itself is a canonical stdlib namespace.
    // Canonical names must remain unconditional tripwires — recording `time → random`
    // would cause later passes to mis-attribute `time.now()` as a `random` call.
    if (STDLIB_NAMES.has(nameTok.text)) continue;

    aliases.set(nameTok.text, stdlibTok.text);
  }

  return aliases;
}

/**
 * Collect module-level const bindings where the RHS starts with a stdlib namespace
 * ident but is in a non-trivial form that the alias collector can't track.
 *
 * These are ALI001 candidates — the author may have intended to alias the namespace
 * but the form is unsound for static tracking.
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
          //   - `((flag ? time : null))` has no stdlib leading → no warning.
          const nestedStdlib =
            trivialStdlib ?? leadingStdlibAfterParens(tokens, innerIdx);
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
        // another `(`. Nothing to do here (e.g. `(flag ? time : null)`).
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

    // `const`/`let` are block-scoped: only shadow at the directly-enclosing
    // scope (braceDepth === 1, or 0 for expression-bodied fns). Bindings inside
    // nested blocks (if/for/while/etc.) are block-scoped there, NOT here.
    // `var` is function-scoped so it shadows regardless of nesting depth.
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
 * Only the outermost pattern is scanned (nested patterns are uncommon for
 * stdlib-alias shadowing and skipped for simplicity).
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

    // Track depth for nested destructuring.
    if (t.kind === "open" && (t.text === "{" || t.text === "[")) { depth++; i++; continue; }
    if (t.kind === "close" && (t.text === "}" || t.text === "]")) {
      depth--;
      i++;
      continue;
    }
    if (depth > 1) { i++; continue; } // inside nested pattern — skip

    if (t.kind !== "ident") { i++; continue; }

    if (isObject) {
      // In an object pattern, peek at the next significant token.
      // If it's `:`, this ident is a key — the binding name follows the colon.
      // If it's `,`/`}`/`=`, this ident is the binding name.
      const peekIdx = nextSignificant(tokens, i + 1);
      const peek = tokens[peekIdx];
      if (peek?.kind === "punct" && peek.text === ":") {
        // `key: localName` — advance past `:` and collect the next ident.
        const localIdx = nextSignificant(tokens, peekIdx + 1);
        const local = tokens[localIdx];
        if (local?.kind === "ident") out.add(local.text);
        i = localIdx + 1;
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
 * a parameter or local `const`/`let`/`var` binding in `fn`. Canonical stdlib
 * names (`time`, `random`, etc.) are never in `moduleAliases` — they are
 * tripwires at every call site, even when locally rebound, so no sentinel is
 * needed.
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
  const paramNs = fnParamNames(tokens, fn);
  const localNs = fnBodyLocalNames(tokens, fn, nestedFns);
  const shadows = new Set([...paramNs, ...localNs]);
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
    return isParenWrappedStdlib(tokens, innerIdx);
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

    if ((tok.kind === "open" && (tok.text === "(" || tok.text === "<" || tok.text === "{")) ||
        (tok.kind === "punct" && tok.text === "<")) {
      depth++;
    } else if (tok.kind === "close" && tok.text === ")") {
      depth--;
      if (depth === 0) break;
    } else if ((tok.kind === "close" && (tok.text === "}" || tok.text === ">")) ||
               (tok.kind === "punct" && tok.text === ">")) {
      if (depth > 0) depth--;
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
 * Return the set of names bound by `const <name> = ...` declarations in
 * `fn`'s immediate body. Tokens inside nested fn bodies are excluded — a
 * `const` binding in an inner fn only shadows at that inner scope, not here.
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
    if (tok.kind !== "ident" || tok.text !== "const") continue;
    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (nameTok && nameTok.kind === "ident") {
      names.add(nameTok.text);
    }
  }

  return names;
}

/**
 * Build a per-fn alias map that accounts for local shadowing.
 *
 * Filters `moduleAliases` to remove entries whose alias name is shadowed by
 * a parameter or local `const` binding in `fn`. Also adds a sentinel entry
 * for any canonical stdlib name that is locally bound (e.g. `const time = …`
 * inside the fn body), so that direct `time.member` references are not
 * mistakenly treated as capability calls.
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
  const paramNs = fnParamNames(tokens, fn);
  const localNs = fnBodyLocalNames(tokens, fn, nestedFns);
  const shadows = new Set([...paramNs, ...localNs]);
  if (shadows.size === 0) return moduleAliases;

  const result = new Map([...moduleAliases].filter(([k]) => !shadows.has(k)));
  // If a canonical stdlib name is shadowed (e.g. `const time = …`), a direct
  // `time.member` reference should not be treated as a capability use.
  // Map it to a sentinel value that STDLIB_TO_CAP will not recognise.
  for (const shadow of shadows) {
    if (STDLIB_NAMES.has(shadow)) {
      result.set(shadow, "__local__");
    }
  }
  return result;
}
