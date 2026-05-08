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
    out += src.slice(cursor, tokens[decl.start]!.start);
    out += emitFn(decl);
    // Skip ahead past the declaration's last token.
    cursor = tokens[decl.end - 1] ? tokens[decl.end - 1]!.end : tokens[decl.end]?.start ?? cursor;
    // Advance the loop cursor to past the consumed run.
    i = decl.end - 1;
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
  return (
    `${asyncPrefix}function ${decl.name}${tparams}${decl.args}: ${decl.returnType} {\n` +
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
  // For pure/io/expr body forms, wrap in `return` IFF the body has no
  // top-level return or top-level `;`. Without this an IIFE-bodied helper
  // silently returns undefined.
  if (hasTopLevelReturn(text) || hasTopLevelSemicolon(text)) return text;
  return `return ${text};`;
}

function indent(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l.length === 0 ? l : pad + l))
    .join("\n");
}

function hasTopLevelReturn(src: string): boolean {
  let i = 0;
  let depth = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === "\\") i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (c === "`") {
      i++;
      while (i < src.length && src[i] !== "`") {
        if (src[i] === "\\") i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length - 1 && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "{" || c === "(" || c === "[") {
      depth++;
      i++;
      continue;
    }
    if (c === "}" || c === ")" || c === "]") {
      depth--;
      i++;
      continue;
    }
    if (depth === 0 && src.startsWith("return", i)) {
      const before = i === 0 ? " " : src[i - 1] ?? " ";
      const after = src[i + 6] ?? " ";
      if (!/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after)) return true;
    }
    i++;
  }
  return false;
}

function hasTopLevelSemicolon(src: string): boolean {
  let i = 0;
  let depth = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '"' || c === "'") {
      i++;
      while (i < src.length && src[i] !== c) {
        if (src[i] === "\\") i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (c === "`") {
      i++;
      while (i < src.length && src[i] !== "`") {
        if (src[i] === "\\") i += 2;
        else i++;
      }
      i++;
      continue;
    }
    if (c === "{" || c === "(" || c === "[") {
      depth++;
      i++;
      continue;
    }
    if (c === "}" || c === ")" || c === "]") {
      depth--;
      i++;
      continue;
    }
    if (c === ";" && depth === 0) return true;
    i++;
  }
  return false;
}
