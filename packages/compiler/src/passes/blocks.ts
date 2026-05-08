/**
 * Token-AST-based pure/io block pass. Each `pure { ... }` or `io { ... }` at
 * an expression position is rewritten — `pure` to `$enter([], () => …)`,
 * `io` to a plain IIFE.
 *
 * Block-style `pure { … }` and `io { … }` attached to a `fn ... = pure { … }`
 * declaration are consumed by the fn pass and never reach this pass; we only
 * see the bare expression form.
 */
import { lex } from "../parser/lex.js";
import type { Token } from "../parser/lex.js";

export function passBlocks(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword") continue;
    if (t.keyword !== "pure" && t.keyword !== "io") continue;
    if (!isExpressionPosition(tokens, i)) continue;

    // Expect `{` next (after whitespace/comments).
    let j = i + 1;
    j = skipTrivia(tokens, j);
    const open = tokens[j];
    if (!open || open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) continue;
    const close = open.matchedAt;
    const body = sliceText(tokens, j + 1, close).trim();
    const wrapped = wrapBody(body);
    const emit = t.keyword === "pure"
      ? `$enter([] as const, () => { ${wrapped} })`
      : `(() => { ${wrapped} })()`;

    out += src.slice(cursor, t.start);
    out += emit;
    cursor = open.matchedAt !== undefined ? tokens[close]!.end : cursor;
    i = close;
  }
  out += src.slice(cursor);
  return out;
}

function isExpressionPosition(tokens: Token[], idx: number): boolean {
  // Walk back for the previous significant token. If it indicates an
  // expression position (`=`, `(`, `,`, `[`, `:`, `?`, `;`, `{`, `=>`, `&&`,
  // `||`, `return` keyword, or BOF), treat as expression-position.
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k]!;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") continue;
    if (t.kind === "eq" || t.kind === "fatArrow") return true;
    if (t.kind === "punct" && (t.text === "," || t.text === ":" || t.text === ";" || t.text === ".")) {
      return t.text !== ".";
    }
    if (t.kind === "open" && (t.text === "(" || t.text === "[" || t.text === "{")) return true;
    if (t.kind === "question" || t.kind === "questionDot" || t.kind === "questionQuestion") return true;
    if (t.kind === "operator" && (t.text === "&&" || t.text === "||" || t.text === "??")) return true;
    if (t.kind === "ident" && t.text === "return") return true;
    if (t.kind === "keyword" && (t.keyword === "pure" || t.keyword === "io" || t.keyword === "match")) return true;
    return false;
  }
  return true;
}

function skipTrivia(tokens: Token[], i: number): number {
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

function sliceText(tokens: Token[], from: number, to: number): string {
  let out = "";
  for (let i = from; i < to; i++) {
    const t = tokens[i];
    if (!t) break;
    out += t.text;
  }
  return out;
}

function wrapBody(body: string): string {
  if (body === "") return "";
  if (hasTopLevelSemicolon(body) || /\breturn\b/.test(body)) return body;
  return `return ${body};`;
}

function hasTopLevelSemicolon(src: string): boolean {
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || c === "'" || c === "`") {
      const q = c;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (c === ";") return true;
    i++;
  }
  return false;
}
