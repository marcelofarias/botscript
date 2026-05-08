/**
 * Bracket-aware skipping. We deliberately do not build a full TS AST — the
 * point of botscript is to be a thin syntactic shell over TS, and a regex +
 * brace matcher is enough.
 *
 * Every helper takes the raw source and a starting index, and returns an
 * index pointing to the *closing* delimiter (or the end of source if
 * unbalanced — callers should treat that as a parse error).
 */

const isIdentStart = (c: string): boolean =>
  (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_" || c === "$";

const isIdentCont = (c: string): boolean => isIdentStart(c) || (c >= "0" && c <= "9");

/** Skip a single string literal starting at src[i] (which is " or '). */
function skipString(src: string, i: number): number {
  const quote = src[i];
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === quote) return i + 1;
    i++;
  }
  return i;
}

/** Skip a template literal starting at src[i] (which is `). Handles ${ ... } interpolations. */
function skipTemplate(src: string, i: number): number {
  i++; // past `
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "`") return i + 1;
    if (c === "$" && src[i + 1] === "{") {
      i = skipBalanced(src, i + 1, "{", "}");
      continue;
    }
    i++;
  }
  return i;
}

/** Skip line comment starting at src[i] (which is the first /). */
function skipLineComment(src: string, i: number): number {
  while (i < src.length && src[i] !== "\n") i++;
  return i;
}

/** Skip block comment starting at src[i] (which is the first /). */
function skipBlockComment(src: string, i: number): number {
  i += 2;
  while (i < src.length - 1) {
    if (src[i] === "*" && src[i + 1] === "/") return i + 2;
    i++;
  }
  return src.length;
}

/**
 * Step exactly one token's worth, skipping past strings/comments/templates as
 * single units. Returns the new index. Used by `skipBalanced`.
 */
export function stepOne(src: string, i: number): number {
  const c = src[i];
  if (c === '"' || c === "'") return skipString(src, i);
  if (c === "`") return skipTemplate(src, i);
  if (c === "/" && src[i + 1] === "/") return skipLineComment(src, i);
  if (c === "/" && src[i + 1] === "*") return skipBlockComment(src, i);
  return i + 1;
}

/**
 * Given index pointing to `open`, find index *just past* the matching `close`.
 * Skips strings/templates/comments cleanly. Throws on unbalanced.
 */
export function skipBalanced(src: string, openIdx: number, open: string, close: string): number {
  if (src[openIdx] !== open) {
    throw new Error(`skipBalanced: expected '${open}' at ${openIdx}, got '${src[openIdx]}'`);
  }
  let depth = 0;
  let i = openIdx;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`" || (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))) {
      i = stepOne(src, i);
      continue;
    }
    if (c === open) {
      depth++;
      i++;
      continue;
    }
    if (c === close) {
      depth--;
      i++;
      if (depth === 0) return i;
      continue;
    }
    i++;
  }
  throw new Error(`skipBalanced: unbalanced '${open}'/'${close}' starting at ${openIdx}`);
}

/** Skip whitespace (and comments treated as whitespace). Returns new index. */
export function skipWs(src: string, i: number): number {
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      i = skipLineComment(src, i);
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      i = skipBlockComment(src, i);
      continue;
    }
    return i;
  }
  return i;
}

/** Read an identifier starting at src[i]. Returns [text, end]. */
export function readIdent(src: string, i: number): [string, number] {
  if (!isIdentStart(src[i] ?? "")) return ["", i];
  let j = i + 1;
  while (j < src.length && isIdentCont(src[j] ?? "")) j++;
  return [src.slice(i, j), j];
}

/**
 * Walk forward token-by-token, calling `visit` with the current index.
 * The visitor returns either a number to jump to or `undefined` to step one.
 * Strings/comments/templates are skipped as single units (visitor not called
 * inside them). Used by passes that want to scan top-level structure.
 */
export function walk(src: string, visit: (i: number) => number | undefined): void {
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`" || (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))) {
      i = stepOne(src, i);
      continue;
    }
    const j = visit(i);
    i = j === undefined ? i + 1 : j;
  }
}

/** Find the index of the next non-string/template/comment occurrence of `needle`. */
export function findOutside(src: string, needle: string, from = 0): number {
  let i = from;
  while (i < src.length) {
    const c = src[i];
    if (c === '"' || c === "'" || c === "`" || (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*"))) {
      i = stepOne(src, i);
      continue;
    }
    if (src.startsWith(needle, i)) return i;
    i++;
  }
  return -1;
}
