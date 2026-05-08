/**
 * Token-based parser for `fn` declarations.
 *
 * Replaces the regex+brace-counting fn pass with a real top-down parser. Given
 * a token array and the index of an `fn` keyword, returns either a parsed
 * declaration or null (malformed). Callers replace tokens[startIdx..endIdx]
 * with the emitted text.
 */

import type { Token } from "./lex.js";

export interface FnDecl {
  /** Token index where the parsed run begins (the `async` modifier or `fn`). */
  start: number;
  /** Token index just after the parsed run (the next token to emit normally). */
  end: number;
  /**
   * Offset of the parsed run start in the source. UTF-16 code units (JS
   * string indices), not UTF-8 bytes — the lexer increments `i++` over
   * `string`, so every position in the AST shares that coordinate system.
   * The fields are still named `byteStart` / `byteEnd` / `*ByteStart` for
   * brevity and historical continuity; treat them as code-unit offsets.
   */
  byteStart: number;
  /** End offset (exclusive) of the parsed run. UTF-16 code units. */
  byteEnd: number;
  /** Offset of the `fn` keyword (after `async` if present). UTF-16 code units. */
  fnKeywordByteStart: number;
  /** Offset of the function name identifier. UTF-16 code units. */
  nameByteStart: number;
  isAsync: boolean;
  name: string;
  /**
   * Verbatim type-parameter block including the angle brackets, e.g. `<T>` or
   * `<T extends U, V = D>`, or null if none. Gated to ?bs 0.4+ at the call
   * site — earlier pins do not parse generics.
   */
  typeParams: string | null;
  /** Verbatim args including parens. */
  args: string;
  capabilities: string[];
  returnType: string;
  /** Body is a brace block OR a single-expression form (= pure / io / arbitrary). */
  body: FnBody;
}

export type FnBody =
  | { kind: "block"; text: string }
  | { kind: "expr"; text: string; wrappedAs: "pure" | "io" | "expr" };

export interface ParseFnOptions {
  /**
   * When true, the parser accepts an optional `<T, …>` type-parameter block
   * between the function name and the args. Gated to ?bs 0.4+ at the call
   * site — earlier pins do not parse generics, so a 0.1/0.2/0.3 file with
   * `fn id<T>(…)` would have failed before this option existed and must
   * continue to fail with allowGenerics=false.
   */
  allowGenerics?: boolean;
}

/**
 * Parse a fn declaration starting at `idx` (which must be the `fn` keyword
 * token). If the previous non-trivia token is `async`, that's consumed too.
 */
export function parseFn(
  tokens: Token[],
  idx: number,
  opts: ParseFnOptions = {},
): FnDecl | null {
  // Detect leading `async` modifier.
  let isAsync = false;
  let start = idx;
  const prev = prevSignificant(tokens, idx);
  if (prev !== -1 && tokens[prev]!.kind === "keyword" && tokens[prev]!.keyword === "async") {
    isAsync = true;
    start = prev;
  }

  // Skip past `fn` to the name.
  let i = idx + 1;
  i = skipTrivia(tokens, i);
  const nameTok = tokens[i];
  if (!nameTok || nameTok.kind !== "ident") return null;
  const name = nameTok.text;
  const nameByteStart = nameTok.start;
  i++;
  i = skipTrivia(tokens, i);

  // Optional type-parameter block (0.4+, opt-in).
  let typeParams: string | null = null;
  if (opts.allowGenerics) {
    const tp = tryParseTypeParams(tokens, i);
    if (tp) {
      typeParams = tp.text;
      i = tp.end;
      i = skipTrivia(tokens, i);
    }
  }

  // Args: balanced `(...)`.
  const argsOpen = tokens[i];
  if (!argsOpen || argsOpen.kind !== "open" || argsOpen.text !== "(" || argsOpen.matchedAt === undefined) return null;
  const argsClose = argsOpen.matchedAt;
  const args = sliceText(tokens, i, argsClose + 1);
  i = argsClose + 1;
  i = skipTrivia(tokens, i);

  // Optional `uses { caps }`.
  let capabilities: string[] = [];
  if (tokens[i]?.kind === "keyword" && tokens[i]?.keyword === "uses") {
    i++;
    i = skipTrivia(tokens, i);
    const usesOpen = tokens[i];
    if (!usesOpen || usesOpen.kind !== "open" || usesOpen.text !== "{" || usesOpen.matchedAt === undefined) return null;
    const usesClose = usesOpen.matchedAt;
    capabilities = parseCapList(tokens, i + 1, usesClose);
    i = usesClose + 1;
    i = skipTrivia(tokens, i);
  }

  // Required `->` ReturnType.
  if (tokens[i]?.kind !== "arrow") return null;
  i++;

  // Read return type tokens until we find body opener (`{` block) or `=` (single expr).
  // Object types `{ a: T }` inside the return type are skipped via matchedAt.
  const typeStart = i;
  let typeEnd = -1;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "eof") break;
    if (t.kind === "open" && t.matchedAt !== undefined) {
      // The brace might be (a) part of the return type (object type) or
      // (b) the body opener. Lookahead past matchedAt — if what follows is
      // another `{` or `=`, this brace was part of the type. Otherwise, it
      // IS the body.
      const after = skipTrivia(tokens, t.matchedAt + 1);
      const next = tokens[after];
      const nextLooksLikeBodyMarker =
        next?.kind === "open" && next.text === "{" ||
        next?.kind === "eq";
      if (t.text === "{" && !nextLooksLikeBodyMarker) {
        typeEnd = i;
        break;
      }
      // Otherwise skip past as part of the type (or whatever bracketed region).
      i = t.matchedAt + 1;
      continue;
    }
    if (t.kind === "eq") {
      typeEnd = i;
      break;
    }
    i++;
  }
  if (typeEnd === -1) return null;
  const returnType = sliceText(tokens, typeStart, typeEnd).trim();

  // Body: either `{ ... }` or `= [pure|io] { ... }` or `= <expression>`.
  let body: FnBody;
  let bodyEnd: number;
  const at = tokens[typeEnd]!;
  if (at.kind === "open" && at.text === "{") {
    if (at.matchedAt === undefined) return null;
    body = { kind: "block", text: sliceText(tokens, typeEnd + 1, at.matchedAt) };
    bodyEnd = at.matchedAt + 1;
  } else if (at.kind === "eq") {
    let j = typeEnd + 1;
    j = skipTrivia(tokens, j);
    const head = tokens[j];
    if (head?.kind === "keyword" && (head.keyword === "pure" || head.keyword === "io")) {
      const tag = head.keyword;
      j++;
      j = skipTrivia(tokens, j);
      const open = tokens[j];
      if (!open || open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) return null;
      body = { kind: "expr", text: sliceText(tokens, j + 1, open.matchedAt), wrappedAs: tag };
      bodyEnd = open.matchedAt + 1;
    } else {
      // `= <expression>` — read until `;` or newline at depth 0.
      const exprStart = j;
      let depth = 0;
      while (j < tokens.length) {
        const t = tokens[j]!;
        if (t.kind === "eof") break;
        if (t.kind === "open" && t.matchedAt !== undefined) {
          j = t.matchedAt + 1;
          continue;
        }
        if (t.kind === "close") {
          depth--;
          j++;
          continue;
        }
        if (depth === 0) {
          if (t.kind === "punct" && t.text === ";") break;
          if (t.kind === "newline") break;
        }
        j++;
      }
      const exprText = sliceText(tokens, exprStart, j).trim();
      if (exprText === "") return null;
      body = { kind: "expr", text: exprText, wrappedAs: "expr" };
      bodyEnd = j;
      // Consume a trailing `;` if present.
      if (tokens[bodyEnd]?.kind === "punct" && tokens[bodyEnd]?.text === ";") bodyEnd++;
    }
  } else {
    return null;
  }

  const startTok = tokens[start]!;
  const lastTok = tokens[bodyEnd - 1] ?? tokens[start]!;
  return {
    start,
    end: bodyEnd,
    byteStart: startTok.start,
    byteEnd: lastTok.end,
    fnKeywordByteStart: tokens[idx]!.start,
    nameByteStart,
    isAsync,
    name,
    typeParams,
    args,
    capabilities,
    returnType,
    body,
  };
}

/**
 * Recognize a balanced `<T, …>` block starting at `from`. Returns the verbatim
 * text (including the angle brackets) and the token index just after the
 * closing `>`. The lexer does NOT bracket-match `<`/`>` (they're operators,
 * not opens/closes), so we count depth manually here, allowing balanced
 * `(...)`, `{...}`, `[...]` inside, plus the multi-char `>>`/`>>>` operators
 * that close two or three levels at once.
 *
 * Returns null if the next token isn't `<`, or if no balanced close is found.
 */
function tryParseTypeParams(tokens: Token[], from: number): { text: string; end: number } | null {
  const t = tokens[from];
  if (!t || t.kind !== "operator" || t.text !== "<") return null;
  let depth = 1;
  let i = from + 1;
  while (i < tokens.length) {
    const tk = tokens[i]!;
    if (tk.kind === "eof") return null;
    if (tk.kind === "open" && tk.matchedAt !== undefined) {
      i = tk.matchedAt + 1;
      continue;
    }
    if (tk.kind === "operator") {
      if (tk.text === "<") {
        depth++;
        i++;
        continue;
      }
      if (tk.text === ">") {
        depth--;
        i++;
        if (depth === 0) return { text: sliceText(tokens, from, i), end: i };
        continue;
      }
      if (tk.text === ">>" || tk.text === ">>>") {
        depth -= tk.text.length;
        i++;
        // depth must land exactly at 0 to be a valid type-param close.
        // Overshoot (depth < 0) means the operator's `>`s would close more
        // levels than were open — treat as malformed and bail so the caller
        // doesn't get a phantom "valid" type-param block that desyncs the
        // rest of parseFn.
        if (depth === 0) return { text: sliceText(tokens, from, i), end: i };
        if (depth < 0) return null;
        continue;
      }
      if (tk.text === ">=") return null;
    }
    i++;
  }
  return null;
}

function parseCapList(tokens: Token[], from: number, to: number): string[] {
  const caps: string[] = [];
  let i = from;
  while (i < to) {
    const t = tokens[i]!;
    if (t.kind === "ident") {
      caps.push(t.text);
    }
    i++;
  }
  return caps;
}

/** Find the previous token index that isn't whitespace/newline/comment. */
function prevSignificant(tokens: Token[], idx: number): number {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k]!;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") continue;
    return k;
  }
  return -1;
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
