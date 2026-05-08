/**
 * `test "name" with mocks { time, random } { body }` (botscript 0.2+)
 *
 * Rewrites the `with mocks { caps } { body }` form into a regular
 * `test "name" { await $withMocks(["caps", …], async () => { body }) }`.
 * The base test pass then handles the rest. Tests pinned to 0.1 (or any
 * file without the with-mocks clause) are passed through unchanged.
 *
 * The clause is structural — `with` and `mocks` are two consecutive idents
 * after the test's name string and before its body block. Plain
 * `test "name" { body }` continues to work unchanged.
 */

import { lex, type Token } from "../parser/lex.js";

export function passTestMocks(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "test") continue;

    let j = i + 1;
    j = skipTrivia(tokens, j);
    const nameTok = tokens[j];
    if (!nameTok || nameTok.kind !== "string") continue;
    j++;
    j = skipTrivia(tokens, j);

    // Require `with` ident.
    const withTok = tokens[j];
    if (!withTok || withTok.kind !== "ident" || withTok.text !== "with") continue;
    j++;
    j = skipTrivia(tokens, j);

    // Require `mocks` ident.
    const mocksTok = tokens[j];
    if (!mocksTok || mocksTok.kind !== "ident" || mocksTok.text !== "mocks") continue;
    j++;
    j = skipTrivia(tokens, j);

    // Require `{ caps }` block.
    const capsOpen = tokens[j];
    if (
      !capsOpen ||
      capsOpen.kind !== "open" ||
      capsOpen.text !== "{" ||
      capsOpen.matchedAt === undefined
    ) {
      continue;
    }
    const caps = parseCapList(tokens, j + 1, capsOpen.matchedAt);
    j = capsOpen.matchedAt + 1;
    j = skipTrivia(tokens, j);

    // Require body `{ … }` block.
    const bodyOpen = tokens[j];
    if (
      !bodyOpen ||
      bodyOpen.kind !== "open" ||
      bodyOpen.text !== "{" ||
      bodyOpen.matchedAt === undefined
    ) {
      continue;
    }
    const bodyClose = bodyOpen.matchedAt;
    const body = sliceText(tokens, j + 1, bodyClose);

    // Emit verbatim text up to the `with` ident, then the rewritten form.
    out += src.slice(cursor, withTok.start);
    const capsLiteral = `[${caps.map((c) => JSON.stringify(c)).join(", ")}]`;
    out += `{ await $withMocks(${capsLiteral} as const, async () => {${body}}); }`;
    cursor = tokens[bodyClose]!.end;
    i = bodyClose;
  }

  out += src.slice(cursor);
  return out;
}

function parseCapList(tokens: Token[], from: number, to: number): string[] {
  const caps: string[] = [];
  for (let i = from; i < to; i++) {
    const t = tokens[i];
    if (t && t.kind === "ident") caps.push(t.text);
  }
  return caps;
}

function skipTrivia(tokens: Token[], i: number): number {
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

function sliceText(tokens: Token[], from: number, to: number): string {
  let out = "";
  for (let i = from; i < to; i++) {
    const t = tokens[i];
    if (!t) break;
    out += t.text;
  }
  return out;
}
