import { primerAsComment } from "../primer.js";

const DIRECTIVE_RE = /^\s*\?primer\s*$/m;

/**
 * If the file begins with `?primer` (allowing leading whitespace and comments
 * before it), strip that line and inject the primer as a top-of-file JSDoc
 * comment. Done before any other pass so the rest of the source is unchanged.
 */
export function passPrimer(src: string): string {
  // Match only if it's effectively the first non-comment, non-whitespace token.
  // We do a quick scan: skip leading whitespace + line/block comments and
  // expect `?primer` next.
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) return src;
      i = end + 2;
      continue;
    }
    break;
  }
  // Tolerate a `?bs <version>` directive having already been stripped at line
  // start: passVersion runs before us, so this is the common case.
  if (!src.startsWith("?primer", i)) return src;

  // Consume to end of line.
  let j = i + "?primer".length;
  while (j < src.length && src[j] !== "\n") j++;

  const before = src.slice(0, i);
  const after = src.slice(j);
  return `${primerAsComment()}\n${before}${after}`;
}
