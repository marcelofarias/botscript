import { findOutside, skipBalanced, skipWs } from "../lex.js";

/**
 * Rewrite `test "name" { body }` into `$test("name", async () => { body });`
 * Top-level only. Names must be string literals (single or double quoted).
 *
 * The `body` is preserved verbatim — later passes (match, ?, assert) operate
 * on it as on any other code.
 */
export function passTest(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    // Find next `test` keyword at safe position.
    const idx = findKeyword(src, "test", i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, idx);

    // After `test`, expect whitespace, then a string literal.
    let j = skipWs(src, idx + 4);
    const quote = src[j];
    if (quote !== '"' && quote !== "'") {
      // Not a botscript test form — pass through.
      out += "test";
      i = idx + 4;
      continue;
    }
    let k = j + 1;
    while (k < src.length && src[k] !== quote) {
      if (src[k] === "\\") k += 2;
      else k++;
    }
    if (k >= src.length) {
      out += "test";
      i = idx + 4;
      continue;
    }
    const name = src.slice(j, k + 1);
    let after = skipWs(src, k + 1);
    if (src[after] !== "{") {
      out += "test";
      i = idx + 4;
      continue;
    }
    const bodyEnd = skipBalanced(src, after, "{", "}");
    const body = src.slice(after + 1, bodyEnd - 1);
    out += `$test(${name}, async () => {${body}});`;
    i = bodyEnd;
  }
  return out;
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
