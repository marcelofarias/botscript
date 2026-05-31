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

    // Must be followed by `(` to be a call.
    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];
    if (!next || next.kind !== "open" || next.text !== "(") continue;

    callees.add(tok.text);
  }

  return callees;
}

/**
 * Botscript stdlib namespace names. Member calls on these (e.g. `time.now()`,
 * `http.get()`) are handled by cap-check/uns-check, not by `hasOpaqueCall`.
 *
 * `cap-check.ts` exports `STDLIB_TO_CAP` whose keys must exactly match this set.
 * Import from here rather than duplicating the list.
 */
export const STDLIB_NAMESPACES = new Set(["http", "time", "random", "fs", "stdout", "stderr"]);

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
 * Botscript stdlib value helpers that appear as bare `ident(` in function
 * bodies but are compiler-known builtins — not opaque external calls.
 * Includes all lowercase Result and Option helpers plus the error builtin.
 */
const BOTSCRIPT_BUILTIN_CALLS = new Set([
  "err",
  "isErr", "isOk", "mapErr", "mapResult", "ok", "unwrap",
  "isNone", "isSome", "mapOption", "none", "optionFromNullable", "some", "unwrapOption", "unwrapOr",
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
  let depth = 0;
  let i = 0;
  while (i < args.length) {
    const c = args[i]!;
    if (c === "(") { depth++; i++; continue; }
    if (c === ")") { depth--; i++; continue; }
    if (depth !== 1) { i++; continue; }
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
 * Returns true if fn's body contains any direct function call (`ident(`) to a
 * name that is NOT in `knownNames` and is not the fn itself.
 *
 * Used by DEP003/DEP004 to suppress over-declaration warnings when the fn
 * calls an opaque external (e.g. an import not listed in moduleEffects) that
 * could be the actual resource access point.
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

    // Skip compiler-known stdlib builtins (ok, err, some, none, etc.) and
    // CapCase identifiers (error-type constructors like `NetworkError(...)`).
    if (BOTSCRIPT_BUILTIN_CALLS.has(tok.text) || /^[A-Z]/.test(tok.text)) continue;

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
      if (STDLIB_NAMESPACES.has(tok.text)) continue;
      if (localNames?.has(tok.text)) continue;
      const methodIdx = nextSignificant(tokens, nextIdx + 1);
      const methodTok = tokens[methodIdx];
      if (methodTok && methodTok.kind === "ident") {
        const afterMethodIdx = nextSignificant(tokens, methodIdx + 1);
        const afterMethod = tokens[afterMethodIdx];
        if (afterMethod && afterMethod.kind === "open" && afterMethod.text === "(") {
          return true; // Opaque namespace/object method call
        }
      }
      continue; // Property access without a following call — not opaque
    }

    // Must be followed by `(` to be a bare function call.
    if (!next || next.kind !== "open" || next.text !== "(") continue;

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

// Alias imported for opaque-call detection; derived from imports.ts to avoid drift.
const BOTSCRIPT_BUILTIN_CALLS = STDLIB_VALUE_CALL_NAMES;

/**
 * Returns true if `fn`'s body contains at least one function call whose callee
 * name is NOT in `knownCalleeNames` (i.e. an opaque/external call whose effects
 * are unknown to the compiler).
 *
 * A call is detected as `ident(` where the ident is not a property access and
 * is not in `knownCalleeNames`. Inner fn declarations are excluded.
 *
 * Botscript stdlib value helpers (ok, isOk, some, none, etc.) and CapCase type
 * constructors are never treated as opaque — they are compiler-known builtins.
 */
export function hasOpaqueCall(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
  knownCalleeNames: Set<string>,
): boolean {
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

    // Skip known callee names (same-file fns and listed external fns).
    if (knownCalleeNames.has(tok.text)) continue;

    // Skip compiler-known builtins (err, ok, some, none, etc.) and CapCase
    // identifiers (error-type constructors like `NetworkError(...)`).
    if (BOTSCRIPT_BUILTIN_CALLS.has(tok.text) || /^[A-Z]/.test(tok.text)) continue;

    // Skip property accesses: `obj.helper(...)` or `obj?.helper(...)`.
    const prevIdx = prevSignificant(tokens, i - 1);
    const prev = tokens[prevIdx];
    if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
      continue;

    // Must be followed by `(` to be a call.
    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];
    if (!next || next.kind !== "open" || next.text !== "(") continue;

    return true;
  }

  return false;
}
