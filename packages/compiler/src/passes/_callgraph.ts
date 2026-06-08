/**
 * Shared call-graph utilities for same-file call resolution.
 *
 * Used by dep-check and thr-check (and any future pass that needs to walk
 * the same-file call graph). Centralised here so fixes to call resolution
 * (new call syntaxes, property access exclusions, etc.) apply to all passes.
 */

import type { Token } from "../parser/lex.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { STDLIB_VALUE_CALL_NAMES } from "./imports.js";
import { STDLIB_TO_CAP } from "./_stdlib.js";

/**
 * Build a map from each FnDecl to all nested (direct and indirect) FnDecls
 * within its token range.
 *
 * A single sweep over `decls` sorted by `tokenStart` replaces a per-fn
 * `decls.filter` (which is O(n²) overall). Fn ranges are properly nested —
 * never partially overlapping — so a stack of "currently open" ancestors is
 * sufficient: every decl is appended to each ancestor still on the stack.
 * Each returned list therefore includes all descendants, not just immediate
 * children. Each list is in ascending `tokenStart` order.
 */
export function computeNesting(decls: FnDecl[]): Map<FnDecl, FnDecl[]> {
  const inner = new Map<FnDecl, FnDecl[]>();
  for (const d of decls) inner.set(d, []);

  const sorted = [...decls].sort((a, b) => a.tokenStart - b.tokenStart);
  const stack: FnDecl[] = [];

  for (const d of sorted) {
    while (stack.length > 0 && stack[stack.length - 1]!.tokenEnd <= d.tokenStart) {
      stack.pop();
    }
    for (const ancestor of stack) inner.get(ancestor)!.push(d);
    stack.push(d);
  }

  return inner;
}

/**
 * Collect the names of same-file fns called inside `fn`'s body, excluding
 * any tokens inside inner (nested) fn declarations.
 *
 * `inner` must be sorted by `tokenStart` (as produced by `computeNesting`).
 * Containment is tracked with a stack advanced in lockstep with the token
 * cursor, so the scan is O(tokens + innerFns) rather than O(tokens·innerFns).
 */
export function collectCallees(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
  fnNames: Set<string>,
): Set<string> {
  const callees = new Set<string>();
  const open: FnDecl[] = [];
  let nextInner = 0;

  for (let i = fn.bodyTokenStart ?? fn.tokenStart; i < fn.tokenEnd; i++) {
    while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
    while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
      open.push(inner[nextInner]!);
      nextInner++;
    }
    if (open.length > 0) continue;

    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    if (!fnNames.has(tok.text)) continue;
    if (tok.text === fn.name) continue;

    // Skip property accesses: `obj.helper(...)` or `obj?.helper(...)`.
    const prevIdx = prevSignificant(tokens, i - 1);
    const prev = tokens[prevIdx];
    if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
      continue;

    // Must be followed by `(` or `?.(` to be a call.
    // `fn?.()` is an optional direct call — it still carries the callee's
    // declared effects, so it must be included in the callee set.
    if (!isDirectOrOptionalCall(tokens, i)) continue;

    callees.add(tok.text);
  }

  return callees;
}

/**
 * Returns true if the token at `identIdx` is directly followed by `(` or `?.(`,
 * indicating a direct or optional-direct call rather than a bare reference.
 */
function isDirectOrOptionalCall(tokens: Token[], identIdx: number): boolean {
  const nextIdx = nextSignificant(tokens, identIdx + 1);
  const next = tokens[nextIdx];
  if (next && next.kind === "open" && next.text === "(") return true;
  if (next && next.kind === "questionDot") {
    const afterQD = nextSignificant(tokens, nextIdx + 1);
    const afterTok = tokens[afterQD];
    if (afterTok && afterTok.kind === "open" && afterTok.text === "(") return true;
  }
  return false;
}

/**
 * Botscript stdlib namespace names. Member calls on these (e.g. `time.now()`,
 * `http.get()`) are handled by cap-check/uns-check, not by `hasOpaqueCall`.
 *
 * Derived from `STDLIB_TO_CAP` in `_stdlib.ts` — the single source of truth.
 */
export const STDLIB_NAMESPACES: ReadonlySet<string> = new Set(Object.keys(STDLIB_TO_CAP));

/**
 * Botscript's lexer only promotes a small set of names to `keyword` tokens
 * (see `KEYWORDS` in lex.ts). Most control-flow constructs (`if`, `while`,
 * `for`, etc.) are tokenised as plain `ident` and would otherwise be treated
 * as opaque function calls by `hasOpaqueCall`. Skip them explicitly.
 */
const CONTROL_FLOW_IDENTS = new Set([
  "if", "else", "while", "for", "do", "switch", "case", "default",
  "return", "break", "continue", "throw", "try", "catch", "finally",
  "typeof", "void", "delete", "new", "in", "of", "instanceof",
]);


/**
 * Parse the top-level parameter names from a fn's `args` string (verbatim,
 * including outer parens). Depth-tracks parentheses so names inside nested
 * callback type annotations (e.g. `cb: (item: string) -> void`) are excluded.
 *
 * Used by `hasOpaqueCall` (and exported for callers that also need param names)
 * to avoid treating method calls on fn parameters as opaque namespace calls.
 */
export function collectTopLevelParamNames(args: string): Set<string> {
  const names = new Set<string>();
  let parenDepth = 0;
  let braceDepth = 0;
  let i = 0;
  while (i < args.length) {
    const c = args[i]!;
    if (c === "(") { parenDepth++; i++; continue; }
    if (c === ")") { parenDepth--; i++; continue; }
    if (c === "{") { braceDepth++; i++; continue; }
    if (c === "}") { braceDepth--; i++; continue; }
    if (parenDepth !== 1 || braceDepth > 0) { i++; continue; }
    const m = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.exec(args.slice(i));
    if (m) {
      names.add(m[1]!);
      i += m[0].length;
    } else {
      i++;
    }
  }
  return names;
}

/**
 * Collect names of `const`/`let` simple-binding variables declared in `fn`'s
 * body (excluding tokens inside nested fn declarations).
 *
 * Only plain `const name = ...` and `let name = ...` forms are collected —
 * destructuring patterns are intentionally skipped. The result is used as
 * the `localNames` set for `hasOpaqueCall` so that method calls on local
 * variables (e.g. `name.trim()`) are not mistaken for opaque import calls.
 */
export function collectFnBodyLocalNames(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
): Set<string> {
  const names = new Set<string>();
  const open: FnDecl[] = [];
  let nextInner = 0;
  const start = fn.bodyTokenStart ?? fn.tokenStart;

  for (let i = start; i < fn.tokenEnd; i++) {
    while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
    while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
      open.push(inner[nextInner]!);
      nextInner++;
    }
    if (open.length > 0) continue;

    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    if (tok.text !== "const" && tok.text !== "let") continue;

    const nameIdx = nextSignificant(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    // Only simple `const name` bindings — skip destructuring (`{`, `[`)
    if (nameTok && nameTok.kind === "ident") names.add(nameTok.text);
  }

  return names;
}

/**
 * Returns true if fn's body contains any opaque external call — either a bare
 * function call (`ident(`) or a member/namespace call (`obj.method()`) — where
 * the callee/receiver is NOT in `knownNames` and is not a compiler-known stdlib
 * builtin, control-flow keyword, or CapCase error constructor.
 *
 * Both patterns can reach external resources: a bare `fetchData()` or a member
 * call `db.read()` on an imported object. Suppresses over-declaration warnings
 * (DEP003/DEP004, THR004) when the fn has at least one such call whose effects
 * are unknown to the compiler.
 *
 * `localNames` (optional) is a set of parameter or local-variable names that
 * should not be treated as opaque namespace/object receivers. For example,
 * `name.trim()` where `name` is a string parameter is not an opaque import
 * method call and must not trigger suppression.
 */
export function hasOpaqueCall(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
  knownNames: Set<string>,
  localNames?: ReadonlySet<string>,
): boolean {
  // When localNames is not provided, lazily compute it so that method calls on
  // fn parameters and local variables (e.g. `name.trim()`) are not mistaken for
  // opaque namespace/object calls.
  const effectiveLocalNames: ReadonlySet<string> =
    localNames ??
    (() => {
      const names = collectTopLevelParamNames(fn.args);
      for (const n of collectFnBodyLocalNames(tokens, fn, inner)) names.add(n);
      return names;
    })();

  const open: FnDecl[] = [];
  let nextInner = 0;

  for (let i = fn.bodyTokenStart ?? fn.tokenStart; i < fn.tokenEnd; i++) {
    while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
    while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
      open.push(inner[nextInner]!);
      nextInner++;
    }
    if (open.length > 0) continue;

    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    if (tok.text === fn.name) continue;
    if (knownNames.has(tok.text)) continue;

    // Skip control-flow identifiers that look like calls but aren't.
    if (CONTROL_FLOW_IDENTS.has(tok.text)) continue;

    // Skip compiler-known stdlib builtins (ok, err, some, none, etc.).
    if (STDLIB_VALUE_CALL_NAMES.has(tok.text)) continue;

    // Skip method identifiers that are part of a property/member access.
    const prevIdx = prevSignificant(tokens, i - 1);
    const prev = tokens[prevIdx];
    if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
      continue;

    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];

    // Detect member calls on unknown namespace objects: `db.read()` or `api.helper()`.
    // If this ident is followed by `.`, it is used as a namespace/object receiver.
    // Stdlib namespaces (time, http, etc.) are handled by cap-check — skip those.
    // Local names (fn parameters, local variables) are also excluded: `name.trim()`
    // is a method on a known local, not a call to an unknown namespace import.
    if (next && ((next.kind === "punct" && next.text === ".") || next.kind === "questionDot")) {
      const afterDotIdx = nextSignificant(tokens, nextIdx + 1);
      const afterDot = tokens[afterDotIdx];

      if (afterDot && afterDot.kind === "ident") {
        // Member-access call: `db.read(...)` or chained: `obj.a.b()`
        if (STDLIB_NAMESPACES.has(tok.text)) continue;
        if (effectiveLocalNames.has(tok.text)) continue;
        // Walk the full member chain (handles single and multi-segment: obj.m() / obj.a.b())
        let segIdx = afterDotIdx;
        let chainEndsInCall = false;
        chainWalk: while (true) {
          const afterSegIdx = nextSignificant(tokens, segIdx + 1);
          const afterSeg = tokens[afterSegIdx];
          if (!afterSeg) break;
          // seg(...) — direct call
          if (afterSeg.kind === "open" && afterSeg.text === "(") {
            chainEndsInCall = true; break;
          }
          // seg. or seg?. — either optional call seg?.() or chain continuation seg.next / seg?.next
          if ((afterSeg.kind === "punct" && afterSeg.text === ".") || afterSeg.kind === "questionDot") {
            const nextSegIdx = nextSignificant(tokens, afterSegIdx + 1);
            const nextSeg = tokens[nextSegIdx];
            if (nextSeg?.kind === "open" && nextSeg.text === "(") {
              chainEndsInCall = true; break; // seg?.()
            }
            if (nextSeg && nextSeg.kind === "ident") {
              segIdx = nextSegIdx; continue; // seg.next or seg?.next — keep walking
            }
            break;
          }
          break; // property access without a following call
        }
        if (chainEndsInCall) return true;
        continue;
      }

      if (afterDot && afterDot.kind === "open" && afterDot.text === "(") {
        // Optional bare call: `fn?.()` — `?.` is immediately followed by `(`.
        // Local variables and callback parameters are not opaque external callers.
        if (effectiveLocalNames.has(tok.text)) continue;
        return true;
      }

      continue; // `?.` followed by something other than ident or `(` — not a call
    }

    // Must be followed by `(` to be a bare function call.
    if (!next || next.kind !== "open" || next.text !== "(") continue;

    // CapCase idents followed by `(` are opaque external calls UNLESS they appear
    // inside `err(TypeName...)` or `err(new TypeName...)` — those are error-type
    // constructors, not user-defined functions.
    if (/^[A-Z]/.test(tok.text)) {
      // err(TypeName(...)) — prev is `(`, prevprev is `err`
      if (prev && prev.kind === "open" && prev.text === "(") {
        const prevPrevIdx = prevSignificant(tokens, prevIdx - 1);
        const prevPrev = tokens[prevPrevIdx];
        if (prevPrev && prevPrev.kind === "ident" && prevPrev.text === "err") continue;
      }
      // err(new TypeName(...)) — prev is `new`, prev-of-prev is `(`, prev3 is `err`
      if (prev && prev.kind === "ident" && prev.text === "new") {
        const prevNewIdx = prevIdx;
        const prevParenIdx = prevSignificant(tokens, prevNewIdx - 1);
        const prevParen = tokens[prevParenIdx];
        if (prevParen && prevParen.kind === "open" && prevParen.text === "(") {
          const prevErrIdx = prevSignificant(tokens, prevParenIdx - 1);
          const prevErr = tokens[prevErrIdx];
          if (prevErr && prevErr.kind === "ident" && prevErr.text === "err") continue;
        }
      }
    }

    return true;
  }

  return false;
}

export function nextSignificant(tokens: Token[], start: number): number {
  let i = start;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t) return i;
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

export function prevSignificant(tokens: Token[], start: number): number {
  let i = start;
  while (i >= 0) {
    const t = tokens[i];
    if (!t) return i;
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      i--;
      continue;
    }
    return i;
  }
  return i;
}

