/**
 * Shared type-string scanner utility.
 *
 * Centralises generic-depth tracking for type expressions so that all passes
 * that need to parse type strings use the same, correct scanner rather than
 * independently re-implementing (and re-introducing) the same family of bugs.
 *
 * Arrow-type guard: both `->` (botscript arrow) and `=>` (TypeScript fat-arrow)
 * contain `>` characters that are NOT generic-close tokens.  Every depth scanner
 * here guards against both by checking whether the preceding character is `-` or `=`.
 *
 * Nesting tracked: `<>`, `[]`, `()`, `{}` — commas / pipes inside any of these
 * are not top-level separators.
 */

// ---------------------------------------------------------------------------
// Core scanner
// ---------------------------------------------------------------------------

interface Depth {
  angle: number;
  bracket: number;
  paren: number;
  brace: number;
}

function isAtTopLevel(d: Depth): boolean {
  return d.angle === 0 && d.bracket === 0 && d.paren === 0 && d.brace === 0;
}

function advanceDepth(s: string, i: number, d: Depth): void {
  const ch = s[i];
  if (ch === "<") { d.angle++; return; }
  if (ch === ">" && (i === 0 || (s[i - 1] !== "-" && s[i - 1] !== "="))) {
    // Skip `>` that is part of `->` or `=>` — those are arrow operators, not generic-close.
    if (d.angle > 0) d.angle--;
    return;
  }
  if (ch === "[") { d.bracket++; return; }
  if (ch === "]") { if (d.bracket > 0) d.bracket--; return; }
  if (ch === "(") { d.paren++; return; }
  if (ch === ")") { if (d.paren > 0) d.paren--; return; }
  if (ch === "{") { d.brace++; return; }
  if (ch === "}") { if (d.brace > 0) d.brace--; return; }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Split `s` on `|` characters that are not inside `<>`, `[]`, `()`, or `{}`.
 * Returns at least one element (the whole string when no top-level `|` exists).
 */
export function splitTopLevelPipe(s: string): string[] {
  const parts: string[] = [];
  const d: Depth = { angle: 0, bracket: 0, paren: 0, brace: 0 };
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "|" && isAtTopLevel(d)) {
      parts.push(s.slice(start, i).trim());
      start = i + 1;
    } else {
      advanceDepth(s, i, d);
    }
  }
  parts.push(s.slice(start).trim());
  return parts;
}

/**
 * Returns the index of the first top-level comma in `s`, or -1 if none.
 * Used to find the T / E split in `Result<T, E>`.
 */
export function topLevelCommaIndex(s: string): number {
  const d: Depth = { angle: 0, bracket: 0, paren: 0, brace: 0 };
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "," && isAtTopLevel(d)) return i;
    advanceDepth(s, i, d);
  }
  return -1;
}

/**
 * Returns the index of the matching `>` for the `<` at `openIdx` in `s`,
 * tracking all nested depth forms and guarding `->` / `=>`.
 * Returns -1 if `openIdx` is out-of-bounds, does not point at `<`, or no
 * matching `>` is found.
 */
export function matchingAngleClose(s: string, openIdx: number): number {
  if (openIdx < 0 || openIdx >= s.length || s[openIdx] !== "<") return -1;
  const d: Depth = { angle: 0, bracket: 0, paren: 0, brace: 0 };
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === "<") {
      advanceDepth(s, i, d);
    } else if (s[i] === ">" && (i === 0 || (s[i - 1] !== "-" && s[i - 1] !== "="))) {
      if (d.angle === 1) return i; // the matching close
      advanceDepth(s, i, d);
    } else {
      advanceDepth(s, i, d);
    }
  }
  return -1;
}

/**
 * Returns true if `s` (trimmed) is *exactly* `Result<…>` at the top level —
 * i.e. the outermost type constructor is `Result` and there are no trailing tokens
 * (rules out `Result<T,E> | Other`, `Wrapper<Result<T,E>>`, etc.).
 * Allows optional whitespace between `Result` and `<`.
 */
export function isTopLevelResult(s: string): boolean {
  const t = s.trim();
  if (!/^Result\s*</.test(t)) return false;
  const openAngle = t.indexOf("<");
  const closeAngle = matchingAngleClose(t, openAngle);
  // The matching `>` must be the very last character — no trailing tokens.
  return closeAngle !== -1 && closeAngle === t.length - 1;
}

/**
 * If `s` (trimmed) is a top-level `Result<T, E>` expression, returns `[T, E]` (trimmed).
 * Also handles a single outer `Promise<Result<T, E>>` wrapper.
 * Returns `null` if the type is not a (possibly Promise-wrapped) top-level `Result<T, E>`.
 */
export function extractResultArgs(s: string): [string, string] | null {
  let rt = s.trim();

  // Unwrap a leading `Promise<…>` — async fns still signal errors through Result.
  // The `Promise<>` must be the whole expression; trailing tokens like `| Other`
  // mean the overall type is not a Promise-wrapped Result.
  if (/^Promise\s*</.test(rt)) {
    const promiseOpen = rt.indexOf("<");
    const promiseClose = matchingAngleClose(rt, promiseOpen);
    if (promiseClose === -1) return null;
    // Reject if there is anything after the closing `>` of Promise<…>.
    if (promiseClose !== rt.length - 1) return null;
    rt = rt.slice(promiseOpen + 1, promiseClose).trim();
  }

  // isTopLevelResult also verifies the matching `>` is at the end of rt.
  if (!isTopLevelResult(rt)) return null;

  const openAngle = rt.indexOf("<");
  if (openAngle === -1) return null;

  // Find the content between the outer `<` and its matching `>`.
  const closeAngle = matchingAngleClose(rt, openAngle);
  if (closeAngle === -1) return null;

  const content = rt.slice(openAngle + 1, closeAngle);
  const commaIdx = topLevelCommaIndex(content);
  if (commaIdx === -1) return null;

  return [content.slice(0, commaIdx).trim(), content.slice(commaIdx + 1).trim()];
}

/**
 * Returns the full content between the outermost `<` and its matching `>` in a
 * generic type like `Outer<A, B>` (i.e. `"A, B"`), or `null` if no well-formed
 * generic argument list exists.
 */
export function extractOutermostGenericContent(s: string): string | null {
  const openAngle = s.indexOf("<");
  if (openAngle === -1) return null;
  const closeAngle = matchingAngleClose(s, openAngle);
  if (closeAngle === -1) return null;
  return s.slice(openAngle + 1, closeAngle);
}

/**
 * Extract the leading identifier from a type expression.
 * Returns `""` in two cases:
 *   - The type resolves to an array form: any type expression that ends with an
 *     empty-bracket suffix `[]` (e.g. `ParseError[]`, `ParseError<T>[]`,
 *     `Foo["bar"][]`, `Errors.ParseError[]`).
 *   - The type does not start with an identifier (e.g. `[A, B]`, tuple literals).
 * Returns the base identifier when the type is a plain name or generic
 * (e.g. `ParseError` → `"ParseError"`, `ParseError<T>` → `"ParseError"`).
 * Indexed-access types like `Foo["bar"]` or `Foo[Bar]` (without trailing `[]`)
 * return the base ident, not `""`.
 */
export function stripArraySuffix(type: string): string {
  const trimmed = type.trim();
  // Detect any trailing empty-bracket suffix, including after indexed-access forms
  // (`Foo["bar"][]`) and qualified names (`Errors.ParseError[]`).
  // Only empty `[]` counts — `Foo["bar"]` without trailing `[]` is not an array.
  if (/\[\s*\]$/.test(trimmed)) return "";
  const m = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
  if (!m) return "";
  return m[1]!;
}
