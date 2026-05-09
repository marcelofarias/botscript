/**
 * Token-AST-based match pass. Replaces the regex/brace-counting version.
 */
import { lex, type Token } from "../parser/lex.js";
import type { MatchExpr, Pattern } from "../parser/parse-match.js";
import { parseMatch } from "../parser/parse-match.js";
import { lowerBlockBody } from "./_block-body.js";

export function passMatch(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "match") continue;
    const expr = parseMatch(tokens, i);
    if (!expr) continue;
    out += src.slice(cursor, tokens[expr.start]!.start);
    out += emitMatch(expr);
    const lastTok = tokens[expr.end - 1];
    cursor = lastTok ? lastTok.end : tokens[expr.end]?.start ?? cursor;
    i = expr.end - 1;
  }
  out += src.slice(cursor);
  return out;
}

function emitMatch(expr: MatchExpr): string {
  const arms = expr.arms.map((a) => {
    const pred = emitPredicate(a.pattern);
    const handler = emitHandler(a.pattern, a.body);
    return `  [${pred}, ${handler}]`;
  });
  return `$match(${expr.scrutinee}, [\n${arms.join(",\n")},\n])`;
}

function emitPredicate(p: Pattern): string {
  switch (p.kind) {
    case "wildcard":
      return "$wildcard()";
    case "literal":
      return `$literalMatch(${p.value})`;
    case "tag":
      return `$tagMatch(${JSON.stringify(p.tag)}, [${p.binds.map((b) => JSON.stringify(b)).join(", ")}])`;
  }
}

function emitHandler(p: Pattern, body: string): string {
  const args = p.kind === "tag" && p.binds.length > 0
    ? `({ ${p.binds.join(", ")} }: any)`
    : `()`;
  const blockInner = extractBraceBlockBody(body);
  if (blockInner !== null) {
    // Arm body is a `{ ... }` block — lower its statements and emit a
    // brace-bodied arrow. This is the form that handles `let`-bearing arm
    // bodies and explicit `return`s correctly.
    const lowered = lowerBlockBody(blockInner);
    return `${args} => { ${lowered} }`;
  }
  return `${args} => (${body})`;
}

/**
 * If `body` is exactly a single `{ ... }` block (the entire arm body is a
 * brace block), return its inner text. Otherwise return `null` so the caller
 * keeps the existing parenthesized-arrow form.
 *
 * "Exactly" means the leading `{` matches the trailing `}` at depth 0.
 * Strings/templates (with arbitrarily nested `${...}` interpolations,
 * including templates-inside-templates) and comments are opaque
 * lexer tokens; the lexer also pre-computes matched-bracket pairs, so this
 * function just checks whether the first lexer token is the opening `{` and
 * its `matchedAt` lands on the last non-trivia token of the body.
 *
 * A body like `{ a: 1 }` (object literal) returns the inner text — but in
 * match-arm position object literals must be parenthesized to disambiguate,
 * so the input form `{ a: 1 }` as an arm body is already a brace block, not
 * an object literal.
 */
function extractBraceBlockBody(body: string): string | null {
  const s = body.trim();
  if (s.length < 2 || s[0] !== "{" || s[s.length - 1] !== "}") return null;
  const tokens = lex(s);
  // Find the first non-trivia token — must be `open` `{`.
  let firstIdx = 0;
  while (firstIdx < tokens.length && isTrivia(tokens[firstIdx]!)) firstIdx++;
  const first = tokens[firstIdx];
  if (!first || first.kind !== "open" || first.text !== "{") return null;
  // Find the last non-trivia, non-eof token — must be `close` `}`.
  let lastIdx = tokens.length - 1;
  while (lastIdx >= 0 && (isTrivia(tokens[lastIdx]!) || tokens[lastIdx]!.kind === "eof")) lastIdx--;
  const last = tokens[lastIdx];
  if (!last || last.kind !== "close" || last.text !== "}") return null;
  // The opening `{` must match the closing `}` (i.e. the entire body is one
  // brace block, not e.g. `{ ... } + { ... }`).
  if (first.matchedAt !== lastIdx) return null;
  return s.slice(first.end, last.start);
}

function isTrivia(t: Token): boolean {
  return (
    t.kind === "whitespace" ||
    t.kind === "newline" ||
    t.kind === "lineComment" ||
    t.kind === "blockComment"
  );
}
