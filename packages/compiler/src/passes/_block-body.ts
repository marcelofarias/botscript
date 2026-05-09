/**
 * Shared block-body lowering for passes that turn a `{ ... }` block in
 * expression position into a function body — `passBlocks` (`pure { ... }` /
 * `io { ... }`), `passResultTry` (`Result.try { ... }`), and the brace-block
 * arm form in `passMatch`.
 *
 * The bug this fixes (issue #23): the previous `wrapBody` helper tested only
 * for top-level `;` and the literal substring `return`, then unconditionally
 * prefixed `return` to the rest. Bodies separated by newlines (botscript's
 * preferred form), `let` declarations, or anything else where the tail is an
 * expression but earlier segments are statements lowered to invalid TS like
 *
 *     return let x = ...
 *       x;
 *
 * The fix: split the body into top-level statement segments — separated by
 * either `;` or unambiguous newline (where neither the line we just finished
 * nor the line we're about to start is a continuation of a longer
 * expression). For each segment, terminate with `;`. The last segment is
 * `return`-wrapped only if it's expression-shaped (no leading
 * `let`/`const`/`var`/`return`/control-flow keyword and not itself a brace
 * block).
 *
 * Implementation: the splitter walks the lexer's token stream rather than
 * raw text. The lexer already classifies strings, templates, regex literals,
 * line/block comments, and matched bracket pairs as opaque tokens (`string`,
 * `template`, `regex`, `lineComment`, `blockComment`, `open`/`close` with
 * `matchedAt`), so the body-scanner gets correct lexical disambiguation for
 * free — closing the regex-vs-divide, comment-eats-too-much, and
 * nested-template-with-${...} edge cases that a raw-text scan kept getting
 * wrong. This is the same approach `passUnsafe` / `passResultTry` /
 * `passMatch` use for their own scans; `_block-body.ts` now joins them.
 *
 * Boundary cases handled by the lexer (so we don't):
 *  - Strings (`"..."`, `'...'`), templates (`` `...` `` with `${...}`
 *    interpolations including nested templates), regex literals, line and
 *    block comments are emitted as single opaque tokens that the splitter
 *    walks past without inspecting.
 *  - Bracket pairs (`(...)`, `[...]`, `{...}`) raise depth on `open` and
 *    drop it on `close`, so newlines / `;` inside argument lists, object
 *    literals, etc. are not splits.
 *
 * Boundary cases handled here:
 *  - A trailing binary/continuation token (`+`, `-`, `*`, `/`, `%`, `&&`,
 *    `||`, `??`, `,`, `.`, `?.`, `=`, `=>`, `<`, `>`, `?`, `|`, `&`, `^`,
 *    `!`, `~`) before a newline means the next line is a continuation, not
 *    a new statement.
 *  - A leading binary/continuation token at the start of the next non-trivia
 *    run (`+`, `.`, `?.`, `,`, `&&`, `||`, `??`, `*`, `/`, `%`, `=`, `=>`,
 *    `<`, `>`, `?`, `|`, `&`, `^`, `)`, `]`, `}`) means we're continuing,
 *    not starting a new statement.
 *  - The tail `return ...` form already has `return`; we don't double-wrap.
 */

import { lex, type Token } from "../parser/lex.js";

const STATEMENT_HEADS = new Set([
  "let", "const", "var",
  "return", "if", "else", "for", "while", "do", "switch", "case", "default",
  "try", "catch", "finally", "throw",
  "function", "class", "type", "interface", "enum",
  "import", "export",
  "break", "continue",
  "yield", "async",
  "debugger",
]);

/**
 * Lower a block body — the verbatim text between `{` and `}` in an
 * expression-position block — into a sequence of TS statements. The result
 * is intended to be inlined inside a `{ ... }` arrow body or function body
 * (so it has no surrounding braces of its own).
 */
export function lowerBlockBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed === "") return "";
  const tokens = lex(trimmed);
  const segments = splitTopLevelStatements(tokens, trimmed);
  if (segments.length === 0) return "";
  const out: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    const isLast = i === segments.length - 1;
    out.push(formatSegment(seg, isLast));
  }
  return out.join(" ");
}

function formatSegment(raw: string, isLast: boolean): string {
  // Drop a trailing `;` if any — we re-add it ourselves.
  let s = raw.trim();
  while (s.endsWith(";")) s = s.slice(0, -1).trimEnd();
  if (s === "") return "";
  if (!isLast) {
    return s + ";";
  }
  // Last segment — `return`-wrap if it's expression-shaped.
  if (isStatementHead(s)) return s + ";";
  return `return ${s};`;
}

function isStatementHead(seg: string): boolean {
  // Read the first ident-like token. `return foo()` and `let x = 1` are
  // statements; `foo()` and `x + 1` are expressions.
  const m = seg.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\b/);
  if (!m) return false;
  return STATEMENT_HEADS.has(m[1]!);
}

/**
 * Walk the lexer's token stream and return an array of statement-segment
 * strings (verbatim source slices). Splits at top-level `;` punct or at
 * top-level newline tokens that don't sit between continuation tokens.
 *
 * Strings/templates/regex/comments are single opaque lexer tokens, so the
 * scan doesn't have to inspect their contents. Bracket pairs raise/lower
 * depth via `open`/`close` tokens, so newlines and `;` inside argument
 * lists, object literals, etc. are not splits.
 */
function splitTopLevelStatements(tokens: Token[], src: string): string[] {
  const segments: string[] = [];
  // segStart is the index of the first token of the current segment.
  let segStart = 0;
  let depth = 0;

  const pushSegment = (toIdx: number) => {
    if (toIdx <= segStart) return;
    const startTok = tokens[segStart];
    if (!startTok) return;
    // Pick the last non-trivia token in [segStart, toIdx) for the slice end.
    let endIdx = toIdx - 1;
    while (endIdx >= segStart && isTrivia(tokens[endIdx]!)) endIdx--;
    if (endIdx < segStart) return;
    const text = src.slice(tokens[segStart]!.start, tokens[endIdx]!.end);
    if (text.trim() !== "") segments.push(text);
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === "eof") break;
    if (t.kind === "open") { depth++; continue; }
    if (t.kind === "close") { depth--; continue; }
    if (depth !== 0) continue;
    if (t.kind === "punct" && t.text === ";") {
      pushSegment(i);
      segStart = i + 1;
      continue;
    }
    if (t.kind === "newline") {
      const prev = lastSignificantToken(tokens, segStart, i);
      const next = nextSignificantToken(tokens, i + 1);
      if (isStatementBoundary(prev, next)) {
        pushSegment(i);
        segStart = i + 1;
      }
    }
  }
  // Trailing segment.
  pushSegment(tokens.length);
  return segments.map((s) => s.trim()).filter((s) => s !== "");
}

function isTrivia(t: Token): boolean {
  return (
    t.kind === "whitespace" ||
    t.kind === "newline" ||
    t.kind === "lineComment" ||
    t.kind === "blockComment"
  );
}

/** Walk backward through `tokens[start..end)` returning the last non-trivia token, or null. */
function lastSignificantToken(tokens: Token[], start: number, end: number): Token | null {
  for (let j = end - 1; j >= start; j--) {
    const t = tokens[j]!;
    if (!isTrivia(t)) return t;
  }
  return null;
}

/** Walk forward from `from` returning the first non-trivia token, or null. */
function nextSignificantToken(tokens: Token[], from: number): Token | null {
  for (let j = from; j < tokens.length; j++) {
    const t = tokens[j]!;
    if (t.kind === "eof") return null;
    if (!isTrivia(t)) return t;
  }
  return null;
}

/** Tokens whose presence at the END of a logical line means the next line continues the expr. */
const TRAILING_CONTINUATIONS = new Set([
  "+", "-", "*", "/", "%",
  "&", "|", "^", "~", "!",
  "<", ">",
  "==", "!=", "===", "!==", "<=", ">=",
  "&&", "||",
  "<<", ">>",
  "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**=",
  "**",
  "=", "=>", "->",
  "??",
  ",",
  ".",
  ":",
  "?", "?.",
]);

/** Tokens whose presence at the START of the next logical line means it continues the previous expr. */
const LEADING_CONTINUATIONS = new Set([
  "+", "-", "*", "/", "%",
  "&", "|", "^",
  "<", ">",
  "==", "!=", "===", "!==", "<=", ">=",
  "&&", "||",
  "<<", ">>",
  "**",
  "=", "=>",
  "??",
  ",",
  ".",
  ":",
  "?", "?.",
]);

/**
 * Decide whether a newline between `prev` and `next` is a statement boundary.
 * Conservative: if either side suggests continuation, don't split.
 */
function isStatementBoundary(prev: Token | null, next: Token | null): boolean {
  if (!prev || !next) return false;
  // Trailing tokens that mean the next line is a continuation.
  if (isContinuationOnLeft(prev)) return false;
  // Leading tokens on the next line that mean continuation of the previous.
  if (isContinuationOnRight(next)) return false;
  return true;
}

function isContinuationOnLeft(t: Token): boolean {
  // Only operators/punct/special tokens can be continuations. An ident,
  // keyword, number, string, template, regex, `close`, postfix `?` or `eof`
  // does NOT continue.
  switch (t.kind) {
    case "operator":
    case "arrow":
    case "fatArrow":
    case "eq":
    case "questionDot":
    case "questionQuestion":
      return TRAILING_CONTINUATIONS.has(t.text);
    case "punct":
      return t.text === "." || t.text === "," || t.text === ":";
    case "question":
      // Postfix `?` (the unwrap operator) ends an expression — NOT a
      // continuation. The text-based scanner used to call it a continuation,
      // but `?` here is always the postfix-unwrap form (a real ternary `a ? b
      // : c` has its `:` on the next line covered separately).
      return false;
    default:
      return false;
  }
}

function isContinuationOnRight(t: Token): boolean {
  switch (t.kind) {
    case "operator":
    case "arrow":
    case "fatArrow":
    case "eq":
    case "questionDot":
    case "questionQuestion":
      return LEADING_CONTINUATIONS.has(t.text);
    case "punct":
      return t.text === "." || t.text === "," || t.text === ":";
    case "question":
      // A line starting with `?` is a postfix unwrap on the previous expr.
      return true;
    case "close":
      // A line starting with `)`, `]`, or `}` continues the previous
      // expression (which is at depth>0, but the body itself ended on a
      // close at depth=0 only when the depth went to 0 on this line, so
      // this case is mostly defensive).
      return true;
    default:
      return false;
  }
}
