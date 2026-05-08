import { findOutside } from "../lex.js";

/**
 * Rewrite `assert <expr>` (statement form) to `$assert(<expr>)`. We only
 * rewrite when `assert` appears in statement position — i.e. preceded by
 * start-of-line whitespace, `;`, `{`, or beginning-of-file. Anything else
 * (member access, type predicate, etc.) is left alone.
 */
export function passAssert(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const found = findOutside(src, "assert", i);
    if (found === -1) {
      out += src.slice(i);
      break;
    }
    const before = src[found - 1] ?? "\n";
    const after = src[found + 6] ?? " ";
    const isWordBoundary =
      !/[A-Za-z0-9_$]/.test(before) && !/[A-Za-z0-9_$]/.test(after);
    if (!isWordBoundary || !isStatementStart(src, found)) {
      out += src.slice(i, found + 6);
      i = found + 6;
      continue;
    }

    // Emit everything up to here, then rewrite up to end-of-statement.
    out += src.slice(i, found);
    let j = found + 6;
    // Skip whitespace.
    while (j < src.length && (src[j] === " " || src[j] === "\t")) j++;
    // Read until `;` or newline at top level.
    const exprStart = j;
    let depth = 0;
    while (j < src.length) {
      const c = src[j];
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      else if (depth === 0 && (c === ";" || c === "\n")) break;
      j++;
    }
    const expr = src.slice(exprStart, j).trim();
    out += `$assert(${expr})`;
    if (src[j] === ";") {
      out += ";";
      j++;
    }
    i = j;
  }
  return out;
}

function isStatementStart(src: string, at: number): boolean {
  let j = at - 1;
  while (j >= 0 && (src[j] === " " || src[j] === "\t")) j--;
  if (j < 0) return true;
  const c = src[j];
  return c === "\n" || c === ";" || c === "{";
}
