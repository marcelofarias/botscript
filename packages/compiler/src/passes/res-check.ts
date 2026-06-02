/**
 * Result/Option discard check (?bs 0.9+).
 *
 * Fires a warning when a same-file function whose declared return type
 * contains `Result<` or `Option<` is called as a statement — the return
 * value is discarded without propagation (`?`), matching, or assignment.
 *
 *   RES002  result/option-returning fn called but return value discarded;
 *           the error or absence path is permanently sealed from callers.
 *
 * Warning-level (non-blocking) to allow intentional fire-and-forget patterns
 * (best-effort logging, optional cache writes). Authors who consciously
 * discard can suppress with `unsafe "intentional discard" { f() }`.
 *
 * Calls inside `test "..." { ... }` and `unsafe "..." { ... }` blocks are
 * excluded — intentional discard in test setup and explicit unsafe blocks is
 * already documented by the author.
 */

import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { locationOf } from "./_location.js";
import { nextSignificant } from "./_callgraph.js";
import { atLeast, type VersionInfo } from "./version.js";
import type { Diagnostic } from "../diagnostics.js";
import type { Token } from "../parser/lex.js";

export interface ResCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

export function passResCheck(src: string, version: VersionInfo): string | ResCheckResult {
  if (!atLeast(version.resolved, "0.9")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: false });
  const tokens = program.tokens;
  const decls = program.fns.map((s) => s.decl);

  if (decls.length === 0) return src;

  // 1. Collect result-bearing fn names.
  const resultBearing = new Set<string>();
  for (const decl of decls) {
    if (decl.returnType.includes("Result<") || decl.returnType.includes("Option<")) {
      resultBearing.add(decl.name);
    }
  }
  if (resultBearing.size === 0) return src;

  // 2. Collect char ranges to skip: test blocks and unsafe expression blocks.
  //    Calls inside these ranges are excluded from the check.
  const skipRanges: Array<{ start: number; end: number }> = [];
  collectSkipRanges(tokens, skipRanges);

  const entry = getErrorCode("RES002")!;
  const warnings: Diagnostic[] = [];

  // 3. Scan tokens for discarded calls.
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;

    if (tok.kind !== "ident") continue;
    if (!resultBearing.has(tok.text)) continue;

    // Skip if inside a test/unsafe block.
    if (isInsideSkipRange(tok.start, skipRanges)) continue;

    // Must be followed by `(` to be a call.
    const openIdx = nextSignificant(tokens, i + 1);
    const openTok = tokens[openIdx];
    if (!openTok || openTok.kind !== "open" || openTok.text !== "(") continue;

    // Must be in statement position: prev token (not skipping newlines) is
    // a newline, `{`, `;`, or start-of-tokens — walking through any leading
    // grouping parens, e.g. `(saveUser(user))` is at statement position.
    let checkPrevIdx = prevNotSkippingNewlines(tokens, i - 1);
    let checkPrev = tokens[checkPrevIdx];
    while (checkPrev && checkPrev.kind === "open" && checkPrev.text === "(") {
      checkPrevIdx = prevNotSkippingNewlines(tokens, checkPrevIdx - 1);
      checkPrev = tokens[checkPrevIdx];
    }
    const inStatementPos =
      checkPrev === undefined ||
      checkPrev.kind === "newline" ||
      (checkPrev.kind === "open" && checkPrev.text === "{") ||
      (checkPrev.kind === "punct" && checkPrev.text === ";");

    if (!inStatementPos) continue;

    // Find the matching close paren.
    const closeIdx = openTok.matchedAt;
    if (closeIdx === undefined) continue;

    // Skip any trailing grouping parens after the call's close paren.
    // e.g. `(saveUser(user))` — the outer `)` is a grouping paren, not an arg.
    // A `)` is a grouping paren when its matching `(` is NOT preceded by an ident.
    let effectiveCloseIdx = closeIdx;
    while (true) {
      const nextIdx = nextNotSkippingNewlines(tokens, effectiveCloseIdx + 1);
      const nextTok = tokens[nextIdx];
      if (!nextTok || nextTok.kind !== "close" || nextTok.text !== ")") break;
      if (nextTok.matchedAt === undefined) break;
      const prevOfOpenIdx = prevNotSkippingNewlines(tokens, nextTok.matchedAt - 1);
      const prevOfOpen = tokens[prevOfOpenIdx];
      // If the matching `(` is preceded by an ident, this `)` closes a fn call
      if (prevOfOpen && prevOfOpen.kind === "ident") break;
      // Otherwise it's a grouping paren — skip past it
      effectiveCloseIdx = nextIdx;
    }

    // Check the token after the (possibly adjusted) close paren to determine
    // if the result is used in a larger expression.
    const afterCloseIdx = nextNotSkippingNewlines(tokens, effectiveCloseIdx + 1);
    const afterClose = tokens[afterCloseIdx];

    if (resultIsConsumed(afterClose)) continue;

    const { line, column } = locationOf(src, tok.start);
    warnings.push({
      code: "RES002",
      severity: "warning" as const,
      file: null,
      line,
      column,
      start: tok.start,
      end: tok.end,
      message:
        `'${tok.text}' returns ${getReturnTypeLabel(decls, tok.text)} — ` +
        `discard hides the error/absence path; use '?', match on the result, or assign it`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: `let result = ${tok.text}(...)  // or use '?' to propagate`,
    });
  }

  if (warnings.length === 0) return src;
  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Walk backward from `start`, skipping only horizontal whitespace and block
 * comments — NOT newlines, since newlines are statement terminators in botscript.
 */
function prevNotSkippingNewlines(tokens: Token[], start: number): number {
  let i = start;
  while (i >= 0) {
    const t = tokens[i];
    if (!t) return i;
    if (t.kind === "whitespace" || t.kind === "blockComment") {
      i--;
      continue;
    }
    return i;
  }
  return i;
}

/**
 * Walk forward from `start`, skipping only horizontal whitespace and block
 * comments — NOT newlines.
 */
function nextNotSkippingNewlines(tokens: Token[], start: number): number {
  let i = start;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t) return i;
    if (t.kind === "whitespace" || t.kind === "blockComment") {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

/**
 * Returns true when `tok` (the token immediately after a call's `)`) shows
 * the result is used in a larger expression rather than discarded.
 */
function resultIsConsumed(tok: Token | undefined): boolean {
  if (!tok) return false;
  // Propagation: saveUser(u)?
  if (tok.kind === "question") return true;
  // Method/property chaining: f().then(...) or f()?.catch(...)
  if (tok.kind === "punct" && tok.text === ".") return true;
  if (tok.kind === "questionDot") return true;
  // Argument to outer call or inside a list: fn(f(), g())
  if (tok.kind === "close" && tok.text === ")") return true;
  if (tok.kind === "punct" && tok.text === ",") return true;
  // Match scrutinee: match f() { ... }
  if (tok.kind === "open" && tok.text === "{") return true;
  // Array element: [f()]
  if (tok.kind === "close" && tok.text === "]") return true;
  // Null-coalescing: result ?? ...
  if (tok.kind === "questionQuestion") return true;
  // Binary operators: result && ..., result || ..., etc.
  if (tok.kind === "operator") {
    const ops = new Set(["&&", "||", "+", "-", "*", "/", "%", "==", "!=", "<", ">", "<=", ">=", "|", "&", "^", "<<", ">>"]);
    if (ops.has(tok.text)) return true;
  }
  return false;
}

/**
 * Collect char ranges for test and unsafe expression blocks that should be
 * excluded from the RES002 scan. Calls inside these ranges are intentional.
 */
function collectSkipRanges(
  tokens: Token[],
  out: Array<{ start: number; end: number }>,
): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;

    // `test "name" { ... }` blocks
    if (t.kind === "keyword" && t.keyword === "test") {
      const j = skipTrivia(tokens, i + 1);
      const nameOrBrace = tokens[j];
      if (!nameOrBrace) continue;
      let braceIdx = -1;
      if (nameOrBrace.kind === "string") {
        const k = skipTrivia(tokens, j + 1);
        const open = tokens[k];
        if (open && open.kind === "open" && open.text === "{") braceIdx = k;
      } else if (nameOrBrace.kind === "open" && nameOrBrace.text === "{") {
        braceIdx = j;
      }
      if (braceIdx === -1) continue;
      const open = tokens[braceIdx]!;
      const close = open.matchedAt !== undefined ? tokens[open.matchedAt] : undefined;
      if (close) out.push({ start: open.start, end: close.end });
      if (open.matchedAt !== undefined) i = open.matchedAt;
      continue;
    }

    // `unsafe "reason" { ... }` expression blocks (not `unsafe fn`)
    if (t.kind === "keyword" && t.keyword === "unsafe") {
      const j = skipTrivia(tokens, i + 1);
      const head = tokens[j];
      if (!head) continue;
      let braceIdx = -1;
      if (head.kind === "string") {
        const k = skipTrivia(tokens, j + 1);
        const open = tokens[k];
        // Only expression blocks — skip `unsafe "reason" fn ...`
        if (open && open.kind === "open" && open.text === "{") braceIdx = k;
      } else if (head.kind === "open" && head.text === "{") {
        braceIdx = j;
      }
      if (braceIdx === -1) continue;
      const open = tokens[braceIdx]!;
      const close = open.matchedAt !== undefined ? tokens[open.matchedAt] : undefined;
      if (close) out.push({ start: open.start, end: close.end });
      if (open.matchedAt !== undefined) i = open.matchedAt;
    }
  }
}

function isInsideSkipRange(
  charOffset: number,
  ranges: Array<{ start: number; end: number }>,
): boolean {
  for (const r of ranges) {
    if (charOffset >= r.start && charOffset < r.end) return true;
  }
  return false;
}

function skipTrivia(tokens: Token[], start: number): number {
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

/** Return the return type label (Result<...> or Option<...>) for a fn name. */
function getReturnTypeLabel(
  decls: Array<{ name: string; returnType: string }>,
  name: string,
): string {
  const decl = decls.find((d) => d.name === name);
  if (!decl) return "Result/Option";
  const rt = decl.returnType;
  const m = /(?:Result|Option)</.exec(rt);
  if (!m) return rt;
  // Count angle-bracket depth to handle nested generics like Result<Option<string>, E>
  let depth = 0;
  for (let i = m.index + m[0].length - 1; i < rt.length; i++) {
    if (rt[i] === "<") depth++;
    else if (rt[i] === ">") {
      depth--;
      if (depth === 0) return rt.slice(m.index, i + 1);
    }
  }
  return rt.slice(m.index);
}
