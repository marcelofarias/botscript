/**
 * Token-AST-based assert pass. Rewrites `assert <expr>` (statement position)
 * to `$assert(<expr>)`.
 */
import { lex } from "../parser/lex.js";
import type { Token } from "../parser/lex.js";

export function passAssert(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "assert") continue;
    if (!isStatementPosition(tokens, i)) continue;

    // Read expression until `;` or `\n` at brace depth 0.
    let j = i + 1;
    j = skipTrivia(tokens, j);
    const exprStart = j;
    while (j < tokens.length) {
      const tk = tokens[j]!;
      if (tk.kind === "eof") break;
      if (tk.kind === "open" && tk.matchedAt !== undefined) {
        j = tk.matchedAt + 1;
        continue;
      }
      if (tk.kind === "close") break;
      if (tk.kind === "punct" && tk.text === ";") break;
      if (tk.kind === "newline") break;
      j++;
    }
    const expr = sliceText(tokens, exprStart, j).trim();
    if (!expr) continue;

    out += src.slice(cursor, t.start);
    out += `$assert(${expr})`;
    let endIdx = j;
    if (tokens[endIdx]?.kind === "punct" && tokens[endIdx]?.text === ";") {
      out += ";";
      endIdx++;
    }
    cursor = tokens[endIdx]?.start ?? src.length;
    i = endIdx - 1;
  }
  out += src.slice(cursor);
  return out;
}

function isStatementPosition(tokens: Token[], idx: number): boolean {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k]!;
    if (t.kind === "whitespace") continue;
    if (t.kind === "lineComment" || t.kind === "blockComment") continue;
    if (t.kind === "newline") return true;
    if (t.kind === "punct" && t.text === ";") return true;
    if (t.kind === "open" && t.text === "{") return true;
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
