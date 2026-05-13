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
  /** Token-array index where the parsed run begins (`async` modifier or `fn`). */
  tokenStart: number;
  /** Token-array index just after the parsed run (the next token to emit normally). */
  tokenEnd: number;
  /**
   * Source offset of the parsed run start. UTF-16 code units (JS string
   * indices), not UTF-8 bytes — the lexer increments `i++` over `string`,
   * so every position in the AST shares that coordinate system. End is
   * exclusive: `src.slice(start, end)` yields the verbatim declaration.
   */
  start: number;
  /** Source offset just after the parsed run end. UTF-16 code units, exclusive. */
  end: number;
  /** Source offset of the `fn` keyword (after `async` if present). UTF-16 code units. */
  fnKeywordStart: number;
  /** Source offset of the function name identifier. UTF-16 code units. */
  nameStart: number;
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
  /**
   * Optional declarative read-dependency list, e.g. `reads { cache, db }`. Each
   * element is an ident naming a resource category the function reads from.
   * Metadata-only in the first version — stripped from TS output, not yet
   * enforced transitively. Introduced in `?bs 0.8`.
   */
  reads?: string[];
  /**
   * Optional declarative write-dependency list, e.g. `writes { metrics, db }`. Each
   * element is an ident naming a resource category the function writes to.
   * Metadata-only in the first version — stripped from TS output, not yet
   * enforced transitively. Introduced in `?bs 0.8`.
   */
  writes?: string[];
  /**
   * Optional machine-checkable intent string, e.g. `"pure"`, `"idempotent"`.
   * Parsed from `intent: "<value>"` between the `uses {}` clause and `->` in
   * the function header. Present only when the `intent:` clause is written;
   * undefined otherwise.
   *
   * The compiler uses this to verify that claimed properties are consistent
   * with the function's capability declarations and body shape. Introduced
   * in `?bs 0.7` (gated at the check level, not the parse level — parseFn
   * always accepts it so earlier pins that happen to write it don't crash).
   */
  intent?: string;
  /** Source offset of the intent string token (UTF-16 code units, inclusive). */
  intentStart?: number;
  returnType: string;
  /** Body is a brace block OR a single-expression form (= pure / io / arbitrary). */
  body: FnBody;
}

/**
 * `start` / `end` are source offsets covering the whole body construct.
 * UTF-16 code units, end-exclusive — same coordinate system as `FnDecl.start`
 * / `FnDecl.end`. Tools that rewrite the body in place (the canonical-form
 * formatter) splice `src.slice(0, body.start) + ... + src.slice(body.end)`
 * to keep everything else verbatim.
 *
 * Per body shape, `end` lands at:
 *   - `block`:                             just past the matching `}`.
 *   - `expr` with `wrappedAs: "pure"|"io"`: just past the `pure`/`io` body's
 *                                          closing `}`. parseFn does NOT
 *                                          consume any trailing `;` here.
 *   - `expr` with `wrappedAs: "expr"`:     just past the expression, INCLUDING
 *                                          a trailing `;` when one is present
 *                                          (parseFn consumes it as part of
 *                                          the bare-expression body).
 */
export type FnBody =
  | { kind: "block"; text: string; start: number; end: number }
  | { kind: "expr"; text: string; wrappedAs: "pure" | "io" | "expr"; start: number; end: number };

export interface ParseFnOptions {
  /**
   * When true, the parser accepts an optional `<T, …>` type-parameter block
   * between the function name and the args. Gated to ?bs 0.4+ at the call
   * site — earlier pins must keep their original behaviour, where parseFn
   * sees the unexpected `<` after the name and returns null. The
   * declaration is then left unrewritten and passes through to the TS
   * output as-is (the same forward-compat behaviour 0.1/0.2/0.3 always
   * had on this construct).
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
  let tokenStart = idx;
  const prev = prevSignificant(tokens, idx);
  if (prev !== -1 && tokens[prev]!.kind === "keyword" && tokens[prev]!.keyword === "async") {
    isAsync = true;
    tokenStart = prev;
  }

  // Skip past `fn` to the name.
  let i = idx + 1;
  i = skipTrivia(tokens, i);
  const nameTok = tokens[i];
  if (!nameTok || nameTok.kind !== "ident") return null;
  const name = nameTok.text;
  const nameStart = nameTok.start;
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

  // Optional `reads { ... }`, `writes { ... }`, and `intent: "<value>"` in any
  // order between `uses {}` and `->`. All are metadata: stripped from TS output.
  let reads: string[] | undefined;
  let writes: string[] | undefined;
  let intent: string | undefined;
  let intentStart: number | undefined;
  // Loop until we hit something that isn't reads/writes/intent.
  for (;;) {
    const tok = tokens[i];
    if (tok?.kind === "ident" && (tok.text === "reads" || tok.text === "writes")) {
      const keyword = tok.text;
      // Duplicate annotation — treat as a parse error (stop parsing the header).
      if (keyword === "reads" && reads !== undefined) break;
      if (keyword === "writes" && writes !== undefined) break;
      const savedI = i;
      i++;
      i = skipTrivia(tokens, i);
      const open = tokens[i];
      if (!open || open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) {
        // Not a reads/writes block — backtrack and stop.
        i = savedI;
        break;
      }
      const close = open.matchedAt;
      const items = parseCapList(tokens, i + 1, close);
      if (keyword === "reads") {
        reads = items;
      } else {
        writes = items;
      }
      i = close + 1;
      i = skipTrivia(tokens, i);
    } else if (tok?.kind === "ident" && tok.text === "intent") {
      // Duplicate intent: — treat as a parse error (stop parsing the header).
      if (intent !== undefined) break;
      const savedI = i;
      i++;
      i = skipTrivia(tokens, i);
      if (tokens[i]?.kind === "punct" && tokens[i]?.text === ":") {
        i++;
        i = skipTrivia(tokens, i);
        const strTok = tokens[i];
        if (strTok?.kind === "string") {
          // Strip the surrounding quotes to get the raw value.
          intentStart = strTok.start;
          const raw = strTok.text;
          intent = raw.startsWith('"') || raw.startsWith("'")
            ? raw.slice(1, -1)
            : raw;
          i++;
          i = skipTrivia(tokens, i);
        } else {
          // Not a string — backtrack and stop.
          i = savedI;
          break;
        }
      } else {
        // No colon after `intent` — backtrack and stop.
        i = savedI;
        break;
      }
    } else {
      break;
    }
  }

  // Required `->` ReturnType.
  if (tokens[i]?.kind !== "arrow") return null;
  i++;

  // Read return type tokens until we find the body opener (`{` block) or
  // `=` (single expr). The lexer pairs `()` `[]` `{}` via matchedAt, but
  // does NOT pair `<` and `>` (they're ambiguous with comparison operators
  // in expression context). After `->` we are unambiguously in type
  // position, so we track angle-bracket depth manually here. With that, a
  // `{...}` inside generic args is unambiguously part of the type, and an
  // outer `{...}` only ever competes with the body opener — handled below.
  const typeStart = i;
  let typeEnd = -1;
  let angleDepth = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "eof") break;

    // Track `<` and `>` as paired delimiters in type position. Angle close
    // tokens can collapse: `Map<K, Vec<T>>` lexes its tail as a single `>>`,
    // and three nested generics close as `>>>`. Decrement by length.
    if (t.kind === "operator") {
      if (t.text === "<") {
        angleDepth++;
        i++;
        continue;
      }
      if (
        angleDepth > 0 &&
        (t.text === ">" || t.text === ">>" || t.text === ">>>")
      ) {
        angleDepth = Math.max(0, angleDepth - t.text.length);
        i++;
        continue;
      }
    }

    if (t.kind === "open" && t.matchedAt !== undefined) {
      // Inside generics, any bracketed group (including `{...}` object
      // types) is unambiguously part of the type — skip past.
      if (angleDepth > 0 || t.text !== "{") {
        i = t.matchedAt + 1;
        continue;
      }
      // At outer type level a `{...}` is either the return type's outermost
      // object literal OR the body opener. Disambiguate by what follows the
      // matched `}`: `{` or `=` means the type ended at this `{...}` and a
      // body marker follows; `|` or `&` means the type continues as a union
      // or intersection. Anything else means this `{` is the body.
      const after = skipTrivia(tokens, t.matchedAt + 1);
      const next = tokens[after];
      const typeContinues =
        (next?.kind === "open" && next.text === "{") ||
        next?.kind === "eq" ||
        (next?.kind === "operator" && (next.text === "|" || next.text === "&"));
      if (!typeContinues) {
        typeEnd = i;
        break;
      }
      i = t.matchedAt + 1;
      continue;
    }

    // `=` at outer level marks the start of an expression body.
    if (t.kind === "eq" && angleDepth === 0) {
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
    body = {
      kind: "block",
      text: sliceText(tokens, typeEnd + 1, at.matchedAt),
      start: at.start,
      end: tokens[at.matchedAt]!.end,
    };
    bodyEnd = at.matchedAt + 1;
  } else if (at.kind === "eq") {
    const eqStart = at.start;
    let j = typeEnd + 1;
    j = skipTrivia(tokens, j);
    const head = tokens[j];
    if (head?.kind === "keyword" && (head.keyword === "pure" || head.keyword === "io")) {
      const tag = head.keyword;
      j++;
      j = skipTrivia(tokens, j);
      const open = tokens[j];
      if (!open || open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) return null;
      body = {
        kind: "expr",
        text: sliceText(tokens, j + 1, open.matchedAt),
        wrappedAs: tag,
        start: eqStart,
        end: tokens[open.matchedAt]!.end,
      };
      bodyEnd = open.matchedAt + 1;
    } else {
      // `= <expression>` — read until `;` or newline at top level. The lexer
      // pairs every `open` with its matching `close` via `matchedAt`, so we
      // skip past balanced groups by jumping `open → matchedAt + 1`. That
      // means the loop never sees a `close` that belongs to a balanced
      // group; if one shows up here it's an unmatched stray and the body
      // is malformed — bail rather than over-consume tokens.
      const exprStart = j;
      while (j < tokens.length) {
        const t = tokens[j]!;
        if (t.kind === "eof") break;
        if (t.kind === "open" && t.matchedAt !== undefined) {
          j = t.matchedAt + 1;
          continue;
        }
        if (t.kind === "close") return null;
        if (t.kind === "punct" && t.text === ";") break;
        if (t.kind === "newline") break;
        j++;
      }
      const exprText = sliceText(tokens, exprStart, j).trim();
      if (exprText === "") return null;
      bodyEnd = j;
      // Consume a trailing `;` if present.
      if (tokens[bodyEnd]?.kind === "punct" && tokens[bodyEnd]?.text === ";") bodyEnd++;
      const lastBodyTok = tokens[bodyEnd - 1] ?? at;
      body = {
        kind: "expr",
        text: exprText,
        wrappedAs: "expr",
        start: eqStart,
        end: lastBodyTok.end,
      };
    }
  } else {
    return null;
  }

  const startTok = tokens[tokenStart]!;
  const lastTok = tokens[bodyEnd - 1] ?? tokens[tokenStart]!;
  return {
    tokenStart,
    tokenEnd: bodyEnd,
    start: startTok.start,
    end: lastTok.end,
    fnKeywordStart: tokens[idx]!.start,
    nameStart,
    isAsync,
    name,
    typeParams,
    args,
    capabilities,
    reads,
    writes,
    intent,
    intentStart,
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
