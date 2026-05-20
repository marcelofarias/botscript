/**
 * Token-based parser for `fn` declarations.
 *
 * Replaces the regex+brace-counting fn pass with a real top-down parser. Given
 * a token array and the index of an `fn` keyword, returns either a parsed
 * declaration or null (malformed). Callers replace tokens[startIdx..endIdx]
 * with the emitted text.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import type { Token } from "./lex.js";

export interface FnDecl {
  /** Token-array index where the parsed run begins (`unsafe` keyword, `async` modifier, or `fn`). */
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
  /** Source offset of the `fn` keyword (after `unsafe "reason"` and/or `async` if present). UTF-16 code units. */
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
  /**
   * TypeScript-compatible args: same as `args` but with botscript `->` arrows
   * converted to `=>` and any `uses { … }`, `reads { … }`, and `writes { … }`
   * annotations stripped from function-typed parameters. Used by `emitFn` so
   * the emitted TypeScript compiles cleanly.
   *
   * Example: `(action: () uses { net } reads { cache } -> string)` →
   *          `(action: () => string)`
   */
  argsTs: string;
  /**
   * Union of all capability names declared in `uses { … }` annotations on
   * function-typed parameters. Empty when no parameter carries an effect
   * annotation. Used by `passEffCheck` (EFF002).
   *
   * Example: `(action: () uses { net } -> string)` → `["net"]`
   */
  paramCaps: string[];
  /**
   * Union of all resource-read labels declared in `reads { … }` annotations on
   * function-typed parameters. Empty when no parameter carries a reads annotation.
   * Used by `passEffCheck` (EFF003). Gated on `?bs 0.9`.
   *
   * Example: `(cb: () reads { cache } -> string)` → `["cache"]`
   */
  paramReads: string[];
  /**
   * Union of all resource-write labels declared in `writes { … }` annotations on
   * function-typed parameters. Empty when no parameter carries a writes annotation.
   * Used by `passEffCheck` (EFF004). Gated on `?bs 0.9`.
   *
   * Example: `(cb: () writes { metrics } -> void)` → `["metrics"]`
   */
  paramWrites: string[];
  /**
   * Union of all exception type names declared in `throws { … }` annotations on
   * function-typed parameters. Empty when no parameter carries a throws annotation.
   * Used by `passThrCheck` (THR003). Gated on `?bs 0.9`.
   *
   * Example: `(handler: (s: string) throws { NetworkError } -> void)` → `["NetworkError"]`
   */
  paramThrows: string[];
  capabilities: string[];
  /**
   * Optional declarative read-dependency list, e.g. `reads { cache, db }`. Each
   * element is an ident naming a resource category the function reads from.
   * Stripped from TS output; transitively enforced across same-file static calls
   * from `?bs 0.9` via DEP001. External, dynamic, and higher-order calls are not tracked.
   * Introduced in `?bs 0.8`.
   */
  reads?: string[];
  /**
   * Optional declarative write-dependency list, e.g. `writes { metrics, db }`. Each
   * element is an ident naming a resource category the function writes to.
   * Stripped from TS output; transitively enforced across same-file static calls
   * from `?bs 0.9` via DEP002. External, dynamic, and higher-order calls are not tracked.
   * Introduced in `?bs 0.8`.
   */
  writes?: string[];
  /**
   * Optional declarative exception list, e.g. `throws { HttpError, TimeoutError }`. Each
   * element is an ident naming an exception type the function (or its same-file statically
   * resolved callees) may throw. Only same-file calls are tracked — cross-module and
   * dynamic dispatch are not. Transitively enforced from `?bs 0.9` (THR001). Stripped from TS output.
   */
  throws?: string[];
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
  /**
   * Justification string from a declaration-level `unsafe "reason" fn …`
   * prefix. When set, bare `as` casts inside the body are allowed (the fn
   * is the declared trust boundary for type coercions). The reason is
   * preserved as a leading `/* unsafe: "…" *\/` comment in the emitted
   * TypeScript so the diff reviewer sees the why.
   *
   * Parsed version-agnostically (like intent) — the enforcement
   * (passBareAs skipping the body) activates only at ?bs 0.5+.
   */
  unsafeReason?: string;
  /** Source offset of the unsafe reason string token (UTF-16 code units, inclusive). Used to anchor UNS002 at the right location. */
  unsafeReasonStart?: number;
  returnType: string;
  /**
   * Token-array index of the first body token (`{` for block bodies, `=` for
   * expression bodies). Effect-check passes use this to scan only from the body
   * start rather than from `tokenStart`, avoiding false matches on idents in the
   * parameter list or return-type annotation.
   *
   * Optional so that code constructing `FnDecl` values outside the parser (e.g.
   * tests, mocks) is not forced to populate this field. Consumers should fall
   * back to `tokenStart` when absent: `fn.bodyTokenStart ?? fn.tokenStart`.
   */
  bodyTokenStart?: number;
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
  /**
   * Source text. When provided, parseFn throws a SYN001 BotscriptError on
   * duplicate header clauses (reads/writes/throws/intent) and on invalid label
   * tokens inside reads/writes/throws lists, rather than silently using first-wins.
   */
  src?: string;
}

/**
 * Parse a fn declaration starting at `idx` (which must be the `fn` keyword
 * token). Leading `async` and/or `unsafe "reason"` modifiers are consumed
 * by walking backwards from the `fn` token.
 *
 * Returns `null` when `idx` does not begin a valid fn declaration (the caller
 * should skip it). Throws `BotscriptError` (SYN001) when `opts.src` is
 * provided and the declaration has a structural error: duplicate header clauses
 * (`reads`, `writes`, `throws`, `intent`), or a non-identifier label inside `reads {}`,
 * `writes {}`, or `throws {}`.
 */
export function parseFn(
  tokens: Token[],
  idx: number,
  opts: ParseFnOptions = {},
): FnDecl | null {
  // Detect leading `async` and/or `unsafe "reason"` modifiers.
  // Valid prefix forms (in source order):
  //   fn name(...)
  //   async fn name(...)
  //   unsafe "reason" fn name(...)
  //   unsafe "reason" async fn name(...)
  //   async unsafe "reason" fn name(...)
  let isAsync = false;
  let tokenStart = idx;
  let unsafeReason: string | undefined;
  let unsafeReasonStart: number | undefined;

  const prev1 = prevSignificant(tokens, idx);
  if (prev1 !== -1 && tokens[prev1]!.kind === "keyword" && tokens[prev1]!.keyword === "async") {
    isAsync = true;
    tokenStart = prev1;
    // Check for `unsafe "reason"` before `async`
    const prev2 = prevSignificant(tokens, prev1);
    if (prev2 !== -1 && tokens[prev2]!.kind === "string") {
      const prev3 = prevSignificant(tokens, prev2);
      if (prev3 !== -1 && tokens[prev3]!.kind === "keyword" && tokens[prev3]!.keyword === "unsafe") {
        unsafeReason = tokens[prev2]!.text.slice(1, -1);
        unsafeReasonStart = tokens[prev2]!.start;
        tokenStart = prev3;
      }
    }
  } else if (prev1 !== -1 && tokens[prev1]!.kind === "string") {
    // Check for `unsafe "reason"` before `fn` (no async, or `async` before `unsafe`)
    const prev2 = prevSignificant(tokens, prev1);
    if (prev2 !== -1 && tokens[prev2]!.kind === "keyword" && tokens[prev2]!.keyword === "unsafe") {
      unsafeReason = tokens[prev1]!.text.slice(1, -1);
      unsafeReasonStart = tokens[prev1]!.start;
      tokenStart = prev2;
      // Also support `async unsafe "reason" fn` — async may precede the unsafe prefix.
      const prev3 = prevSignificant(tokens, prev2);
      if (prev3 !== -1 && tokens[prev3]!.kind === "keyword" && tokens[prev3]!.keyword === "async") {
        isAsync = true;
        tokenStart = prev3;
      }
    }
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
  const { text: argsTs, paramCaps, paramReads, paramWrites, paramThrows } = buildArgsTs(tokens, i, argsClose + 1, opts.src);
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

  // Optional `reads { ... }`, `writes { ... }`, `throws { ... }`, and `intent: "<value>"` in any
  // order between `uses {}` and `->`. All are metadata: stripped from TS output.
  let reads: string[] | undefined;
  let writes: string[] | undefined;
  let throws_: string[] | undefined; // trailing underscore avoids shadowing the FnDecl field `throws` declared below
  let intent: string | undefined;
  let intentStart: number | undefined;
  // Loop until we hit something that isn't reads/writes/throws/intent.
  for (;;) {
    const tok = tokens[i];
    if (tok?.kind === "ident" && (tok.text === "reads" || tok.text === "writes" || tok.text === "throws")) {
      const keyword = tok.text;
      const isDuplicate = (keyword === "reads" && reads !== undefined) ||
        (keyword === "writes" && writes !== undefined) ||
        (keyword === "throws" && throws_ !== undefined);
      const savedI = i;
      i++;
      i = skipTrivia(tokens, i);
      const open = tokens[i];
      if (!open || open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) {
        // Not a reads/writes/throws block — backtrack and stop.
        i = savedI;
        break;
      }
      const close = open.matchedAt;
      if (isDuplicate) {
        // Duplicate clause: emit SYN001 when src is available.
        throwSyn001(opts.src, tok, `duplicate \`${keyword} {}\` clause — each header clause may appear at most once`);
        // No src: fall through with first-wins (silent, for direct parseFn callers in tests).
      } else {
        const items = parseLabelList(tokens, i + 1, close, opts.src);
        if (keyword === "reads") {
          reads = items;
        } else if (keyword === "writes") {
          writes = items;
        } else {
          throws_ = items;
        }
      }
      i = close + 1;
      i = skipTrivia(tokens, i);
    } else if (tok?.kind === "ident" && tok.text === "intent") {
      const isDuplicateIntent = intent !== undefined;
      const savedI = i;
      i++;
      i = skipTrivia(tokens, i);
      if (tokens[i]?.kind === "punct" && tokens[i]?.text === ":") {
        i++;
        i = skipTrivia(tokens, i);
        const strTok = tokens[i];
        if (strTok?.kind === "string") {
          if (isDuplicateIntent) {
            // Duplicate clause: emit SYN001 when src is available.
            throwSyn001(opts.src, strTok, `duplicate \`intent:\` clause — each header clause may appear at most once`);
            // No src: fall through with first-wins (silent, for direct parseFn callers in tests).
          } else {
            // Strip the surrounding quotes to get the raw value.
            intentStart = strTok.start;
            const raw = strTok.text;
            intent = raw.startsWith('"') || raw.startsWith("'")
              ? raw.slice(1, -1)
              : raw;
          }
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
    argsTs,
    paramCaps,
    paramReads,
    paramWrites,
    paramThrows,
    capabilities,
    reads,
    writes,
    throws: throws_,
    intent,
    intentStart,
    unsafeReason,
    unsafeReasonStart,
    returnType,
    bodyTokenStart: typeEnd,
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

/**
 * Parse a user-defined label list inside `reads { ... }`, `writes { ... }`, or
 * `throws { ... }`. Labels must be plain identifiers. If `src` is provided and
 * a non-identifier token is found, throws SYN001 so users get a clear error
 * instead of silently receiving an empty or truncated list.
 */
function parseLabelList(tokens: Token[], from: number, to: number, src?: string): string[] {
  const labels: string[] = [];
  for (let i = from; i < to; i++) {
    const t = tokens[i]!;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") continue;
    // Commas are accepted as optional separators (e.g. `reads { cache, db }`).
    if (t.kind === "punct" && t.text === ",") continue;
    if (t.kind === "ident") {
      labels.push(t.text);
      continue;
    }
    // Non-identifier, non-separator token inside a reads/writes/throws list.
    throwSyn001(src, t, `invalid label in reads/writes/throws list — labels must be plain identifiers (e.g. \`cache\`, \`HttpError\`), not ${JSON.stringify(t.text)}`);
    // No src: silently ignore (backward compat for direct callers without src).
  }
  return labels;
}

/**
 * Throw a SYN001 BotscriptError when `src` is available. When `src` is absent
 * the caller falls through silently (backward compat for tests that call parseFn
 * directly without a source string).
 */
function throwSyn001(src: string | undefined, tok: Token, message: string): void {
  if (!src) return;
  const { line, column } = locationOf(src, tok.start);
  // Pull rule/idiom/rewrite from the central registry (AGENTS.md: passes
  // must not hard-code these fields). We fall back to inline strings only
  // if the registry entry is missing, which would itself be a bug.
  const entry = getErrorCode("SYN001");
  const diag: Diagnostic = {
    code: "SYN001",
    severity: "error",
    file: null,
    line,
    column,
    start: tok.start,
    end: tok.end,
    message,
    rule: entry?.rule ?? "duplicate or invalid fn header clause",
    idiom: entry?.idiom ?? "declare each clause once",
    rewrite: entry?.rewrite ?? "fn name(...) reads { cache, db } -> ...",
  };
  throw new BotscriptError([diag]);
}

function locationOf(src: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
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

/**
 * Build the TypeScript-compatible args string from the args token range.
 *
 * Three transformations applied:
 * 1. Botscript `->` (arrow token) → TypeScript `=>` (function type arrow).
 * 2. `uses { cap, … }` annotations on function-typed parameters are stripped
 *    from the emitted text and their capability names collected into `paramCaps`.
 * 3. `reads { label, … }` and `writes { label, … }` annotations on
 *    function-typed parameters are stripped and collected into `paramReads` /
 *    `paramWrites`.
 *
 * The stripping is position-independent: any effect annotation inside the args
 * list is treated as a parameter effect annotation. This is safe because the
 * stripping only activates on the specific `uses { ... }` / `reads { ... }` /
 * `writes { ... }` syntax pattern — a keyword/ident token immediately followed
 * by a `{...}` block — not on bare `reads` or `writes` identifiers elsewhere in
 * TypeScript type positions (e.g. `reads` as a field name in an object type).
 */
function buildArgsTs(
  tokens: Token[],
  from: number,
  to: number,
  src?: string,
): { text: string; paramCaps: string[]; paramReads: string[]; paramWrites: string[]; paramThrows: string[] } {
  let out = "";
  const paramCaps: string[] = [];
  const paramReads: string[] = [];
  const paramWrites: string[] = [];
  const paramThrows: string[] = [];
  let i = from;
  while (i < to) {
    const t = tokens[i]!;
    // Convert botscript function-type arrow to TypeScript function-type arrow.
    if (t.kind === "arrow") {
      out += "=>";
      i++;
      continue;
    }
    // Strip effect annotations (`uses`/`reads`/`writes`) and collect their labels.
    // Note: `uses` is a lexer keyword (kind="keyword"), but `reads` and `writes`
    // are treated as identifiers (kind="ident") by the lexer.
    const isUses = t.kind === "keyword" && t.keyword === "uses";
    const isReads = t.kind === "ident" && t.text === "reads";
    const isWrites = t.kind === "ident" && t.text === "writes";
    if (isUses || isReads || isWrites) {
      const j = skipTrivia(tokens, i + 1);
      const open = tokens[j];
      if (open && open.kind === "open" && open.text === "{" && open.matchedAt !== undefined) {
        if (isUses) {
          const labels = parseCapList(tokens, j + 1, open.matchedAt);
          for (const c of labels) paramCaps.push(c);
        } else {
          // parseLabelList validates that all tokens are plain identifiers and
          // fires SYN001 (via src) on invalid labels like `reads { "cache" }`.
          const labels = parseLabelList(tokens, j + 1, open.matchedAt, src);
          if (isReads) {
            for (const l of labels) paramReads.push(l);
          } else {
            for (const l of labels) paramWrites.push(l);
          }
        }
        i = open.matchedAt + 1;
        // Consume whitespace that separated the annotation from the `->` to
        // avoid double-spacing in the emitted TypeScript output.
        while (i < to && tokens[i]?.kind === "whitespace") i++;
        continue;
      }
    }
    // Strip `throws { types }` and collect the declared exception types.
    if (t.kind === "ident" && t.text === "throws") {
      const j = skipTrivia(tokens, i + 1);
      const open = tokens[j];
      if (open && open.kind === "open" && open.text === "{" && open.matchedAt !== undefined) {
        const types = parseLabelList(tokens, j + 1, open.matchedAt, src);
        for (const ty of types) paramThrows.push(ty);
        i = open.matchedAt + 1;
        while (i < to && tokens[i]?.kind === "whitespace") i++;
        continue;
      }
    }
    out += t.text;
    i++;
  }
  return { text: out, paramCaps, paramReads, paramWrites, paramThrows };
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
