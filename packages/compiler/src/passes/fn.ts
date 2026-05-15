/**
 * Token-AST-based fn pass. The lexer produces a token stream with matched
 * bracket pairs; the fn parser consumes a typed `FnDecl`; this pass emits the
 * desugared TypeScript and stitches it back into the source.
 *
 * This replaces the older string-rewrite version. Behaviour is identical for
 * every test in `tests/transform.test.ts`, plus we no longer rely on the
 * fragile `{ … }` body/object-type heuristic — bracket pairing comes from the
 * lexer and is always correct.
 */
import { lex } from "../parser/lex.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { parseFn } from "../parser/parse-fn.js";
import { lowerBlockBody } from "./_block-body.js";
import { atLeast, type VersionInfo } from "./version.js";

export function passFn(src: string, version?: VersionInfo): string {
  const tokens = lex(src);
  const allowGenerics = version ? atLeast(version.resolved, "0.4") : false;
  // Walk tokens, find every `fn` keyword, parse it, and emit the desugared TS.
  // We slice from previous emit-cursor to the start of the parsed run, then
  // append the emit. That keeps comments/whitespace verbatim.
  let out = "";
  let cursor = 0; // position in src
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "fn") continue;
    const decl = parseFn(tokens, i, { allowGenerics });
    if (!decl) continue;
    // Emit everything up to the start of this declaration.
    out += src.slice(cursor, tokens[decl.tokenStart]!.start);
    out += emitFn(decl);
    // Skip ahead past the declaration's last token.
    cursor = tokens[decl.tokenEnd - 1]
      ? tokens[decl.tokenEnd - 1]!.end
      : tokens[decl.tokenEnd]?.start ?? cursor;
    // Advance the loop cursor to past the consumed run.
    i = decl.tokenEnd - 1;
  }
  out += src.slice(cursor);
  return out;
}

function emitFn(decl: FnDecl): string {
  const capsLiteral = `[${decl.capabilities.map((c) => JSON.stringify(c)).join(", ")}]`;
  const arrow = decl.isAsync ? "async () => " : "() => ";

  const inner = renderBody(decl);
  const asyncPrefix = decl.isAsync ? "async " : "";
  // Type params are emitted verbatim between the name and the arg list.
  // 0.1/0.2/0.3 produce typeParams === null (allowGenerics gated off), so
  // the emitted shape there is byte-identical to before. Only ?bs 0.4+ sees
  // the `<…>` block in the TS output.
  const tparams = decl.typeParams ?? "";
  const unsafePrefix = decl.unsafeReason
    ? `/* unsafe: ${JSON.stringify(decl.unsafeReason)} */\n`
    : "";
  return (
    `${unsafePrefix}${asyncPrefix}function ${decl.name}${tparams}${decl.args}: ${decl.returnType} {\n` +
    `  return $enter(${capsLiteral} as const, ${arrow}{\n` +
    `${indent(inner, 4)}\n` +
    `  });\n` +
    `}`
  );
}

function renderBody(decl: FnDecl): string {
  if (decl.body.kind === "block") return decl.body.text;

  const text = decl.body.text.trim();
  if (text === "") return "";
  // For pure/io/expr body forms, lower the body into statement segments and
  // `return`-wrap only the tail expression. Without this an IIFE-bodied
  // helper either silently returns undefined (single-expr case) or emits
  // invalid TS (`return let x = ...`) when the body has multiple
  // statements separated by newlines instead of `;`.
  return lowerBlockBody(text);
}

function indent(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l.length === 0 ? l : pad + l))
    .join("\n");
}

