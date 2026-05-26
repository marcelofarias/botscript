/**
 * External call without declared result contract (?bs 0.9+).
 *
 *   UNS005  A stdlib capability call (http.x, fs.x, time.x, random.x,
 *           stdout.x, stderr.x) appears in a function body with no
 *           declared output contract the compiler can verify.
 *
 *           "Declared output contract" at the call site means one of:
 *             - The call is the direct subject of a `match` expression
 *               (`match http.get(url) { ... }`).
 *             - The call is inside an `unsafe "<reason>" { ... }` block.
 *             - The call is inside an `unsafe "<reason>" fn` body.
 *
 *           This is compiler-inferred (not programmer-applied) — unlike
 *           UNS001-UNS004 which fire on malformed `unsafe` blocks.
 *           A reviewer can tell at a glance whether the author made a
 *           deliberate choice (unsafe block / suppression) or the compiler
 *           is flagging an omission.
 *
 *           Suppression mechanisms:
 *             1. Wrap in `match` to handle both ok and err arms.
 *             2. Use `unsafe "<reason>" { ... }` to accept the uncertainty
 *                with a written explanation.
 *             3. Declare the containing fn as `unsafe "<reason>" fn` when
 *                the entire fn body is the intended escape hatch.
 *             4. (Future) Declare `ensures: "..."` on the callee — allows
 *                the compiler to verify the output contract structurally.
 *
 *   pre-0.9  This pass is not run.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import type { Token } from "../parser/lex.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";
import { STDLIB_TO_CAP } from "./_stdlib.js";
import { computeNesting, nextSignificant } from "./_callgraph.js";
import { collectStdlibAliases } from "./_alias.js";

const STDLIB_CAPS = new Set(Object.keys(STDLIB_TO_CAP));

interface CharRange {
  start: number;
  end: number;
}

export function passUnsCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const decls = program.fns.map((s) => s.decl);

  if (decls.length === 0) return src;

  // Collect char-offset ranges for unsafe blocks and unsafe fn bodies.
  // Any stdlib call inside these ranges is suppressed.
  const unsafeRanges: CharRange[] = [];
  collectUnsafeBlockRanges(tokens, unsafeRanges);
  // Unsafe fn bodies come from the pre-parsed decls — no re-parsing needed.
  for (const decl of decls) {
    if (decl.unsafeReason !== undefined) {
      unsafeRanges.push({ start: decl.body.start, end: decl.body.end });
    }
  }

  const aliases = collectStdlibAliases(tokens, decls);
  const innerByDecl = computeNesting(decls);
  const diagnostics: Diagnostic[] = [];

  for (const decl of decls) {
    const inner = innerByDecl.get(decl) ?? [];

    // Cursor-based inner-fn exclusion (same pattern as dep-check).
    const open: FnDecl[] = [];
    let nextInner = 0;

    for (let i = decl.bodyTokenStart ?? decl.tokenStart; i < decl.tokenEnd; i++) {
      // Maintain the open-inner-fn stack.
      while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open.push(inner[nextInner]!);
        nextInner++;
      }
      if (open.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident") continue;
      const canonical = aliases.get(tok.text) ?? tok.text;
      if (!STDLIB_CAPS.has(canonical)) continue;

      // Must be `stdlib.method(` or `stdlib?.method(` — confirm the shape before acting.
      const dotIdx = nextSignificant(tokens, i + 1);
      const dotTok = tokens[dotIdx];
      if (
        !dotTok ||
        !((dotTok.kind === "punct" && dotTok.text === ".") || dotTok.kind === "questionDot")
      ) continue;

      const memberIdx = nextSignificant(tokens, dotIdx + 1);
      const memberTok = tokens[memberIdx];
      if (!memberTok || memberTok.kind !== "ident") continue;

      const parenIdx = nextSignificant(tokens, memberIdx + 1);
      const parenTok = tokens[parenIdx];
      if (!parenTok || parenTok.kind !== "open" || parenTok.text !== "(") continue;

      // Suppression 1: inside an unsafe block or unsafe fn body.
      if (insideAnyChar(tok.start, unsafeRanges)) continue;

      // Suppression 2: direct subject of a `match` expression.
      // Skips trivia and `await` — `match await http.get(url) { }` is fine.
      // Pass the closing-paren index so the forward check can verify the call
      // is the full scrutinee (not part of a larger expression like `http.get(url) + "x"`).
      if (isDirectMatchSubject(tokens, i, parenTok.matchedAt)) continue;

      // Suppression 3: malformed `unsafe "reason" ns.method(...)` (missing `{}`).
      // passUnsafe will emit UNS003 for the missing block body; suppress UNS005
      // here so the more specific diagnostic wins.
      if (isMalformedUnsafeExpr(tokens, i)) continue;

      const entry = getErrorCode("UNS005")!;
      const loc = locationOf(src, tok.start);
      const ns = tok.text;
      const member = memberTok.text;

      const isOptChain = dotTok.kind === "questionDot";
      const accessOp = isOptChain ? "?." : ".";
      const callExpr = `${ns}${accessOp}${member}`;
      const closingParen = parenTok.matchedAt !== undefined ? tokens[parenTok.matchedAt] : undefined;
      diagnostics.push({
        code: "UNS005",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: tok.start,
        end: closingParen?.end ?? memberTok.end,
        message:
          `'${callExpr}(...)' is an external call with no declared result contract — ` +
          `the return value may be structurally typed but semantically incorrect`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite:
          `// option A — match on the result (handles both ok and err):\n` +
          `match ${callExpr}(...) {\n` +
          `  ok { value } -> { /* use value */ }\n` +
          `  err { error } -> { /* handle error */ }\n` +
          `}\n\n` +
          `// option B — accept the uncertainty with a written reason:\n` +
          `unsafe "I know what ${callExpr} returns here" { ${callExpr}(...) }`,
      });

      // Do not advance past the closing paren — inner stdlib calls in the
      // argument list (e.g. http.get(fs.readText(path))) must each be flagged.
    }
  }

  // UNS005 intentionally accumulates all violations before throwing so the
  // caller sees every missing result contract in one pass — violations are
  // independent (each has a mechanical fix) and reporting them all at once is
  // more useful than bailing on the first. This differs from passes like
  // bareAs/depCheck that bail on first error because a single violation there
  // already indicates a structural problem that invalidates further analysis.
  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

// ---------------------------------------------------------------------------
// Unsafe range collection
// ---------------------------------------------------------------------------

/** Collects char-offset ranges for `unsafe "reason" { body }` block bodies. */
function collectUnsafeBlockRanges(tokens: Token[], out: CharRange[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;

    const j = nextSignificant(tokens, i + 1);
    const head = tokens[j];
    if (!head) continue;

    let braceIdx = -1;
    if (head.kind === "open" && head.text === "{") {
      braceIdx = j;
    } else if (head.kind === "string") {
      const k = nextSignificant(tokens, j + 1);
      const open = tokens[k];
      if (open && open.kind === "open" && open.text === "{") {
        braceIdx = k;
      }
    }
    if (braceIdx === -1) continue;

    const open = tokens[braceIdx]!;
    if (open.matchedAt === undefined) continue;
    const close = tokens[open.matchedAt];
    if (!close) continue;

    out.push({ start: open.start, end: close.end });
    i = open.matchedAt;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the stdlib call at `callIdx` is immediately preceded
 * (ignoring whitespace) by `unsafe "reason"` without a following `{`.
 *
 * This is the "malformed unsafe expression" pattern: the author wrote
 * `unsafe "reason" ns.method(...)` instead of `unsafe "reason" { ns.method(...) }`.
 * passUnsafe will fire UNS003 (missing body) for this form — suppress UNS005
 * so the more specific diagnostic wins.
 */
function isTrivia(k: string): boolean {
  return k === "whitespace" || k === "newline" || k === "lineComment" || k === "blockComment";
}

function isMalformedUnsafeExpr(tokens: Token[], callIdx: number): boolean {
  let i = callIdx - 1;
  // Scan backwards past trivia, await, idents, dots, and parens to find
  // `unsafe "reason"` anywhere wrapping this call — handles both direct
  // (`unsafe "r" ns.call()`) and wrapped (`unsafe "r" foo(ns.call())`).
  while (i >= 0) {
    const t = tokens[i]!;
    if (isTrivia(t.kind)) { i--; continue; }
    if (t.kind === "ident") { i--; continue; }
    if (t.kind === "punct" && t.text === ".") { i--; continue; }
    if (t.kind === "questionDot") { i--; continue; }
    if (t.kind === "open" && t.text === "(") { i--; continue; }
    if (t.kind === "close" && t.text === ")") { i--; continue; }
    break;
  }
  if (i < 0 || tokens[i]?.kind !== "string") return false;
  i--;
  while (i >= 0 && isTrivia(tokens[i]!.kind)) i--;
  const t = tokens[i];
  return !!(t && t.kind === "keyword" && t.keyword === "unsafe");
}

/**
 * Returns true when the stdlib call at `callIdx` is the direct subject of a
 * `match` expression. Skips trivia, `await`, and grouping parens looking
 * backward. This means all of these are recognized:
 *   match http.get(url) { ... }
 *   match await http.get(url) { ... }
 *   match (http.get(url)) { ... }
 *   match (await http.get(url)) { ... }
 *
 * When `closingParenIdx` is provided, also verifies (forward) that the token
 * immediately after the call's closing paren (skipping any grouping `)` from
 * `match (...)`) is the `{` opening match arms. This prevents false suppression
 * for `match (http.get(url) + "x") { }` where the call is part of a larger
 * scrutinee expression.
 */
function isDirectMatchSubject(tokens: Token[], callIdx: number, closingParenIdx?: number): boolean {
  let i = callIdx - 1;
  while (i >= 0) {
    const t = tokens[i];
    if (!t) { i--; continue; }
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      i--;
      continue;
    }
    // await is transparent — the match still covers the result.
    // Note: await is not in the KEYWORDS set; it lexes as an ident.
    if (t.kind === "ident" && t.text === "await") {
      i--;
      continue;
    }
    // Opening paren is transparent — match (http.get(url)) is equivalent to
    // match http.get(url). Walk backward through as many grouping parens as
    // needed so match (await (http.get(url))) is also recognized.
    if (t.kind === "open" && t.text === "(") {
      i--;
      continue;
    }
    if (!(t.kind === "keyword" && t.keyword === "match")) return false;
    break;
  }
  if (i < 0) return false;

  // Forward check: the token(s) after the call's closing paren must be `{`.
  // Skip closing grouping parens (from `match (http.get(url)) { }` forms).
  // If the next sig token is anything else (e.g. `+`), the call is part of a
  // larger expression and is not the direct match subject.
  if (closingParenIdx === undefined) return true; // can't verify forward; trust backward
  let j = closingParenIdx + 1;
  while (j < tokens.length) {
    const t = tokens[j];
    if (!t) { j++; continue; }
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      j++;
      continue;
    }
    // A closing grouping paren is transparent (from `match (http.get(url)) { }`).
    if (t.kind === "close" && t.text === ")") {
      j++;
      continue;
    }
    return t.kind === "open" && t.text === "{";
  }
  return false;
}

function insideAnyChar(offset: number, ranges: CharRange[]): boolean {
  for (const r of ranges) {
    if (offset >= r.start && offset < r.end) return true;
  }
  return false;
}

