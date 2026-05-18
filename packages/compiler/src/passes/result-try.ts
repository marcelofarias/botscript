/**
 * `Result.try { ... }` and `Result.tryAsync { ... }` block form (botscript 0.2+).
 *
 * The JS-boundary boilerplate that bots get wrong most often — wrapping a
 * throwing call in try/catch and converting the thrown value to an `Err`.
 * `Result.try { JSON.parse(s) }` lifts the body's value into `Ok` and any
 * thrown value into `Err<string>`, so the result stays inside the `?` chain
 * idiom instead of leaving the bot to hand-roll a try/catch every time.
 *
 * Rewrite:
 *   Result.try { body }       -> $resultTry(() => { wrapped(body) })
 *   Result.tryAsync { body }  -> $resultTryAsync(async () => { wrapped(body) })
 *
 * The auto-import pass picks up `$resultTry` / `$resultTryAsync` from the
 * runtime package — same path as the other compiler-emitted helpers.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex, type Token } from "../parser/lex.js";
import { lowerBlockBody } from "./_block-body.js";
import { locationOf } from "./_location.js";

export function passResultTry(src: string): string {
  const tokens = lex(src);
  let out = "";
  let cursor = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "ident" || t.text !== "Result") continue;

    const dotIdx = skipTrivia(tokens, i + 1);
    const dot = tokens[dotIdx];
    if (!dot || dot.kind !== "punct" || dot.text !== ".") continue;

    const methodIdx = skipTrivia(tokens, dotIdx + 1);
    const method = tokens[methodIdx];
    if (!method || method.kind !== "ident") continue;
    if (method.text !== "try" && method.text !== "tryAsync") continue;

    // After `Result.try` / `Result.tryAsync`, expect `{ ... }` (no `(`).
    const openIdx = skipTrivia(tokens, methodIdx + 1);
    const open = tokens[openIdx];
    if (!open) continue;
    // If the user wrote `Result.try(...)` (function call), skip — leave it alone.
    if (open.kind === "open" && open.text === "(") continue;
    if (open.kind !== "open" || open.text !== "{" || open.matchedAt === undefined) {
      throw mkError("RES001", t, src, `${method.text} block has no body — expected \`{ ... }\``);
    }

    const close = open.matchedAt;
    const body = sliceText(tokens, openIdx + 1, close).trim();
    const wrapped = wrapBody(body);

    const helper = method.text === "try" ? "$resultTry" : "$resultTryAsync";
    const arrow = method.text === "try" ? "() =>" : "async () =>";
    const emit = `${helper}(${arrow} { ${wrapped} })`;

    out += src.slice(cursor, t.start);
    out += emit;
    cursor = tokens[close]!.end;
    i = close;
  }

  out += src.slice(cursor);
  return out;
}

function mkError(code: "RES001", tok: Token, src: string, message: string): BotscriptError {
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
  return lowerBlockBody(body);
}

