/**
 * Canonical-form formatter (v1, RFC #13).
 *
 * Token-level whitespace tidier. Re-emits the source with normalized spacing,
 * tabs converted to 2 spaces, trailing whitespace stripped, blank-line runs
 * collapsed, and exactly one trailing newline. Content inside string,
 * template, regex, and block-comment tokens is emitted verbatim — the
 * formatter never touches semantics. Line-comment (`//`) tokens are emitted
 * verbatim except that trailing horizontal whitespace and CR are stripped,
 * so the "no trailing whitespace on any line" rule still holds.
 *
 * What it deliberately does NOT do (yet):
 *   - Brace-style re-flow (Allman → K&R). Needs an AST to identify which
 *     `{`s open a block vs. an object literal.
 *   - Declaration / import / union-member reordering. Order can be
 *     semantically meaningful (overload resolution, first-match in `match`,
 *     side-effect order in imports). Reordering needs proof per construct.
 *   - Quote-style normalization (`'foo'` → `"foo"`). Risky without parsing
 *     escape sequences carefully.
 *   - Re-indentation by bracket depth. The formatter preserves the user's
 *     line breaks and indentation depth, only normalizing the *characters*
 *     used (tabs → spaces) and stripping trailing whitespace.
 *
 * What it DOES do:
 *   - Replaces leading-tab characters with 2 spaces each.
 *   - Strips trailing whitespace on every line.
 *   - Collapses runs of 2+ blank lines to a single blank line.
 *   - Strips leading blank lines so the first line of output is the file's
 *     first non-empty line (typically a `?bs` / `?primer` directive, but the
 *     stripping is unconditional).
 *   - Collapses runs of mid-line whitespace to a single space (outside
 *     strings/templates/comments/regex).
 *   - Normalizes line endings outside string / template / regex / block-
 *     comment tokens to `\n` (CR-only and CRLF inputs are accepted). The
 *     formatter does NOT touch `\r` characters embedded inside those tokens
 *     (they're literal content and rewriting them could change semantics).
 *   - Ensures the file ends with exactly one trailing newline.
 *
 * The formatter is idempotent: `formatSource(formatSource(x)) === formatSource(x)`.
 * It is semantics-preserving: a file that compiled before still compiles, and
 * the resulting TypeScript is observationally equivalent (whitespace may
 * differ, but no parse changes).
 */

import { lex } from "../parser/lex.js";
import type { Token } from "../parser/lex.js";

export function formatSource(src: string): string {
  let out = "";
  emitCanonical(src, (chunk) => {
    out += chunk;
    return true;
  });
  return postProcess(out);
}

/**
 * Returns true iff `src` is already in canonical form. Cheaper than
 * `formatSource(src) === src` because the walk halts at the first UTF-16
 * code unit that doesn't match — most non-canonical inputs bail out long
 * before the file ends, and canonical inputs avoid the string allocation
 * entirely.
 */
export function isCanonical(src: string): boolean {
  let off = 0;
  let ok = true;
  emitCanonical(src, (chunk) => {
    if (off + chunk.length > src.length) {
      ok = false;
      return false;
    }
    for (let k = 0; k < chunk.length; k++) {
      if (src.charCodeAt(off + k) !== chunk.charCodeAt(k)) {
        ok = false;
        return false;
      }
    }
    off += chunk.length;
    return true;
  });
  if (!ok || off !== src.length) return false;
  // postProcess invariants — these would change `src` even if every chunk
  // matched. An empty file is canonical; otherwise it must not start with
  // `\n` (leading-strip), must end with exactly one `\n` (trailing fix).
  if (src === "") return true;
  if (src[0] === "\n") return false;
  if (!src.endsWith("\n") || src.endsWith("\n\n")) return false;
  return true;
}

/**
 * Walks `src` token-by-token and yields each canonical-form chunk via `emit`.
 * `emit` returns `false` to halt the walk early — formatSource ignores the
 * return value; isCanonical halts on the first code-unit mismatch.
 */
function emitCanonical(src: string, emit: (chunk: string) => boolean): void {
  const tokens = lex(src);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;

    if (t.kind === "eof") break;

    if (t.kind === "whitespace") {
      if (!emit(emitWhitespace(t, tokens, i))) return;
      continue;
    }

    if (t.kind === "newline") {
      // Collapse runs of newlines (possibly with blank-line indentation
      // between them) into at most two `\n` — i.e. at most one blank line.
      // A whitespace token is "blank-line indentation" only when flanked by
      // newlines on both sides; the indentation that opens a real line of
      // content is left for the main loop to emit.
      let newlineCount = 0;
      let j = i;
      while (j < tokens.length) {
        const tk = tokens[j]!;
        if (tk.kind === "newline") {
          newlineCount += countLineBreaks(tk.text);
          j++;
          continue;
        }
        if (tk.kind === "whitespace" && tokens[j + 1]?.kind === "newline") {
          // Whitespace between two newlines — blank-line indent. Drop.
          j++;
          continue;
        }
        break;
      }
      const n = Math.min(newlineCount, 2);
      if (!emit("\n".repeat(n))) return;
      i = j - 1; // for-loop will i++
      continue;
    }

    if (t.kind === "lineComment") {
      // The lexer reads `//` up to (but not including) `\n` or `\r`. Trailing
      // spaces/tabs end up inside the comment token; strip them so the
      // formatter's "no trailing whitespace on any line" rule covers
      // comment-only lines too. (CR/CRLF normalization is handled by the
      // newline-token path; the `\r` in the strip is defensive.)
      if (!emit(t.text.replace(/[ \t\r]+$/, ""))) return;
      continue;
    }

    if (t.kind === "directive") {
      // The lexer captures `?bs   0.4` and `?bs\t0.4` whole — including the
      // inter-word whitespace — so the catch-all path below would leak that
      // whitespace through. Re-emit the canonical form. Empty `directiveValue`
      // (e.g. `?bs\n` or `?bs   \n` with no version) emits bare `?bs` to
      // avoid a trailing space.
      let chunk: string;
      if (t.directive === "primer") chunk = "?primer";
      else if (t.directive === "bs") chunk = t.directiveValue ? `?bs ${t.directiveValue}` : "?bs";
      else chunk = t.text;
      if (!emit(chunk)) return;
      continue;
    }

    // Every other token is emitted verbatim.
    if (!emit(t.text)) return;
  }
}

function countLineBreaks(s: string): number {
  // The lexer's `newline` token can contain any mix of `\n` and `\r`. Count
  // each `\r\n` as one break, each lone `\r` as one break, each lone `\n` as
  // one break — so CR-only and CRLF inputs are normalized correctly.
  let n = 0;
  for (let k = 0; k < s.length; k++) {
    const ch = s[k]!;
    if (ch === "\r") {
      n++;
      if (s[k + 1] === "\n") k++;
    } else if (ch === "\n") {
      n++;
    }
  }
  return n;
}

function emitWhitespace(t: Token, tokens: Token[], i: number): string {
  const prev = i > 0 ? tokens[i - 1] : undefined;
  const next = i + 1 < tokens.length ? tokens[i + 1] : undefined;
  const atLineStart = !prev || prev.kind === "newline";
  const atLineEnd = !next || next.kind === "newline" || next.kind === "eof";

  // Trailing whitespace — drop. The newline-run loop above also drops blank-
  // line indentation, but this catches the ordinary "line ends with spaces"
  // case where the next token is a newline.
  if (atLineEnd) return "";

  if (atLineStart) {
    // Leading indentation. Convert each tab to two spaces; preserve spaces.
    let out = "";
    for (const ch of t.text) {
      if (ch === "\t") out += "  ";
      else if (ch === " ") out += " ";
      // Anything else in a whitespace token is a bug in the lexer; drop it.
    }
    return out;
  }

  // Mid-line whitespace run — single space.
  return " ";
}

function postProcess(s: string): string {
  // Strip leading blank lines, but preserve directive lines (`?bs ...`,
  // `?primer`) at the top. The formatter's per-line work has already turned
  // any leading whitespace-only lines into empty `\n`s, so dropping them here
  // is a simple prefix-trim of `\n`s — except we must not drop the newline
  // that terminates a directive line.
  let i = 0;
  while (i < s.length && s[i] === "\n") i++;
  let body = s.slice(i);

  // Empty or whitespace-only file stays empty.
  if (body === "") return "";

  // Ensure exactly one trailing newline.
  body = body.replace(/\n+$/, "");
  return body + "\n";
}
