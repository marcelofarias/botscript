import { findOutside, readIdent, skipBalanced, skipWs, stepOne } from "../lex.js";

/**
 * Rewrites:
 *   fn name(args) [uses { caps }] -> ReturnType { body }
 *   fn name(args) [uses { caps }] -> ReturnType = pure { expr }
 *
 * into ordinary TS function declarations with the body wrapped in `$enter`
 * so capability requirements are enforced at runtime.
 *
 * Anonymous function expressions are not supported in v0.1; the `fn` keyword
 * always introduces a top-level (or member-style) named declaration.
 */
export function passFn(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const idx = findKeyword(src, "fn", i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);
    const result = parseFn(src, idx);
    if (!result) {
      // Malformed — pass through the keyword and keep going.
      out += "fn";
      i = idx + 2;
      continue;
    }
    out += result.emit;
    i = result.end;
  }
  return out;
}

interface FnParse {
  emit: string;
  end: number;
}

function parseFn(src: string, start: number): FnParse | null {
  // start points at `fn`. Move past keyword.
  let i = skipWs(src, start + 2);

  // Allow modifier `export` to have already been consumed by the caller's
  // surrounding text — botscript treats `export fn` as `export function`.
  // We let the existing prefix flow through unchanged.

  // Read function name.
  const [name, afterName] = readIdent(src, i);
  if (!name) return null;
  i = skipWs(src, afterName);

  // Args: balanced parens.
  if (src[i] !== "(") return null;
  const argsEnd = skipBalanced(src, i, "(", ")");
  const args = src.slice(i, argsEnd); // includes parens
  i = skipWs(src, argsEnd);

  // Optional `uses { ... }` clause.
  let caps: string[] = [];
  if (src.startsWith("uses", i) && /\W/.test(src[i + 4] ?? " ")) {
    i = skipWs(src, i + 4);
    if (src[i] !== "{") return null;
    const usesEnd = skipBalanced(src, i, "{", "}");
    const inner = src.slice(i + 1, usesEnd - 1);
    caps = inner
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    i = skipWs(src, usesEnd);
  }

  // Required `->` ReturnType. Read until we hit `{` or `=`.
  if (src[i] !== "-" || src[i + 1] !== ">") return null;
  i += 2;
  const typeStart = i;
  // Walk until we hit a top-level `{` or `=` outside angle/square brackets.
  let typeEnd = -1;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "<" || c === "[" || c === "(") {
      const close = c === "<" ? ">" : c === "[" ? "]" : ")";
      // For `<`, only treat as bracket if it looks like a generic — best effort.
      i = c === "<" ? skipAngles(src, i) : skipBalanced(src, i, c, close);
      continue;
    }
    if (c === "{" && depth === 0) {
      typeEnd = i;
      break;
    }
    if (c === "=" && src[i + 1] !== "=" && depth === 0) {
      typeEnd = i;
      break;
    }
    if (c === '"' || c === "'" || c === "`" || (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))) {
      i = stepOne(src, i);
      continue;
    }
    i++;
  }
  if (typeEnd === -1) return null;
  const returnType = src.slice(typeStart, typeEnd).trim();
  i = typeEnd;

  // Now one of:
  //   { body }                  — block body
  //   = pure { expr }           — pure shorthand
  //   = io   { expr }           — io shorthand
  //   = expr                    — single-expression body (terminated by `;` or
  //                               newline at brace-depth 0). Used to write
  //                               `fn area(s) -> n = match s { … }`.
  let body: string;
  let wrapExpr = false;
  if (src[i] === "=") {
    i = skipWs(src, i + 1);
    if (src.startsWith("pure", i) && /\W/.test(src[i + 4] ?? " ")) {
      i = skipWs(src, i + 4);
      if (src[i] !== "{") return null;
      const bEnd = skipBalanced(src, i, "{", "}");
      body = src.slice(i + 1, bEnd - 1);
      caps = []; // pure overrides any `uses { }` clause
      wrapExpr = true;
      i = bEnd;
    } else if (src.startsWith("io", i) && /\W/.test(src[i + 2] ?? " ")) {
      i = skipWs(src, i + 2);
      if (src[i] !== "{") return null;
      const bEnd = skipBalanced(src, i, "{", "}");
      body = src.slice(i + 1, bEnd - 1);
      wrapExpr = true;
      i = bEnd;
    } else {
      // Single-expression body. Read until `;` or newline at depth 0.
      const exprStart = i;
      let depth = 0;
      while (i < src.length) {
        const c = src[i];
        if (
          c === '"' ||
          c === "'" ||
          c === "`" ||
          (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))
        ) {
          i = stepOne(src, i);
          continue;
        }
        if (c === "{" || c === "(" || c === "[") depth++;
        else if (c === "}" || c === ")" || c === "]") depth--;
        else if (depth === 0 && (c === ";" || c === "\n")) break;
        i++;
      }
      body = src.slice(exprStart, i).trim();
      if (body === "") return null;
      wrapExpr = true;
      if (src[i] === ";") i++;
    }
  } else if (src[i] === "{") {
    const bEnd = skipBalanced(src, i, "{", "}");
    body = src.slice(i + 1, bEnd - 1);
    i = bEnd;
  } else {
    return null;
  }

  const capsLiteral = `[${caps.map((c) => JSON.stringify(c)).join(", ")}]`;
  const innerBody = wrapExpr ? wrapExprAsReturn(body) : body;
  const emit =
    `function ${name}${args}: ${returnType} {\n` +
    `  return $enter(${capsLiteral} as const, () => {\n` +
    `${indent(innerBody, 4)}\n` +
    `  });\n` +
    `}`;
  return { emit, end: i };
}

function findKeyword(src: string, kw: string, from: number): number {
  let i = from;
  while (true) {
    const found = findOutside(src, kw, i);
    if (found === -1) return -1;
    const before = src[found - 1] ?? " ";
    const after = src[found + kw.length] ?? " ";
    const isWordBoundary =
      !/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after);
    if (isWordBoundary) return found;
    i = found + kw.length;
  }
}

/** Heuristic angle-bracket skip for generic types like `Result<T, E>`. */
function skipAngles(src: string, openIdx: number): number {
  let i = openIdx + 1;
  let depth = 1;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (c === "<") depth++;
    else if (c === ">") depth--;
    else if (c === "\n") return openIdx + 1; // bail on newline — probably not a generic
    i++;
  }
  return i;
}

/**
 * For `pure { expr }` where the body is meant to be an expression: if the body
 * contains no `;` outside strings/templates, prepend `return ` to make it a
 * value-returning block. Otherwise pass through.
 */
function wrapExprAsReturn(body: string): string {
  const trimmed = body.trim();
  if (trimmed === "") return "";
  if (hasTopLevelSemicolon(trimmed) || /\breturn\b/.test(trimmed)) return trimmed;
  return `return ${trimmed};`;
}

function hasTopLevelSemicolon(src: string): boolean {
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
      // Crude skip — fine because we're scanning a small expression.
      i++;
      while (i < src.length && src[i] !== c) {
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

function indent(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l.length === 0 ? l : pad + l))
    .join("\n");
}
