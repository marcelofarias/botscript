import type { Token } from "./lex.js";

export interface MatchExpr {
  start: number;
  end: number;
  /** Verbatim scrutinee text (without surrounding parens, if any). */
  scrutinee: string;
  arms: MatchArm[];
}

export type Pattern =
  | { kind: "tag"; tag: string; binds: string[] }
  | { kind: "literal"; value: string }
  | { kind: "wildcard" };

export interface MatchArm {
  pattern: Pattern;
  /** Verbatim arm body (single expression). */
  body: string;
  /** Token index of the first token in the arm body (after `->` and whitespace). */
  bodyStartToken: number;
}

/**
 * Parse a `match` expression starting at the `match` keyword token. Bracket
 * pairing comes from the lexer (open.matchedAt), so scrutinee parsing is
 * trivial — no manual brace counting.
 */
export function parseMatch(tokens: Token[], idx: number): MatchExpr | null {
  let i = idx + 1;
  i = skipTrivia(tokens, i);

  // Scrutinee: either a paren-wrapped expression, or anything up to the
  // brace that opens the arms block.
  let scrutinee: string;
  let scrutEnd: number;
  const t = tokens[i];
  if (!t) return null;
  if (t.kind === "open" && t.text === "(" && t.matchedAt !== undefined) {
    const close = t.matchedAt;
    scrutinee = sliceText(tokens, i + 1, close).trim();
    scrutEnd = close + 1;
  } else {
    // Read until the next `{` at depth 0, skipping `(...)` / `[...]`.
    let j = i;
    while (j < tokens.length) {
      const tk = tokens[j]!;
      if (tk.kind === "eof") return null;
      if (tk.kind === "open" && (tk.text === "(" || tk.text === "[")) {
        if (tk.matchedAt === undefined) return null;
        j = tk.matchedAt + 1;
        continue;
      }
      if (tk.kind === "open" && tk.text === "{") {
        scrutinee = sliceText(tokens, i, j).trim();
        scrutEnd = j;
        return parseArms(tokens, scrutinee, scrutEnd, idx);
      }
      j++;
    }
    return null;
  }
  return parseArms(tokens, scrutinee, scrutEnd, idx);
}

function parseArms(tokens: Token[], scrutinee: string, scrutEnd: number, startIdx: number): MatchExpr | null {
  let i = skipTrivia(tokens, scrutEnd);
  const blockOpen = tokens[i];
  if (!blockOpen || blockOpen.kind !== "open" || blockOpen.text !== "{" || blockOpen.matchedAt === undefined) return null;
  const blockClose = blockOpen.matchedAt;

  const arms: MatchArm[] = [];
  // Walk tokens between `{` and `}` to collect arms.
  let cursor = i + 1;
  while (cursor < blockClose) {
    cursor = skipTrivia(tokens, cursor);
    if (cursor >= blockClose) break;

    // Parse a pattern.
    const pat = parsePattern(tokens, cursor);
    if (!pat) return null;
    cursor = pat.end;
    cursor = skipTrivia(tokens, cursor);

    // Expect `->`.
    if (tokens[cursor]?.kind !== "arrow") return null;
    cursor++;
    cursor = skipTrivia(tokens, cursor);

    // Read arm body until top-level `;`, `\n`, or end-of-arms `}`.
    const bodyStart = cursor;
    while (cursor < blockClose) {
      const tk = tokens[cursor]!;
      if (tk.kind === "open" && tk.matchedAt !== undefined) {
        cursor = tk.matchedAt + 1;
        continue;
      }
      if (tk.kind === "punct" && tk.text === ";") break;
      if (tk.kind === "newline") break;
      cursor++;
    }
    const body = sliceText(tokens, bodyStart, cursor).trim();
    arms.push({ pattern: pat.pattern, body, bodyStartToken: bodyStart });
    if (tokens[cursor]?.kind === "punct" && tokens[cursor]?.text === ";") cursor++;
    cursor = skipTrivia(tokens, cursor);
  }

  if (arms.length === 0) return null;

  return {
    start: startIdx,
    end: blockClose + 1,
    scrutinee,
    arms,
  };
}

interface ParsedPattern {
  pattern: Pattern;
  end: number;
}

function parsePattern(tokens: Token[], idx: number): ParsedPattern | null {
  let i = idx;
  const t = tokens[i];
  if (!t) return null;

  // Wildcard: `_` ident
  if (t.kind === "ident" && t.text === "_") {
    return { pattern: { kind: "wildcard" }, end: i + 1 };
  }

  // Literal: string, template (rare), number, or bare true/false/null ident.
  if (t.kind === "string") {
    return { pattern: { kind: "literal", value: t.text }, end: i + 1 };
  }
  if (t.kind === "number") {
    return { pattern: { kind: "literal", value: t.text }, end: i + 1 };
  }
  if (t.kind === "ident" && (t.text === "true" || t.text === "false" || t.text === "null")) {
    return { pattern: { kind: "literal", value: t.text }, end: i + 1 };
  }

  // Tag (with optional binding block).
  if (t.kind === "ident") {
    const tag = t.text;
    let j = i + 1;
    j = skipTrivia(tokens, j);
    let binds: string[] = [];
    if (tokens[j]?.kind === "open" && tokens[j]?.text === "{") {
      const open = tokens[j]!;
      if (open.matchedAt === undefined) return null;
      const close = open.matchedAt;
      // Extract bind names — idents only, comma-separated.
      for (let k = j + 1; k < close; k++) {
        const tk = tokens[k]!;
        if (tk.kind === "ident") binds.push(tk.text);
      }
      j = close + 1;
    }
    return { pattern: { kind: "tag", tag, binds }, end: j };
  }

  return null;
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
