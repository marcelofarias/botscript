/**
 * Tagged-union declarations (botscript 0.2+).
 *
 *   type Shape = Circle { r: number } | Square { side: number };
 *
 * desugars to:
 *
 *   type Shape = { kind: "Circle"; r: number } | { kind: "Square"; side: number };
 *
 * The `kind` discriminant matches what the existing `match` pass already
 * destructures on, so a tagged union declared this way is a one-line change
 * away from being matched exhaustively.
 *
 * Detection rule (precise on purpose):
 *  - `type Name<…> = Alt | Alt | …;` (or to end of line)
 *  - every Alt is either a bare TagIdent or `TagIdent { fields }`
 *  - at least one Alt carries the `{ … }` form
 *
 * Plain TS unions like `type X = Foo | Bar`, `type X = number | string`, and
 * `type X = { a: number }` are left untouched.
 *
 * halt modifier (botscript 0.9+):
 *  - `TagIdent halt` or `TagIdent halt { fields }` marks a variant as non-continuable.
 *  - The `halt` keyword is stripped from the TypeScript output (compile-time annotation only).
 *  - MAT005 enforces that any match arm covering a halt variant must call halt() or throw
 *    rather than returning a continuable value.
 *
 * distinct modifier (botscript 0.9+):
 *  - `TagIdent distinct` or `TagIdent distinct { fields }` marks a variant as requiring
 *    observably different handling from all sibling arms in the same match expression.
 *  - The `distinct` keyword is stripped from the TypeScript output (compile-time annotation only).
 *  - MAT006 fires when a distinct variant's arm body is textually identical to any other
 *    non-wildcard arm body in the same match, indicating the type-level distinction is a no-op.
 *
 *   type QueryResult =
 *     | Confirmed { value: string }
 *     | Recoverable { reason: string }
 *     | Unresolvable distinct { reason: string }
 *
 * desugars to:
 *
 *   type QueryResult =
 *     | { kind: "Confirmed"; value: string }
 *     | { kind: "Recoverable"; reason: string }
 *     | { kind: "Unresolvable"; reason: string }
 */

import { lex, type Token } from "../parser/lex.js";

interface TypeDecl {
  /** Token index of `type` (or `export` when prefixed). */
  start: number;
  /** Token index just past the trailing `;` or terminator. */
  end: number;
  /** Token index of the `=`. */
  eq: number;
  /** First token of the RHS (after `=`). */
  rhsStart: number;
  /** Token index just past the last RHS token (i.e., the terminator). */
  rhsEnd: number;
}

export interface Alt {
  tag: string;
  /** Body text inside the `{ … }`, or null for bare tag. */
  body: string | null;
  /**
   * True when the variant is declared with the `halt` modifier
   * (e.g. `Unresolvable halt { reason: string }`).  A match arm
   * covering this variant must call `halt()` or `throw` — it may not
   * return a continuable value (MAT005).
   */
  halt: boolean;
  /**
   * True when the variant is declared with the `distinct` modifier
   * (e.g. `Unresolvable distinct { reason: string }`).  A match arm
   * covering this variant must have a body that differs from all other
   * non-wildcard arms in the same match (MAT006).
   */
  distinct: boolean;
}

export function passTaggedUnion(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "ident" || t.text !== "type") continue;
    if (!atStatementStart(tokens, i)) continue;

    const decl = parseTypeDecl(tokens, i);
    if (!decl) continue;

    const alts = parseAlts(tokens, decl.rhsStart, decl.rhsEnd);
    if (!alts || !shouldRewrite(alts)) continue;

    // Emit verbatim everything from the cursor up to the start of the RHS,
    // then the desugared union members, then move the cursor to rhsEnd. This
    // preserves the original `type X<T>` header and the trailing `;` exactly.
    out += src.slice(cursor, tokens[decl.rhsStart]!.start);
    out += alts
      .map((a) => {
        const body = a.body?.trim() ?? "";
        return `{ kind: "${a.tag}"${body ? `; ${body}` : ""} }`;
      })
      .join(" | ");
    cursor = tokens[decl.rhsEnd]!.start;
    i = decl.rhsEnd - 1;
  }

  out += src.slice(cursor);
  return out;
}

function atStatementStart(tokens: Token[], idx: number): boolean {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k];
    if (!t) continue;
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      continue;
    }
    if (t.kind === "punct" && (t.text === ";" || t.text === ":")) return true;
    if (t.kind === "open" && (t.text === "{" || t.text === "(")) return true;
    if (t.kind === "close" && t.text === "}") return true;
    if (t.kind === "ident" && t.text === "export") return true;
    return false;
  }
  return true;
}

function parseTypeDecl(tokens: Token[], typeIdx: number): TypeDecl | null {
  let i = typeIdx + 1;
  i = skipTrivia(tokens, i);
  const nameTok = tokens[i];
  if (!nameTok || nameTok.kind !== "ident") return null;
  i++;
  // Walk to the `=` at depth zero across (), {}, [].
  let eq = -1;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t || t.kind === "eof") break;
    if (t.kind === "open" && t.matchedAt !== undefined) {
      i = t.matchedAt + 1;
      continue;
    }
    if (t.kind === "eq") {
      eq = i;
      break;
    }
    i++;
  }
  if (eq === -1) return null;

  const rhsStart = skipTrivia(tokens, eq + 1);
  // Read until terminator at depth zero: `;` or eof. A newline only terminates
  // when the next significant token is NOT `|` — that mirrors TS's ASI rule
  // for multi-line unions like:
  //   type Shape =
  //     | Circle { r: number }
  //     | Square { side: number };
  let j = rhsStart;
  while (j < tokens.length) {
    const t = tokens[j];
    if (!t || t.kind === "eof") break;
    if (t.kind === "open" && t.matchedAt !== undefined) {
      j = t.matchedAt + 1;
      continue;
    }
    if (t.kind === "punct" && t.text === ";") break;
    if (t.kind === "newline") {
      const nextIdx = skipTrivia(tokens, j + 1);
      const next = tokens[nextIdx];
      if (next?.kind === "operator" && next.text === "|") {
        j++;
        continue;
      }
      break;
    }
    j++;
  }
  return { start: typeIdx, end: j, eq, rhsStart, rhsEnd: j };
}

function parseAlts(tokens: Token[], from: number, to: number): Alt[] | null {
  const alts: Alt[] = [];
  let i = skipTrivia(tokens, from);
  // Optional leading `|` (TS-style multi-line unions).
  if (i < to && tokens[i]?.kind === "operator" && tokens[i]?.text === "|") {
    i = skipTrivia(tokens, i + 1);
  }
  while (i < to) {
    const tagTok = tokens[i];
    if (!tagTok || tagTok.kind !== "ident") return null;
    const tag = tagTok.text;
    i = skipTrivia(tokens, i + 1);
    let body: string | null = null;
    let isHalt = false;
    let isDistinct = false;
    // Optional `halt` or `distinct` modifier between tag name and optional body block.
    const maybeModifier = tokens[i];
    if (maybeModifier?.kind === "ident" && maybeModifier.text === "halt") {
      isHalt = true;
      i = skipTrivia(tokens, i + 1);
    } else if (maybeModifier?.kind === "ident" && maybeModifier.text === "distinct") {
      isDistinct = true;
      i = skipTrivia(tokens, i + 1);
    }
    const maybeBrace = tokens[i];
    if (
      maybeBrace?.kind === "open" &&
      maybeBrace.text === "{" &&
      maybeBrace.matchedAt !== undefined
    ) {
      body = sliceText(tokens, i + 1, maybeBrace.matchedAt);
      i = maybeBrace.matchedAt + 1;
    }
    alts.push({ tag, body, halt: isHalt, distinct: isDistinct });
    i = skipTrivia(tokens, i);
    if (i >= to) break;
    const sep = tokens[i];
    if (sep?.kind === "operator" && sep.text === "|") {
      i = skipTrivia(tokens, i + 1);
      continue;
    }
    return null;
  }
  return alts.length > 0 ? alts : null;
}

function shouldRewrite(alts: Alt[]): boolean {
  if (alts.length === 0) return false;
  // Rewrite when any alt has a body block (normal case) OR carries a modifier
  // keyword (halt/distinct) that must be stripped from the TypeScript output.
  return alts.some((a) => a.body !== null || a.halt || a.distinct);
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

/**
 * Collect all user-defined tagged-union declarations from an already-lexed token stream.
 *
 * Returns a map from union name → array of `Alt` objects (tag + body presence),
 * for every `type Name = A | B { … } | C` declaration that satisfies the
 * tagged-union detection rule (at least one alt carries a `{ … }` field block).
 * Callers use the `body` field of each `Alt` to determine whether a variant is
 * bare-tag or carries a field block.
 *
 * Accepts a pre-lexed token array so callers who already hold tokens (e.g.
 * passMatCheck) avoid lexing the source a second time.
 *
 * Used by MAT003 to check exhaustiveness of match arms against known unions.
 */
export function collectTaggedUnionTypes(tokens: Token[]): Map<string, Alt[]> {
  const result = new Map<string, Alt[]>();
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t) continue;
    if (t.kind === "open" && t.text === "{") { depth++; continue; }
    if (t.kind === "close" && t.text === "}") { if (depth > 0) depth--; continue; }
    if (depth !== 0) continue;
    if (t.kind !== "ident" || t.text !== "type") continue;

    const decl = parseTypeDecl(tokens, i);
    if (!decl) continue;

    const alts = parseAlts(tokens, decl.rhsStart, decl.rhsEnd);
    if (!alts || !shouldRewrite(alts)) continue;

    const nameIdx = skipTrivia(tokens, i + 1);
    const nameTok = tokens[nameIdx];
    if (!nameTok || nameTok.kind !== "ident") continue;

    result.set(nameTok.text, alts);
    i = decl.end;
  }

  return result;
}
