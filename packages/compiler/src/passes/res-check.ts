/**
 * Result/Option discard check (?bs 0.9+).
 *
 * Fires a warning when a function whose declared return type contains
 * `Result<` or `Option<` is called as a statement — the return value is
 * discarded without propagation (`?`), matching, or assignment.
 *
 *   RES002  same-file result/option-returning fn called but return value
 *           discarded; the error or absence path is permanently sealed from
 *           callers.
 *
 *   RES003  imported result/option-returning fn called but return value
 *           discarded; fires when moduleEffects carries returnsResult/
 *           returnsOption for the callee.
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
import { buildImportAliasMap } from "../module-effects.js";
import { atLeast, type VersionInfo } from "./version.js";
import type { Diagnostic } from "../diagnostics.js";
import type { Token } from "../parser/lex.js";
import type { ModuleEffects } from "../module-effects.js";

const BINARY_OPS = new Set(["&&", "||", "+", "-", "*", "/", "%", "==", "!=", "===", "!==", "<", ">", "<=", ">=", "|", "&", "^", "<<", ">>", ">>>", "**"]);

export interface ResCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

export function passResCheck(
  src: string,
  version: VersionInfo,
  moduleEffects?: ModuleEffects,
): string | ResCheckResult {
  if (!atLeast(version.resolved, "0.9")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const decls = program.fns.map((s) => s.decl);

  // 1. Collect result-bearing fn names from same-file declarations.
  // If the same name appears with mixed return types (e.g. a nested fn shadows a
  // top-level fn with a different type), treat it as ambiguous and exclude it —
  // scope resolution would be needed to classify calls correctly.
  // Two categories of ambiguity:
  //   a. Same name has both Result/Option and non-Result/Option variants.
  //   b. Same name appears multiple times with different Result/Option return types
  //      (e.g. overloads with different error arms) — exclude these too, since scope
  //      resolution would be needed to pick the right overload at the call site.
  const resultBearing = new Set<string>();
  const optionBearing = new Set<string>();
  const nonResultBearing = new Set<string>();
  // Track all Result/Option return types seen per name to detect same-category ambiguity.
  const resultReturnTypes = new Map<string, Set<string>>();
  for (const decl of decls) {
    if (decl.returnType.includes("Result<") || decl.returnType.includes("Option<")) {
      resultBearing.add(decl.name);
      if (decl.returnType.includes("Option<")) optionBearing.add(decl.name);
      const seen = resultReturnTypes.get(decl.name) ?? new Set<string>();
      seen.add(decl.returnType.trim());
      resultReturnTypes.set(decl.name, seen);
    } else {
      nonResultBearing.add(decl.name);
    }
  }
  // Remove names that are ambiguous across Result/non-Result categories.
  for (const name of nonResultBearing) resultBearing.delete(name);
  // Also remove names that appear multiple times with different Result/Option return types:
  // same-category overloads have no safe scope resolution either.
  for (const [name, types] of resultReturnTypes) {
    if (types.size > 1) resultBearing.delete(name);
  }

  // 1b. Extend with imported fns from moduleEffects (RES003).
  // Build a set of imported names that resolve to result-bearing callees.
  // Same-file declarations shadow imported names — if a same-file fn has the
  // same name, the same-file check (RES002) already covers it; don't add it
  // to the imported set to avoid double-firing with the wrong code.
  const importedResultBearing = new Set<string>(); // fires RES003
  const importedOptionBearing = new Set<string>(); // for label in message
  if (moduleEffects) {
    // Resolve import aliases: `import { saveRow as saveUser }` maps local
    // name "saveUser" → declared name "saveRow" in the effect surface.
    const aliasMap = buildImportAliasMap(tokens);

    // Collect all local names that are imported (appear in an import statement).
    // We can't cheaply enumerate all imported names from tokens alone, so instead
    // we check every ident token that appears in moduleEffects (after alias resolution)
    // and is NOT defined locally.
    const allKnownLocals = new Set([...resultBearing, ...nonResultBearing]);
    for (const [declaredName, surface] of Object.entries(moduleEffects)) {
      if (!surface.returnsResult && !surface.returnsOption) continue;
      // Find all local names that resolve to this declared name.
      // Case 1: direct import (local name === declared name), not shadowed locally.
      if (!allKnownLocals.has(declaredName)) {
        // Both Result and Option names go into the scanning set.
        importedResultBearing.add(declaredName);
        if (surface.returnsOption && !surface.returnsResult) importedOptionBearing.add(declaredName);
      }
      // Case 2: aliased import — find local names that alias to declaredName.
      for (const [localAlias, target] of aliasMap) {
        if (target === declaredName && !allKnownLocals.has(localAlias)) {
          importedResultBearing.add(localAlias);
          if (surface.returnsOption && !surface.returnsResult) importedOptionBearing.add(localAlias);
        }
      }
    }
  }

  if (resultBearing.size === 0 && importedResultBearing.size === 0) return src;

  // 2. Collect char ranges to skip: test blocks and unsafe expression blocks.
  //    Calls inside these ranges are excluded from the check.
  const skipRanges: Array<{ start: number; end: number }> = [];
  collectSkipRanges(tokens, skipRanges);

  const entryRES002 = getErrorCode("RES002")!;
  const entryRES003 = getErrorCode("RES003")!;
  const warnings: Diagnostic[] = [];

  // 3. Scan tokens for discarded calls.
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]!;

    if (tok.kind !== "ident") continue;
    const isSameFile = resultBearing.has(tok.text);
    const isImported = !isSameFile && importedResultBearing.has(tok.text);
    if (!isSameFile && !isImported) continue;

    // Skip if inside a test/unsafe block.
    if (isInsideSkipRange(tok.start, skipRanges)) continue;

    // Must be followed by `(` to be a call — also covers optional calls `f?.(args)`,
    // where the token sequence is `questionDot` then `(`.
    let openIdx = nextSignificant(tokens, i + 1);
    let openTok = tokens[openIdx];
    if (openTok?.kind === "questionDot") {
      // Optional call: skip past `?.` to find the `(`
      openIdx = nextSignificant(tokens, openIdx + 1);
      openTok = tokens[openIdx];
    }
    if (!openTok || openTok.kind !== "open" || openTok.text !== "(") continue;

    // Must be in statement position: prev token (not skipping newlines) is
    // a newline, `{`, `;`, or start-of-tokens — walking through any leading
    // grouping parens, e.g. `(saveUser(user))` is at statement position.
    //
    // If the prev token is a newline, also check the token on the line above:
    // if it's a continuation token (=, &&, ||, ,, :, binary ops, etc.) then
    // this call is part of a multi-line expression, not a statement.
    let checkPrevIdx = prevNotSkippingNewlines(tokens, i - 1);
    let checkPrev = tokens[checkPrevIdx];
    while (
      checkPrev &&
      ((checkPrev.kind === "open" && checkPrev.text === "(") ||
        (checkPrev.kind === "ident" && checkPrev.text === "await"))
    ) {
      checkPrevIdx = prevNotSkippingNewlines(tokens, checkPrevIdx - 1);
      checkPrev = tokens[checkPrevIdx];
    }
    const inStatementPos =
      checkPrev === undefined ||
      ((checkPrev.kind === "newline") && !precededByContinuation(tokens, checkPrevIdx)) ||
      (checkPrev.kind === "open" && checkPrev.text === "{") ||
      (checkPrev.kind === "close" && checkPrev.text === "}") ||
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
    // if the result is used in a larger expression.  Use skipTrivia (which
    // also skips newlines) so continuation tokens on the next line — `?`,
    // `.`, `?.` — are still recognized as consumption.
    // Exception: `{` is only treated as consumption on the same line (match
    // scrutinee). A `{` on the next line starts a block statement and does
    // not consume the result.
    const afterCloseIdx = skipTrivia(tokens, effectiveCloseIdx + 1);
    const afterClose = tokens[afterCloseIdx];
    const afterCloseSameLineIdx = nextNotSkippingNewlines(tokens, effectiveCloseIdx + 1);
    const afterCloseSameLine = tokens[afterCloseSameLineIdx];

    if (resultIsConsumed(afterClose, afterCloseSameLine)) continue;

    const { line, column } = locationOf(src, tok.start);
    if (isSameFile) {
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
        rule: entryRES002.rule,
        idiom: entryRES002.idiom,
        rewrite: entryRES002.rewrite,
      });
    } else {
      const typeLabel = importedOptionBearing.has(tok.text) ? "Option<…>" : "Result<…>";
      warnings.push({
        code: "RES003",
        severity: "warning" as const,
        file: null,
        line,
        column,
        start: tok.start,
        end: tok.end,
        message:
          `'${tok.text}' is an imported fn that returns ${typeLabel} — ` +
          `discard hides the error/absence path; use '?', match on the result, or assign it`,
        rule: entryRES003.rule,
        idiom: entryRES003.idiom,
        rewrite: entryRES003.rewrite,
      });
    }
  }

  if (warnings.length === 0) return src;
  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Tokens that, when appearing at the end of a line, indicate the expression
 * continues on the next line — so a call starting on the next line is NOT
 * in statement position.
 */
const CONTINUATION_TOKEN_TEXT = new Set([
  "=", "+=", "-=", "*=", "/=", "%=", "&&=", "||=", "??=",
  "&&", "||", "??", "+", "-", "*", "/", "%",
  "==", "!=", "===", "!==", "<", ">", "<=", ">=",
  "&", "|", "^", "<<", ">>",
  ",", ":",
  // `match` is a continuation token: `match\n  f(x)\n{ ... }` — the call on
  // the next line is the scrutinee, not a statement.
  "match",
  // Note: `?` is NOT included — in botscript `?` is the postfix propagation
  // operator, not a ternary marker; a line ending in `?` terminates the
  // expression, so the next line's call is a new statement.
]);

/**
 * Returns true if the last non-whitespace token on the line above `newlineIdx`
 * is a continuation token (meaning the call on the next line is part of a
 * larger expression, not a statement).
 */
function precededByContinuation(tokens: Token[], newlineIdx: number): boolean {
  // Walk backward past the newline to the previous line's last real token.
  let i = newlineIdx - 1;
  while (i >= 0) {
    const t = tokens[i];
    if (!t) return false;
    if (t.kind === "whitespace" || t.kind === "blockComment" || t.kind === "lineComment") { i--; continue; }
    if (t.kind === "newline") return false; // empty line above — not a continuation
    // Check if this token is a continuation token.
    return CONTINUATION_TOKEN_TEXT.has(t.text);
  }
  return false;
}

/**
 * Walk backward from `start`, skipping only horizontal whitespace and block
 * comments — NOT newlines, since newlines are statement terminators in botscript.
 */
function prevNotSkippingNewlines(tokens: Token[], start: number): number {
  let i = start;
  while (i >= 0) {
    const t = tokens[i];
    if (!t) return i;
    if (t.kind === "whitespace" || t.kind === "blockComment" || t.kind === "lineComment") {
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
    if (t.kind === "whitespace" || t.kind === "blockComment" || t.kind === "lineComment") {
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
 *
 * `sameLineTok` is the next non-whitespace token on the same line (no newlines
 * crossed). Used for the `{` check: a `{` that is part of a match scrutinee
 * (`match f() { ... }`) is always on the same line, while a block statement
 * opening brace appears after a newline and must not suppress the warning.
 */
function resultIsConsumed(tok: Token | undefined, sameLineTok?: Token | undefined): boolean {
  if (!tok) return false;
  // Propagation: saveUser(u)?
  if (tok.kind === "question") return true;
  // Method/property chaining: f().then(...) or f()?.catch(...)
  if (tok.kind === "punct" && tok.text === ".") return true;
  if (tok.kind === "questionDot") return true;
  // Argument to outer call or inside a list: fn(f(), g())
  if (tok.kind === "close" && tok.text === ")") return true;
  if (tok.kind === "punct" && tok.text === ",") return true;
  // Match scrutinee: match f() { ... } — only when the `{` is on the same line.
  // A `{` on the next line opens a block statement and does not consume the result.
  if (sameLineTok?.kind === "open" && sameLineTok.text === "{") return true;
  // Array element: [f()]
  if (tok.kind === "close" && tok.text === "]") return true;
  // Null-coalescing: result ?? ...
  if (tok.kind === "questionQuestion") return true;
  // Binary operators: result && ..., result || ..., etc.
  if (tok.kind === "operator" && BINARY_OPS.has(tok.text)) return true;
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
        const next = tokens[k];
        if (next && next.kind === "open" && next.text === "{") {
          braceIdx = k;
        } else if (next && next.kind === "ident" && next.text === "with") {
          // test "name" with mocks { caps } { body }
          const mocksIdx = skipTrivia(tokens, k + 1);
          const mocksTok = tokens[mocksIdx];
          if (!mocksTok || mocksTok.kind !== "ident" || mocksTok.text !== "mocks") continue;
          const capsIdx = skipTrivia(tokens, mocksIdx + 1);
          const capsOpen = tokens[capsIdx];
          if (
            capsOpen &&
            capsOpen.kind === "open" &&
            capsOpen.text === "{" &&
            capsOpen.matchedAt !== undefined
          ) {
            const bodyIdx = skipTrivia(tokens, capsOpen.matchedAt + 1);
            const bodyOpen = tokens[bodyIdx];
            if (bodyOpen && bodyOpen.kind === "open" && bodyOpen.text === "{") braceIdx = bodyIdx;
          }
        }
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

/** Extract the Result<...>/Option<...> substring from a return type string. */
function extractTypeLabel(rt: string): string {
  const m = /(?:Result|Option)</.exec(rt);
  if (!m) return rt;
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

/** Return the return type label (Result<...> or Option<...>) for a fn name. */
function getReturnTypeLabel(
  decls: Array<{ name: string; returnType: string }>,
  name: string,
): string {
  const matching = decls.filter((d) => d.name === name);
  if (matching.length === 0) return "Result/Option";
  // If multiple overloads exist, only show the label when they all agree.
  const labels = matching.map((d) => extractTypeLabel(d.returnType));
  const first = labels[0]!;
  if (labels.every((l) => l === first)) return first;
  return "Result/Option";
}
