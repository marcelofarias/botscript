/**
 * Botscript lexer. Produces a token stream from source.
 *
 * The lexer tokenizes everything, including strings/templates/comments —
 * those are emitted as opaque tokens that downstream code never has to
 * inspect or re-parse. Brace/paren/bracket matching is computed at lex
 * time (each `Open` token carries the index of its matching `Close`),
 * so the parser never has to count brackets manually.
 */

export type TokenKind =
  | "ident"
  | "keyword"
  | "number"
  | "string"
  | "template"
  | "regex"
  | "lineComment"
  | "blockComment"
  | "whitespace"
  | "newline"
  | "open" // { ( [
  | "close" // } ) ]
  | "punct" // single-char punct that isn't a bracket: , ; : .
  | "arrow" // ->
  | "fatArrow" // =>
  | "eq" // = (single)
  | "questionDot" // ?.
  | "questionQuestion" // ??
  | "question" // ? (postfix unwrap or optional)
  | "directive" // ?primer or ?bs <version>
  | "operator" // generic operator: + - * / % < > == === ! && || etc.
  | "eof";

/**
 * Tokens are tightly-typed values. We deliberately keep `text` as the verbatim
 * substring and `start`/`end` as indices into the source, so the lexer is a
 * faithful slicer — no information is lost.
 */
export interface Token {
  kind: TokenKind;
  text: string;
  start: number;
  end: number;
  /** For `open` tokens: index in the token array of the matching `close`. */
  matchedAt?: number;
  /** For directive tokens: the parsed directive name (`primer` | `bs`). */
  directive?: "primer" | "bs";
  /** For directive `?bs <version>`: the version string. */
  directiveValue?: string;
  /** For keyword tokens: the keyword text (so consumers don't recompute). */
  keyword?: string;
}

/** Botscript-specific keywords, recognized only when standalone (word-boundary). */
const KEYWORDS = new Set([
  "fn",
  "uses",
  "pure",
  "io",
  "match",
  "test",
  "assert",
  "async", // modifier preceding fn
  "unsafe", // 0.2+ — escape hatch that must carry a justification string
]);

const PAIRS: Record<string, string> = { "{": "}", "(": ")", "[": "]" };
const CLOSES = new Set(["}", ")", "]"]);

const isIdentStart = (c: string): boolean =>
  (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";

const isIdentCont = (c: string): boolean =>
  isIdentStart(c) || (c >= "0" && c <= "9");

const isDigit = (c: string): boolean => c >= "0" && c <= "9";

export function lex(src: string): Token[] {
  const tokens: Token[] = [];
  const opens: number[] = []; // stack of token indices waiting for their close
  let i = 0;

  // Track whether the previous *meaningful* token (skipping whitespace/comments)
  // could end an expression. Used to disambiguate `/` between division and
  // regex literal. The set is approximate but works for botscript code.
  const prevEndsExpr = (): boolean => {
    for (let k = tokens.length - 1; k >= 0; k--) {
      const t = tokens[k]!;
      if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") continue;
      if (t.kind === "ident" || t.kind === "number" || t.kind === "string" || t.kind === "template") return true;
      if (t.kind === "close") return true;
      if (t.kind === "question") return true; // a postfix `?` ends an expr
      return false;
    }
    return false;
  };

  while (i < src.length) {
    const start = i;
    const c = src[i]!;

    // --- whitespace & newlines ---
    if (c === " " || c === "\t") {
      while (i < src.length && (src[i] === " " || src[i] === "\t")) i++;
      tokens.push({ kind: "whitespace", text: src.slice(start, i), start, end: i });
      continue;
    }
    if (c === "\n" || c === "\r") {
      while (i < src.length && (src[i] === "\n" || src[i] === "\r")) i++;
      tokens.push({ kind: "newline", text: src.slice(start, i), start, end: i });
      continue;
    }

    // --- comments ---
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      tokens.push({ kind: "lineComment", text: src.slice(start, i), start, end: i });
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length - 1 && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i = Math.min(src.length, i + 2);
      tokens.push({ kind: "blockComment", text: src.slice(start, i), start, end: i });
      continue;
    }

    // --- regex literal — only after operators/keywords/start, not after expr ---
    if (c === "/" && !prevEndsExpr()) {
      // Try to read a regex. Bail if it doesn't look like one.
      let j = i + 1;
      let inClass = false;
      while (j < src.length) {
        const ch = src[j];
        if (ch === "\\") { j += 2; continue; }
        if (ch === "[") { inClass = true; j++; continue; }
        if (ch === "]") { inClass = false; j++; continue; }
        if (ch === "/" && !inClass) { j++; break; }
        if (ch === "\n") break;
        j++;
      }
      // Consume regex flags.
      while (j < src.length && /[A-Za-z]/.test(src[j] ?? "")) j++;
      // Plausible regex if there was a closing slash.
      if (j > i + 1 && src[j - 1 - (src[j - 1]!.match(/[A-Za-z]/) ? 0 : 0)] !== undefined) {
        tokens.push({ kind: "regex", text: src.slice(start, j), start, end: j });
        i = j;
        continue;
      }
      // Otherwise fall through to operator handling.
    }

    // --- strings ---
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "\n") break;
        i++;
      }
      if (i < src.length) i++;
      tokens.push({ kind: "string", text: src.slice(start, i), start, end: i });
      continue;
    }

    // --- template literal (preserve verbatim, including ${ ... } interpolations) ---
    if (c === "`") {
      i++;
      while (i < src.length && src[i] !== "`") {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "$" && src[i + 1] === "{") {
          // Balance `{ ... }` with template-aware nesting.
          let depth = 1;
          i += 2;
          while (i < src.length && depth > 0) {
            const ch = src[i]!;
            if (ch === "\\") { i += 2; continue; }
            if (ch === '"' || ch === "'") {
              const q = ch;
              i++;
              while (i < src.length && src[i] !== q) {
                if (src[i] === "\\") i += 2;
                else i++;
              }
              if (i < src.length) i++;
              continue;
            }
            if (ch === "`") {
              // Nested template — recurse via skip.
              i = skipTemplate(src, i);
              continue;
            }
            if (ch === "{") depth++;
            else if (ch === "}") depth--;
            i++;
          }
          continue;
        }
        i++;
      }
      if (i < src.length) i++;
      tokens.push({ kind: "template", text: src.slice(start, i), start, end: i });
      continue;
    }

    // --- numbers (int + float, no scientific for now) ---
    if (isDigit(c)) {
      while (i < src.length && (isDigit(src[i]!) || src[i] === ".")) i++;
      tokens.push({ kind: "number", text: src.slice(start, i), start, end: i });
      continue;
    }

    // --- directives: `?primer` and `?bs <version>` (only at the very start of a line) ---
    if (c === "?" && atLineStart(src, i)) {
      if (src.startsWith("?primer", i)) {
        i += "?primer".length;
        tokens.push({ kind: "directive", text: src.slice(start, i), start, end: i, directive: "primer" });
        continue;
      }
      if (src.startsWith("?bs", i) && /\s/.test(src[i + 3] ?? "")) {
        let j = i + 3;
        while (j < src.length && (src[j] === " " || src[j] === "\t")) j++;
        const vstart = j;
        while (j < src.length && /[\d.]/.test(src[j] ?? "")) j++;
        const value = src.slice(vstart, j);
        tokens.push({
          kind: "directive",
          text: src.slice(start, j),
          start,
          end: j,
          directive: "bs",
          directiveValue: value,
        });
        i = j;
        continue;
      }
    }

    // --- identifiers / keywords ---
    if (isIdentStart(c)) {
      let j = i + 1;
      while (j < src.length && isIdentCont(src[j] ?? "")) j++;
      const name = src.slice(i, j);
      if (KEYWORDS.has(name)) {
        tokens.push({ kind: "keyword", text: name, start: i, end: j, keyword: name });
      } else {
        tokens.push({ kind: "ident", text: name, start: i, end: j });
      }
      i = j;
      continue;
    }

    // --- brackets (with matched-pair indices) ---
    if (c === "{" || c === "(" || c === "[") {
      const idx = tokens.length;
      tokens.push({ kind: "open", text: c, start, end: i + 1 });
      opens.push(idx);
      i++;
      continue;
    }
    if (CLOSES.has(c)) {
      const idx = tokens.length;
      tokens.push({ kind: "close", text: c, start, end: i + 1 });
      const openIdx = opens.pop();
      if (openIdx !== undefined) {
        const o = tokens[openIdx]!;
        const expected = PAIRS[o.text] ?? "";
        if (expected === c) {
          o.matchedAt = idx;
          tokens[idx]!.matchedAt = openIdx;
        }
      }
      i++;
      continue;
    }

    // --- multi-char operators and special tokens ---
    if (c === "-" && src[i + 1] === ">") {
      tokens.push({ kind: "arrow", text: "->", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (c === "=" && src[i + 1] === ">") {
      tokens.push({ kind: "fatArrow", text: "=>", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (c === "?" && src[i + 1] === ".") {
      tokens.push({ kind: "questionDot", text: "?.", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (c === "?" && src[i + 1] === "?") {
      tokens.push({ kind: "questionQuestion", text: "??", start, end: i + 2 });
      i += 2;
      continue;
    }
    if (c === "?") {
      tokens.push({ kind: "question", text: "?", start, end: i + 1 });
      i++;
      continue;
    }
    if (c === "=" && src[i + 1] !== "=") {
      tokens.push({ kind: "eq", text: "=", start, end: i + 1 });
      i++;
      continue;
    }

    // Generic operators — anything else that's not punct/bracket.
    if (",;:.".includes(c)) {
      tokens.push({ kind: "punct", text: c, start, end: i + 1 });
      i++;
      continue;
    }

    // Multi-char comparison and logical ops.
    const two = src.slice(i, i + 2);
    const three = src.slice(i, i + 3);
    if (["===", "!==", "**=", "...", ">>>"].includes(three)) {
      tokens.push({ kind: "operator", text: three, start, end: i + 3 });
      i += 3;
      continue;
    }
    if (["==", "!=", "<=", ">=", "&&", "||", "<<", ">>", "++", "--", "+=", "-=", "*=", "/=", "%=", "**", "&=", "|=", "^="].includes(two)) {
      tokens.push({ kind: "operator", text: two, start, end: i + 2 });
      i += 2;
      continue;
    }
    if ("+-*/%<>!&|^~".includes(c)) {
      tokens.push({ kind: "operator", text: c, start, end: i + 1 });
      i++;
      continue;
    }

    // Unknown — keep moving to avoid infinite loop.
    tokens.push({ kind: "operator", text: c, start, end: i + 1 });
    i++;
  }

  tokens.push({ kind: "eof", text: "", start: src.length, end: src.length });
  return tokens;
}

function atLineStart(src: string, i: number): boolean {
  let j = i - 1;
  while (j >= 0) {
    const c = src[j];
    if (c === "\n") return true;
    if (c === " " || c === "\t" || c === "\r") {
      j--;
      continue;
    }
    return false;
  }
  return true;
}

function skipTemplate(src: string, openIdx: number): number {
  let i = openIdx + 1;
  while (i < src.length && src[i] !== "`") {
    if (src[i] === "\\") { i += 2; continue; }
    if (src[i] === "$" && src[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < src.length && depth > 0) {
        const ch = src[i]!;
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        i++;
      }
      continue;
    }
    i++;
  }
  return Math.min(src.length, i + 1);
}
