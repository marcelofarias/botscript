/**
 * Shared call-graph utilities for same-file call resolution.
 *
 * Used by dep-check and thr-check (and any future pass that needs to walk
 * the same-file call graph). Centralised here so fixes to call resolution
 * (new call syntaxes, property access exclusions, etc.) apply to all passes.
 */

import type { Token } from "../parser/lex.js";
import type { FnDecl } from "../parser/parse-fn.js";

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

/**
 * Returns true if `fn`'s body contains at least one function call whose callee
 * name is NOT in `knownCalleeNames` (i.e. an opaque/external call whose effects
 * are unknown to the compiler).
 *
 * A call is detected as `ident(` where the ident is not a property access and
 * is not in `knownCalleeNames`. Inner fn declarations are excluded.
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

    // Skip `err` (botscript error-throw builtin) and CapCase identifiers
    // (error-type constructors like `NetworkError(...)`). These are language
    // builtins/type constructs, not opaque external calls.
    if (tok.text === "err" || /^[A-Z]/.test(tok.text)) continue;

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
