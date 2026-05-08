import { findOutside, skipBalanced, skipWs } from "../lex.js";

/**
 * `pure { ... }` and `io { ... }` as expressions. (The forms attached to a
 * `fn ... = pure { ... }` declaration are already consumed by the fn pass.)
 *
 *   pure { expr }   ->  $enter([], () => expr)
 *   io   { expr }   ->  ((() => expr)())
 *
 * If the body has top-level semicolons or a `return`, we leave it as a block
 * body. Otherwise the trailing expression is implicitly returned.
 */
export function passBlocks(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const next = nextBlockKeyword(src, i);
    if (!next) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, next.idx);
    const wsAfter = skipWs(src, next.idx + next.kw.length);
    if (src[wsAfter] !== "{") {
      out += next.kw;
      i = next.idx + next.kw.length;
      continue;
    }
    const bEnd = skipBalanced(src, wsAfter, "{", "}");
    const body = src.slice(wsAfter + 1, bEnd - 1).trim();
    const wrapped = wrapBody(body);
    if (next.kw === "pure") {
      out += `$enter([] as const, () => { ${wrapped} })`;
    } else {
      out += `(() => { ${wrapped} })()`;
    }
    i = bEnd;
  }
  return out;
}

function nextBlockKeyword(src: string, from: number): { idx: number; kw: "pure" | "io" } | null {
  let bestIdx = -1;
  let bestKw: "pure" | "io" | null = null;
  for (const kw of ["pure", "io"] as const) {
    let scan = from;
    while (true) {
      const found = findOutside(src, kw, scan);
      if (found === -1) break;
      const before = src[found - 1] ?? " ";
      const after = src[found + kw.length] ?? " ";
      // Word boundary on both sides.
      if (/[A-Za-z0-9_$]/.test(before) || /[A-Za-z0-9_$]/.test(after)) {
        scan = found + kw.length;
        continue;
      }
      // Must look like a block expression: be preceded by something that
      // suggests an expression position, not e.g. `function pure(){}`.
      // We accept after `=`, `return`, `(`, `,`, `[`, `:`, `?`, `&&`, `||`, `=>`, `;`, `{`, or BOF.
      if (!isExpressionPosition(src, found)) {
        scan = found + kw.length;
        continue;
      }
      if (bestIdx === -1 || found < bestIdx) {
        bestIdx = found;
        bestKw = kw;
      }
      break;
    }
  }
  if (bestIdx === -1 || bestKw === null) return null;
  return { idx: bestIdx, kw: bestKw };
}

function isExpressionPosition(src: string, at: number): boolean {
  let j = at - 1;
  while (j >= 0 && /\s/.test(src[j] ?? "")) j--;
  if (j < 0) return true;
  const c = src[j];
  if (c === "=" || c === "(" || c === "," || c === "[" || c === ":" || c === "?" || c === ";" || c === "{") return true;
  if (c === ">" && src[j - 1] === "=") return true; // `=>`
  if (c === "&" && src[j - 1] === "&") return true;
  if (c === "|" && src[j - 1] === "|") return true;
  // `return` keyword
  if (c === "n" && src.slice(Math.max(0, j - 5), j + 1) === "return") return true;
  return false;
}

function wrapBody(body: string): string {
  if (body === "") return "";
  if (hasTopLevelSemicolon(body) || /\breturn\b/.test(body)) return body;
  return `return ${body};`;
}

function hasTopLevelSemicolon(src: string): boolean {
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`") {
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
