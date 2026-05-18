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
 *
 *           This is compiler-inferred (not programmer-applied) — unlike
 *           UNS001-UNS004 which fire on malformed `unsafe` blocks.
 *           A reviewer can tell at a glance whether the author made a
 *           deliberate choice (unsafe block / suppression) or the compiler
 *           is flagging an omission.
 *
 *           Suppression mechanisms:
 *             1. Wrap in `match` to handle both Ok and Err arms.
 *             2. Use `unsafe "<reason>" { ... }` to accept the uncertainty
 *                with a written explanation.
 *             3. (Future) Declare `ensures: "..."` on the callee — allows
 *                the compiler to verify the output contract structurally.
 *
 *   pre-0.9  This pass is not run.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import type { Token } from "../parser/lex.js";
import { parseFn } from "../parser/parse-fn.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";

/** stdlib namespaces that consume external capabilities. */
const STDLIB_CAPS = new Set(["http", "fs", "time", "random", "stdout", "stderr"]);

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
  collectUnsafeFnBodyRanges(tokens, unsafeRanges);

  const innerByDecl = computeNesting(decls);
  const diagnostics: Diagnostic[] = [];

  for (const decl of decls) {
    const inner = innerByDecl.get(decl) ?? [];

    // Cursor-based inner-fn exclusion (same pattern as dep-check).
    const open: FnDecl[] = [];
    let nextInner = 0;

    for (let i = decl.tokenStart; i < decl.tokenEnd; i++) {
      // Maintain the open-inner-fn stack.
      while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open.push(inner[nextInner]!);
        nextInner++;
      }
      if (open.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident") continue;
      if (!STDLIB_CAPS.has(tok.text)) continue;

      // Must be `stdlib.method(` — confirm the shape before acting.
      const dotIdx = nextSignificant(tokens, i + 1);
      const dotTok = tokens[dotIdx];
      if (!dotTok || dotTok.kind !== "punct" || dotTok.text !== ".") continue;

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
      if (isDirectMatchSubject(tokens, i)) continue;

      const entry = getErrorCode("UNS005")!;
      const loc = locationOf(src, tok.start);
      const ns = tok.text;
      const member = memberTok.text;

      diagnostics.push({
        code: "UNS005",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: tok.start,
        end: memberTok.end,
        message:
          `'${ns}.${member}(...)' is an external call with no declared result contract — ` +
          `the return value may be structurally typed but semantically incorrect`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite:
          `// option A — match on the result (handles both Ok and Err):\n` +
          `match ${ns}.${member}(...) {\n` +
          `  Ok(value) => { /* use value */ },\n` +
          `  Err(e) => { /* handle error */ },\n` +
          `}\n\n` +
          `// option B — accept the uncertainty with a written reason:\n` +
          `unsafe "I know what ${ns}.${member} returns here" { ${ns}.${member}(...) }`,
      });

      // Advance past the call to avoid redundant hits (e.g. chained calls).
      i = parenTok.matchedAt ?? parenIdx;
    }
  }

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

/** Collects char-offset ranges for `unsafe "reason" fn` declaration bodies. */
function collectUnsafeFnBodyRanges(tokens: Token[], out: CharRange[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;

    const j = nextSignificant(tokens, i + 1);
    const reasonTok = tokens[j];
    if (!reasonTok || reasonTok.kind !== "string") continue;

    const k = nextSignificant(tokens, j + 1);
    const next = tokens[k];
    if (!next || next.kind !== "keyword") continue;

    let fnIdx: number;
    if (next.keyword === "fn") {
      fnIdx = k;
    } else if (next.keyword === "async") {
      const l = nextSignificant(tokens, k + 1);
      const fnTok = tokens[l];
      if (!fnTok || fnTok.kind !== "keyword" || fnTok.keyword !== "fn") continue;
      fnIdx = l;
    } else {
      continue;
    }

    const decl = parseFn(tokens, fnIdx, { allowGenerics: true });
    if (!decl) continue;

    out.push({ start: decl.body.start, end: decl.body.end });
    i = decl.tokenEnd - 1;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the stdlib call at `callIdx` is the direct subject of a
 * `match` expression. Skips trivia and `await` tokens looking backward.
 */
function isDirectMatchSubject(tokens: Token[], callIdx: number): boolean {
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
    return t.kind === "keyword" && t.keyword === "match";
  }
  return false;
}

function nextSignificant(tokens: Token[], start: number): number {
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

function insideAnyChar(offset: number, ranges: CharRange[]): boolean {
  for (const r of ranges) {
    if (offset >= r.start && offset < r.end) return true;
  }
  return false;
}

function computeNesting(decls: FnDecl[]): Map<FnDecl, FnDecl[]> {
  const result = new Map<FnDecl, FnDecl[]>();
  for (const outer of decls) {
    const inner = decls.filter(
      (d) => d !== outer && d.tokenStart >= outer.tokenStart && d.tokenEnd <= outer.tokenEnd,
    );
    inner.sort((a, b) => a.tokenStart - b.tokenStart);
    result.set(outer, inner);
  }
  return result;
}
