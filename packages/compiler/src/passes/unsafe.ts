/**
 * `unsafe "<reason>" { <body> }` pass (botscript 0.2+).
 *
 * The escape hatch for `as` casts and other places the type system can't
 * follow. Every `unsafe` block must carry a non-empty justification string —
 * the bot writing the cast names the reason at the moment it's freshest, the
 * next reviewer (human or model) sees the *why* in the diff instead of just
 * a bare cast.
 *
 * Rejected:
 *   unsafe { ... }            -> UNS001 (no justification)
 *   unsafe "" { ... }         -> UNS002 (empty justification)
 *   unsafe "reason"           -> UNS003 (no body)
 *
 * Accepted:
 *   unsafe "reason" { body }  -> /* unsafe: "reason" *\/ (() => { body })()
 *
 * The justification is preserved as a leading block comment so it shows up
 * in the compiled .ts file and in any downstream review tooling.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex, type Token } from "../parser/lex.js";
import { locationOf } from "./_location.js";

export function passUnsafe(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "unsafe") continue;
    if (!isExpressionPosition(tokens, i)) continue;

    const j = skipTrivia(tokens, i + 1);
    const head = tokens[j];

    // Must be followed by a string literal.
    if (!head || head.kind !== "string") {
      // Distinguish "no justification" (next is `{`) from "no body" (next is something else / nothing).
      if (head?.kind === "open" && head.text === "{") {
        throw mkError("UNS001", t, src, "unsafe block has no justification string");
      }
      throw mkError("UNS001", t, src, "unsafe block must be followed by a justification string");
    }

    const k = skipTrivia(tokens, j + 1);
    const open = tokens[k];
    // Declaration-level `unsafe "reason" fn` — the fn keyword (or `async fn` before it)
    // follows the reason string instead of `{`. Skip it here BEFORE validating the
    // reason string: declaration-level reasons are owned by passFn. passFn emits the
    // correct declaration-level UNS002 (with the right rewrite hint) for an empty
    // `unsafe "" fn` reason at ?bs 0.5+; earlier pins parse it without enforcement.
    // Either way, the block-level UNS002 message here must not fire on a fn prefix.
    if (open && open.kind === "keyword" && open.keyword === "fn") {
      continue;
    }
    if (open && open.kind === "keyword" && open.keyword === "async") {
      const m = skipTrivia(tokens, k + 1);
      const fnTok = tokens[m];
      if (fnTok && fnTok.kind === "keyword" && fnTok.keyword === "fn") continue;
    }

    // Reason content must be non-empty (strip surrounding quotes).
    const reason = head.text.slice(1, -1);
    if (reason.trim() === "") {
      throw mkError("UNS002", head, src, "unsafe justification is empty");
    }

    if (!open || open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) {
      throw mkError("UNS003", t, src, "unsafe block has no body — expected `{ ... }`");
    }
    const close = open.matchedAt;
    const body = sliceText(tokens, k + 1, close).trim();

    // Wrap body so a bare expression flows out as a value.
    const wrapped = wrapBody(body);
    const reasonComment = `/* unsafe: ${head.text.replace(/\*\//g, "*\\/")} */`;
    const emit = `${reasonComment} (() => { ${wrapped} })()`;

    out += src.slice(cursor, t.start);
    out += emit;
    cursor = tokens[close]!.end;
    i = close;
  }

  out += src.slice(cursor);
  return out;
}

function mkError(code: "UNS001" | "UNS002" | "UNS003", tok: Token, src: string, message: string): BotscriptError {
  const entry = getErrorCode(code)!;
  const { line, column } = locationOf(src, tok.start);
  const diag: Diagnostic = {
    code,
    severity: "error",
    file: null,
    line,
    column,
    message,
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite: entry.rewrite,
  };
  return new BotscriptError([diag]);
}

function isExpressionPosition(tokens: Token[], idx: number): boolean {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k]!;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") continue;
    if (t.kind === "eq" || t.kind === "fatArrow") return true;
    if (t.kind === "punct" && (t.text === "," || t.text === ":" || t.text === ";")) return true;
    if (t.kind === "punct" && t.text === ".") return false;
    if (t.kind === "open" && (t.text === "(" || t.text === "[" || t.text === "{")) return true;
    if (t.kind === "question" || t.kind === "questionDot" || t.kind === "questionQuestion") return true;
    if (t.kind === "operator") return true;
    if (t.kind === "ident" && t.text === "return") return true;
    if (t.kind === "keyword") return true;
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

