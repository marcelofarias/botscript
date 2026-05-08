/**
 * Token-AST-based test pass.
 *
 *   test "name" { body }   ->   $test("name", async () => { body });
 */
import { lex } from "../parser/lex.js";
import type { Token } from "../parser/lex.js";

export function passTest(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "test") continue;

    let j = i + 1;
    j = skipTrivia(tokens, j);
    const nameTok = tokens[j];
    if (!nameTok || nameTok.kind !== "string") continue;
    const name = nameTok.text;
    j++;
    j = skipTrivia(tokens, j);
    const open = tokens[j];
    if (!open || open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) continue;
    const close = open.matchedAt;
    const body = sliceText(tokens, j + 1, close);
    out += src.slice(cursor, t.start);
    out += `$test(${name}, async () => {${body}});`;
    cursor = tokens[close]!.end;
    i = close;
  }
  out += src.slice(cursor);
  return out;
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
