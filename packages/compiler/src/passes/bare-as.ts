/**
 * `as` cast check (botscript 0.5+).
 *
 * Every `as` cast in expression position must live inside an
 * `unsafe "<reason>" { ... }` block. A bare `as` outside such a block is a
 * parse error with diagnostic `UNS004`. The rule is the manifesto promise
 * made concrete: every cast carries a written reason, and the next reviewer
 * (human or model) sees the *why* alongside the *what* in the diff.
 *
 * The pass runs BEFORE `passUnsafe` in the pipeline, because `passUnsafe`
 * rewrites the source and erases the original `unsafe` keyword. We use the
 * pre-rewrite token stream to find every `unsafe "..." { ... }` body range,
 * then walk the file again and flag every bare `as` that is NOT inside one
 * of those ranges.
 *
 * Disambiguation — what we DO NOT flag:
 *   - The namespace-import form: `import * as ns from "..."`.
 *   - The named-binding rename forms: `import { foo as bar } from "..."`,
 *     `export { foo as bar } from "..."`.
 *   - `export * as ns from "..."`.
 *   - Any `as` whose previous significant token is not an expression value
 *     (i.e. doesn't look like a TS type assertion at all).
 *
 * The implementation skips entire `import ... ;` and `export ... ;`
 * statements rather than trying to disambiguate each `as` token in isolation
 * — that's both simpler and more robust to nested binding forms.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex, type Token } from "../parser/lex.js";
import { parseFn } from "../parser/parse-fn.js";

interface Range {
  /** Token index of the first token to skip (inclusive). */
  start: number;
  /** Token index just past the last token to skip (exclusive). */
  end: number;
}

/** Character-offset range for unsafe fn body regions. */
interface CharRange {
  start: number;
  end: number;
}

export function passBareAs(src: string): string {
  const tokens = lex(src);

  // 1. Collect ranges to skip: unsafe-block bodies and import/export statements.
  const skip: Range[] = [];
  collectUnsafeBodies(tokens, skip);
  collectImportExport(tokens, skip);

  // Also collect character-offset ranges for declaration-level `unsafe fn` bodies.
  // These use source offsets rather than token indices (parseFn returns offsets).
  // Throws UNS002 immediately for any declaration-level unsafe fn with an empty reason.
  const unsafeFnBodyRanges: CharRange[] = [];
  collectUnsafeFnBodies(tokens, src, unsafeFnBodyRanges);

  // 2. Walk the token stream looking for bare `as` casts in expression
  //    position. Throw on the first one we find — matching `unsafe.ts`'s
  //    "first violation wins" pattern. (cap-check throws on the first
  //    diagnostic too; multi-violation accumulation is not the convention
  //    elsewhere in this compiler.)
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "ident" || t.text !== "as") continue;
    if (insideAny(i, skip)) continue;
    if (insideAnyChar(t.start, unsafeFnBodyRanges)) continue;
    if (!isExpressionPosition(tokens, i)) continue;
    if (!looksLikeTypeAfter(tokens, i)) continue;
    throw mkError(t, src);
  }

  return src;
}

/**
 * Find the body range (between matched braces) of every
 * `unsafe "<reason>" { ... }` block in the token stream and append it to
 * `out`. The body's opening `{` and closing `}` are both included so that
 * an `as` token at the boundary cannot escape the skip set.
 */
function collectUnsafeBodies(tokens: Token[], out: Range[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;
    // Skip unsafe blocks that aren't in expression position — those are
    // malformed and `passUnsafe` will diagnose them. We just don't want
    // to accidentally flag `as` inside what was intended to be unsafe.
    const j = skipTrivia(tokens, i + 1);
    const head = tokens[j];
    if (!head) continue;
    // Tolerant: a body brace might come right after the keyword (no
    // justification) or after the justification string. Either way we
    // want to skip the body so `passUnsafe` can decide whether the
    // surrounding shape is legal.
    let braceIdx = -1;
    if (head.kind === "open" && head.text === "{") {
      braceIdx = j;
    } else if (head.kind === "string") {
      const k = skipTrivia(tokens, j + 1);
      const open = tokens[k];
      if (open && open.kind === "open" && open.text === "{") {
        braceIdx = k;
      }
    }
    if (braceIdx === -1) continue;
    const open = tokens[braceIdx]!;
    if (open.matchedAt === undefined) continue;
    out.push({ start: braceIdx, end: open.matchedAt + 1 });
    i = open.matchedAt;
  }
}

/**
 * Skip every `import …` statement and the namespace/rename forms of
 * `export …` — but NOT the value-introducing forms like `export const …`,
 * `export function …`, or `export default <expr>`. Those legitimately
 * contain a binding initializer / function body that may use a bare `as`
 * cast in expression position, and must be walked normally so UNS004 fires.
 *
 * Skipped `export` shapes (the `as`/from token here is structural, never a
 * type assertion):
 *   - `export * as ns from "..."`         (token sequence: export `*`)
 *   - `export * from "..."`               (token sequence: export `*`)
 *   - `export { foo as bar, ... } from "..."`  (export `{`)
 *   - `export { foo as bar }`             (export `{`)
 *   - `export default *`                  (rare; defensive)
 *
 * NOT skipped (must be walked):
 *   - `export const|let|var|function|async|class|type|interface|enum …`
 *   - `export default <expr>` when `<expr>` is not `*`
 *
 * For `import`, every TS-legal shape uses `as` only in the namespace /
 * named-binding sense, so the wholesale-skip is correct.
 *
 * The range walk is conservative — if we can't find a clean terminator we
 * extend the skip range to the next statement boundary. The cost of
 * over-skipping is low (we miss a real cast we should have flagged); the
 * cost of under-skipping is wrong UNS004 hits on `import * as` — which
 * would be a regression.
 */
function collectImportExport(tokens: Token[], out: Range[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "ident") continue;
    if (t.text !== "import" && t.text !== "export") continue;
    if (!atStatementStart(tokens, i)) continue;
    if (t.text === "export" && !shouldSkipExport(tokens, i)) continue;
    const end = findStatementEnd(tokens, i);
    out.push({ start: i, end });
    i = end - 1;
  }
}

/**
 * Decide whether an `export` statement is the namespace/rename shape
 * (whole-statement skip) or a value-introducing shape (must be walked
 * normally so a bare `as` inside an initializer or function body fires
 * UNS004).
 *
 * Returns true (skip) only if the next significant token after `export` is
 * `*`, `{`, or `default *`.
 */
function shouldSkipExport(tokens: Token[], idx: number): boolean {
  const j = skipTrivia(tokens, idx + 1);
  const next = tokens[j];
  if (!next) return false;
  if (next.kind === "operator" && next.text === "*") return true;
  if (next.kind === "open" && next.text === "{") return true;
  if (next.kind === "ident" && next.text === "default") {
    const k = skipTrivia(tokens, j + 1);
    const after = tokens[k];
    if (after && after.kind === "operator" && after.text === "*") return true;
    return false;
  }
  return false;
}

/**
 * True if the previous significant token is one that ends a statement
 * (`;`, `}`, newline-only, or the start of file). We use this to avoid
 * matching `import` / `export` that appears as an identifier inside an
 * expression — which is rare but possible.
 */
function atStatementStart(tokens: Token[], idx: number): boolean {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k];
    if (!t) return true;
    if (t.kind === "whitespace" || t.kind === "lineComment" || t.kind === "blockComment") {
      continue;
    }
    if (t.kind === "newline") return true;
    if (t.kind === "punct" && t.text === ";") return true;
    if (t.kind === "close" && t.text === "}") return true;
    if (t.kind === "open" && t.text === "{") return true;
    return false;
  }
  return true;
}

/** Walk from an `import`/`export` token to the end of its statement. */
function findStatementEnd(tokens: Token[], from: number): number {
  let i = from + 1;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "eof") return i;
    if (t.kind === "open" && t.matchedAt !== undefined) {
      // Skip past balanced braces/parens/brackets so an inner `;` or
      // newline doesn't end the statement prematurely.
      i = t.matchedAt + 1;
      continue;
    }
    if (t.kind === "punct" && t.text === ";") return i + 1;
    if (t.kind === "newline") {
      // An import statement spans a line; if the next significant token is
      // `from`, we're still inside the same statement. Otherwise bail.
      const j = skipTrivia(tokens, i + 1);
      const next = tokens[j];
      if (
        next &&
        next.kind === "ident" &&
        (next.text === "from" || next.text === "as")
      ) {
        i = j;
        continue;
      }
      return i + 1;
    }
    i++;
  }
  return tokens.length;
}

function isExpressionPosition(tokens: Token[], idx: number): boolean {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k];
    if (!t) return false;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") {
      continue;
    }
    // Things that can syntactically end a value expression:
    if (t.kind === "ident") return true;
    if (t.kind === "number") return true;
    if (t.kind === "string") return true;
    if (t.kind === "template") return true;
    if (t.kind === "regex") return true;
    if (t.kind === "close") return true; // `)`, `]`, `}`
    if (t.kind === "question") return true; // postfix `?`
    // Things that explicitly do NOT end an expression:
    return false;
  }
  return false;
}

/**
 * After an `as` token, the next significant token should be the start of a
 * type expression — an ident, a `(`, a `{`, a `[`, or a literal type like a
 * string. If it's something else we bail out (defensive — a stray `as`
 * shouldn't false-positive).
 */
function looksLikeTypeAfter(tokens: Token[], idx: number): boolean {
  const j = skipTrivia(tokens, idx + 1);
  const t = tokens[j];
  if (!t) return false;
  if (t.kind === "ident") return true; // User, any, unknown, const, Foo<Bar>, ...
  if (t.kind === "keyword") return true; // unsafe-as-type? defensive.
  if (t.kind === "open") return true; // (X | Y), { name: string }, [number, number]
  if (t.kind === "string") return true; // literal-string type
  if (t.kind === "number") return true; // literal-number type
  if (t.kind === "operator" && (t.text === "<" || t.text === "&" || t.text === "|" || t.text === "!")) {
    return true;
  }
  return false;
}

function skipTrivia(tokens: Token[], i: number): number {
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t) return i;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

/**
 * Collect source-offset ranges of fn bodies declared with
 * `unsafe "reason" fn name(…)`. An `as` cast inside such a body is allowed
 * — the fn declaration itself is the declared trust boundary.
 *
 * Throws UNS002 immediately for any declaration-level `unsafe "" fn` (empty
 * reason), independent of `passUnsafe`'s expression-position heuristic.
 */
function collectUnsafeFnBodies(tokens: Token[], src: string, out: CharRange[]): void {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;

    const j = skipTrivia(tokens, i + 1);
    const reasonTok = tokens[j];
    if (!reasonTok || reasonTok.kind !== "string") continue;

    const k = skipTrivia(tokens, j + 1);
    const next = tokens[k];
    if (!next || next.kind !== "keyword") continue;

    let fnIdx: number;
    if (next.keyword === "fn") {
      fnIdx = k;
    } else if (next.keyword === "async") {
      const l = skipTrivia(tokens, k + 1);
      const fnTok = tokens[l];
      if (!fnTok || fnTok.kind !== "keyword" || fnTok.keyword !== "fn") continue;
      fnIdx = l;
    } else {
      continue;
    }

    // Declaration-level unsafe fn with an empty reason is always UNS002,
    // regardless of whether the body contains an `as` cast.
    const reason = reasonTok.text.slice(1, -1);
    if (reason.trim() === "") {
      const entry = getErrorCode("UNS002")!;
      const { line, column } = locationOf(src, reasonTok.start);
      const diag: Diagnostic = {
        code: "UNS002",
        severity: "error",
        file: null,
        line,
        column,
        message: "declaration-level unsafe fn has an empty justification string",
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite: 'unsafe "<short reason>" fn <name>(...) -> T { ... }',
      };
      throw new BotscriptError([diag]);
    }

    const decl = parseFn(tokens, fnIdx, { allowGenerics: true });
    if (!decl) continue;

    out.push({ start: decl.body.start, end: decl.body.end });
    i = decl.tokenEnd - 1;
  }
}

function insideAny(idx: number, ranges: Range[]): boolean {
  for (const r of ranges) {
    if (idx >= r.start && idx < r.end) return true;
  }
  return false;
}

function insideAnyChar(offset: number, ranges: CharRange[]): boolean {
  for (const r of ranges) {
    if (offset >= r.start && offset < r.end) return true;
  }
  return false;
}

function mkError(tok: Token, src: string): BotscriptError {
  const entry = getErrorCode("UNS004")!;
  const { line, column } = locationOf(src, tok.start);
  const diag: Diagnostic = {
    code: "UNS004",
    severity: "error",
    file: null,
    line,
    column,
    start: tok.start,
    end: tok.end,
    message: "bare `as` cast outside an `unsafe \"<reason>\" { ... }` block or `unsafe \"<reason>\" fn` declaration",
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite: entry.rewrite,
  };
  return new BotscriptError([diag]);
}

function locationOf(src: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}
