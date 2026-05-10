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
 *   - Declaration / match-arm reordering. Declaration order can interact
 *     with TS hoisting and `match` arms have first-match semantics, so
 *     reordering them would change behaviour.
 *   - Quote-style normalization (`'foo'` → `"foo"`). Risky without parsing
 *     escape sequences carefully.
 *   - Re-indentation by bracket depth. The formatter preserves the user's
 *     line breaks and indentation depth, only normalizing the *characters*
 *     used (tabs → spaces) and stripping trailing whitespace.
 *
 * Structural rewrites (run as a pre-pass before the token walk):
 *   - Brace-block → expression body. When a `fn`'s body block contains a
 *     single `return e;` statement (and nothing else), rewrite the whole
 *     `{ return e; }` to `= e`. ASI-safe: the rewrite bails when there's a
 *     newline between `return` and the expression start, or any depth-0
 *     newline inside the expression — both cases where ASI in the emitted
 *     TypeScript would change semantics. Bails on comments outside the
 *     expression so they're never silently dropped.
 *   - Import-order canonicalization. A contiguous run of top-level `import`
 *     statements is sorted by module-path string. The sort key is the raw
 *     text between the quotes; the comparison is JS-string `<` / `>`
 *     (UTF-16 code-unit order), with escape sequences left ENCODED rather
 *     than decoded — that is, two import paths that resolve to the same
 *     module at runtime but spell that module differently at the source
 *     level (one with a literal `a` character, the other with a unicode
 *     or hex escape sequence whose decoded value is `a`) compare as
 *     different strings here, because the formatter compares the raw
 *     between-the-quotes text rather than the post-decode value.
 *     Decoding before the compare would mean the formatter has to
 *     evaluate JS string escapes; we don't, both for simplicity and so
 *     the rewrite never touches the user's literal text. The gap text
 *     between imports stays in
 *     place — only the import bodies are permuted — so blank lines
 *     between imports keep their position. The pass bails on a region
 *     whose trivia (above the first import, between any two imports, or
 *     after the last import before the region barrier) contains a
 *     line/block comment, since a sort would silently re-attach the
 *     comment to a different statement. Side-effect imports
 *     (`import "foo";`) also bail their run, because ESM evaluates them
 *     in source order and reordering them would change observable side
 *     effects.
 *
 *     A note on runtime imports more broadly: technically, reordering ANY
 *     ESM `import` (not just bare side-effect ones) can change observable
 *     evaluation order — `a`'s top-level side effects run before `b`'s
 *     when `import { x } from "a"; import { y } from "b";` is the
 *     source order. RFC #13 explicitly trades that strict ordering for a
 *     canonical surface form: in practice most modules' top-level code is
 *     side-effect-free, mainstream tools (prettier-plugin-organize-imports,
 *     ESLint `import/order`) reorder runtime imports without warning, and
 *     the canonical-form goal — "one program, one representation" — is
 *     why this issue exists. When evaluation order matters, the user
 *     can pin it: a blank line between two imports breaks the run, and a
 *     comment anywhere in the region disables reordering entirely.
 *   - Tagged-union member reordering. When a `type X = A | B | C;`
 *     declaration matches the tagged-union shape (every alt is a bare
 *     TagIdent or `TagIdent { fields }`), the alts are sorted alphabetically
 *     by tag name. Plain TS unions like `type X = number | string` or
 *     `type Mode = "a" | "b"` are left alone — no tag idents, not a
 *     tagged union. The same detection rule is used by the `passTaggedUnion`
 *     pass that desugars these into discriminated unions, so the formatter
 *     and the pass agree on what "tagged-union" means.
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
 *   - Inserts a single space between adjacent non-whitespace tokens when
 *     canonical form requires it but the source omitted it. Rules: after
 *     `,` (unless followed by a closing bracket); after `:`; on each side
 *     of `->`, `=>`, and `??`. Three cases are deliberately not touched:
 *       - `=` (declaration / assignment vs. JSX attribute, which uses
 *         `name="value"` with no space — indistinguishable at the token
 *         level because the lexer doesn't pair `<` / `>`).
 *       - `;` (statement terminator vs. HTML entity end like `&rsquo;t`
 *         in JSX text — same disambiguation problem).
 *       - Generic `operator` tokens (`+`, `*`, etc.) — they can be unary
 *         or binary and disambiguating needs more context than the token
 *         walk has.
 *
 *     `,` and `:` *can* in principle trip JSX text content (`<p>2:30</p>`
 *     would canonicalize to `<p>2: 30</p>`). The repo doesn't hit this
 *     today, and the win on real `.bs` code is large; if a user hits it,
 *     wrapping the text in an expression container (`<p>{"2:30"}</p>`)
 *     stops the formatter from reaching into the text.
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
import { parseFn } from "../parser/parse-fn.js";

export function formatSource(src: string): string {
  // Structural rewrites stack: each runs on the output of the previous.
  // Order is deliberate — import reordering only moves whole statements, so
  // it is independent of the brace→expr rewrite (which only edits fn body
  // ranges) and the tagged-union reorder (which only edits the alt list of a
  // type decl). Running imports first means the union-rewrite walks shorter
  // source on files dominated by unsorted imports; the result is the same
  // either way.
  const r1 = rewriteImportOrder(src) ?? src;
  const r2 = rewriteTaggedUnionOrder(r1) ?? r1;
  const r3 = rewriteBraceToExprBody(r2) ?? r2;
  let out = "";
  emitCanonical(r3, (chunk) => {
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
 * entirely. The brace→expression rewrite runs as a pre-check: any rewritable
 * fn body short-circuits to `false` without paying for the token walk.
 */
export function isCanonical(src: string): boolean {
  // Cheap path: if the source has no rewrite candidate at all (no
  // `import`, no `type ... |`, no `fn ... return`), none of the
  // structural rewrites can fire and we can skip the shared lex
  // entirely. Most already-canonical files of pure expressions /
  // declarations land here. When at least one candidate IS present,
  // lex ONCE and thread the shared token array through every
  // rewrite — the previous shape lexed up to three times in a row.
  // `emitCanonical` below still lexes once on its own; threading the
  // same array through both phases would couple the rewriter and the
  // emitter to a single lex call, which is more entanglement than
  // the savings warrant.
  const maybeImports = src.indexOf("import") >= 0;
  const maybeTypeUnion = src.indexOf("type") >= 0 && src.indexOf("|") >= 0;
  const maybeFnReturn = src.indexOf("fn") >= 0 && src.indexOf("return") >= 0;
  if (maybeImports || maybeTypeUnion || maybeFnReturn) {
    const tokens = lex(src);
    if (rewriteImportOrder(src, tokens) !== null) return false;
    if (rewriteTaggedUnionOrder(src, tokens) !== null) return false;
    if (rewriteBraceToExprBody(src, tokens) !== null) return false;
  }
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
  // Track the previous content (non-whitespace, non-newline) token actually
  // emitted, plus whether the source had any whitespace token or newline run
  // between it and the current position. When the source omitted a separator
  // that canonical form requires, we inject a single space before the next
  // content token. The flag is re-set to `false` as soon as the next content
  // token is emitted, so we don't track injected spaces here.
  let prevContent: Token | null = null;
  let separatorSinceContent = true; // start-of-file behaves like a separator
  // JSX state. The lexer has no JSX awareness, so we track context as a
  // stack the format walk pushes/pops:
  //
  //   ctx[i] === "jsxText"   — we're in a JSX element's text body
  //                           (between an open tag's `>` and its close).
  //                           `<Ident` is unambiguously a sibling open.
  //                           `{` opens a child-expression frame.
  //   ctx[i] === "childExpr" — we're inside `<Foo>{ ... }</Foo>`'s
  //                           `{...}`. Regular JS rules: `<` is JSX only
  //                           when prev is in expression position.
  //                           `{` pushes another childExpr frame, `}`
  //                           pops back to the surrounding jsxText.
  //
  // Top-level (no JSX yet) is represented by an empty stack.
  //
  // Four scalar fields cover the rest:
  //
  // - `inJsxOpenTag`: we're between `<Tag` (or `<>` open) and the
  //   closing `>`. While true, `=` does NOT pick up whitespace.
  // - `jsxAttrBraceDepth`: `{`/`}` depth inside an open tag's
  //   attribute list, so `>` inside attribute expressions like
  //   `<button onClick={a > b}>` doesn't prematurely close the tag.
  // - `prevContentWasSlash`: tracks `/` immediately before `>` so we
  //   recognize self-close `/>` and pop one nesting level.
  // - `JSX_CLOSE_TAG_RE`: pattern for regex-token-shaped close tags
  //   (`</Foo>` -> `/Foo>` and fragment close `</>` -> `/>`); also
  //   accepts a trailing `}*` because the lexer sometimes munches a
  //   surrounding expression block's brace into the regex token.
  type JsxCtx = "jsxText" | "childExpr";
  const ctxStack: JsxCtx[] = [];
  let inJsxOpenTag = false;
  let jsxAttrBraceDepth = 0;
  let prevContentWasSlash = false;
  const JSX_CLOSE_TAG_RE = /^\/(?:[A-Za-z_$][\w.$-]*)?\s*>\}*$/;
  const top = (): JsxCtx | undefined => ctxStack[ctxStack.length - 1];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;

    if (t.kind === "eof") break;

    if (t.kind === "whitespace") {
      const ws = emitWhitespace(t, tokens, i);
      if (ws.length > 0) separatorSinceContent = true;
      if (!emit(ws)) return;
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
      separatorSinceContent = true;
      i = j - 1; // for-loop will i++
      continue;
    }

    // Update JSX state BEFORE asking wantsSpaceBetween, so the `=` rule
    // sees the right state when we're sitting on an attribute name.
    if (inJsxOpenTag) {
      // Track `{...}` depth inside the open tag's attributes so `>`
      // operators inside attribute expressions like
      // `<button onClick={a > b ? x : y}>` don't prematurely close the
      // tag.
      if (t.kind === "open" && t.text === "{") {
        jsxAttrBraceDepth++;
      } else if (
        t.kind === "close" &&
        t.text === "}" &&
        jsxAttrBraceDepth > 0
      ) {
        jsxAttrBraceDepth--;
      } else if (
        t.kind === "operator" &&
        t.text === ">" &&
        jsxAttrBraceDepth === 0
      ) {
        // The literal `>` that closes the open tag.
        inJsxOpenTag = false;
        if (prevContentWasSlash) {
          // Self-close `/>` — don't push a jsxText frame, the element
          // closed itself in one step.
        } else {
          // Open tag `<Foo ...>` — we're now in this element's text body.
          ctxStack.push("jsxText");
        }
      }
    } else if (top() === "childExpr") {
      // Inside `<Foo>{ ... }</Foo>`'s `{...}`. Regular JS rules: `<`
      // is JSX only when prev is expression-position. Track nested
      // braces and pop back to surrounding jsxText on the matching `}`.
      if (t.kind === "open" && t.text === "{") {
        ctxStack.push("childExpr");
      } else if (t.kind === "close" && t.text === "}") {
        ctxStack.pop();
      } else if (
        t.kind === "operator" &&
        t.text === "<" &&
        inExpressionPosition(prevContent)
      ) {
        const ahead = lookAheadContent(tokens, i + 1);
        const isFragmentOpen =
          ahead?.kind === "operator" && ahead.text === ">";
        const isNamedOpen = ahead?.kind === "ident";
        if (isNamedOpen) {
          inJsxOpenTag = true;
          jsxAttrBraceDepth = 0;
        } else if (isFragmentOpen) {
          // Fragment open: push jsxText immediately; the `>` will be
          // emitted as a normal token and we're already in the body.
          ctxStack.push("jsxText");
        }
      } else if (
        t.kind === "regex" &&
        JSX_CLOSE_TAG_RE.test(t.text) &&
        ctxStack.length > 0
      ) {
        // Defensive: a regex-shaped close tag inside a child expr
        // shouldn't normally appear (close tags terminate a JSX element
        // we'd have entered as jsxText). If we ever land here it's a
        // recovery path — pop the nearest jsxText frame.
        popThroughJsxText(ctxStack);
      }
    } else if (top() === "jsxText") {
      // JSX text body: `<Ident` and `<>` are sibling opens, no
      // expression-position guard needed. `{` opens a child-expression
      // frame. Close tags pop our jsxText frame.
      if (t.kind === "operator" && t.text === "<") {
        const ahead = lookAheadContent(tokens, i + 1);
        const isFragmentOpen =
          ahead?.kind === "operator" && ahead.text === ">";
        const isNamedOpen = ahead?.kind === "ident";
        if (isNamedOpen) {
          inJsxOpenTag = true;
          jsxAttrBraceDepth = 0;
        } else if (isFragmentOpen) {
          ctxStack.push("jsxText");
        }
      } else if (
        t.kind === "regex" &&
        JSX_CLOSE_TAG_RE.test(t.text)
      ) {
        // Named close `</Foo>` or fragment close `</>` — pops this
        // element's jsxText frame.
        ctxStack.pop();
      } else if (t.kind === "open" && t.text === "{") {
        ctxStack.push("childExpr");
      }
    } else {
      // Top level (empty stack): `<Ident` or `<>` is a JSX open only
      // when prev is in expression position. Anything else is regular
      // code we leave alone.
      if (
        t.kind === "operator" &&
        t.text === "<" &&
        inExpressionPosition(prevContent)
      ) {
        const ahead = lookAheadContent(tokens, i + 1);
        const isFragmentOpen =
          ahead?.kind === "operator" && ahead.text === ">";
        const isNamedOpen = ahead?.kind === "ident";
        if (isNamedOpen) {
          inJsxOpenTag = true;
          jsxAttrBraceDepth = 0;
        } else if (isFragmentOpen) {
          ctxStack.push("jsxText");
        }
      }
    }
    // Update slash-tracking for `/>` self-close detection on the next
    // iteration. Only meaningful inside an open tag.
    prevContentWasSlash =
      inJsxOpenTag && t.kind === "operator" && t.text === "/";

    // Non-whitespace, non-newline token — possibly inject a separator first.
    if (
      prevContent !== null &&
      !separatorSinceContent &&
      wantsSpaceBetween(prevContent, t, inJsxOpenTag)
    ) {
      if (!emit(" ")) return;
    }

    let chunk: string;
    if (t.kind === "lineComment") {
      // The lexer reads `//` up to (but not including) `\n` or `\r`. Trailing
      // spaces/tabs end up inside the comment token; strip them so the
      // formatter's "no trailing whitespace on any line" rule covers
      // comment-only lines too. (CR/CRLF normalization is handled by the
      // newline-token path; the `\r` in the strip is defensive.)
      chunk = t.text.replace(/[ \t\r]+$/, "");
    } else if (t.kind === "directive") {
      // The lexer captures `?bs   0.4` and `?bs\t0.4` whole — including the
      // inter-word whitespace — so re-emit the canonical form. Empty
      // `directiveValue` (e.g. `?bs\n` or `?bs   \n` with no version) emits
      // bare `?bs` to avoid a trailing space.
      if (t.directive === "primer") chunk = "?primer";
      else if (t.directive === "bs") chunk = t.directiveValue ? `?bs ${t.directiveValue}` : "?bs";
      else chunk = t.text;
    } else {
      chunk = t.text;
    }
    if (!emit(chunk)) return;
    prevContent = t;
    separatorSinceContent = false;
  }
}

/**
 * Should canonical form put a single space between these two adjacent
 * non-whitespace tokens? Returns true ONLY for cases that are unambiguous
 * regardless of expression vs. type vs. statement context. In particular,
 * `+` / `-` / `*` etc. (the `operator` kind) are deliberately excluded —
 * they can be unary or binary, and disambiguating needs more context than
 * the token walk has.
 *
 * `inJsxOpenTag` is the only piece of state the caller threads in: when
 * true, we're between `<Tag` and the `>` (or `/>`) that closes its opening,
 * which is the one place where `name="value"` legitimately has no space
 * around `=`. Outside of JSX open tags, `=` is always a declaration /
 * assignment / type-alias and gets a space on each side.
 */
function wantsSpaceBetween(
  prev: Token,
  curr: Token,
  inJsxOpenTag: boolean,
): boolean {
  // `->`, `=>`, `??` always want a space on each side.
  if (
    prev.kind === "arrow" || curr.kind === "arrow" ||
    prev.kind === "fatArrow" || curr.kind === "fatArrow" ||
    prev.kind === "questionQuestion" || curr.kind === "questionQuestion"
  ) {
    return true;
  }
  // `=` (single-equals) wants a space on each side outside JSX open tags.
  // Inside a JSX open tag we leave `name="value"` and `name={expr}` alone
  // because canonical JSX attributes have no space around `=`.
  if (
    !inJsxOpenTag &&
    (prev.kind === "eq" || curr.kind === "eq")
  ) {
    return true;
  }
  // `,` followed by anything except a closing bracket → space. (`;` is
  // excluded: HTML entities like `&rsquo;t` in JSX text use `;` as the
  // entity terminator, and the lexer can't tell that from a statement
  // terminator. Statement-terminator `;` is followed by a newline in
  // canonical code anyway, so this rule wouldn't fire on real code.)
  if (prev.kind === "punct" && prev.text === ",") {
    return curr.kind !== "close";
  }
  // `:` followed by anything (type annotation, ternary, object key) → space.
  if (prev.kind === "punct" && prev.text === ":") {
    return true;
  }
  return false;
}

// JS keywords that legally precede an expression (and therefore a JSX tag).
// The lexer's `kind === "keyword"` only covers botscript-specific reserves
// (`fn`, `match`, `test`, ...); everyday JS keywords like `return` come
// through as `kind === "ident"`, so we list them by name here.
const EXPR_STARTING_IDENTS = new Set([
  "return",
  "throw",
  "yield",
  "await",
  "typeof",
  "void",
  "delete",
  "new",
  "in",
  "of",
  "do",
  "case",
]);

/**
 * Heuristic: is the previous content token in expression position, i.e. a
 * JSX element could legitimately start here? This is the same
 * disambiguation Babel and esbuild use to tell `<Foo>` from a `<` operator.
 *
 * Used to decide whether `<` followed by an ident opens a JSX tag (yes,
 * after expression-position tokens) vs. a TS generic / less-than
 * (no, after ident / number / `)` / `]`).
 */
/**
 * Look ahead from index `start` past whitespace/newline tokens and return
 * the next content token (or `undefined` at EOF).
 */
function lookAheadContent(tokens: Token[], start: number): Token | undefined {
  let k = start;
  while (
    k < tokens.length &&
    (tokens[k]!.kind === "whitespace" || tokens[k]!.kind === "newline")
  ) {
    k++;
  }
  return tokens[k];
}

/**
 * Recovery path: pop the JSX context stack down to (and including) the
 * nearest `"jsxText"` frame. Used when the lexer's regex-close-tag
 * heuristic fires in a context where we wouldn't normally expect it.
 */
function popThroughJsxText(stack: ("jsxText" | "childExpr")[]): void {
  while (stack.length > 0) {
    const top = stack.pop();
    if (top === "jsxText") return;
  }
}

function inExpressionPosition(prev: Token | null): boolean {
  if (!prev) return true; // start of file
  switch (prev.kind) {
    case "eq":
    case "arrow":
    case "fatArrow":
    case "questionQuestion":
    case "questionDot":
    case "question":
    case "open":
    case "newline":
      return true;
    case "regex":
      // The lexer's regex-detection rule fires after operators, which
      // means JSX close tags like `</div>` get lexed as `operator "<"`
      // followed by a `regex` token spanning `/div>`. Treating `regex` as
      // expression-position lets the next `<Foo` be correctly identified
      // as a JSX open. Real regex literals also leave the parser in
      // expression position (they're values), so this is safe in both
      // cases.
      return true;
    case "keyword":
      // botscript reserves: `fn`, `match`, `test`, `assert`, `pure`, `uses`,
      // `io`, `unsafe`, `async`. None of these directly precede a JSX tag
      // in well-formed code (e.g. `match` is followed by an expression then
      // `{`, not by `<Tag>`), but treating them as expression-position is
      // safe — the worst case is an unrelated `<` immediately after one of
      // these keywords gets misclassified as JSX, which would only matter
      // if it were followed by an ident, and that combination doesn't
      // occur in valid botscript.
      return true;
    case "ident":
      return EXPR_STARTING_IDENTS.has(prev.text);
    case "punct":
      // `,`, `:`, `;` are all expression-position separators.
      return true;
    case "operator":
      // Most operators are followed by an operand (i.e. expression position).
      // The exception is postfix `++`/`--`, but those are rare directly
      // before a `<`.
      return true;
    default:
      return false;
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

/**
 * Source-to-source rewrite: replace each `fn` whose body is `{ return e; }`
 * (single statement, optional trailing `;`) with the expression-body form
 * `= e`. Returns the rewritten source, or `null` when no body matched — the
 * `null` channel lets `isCanonical` short-circuit without allocating a copy
 * of the source on canonical input.
 *
 * Rewrites are collected as (start, end, replacement) splices over the
 * original source and applied right-to-left so earlier offsets stay valid.
 * Splices never overlap: a single-`return` body has no nested fn declaration
 * that could itself be a candidate.
 */
function rewriteBraceToExprBody(src: string, preLexed?: Token[]): string | null {
  // Cheap pre-check before the lex: a candidate body needs both an `fn`
  // declaration and a `return` somewhere in the source. Substring tests are
  // O(n) string scans without allocations, so they pay for themselves on the
  // common already-canonical case (no fn-keyword or no return → null without
  // ever lexing). False positives — e.g. `return` sitting inside a string
  // literal — fall through to the lex/parse path and correctly return null
  // there, so no rewrite is ever missed. Skipped when the caller already
  // lexed (the shared array is the source of truth).
  if (preLexed === undefined && (src.indexOf("fn") < 0 || src.indexOf("return") < 0)) return null;
  const tokens = preLexed ?? lex(src);
  let patches: { start: number; end: number; replacement: string }[] | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "fn") continue;
    const decl = parseFn(tokens, i, { allowGenerics: true });
    if (!decl) continue;
    if (decl.body.kind === "block") {
      const expr = extractSingleReturn(decl.body.text);
      if (expr !== null) {
        if (patches === null) patches = [];
        patches.push({
          start: decl.body.start,
          end: decl.body.end,
          replacement: `= ${expr}`,
        });
      }
    }
    // Don't skip past the outer decl's tokens. The for-loop's natural
    // `i++` advances one token per iteration, so any nested `fn` keyword
    // inside the body is visited and re-parsed in turn — parseFn just
    // walks the already-lexed token array, so re-entering it on each
    // inner keyword is cheap. Skipping ahead to `decl.tokenEnd` here
    // would suppress those inner declarations and they'd never get
    // rewritten.
  }
  if (patches === null) return null;
  patches.sort((a, b) => b.start - a.start);
  let out = src;
  for (const p of patches) {
    out = out.slice(0, p.start) + p.replacement + out.slice(p.end);
  }
  return out;
}

/**
 * Inspect the *content* between a fn's body braces (`body.text`) and decide
 * whether it is a single `return EXPR;` (or `return EXPR` without the
 * semicolon). Returns the trimmed expression text on success, or `null`
 * when the block is not a candidate.
 *
 * Bails (returns null) when:
 *   - the first significant token isn't the `return` identifier (the lexer
 *     does NOT include `return` in its botscript keyword set — it lexes as
 *     a plain `ident`, just like `let` or `if`. The check below matches on
 *     `kind === "ident"` and `text === "return"`, not `kind === "keyword"`);
 *   - there's a newline between `return` and the expression start (ASI in
 *     the emitted TS would turn this into bare `return;`);
 *   - there's a top-level newline inside the expression (potential ASI cut);
 *   - a top-level block comment containing a `\n` / `\r` appears inside the
 *     expression. ECMAScript treats line terminators inside multi-line block
 *     comments as ASI hazards (spec §7.4), so rewriting around them would
 *     change observable behaviour;
 *   - the expression is empty (`return;`);
 *   - any non-trivia (line/block comment, more code) sits AFTER the optional
 *     trailing `;` — the formatter never silently drops comments;
 *   - any leading line/block comment sits BEFORE `return`.
 *
 * Comments INSIDE the expression's range are preserved verbatim, including
 * an inline block comment that sits between `return` and the value (e.g.
 * `return /* keep *\/ 1;` rewrites to `= /* keep *\/ 1`). The expression
 * text is captured as-is and copied straight into the rewrite.
 */
function extractSingleReturn(blockText: string): string | null {
  const tokens = lex(blockText);
  let i = 0;
  // Leading trivia: whitespace + newlines only. Comments → bail.
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "whitespace" || t.kind === "newline") { i++; continue; }
    if (t.kind === "lineComment" || t.kind === "blockComment") return null;
    break;
  }
  if (i >= tokens.length) return null;
  const ret = tokens[i]!;
  if (ret.kind !== "ident" || ret.text !== "return") return null;
  i++;
  // Between `return` and the expression: only horizontal whitespace. A
  // newline here would ASI to bare `return;` in JS, changing semantics.
  while (i < tokens.length && tokens[i]!.kind === "whitespace") i++;
  if (i >= tokens.length) return null;
  const startTok = tokens[i]!;
  if (startTok.kind === "newline") return null;
  // A line comment between `return` and the value runs to the next `\n`,
  // and ASI would then re-bind to bare `return;` — bail.
  if (startTok.kind === "lineComment") return null;
  // Empty `return;` — exprText would be empty, bail explicitly so we don't
  // emit `= ` and rely on a downstream parser to reject it.
  if (startTok.kind === "punct" && startTok.text === ";") return null;
  if (startTok.kind === "eof") return null;
  // A leading block comment IS allowed and folded into the expression text
  // (so `return /* keep */ 1;` rewrites to `= /* keep */ 1`). Multi-line
  // block comments are still ASI hazards and are caught in the walk below.
  const exprStart = i;
  let exprEnd = i;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "eof") { exprEnd = i; break; }
    if (t.kind === "newline") return null;
    // ECMAScript §7.4: a multi-line block comment counts as a line break
    // for ASI in the emitted TS. Bail so we never rewrite around one.
    if (t.kind === "blockComment" && (t.text.indexOf("\n") >= 0 || t.text.indexOf("\r") >= 0)) {
      return null;
    }
    if (t.kind === "punct" && t.text === ";") { exprEnd = i; break; }
    if (t.kind === "open" && t.matchedAt !== undefined) {
      i = t.matchedAt + 1;
      exprEnd = i;
      continue;
    }
    i++;
    exprEnd = i;
  }
  // Linear-time concatenation: collect token texts into an array and join
  // once. `+=` in a tight loop on long expressions can degrade to quadratic
  // on engines that don't rope short strings.
  const parts: string[] = [];
  for (let k = exprStart; k < exprEnd; k++) parts.push(tokens[k]!.text);
  const exprText = parts.join("").trim();
  if (exprText === "") return null;
  // Past the optional trailing `;`: only whitespace/newlines. Any non-
  // trivia (comment, more code) means the block isn't a single-return.
  let after = exprEnd;
  if (after < tokens.length && tokens[after]!.kind === "punct" && tokens[after]!.text === ";") after++;
  for (let k = after; k < tokens.length; k++) {
    const t = tokens[k]!;
    if (t.kind === "eof") break;
    if (t.kind === "whitespace" || t.kind === "newline") continue;
    return null;
  }
  return exprText;
}

/**
 * Source-to-source rewrite: alphabetize each contiguous run of top-level
 * `import` statements by their module-path string. Returns the rewritten
 * source, or `null` when no run needed reordering — the `null` channel lets
 * `isCanonical` short-circuit without allocating a copy of the source on
 * already-canonical input.
 *
 * Design choices the implementation makes:
 *   - "Top-level" means depth zero in the brace/paren/bracket grid. Imports
 *     inside a string template (e.g. the playground's snippet samples) are
 *     skipped automatically because the lexer emits the whole template as a
 *     single opaque `template` token.
 *   - The walk groups imports into two scopes: a "region" is a contiguous
 *     span of imports separated only by trivia (whitespace, newlines, and
 *     comments) — it ends when any non-import code appears at depth zero.
 *     A "run" is a region sub-span separated by blank lines (2+ line
 *     breaks). Each run sorts independently; the user's blank-line
 *     grouping (npm vs. local imports, for example) is preserved.
 *   - If ANY comment sits in the trivia between two imports inside a
 *     region, the WHOLE region bails — every run inside it. A weaker
 *     bail (only the local run) would still let the formatter reorder
 *     post-comment imports and silently re-attach the comment to a
 *     different statement (`// for a` ending up next to `b`). The full-
 *     region bail is the conservative answer; once any comment is seen,
 *     all attachment relationships in the region are uncertain.
 *   - If any run contains a side-effect import (`import "foo";`), the
 *     whole run bails. Side-effect imports have observable evaluation
 *     order — a runtime polyfill has to load before the consumer that
 *     uses it, for example — so reordering them can change behaviour.
 *     Other runs in the same region (separated by a blank line) sort
 *     normally; the side-effect concern is local to whichever run
 *     contains the bare `import "..."`.
 *   - The gap text between two imports inside a single sortable run
 *     stays in source position. Sorting permutes only the import
 *     bodies. Practically: if a run is `import a;\nimport c;\nimport b;`,
 *     the sorted run is `import a;\nimport b;\nimport c;` — the two
 *     single newlines between bodies stay where they were.
 *   - Sort key is the raw module-path text (between the quotes). The
 *     comparison is `<` / `>` on JS strings — UTF-16 code-unit lex order.
 *     That's deterministic and matches what `Array.prototype.sort()` does
 *     by default.
 *
 * The pass bails (returns null without changes) on malformed input — an
 * `import` keyword with no `from "..."` and no leading string literal, an
 * unterminated bracket group, etc. Downstream passes still see the original
 * source verbatim in those cases.
 */
function rewriteImportOrder(src: string, preLexed?: Token[]): string | null {
  // Cheap pre-check: no `import` in the source at all → no rewrite. The
  // substring scan is O(n) and avoids the lex on already-canonical input
  // that has no imports. Skipped when the caller already lexed (the lex
  // result is the source of truth in that case; the substring test would
  // be redundant).
  if (preLexed === undefined && src.indexOf("import") < 0) return null;
  const tokens = preLexed ?? lex(src);

  interface Imp {
    /** Source offset of the `import` ident. */
    start: number;
    /** Source offset just past the import's last meaningful token (`;` or path). */
    end: number;
    /** Index in the token array of the `import` ident. */
    tokenStart: number;
    /** Index in the token array of the last meaningful token, +1. */
    tokenEnd: number;
    /** Module-path text (no surrounding quotes). Sort key. */
    path: string;
    /** True iff this is a side-effect import (`import "foo";` with no `from`). */
    sideEffect: boolean;
  }

  interface Region {
    runs: Imp[][];
    /** Set when any line/block comment sits in the trivia between two imports in this region. */
    hasComment: boolean;
  }

  const regions: Region[] = [];
  // Region tracking. `region` is non-null exactly when we are inside a
  // contiguous span of imports (any number of sub-runs). It's created the
  // moment we parse the first import in a span and torn down by
  // `flushRegion` when a non-import non-trivia token appears (or at EOF).
  // `lastBarrier` is the token index just past the last region barrier
  // (start of file, or the token that ended the previous region). When a
  // new region begins, the trivia between `lastBarrier` and the first
  // import is inspected for comments — so a comment immediately above
  // the first import in a region also taints the region (without it the
  // formatter could sort the run and silently re-attach the leading
  // comment to a different statement).
  let region: Region | null = null;
  let run: Imp[] = [];
  let lastBarrier = 0;

  const flushRun = () => {
    if (run.length === 0) return;
    region!.runs.push(run);
    run = [];
  };
  const flushRegion = () => {
    if (region === null) return;
    flushRun();
    regions.push(region);
    region = null;
  };

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "eof") break;

    // Skip balanced groups so the walk only sees depth-0 tokens. An `import`
    // ident inside a `{ ... }` object type or a function body isn't a real
    // import statement and must not be reordered. The lexer pre-computes
    // `matchedAt`, so the skip is a single jump.
    if (t.kind === "open" && t.matchedAt !== undefined) {
      flushRegion();
      i = t.matchedAt + 1;
      lastBarrier = i;
      continue;
    }

    if (t.kind === "ident" && t.text === "import") {
      // Inspect trivia between the previous import (anywhere in the
      // current region) and this one. Two flags drive the decision:
      //   - `lineBreaks >= 2` (blank line between) splits this import into
      //     a new run inside the same region. The blank line is the user's
      //     grouping signal; it survives the sort.
      //   - any line/block comment in the trivia taints the whole region;
      //     all of its runs bail. Reordering across a comment would
      //     silently re-attach it to a different statement.
      if (region !== null) {
        // The previous import is the last entry of the current `run` if
        // we have one, otherwise the last entry of the last completed run
        // in the region.
        const prevTokenEnd =
          run.length > 0
            ? run[run.length - 1]!.tokenEnd
            : region.runs[region.runs.length - 1]!.at(-1)!.tokenEnd;
        let lineBreaks = 0;
        for (let k = prevTokenEnd; k < i; k++) {
          const tk = tokens[k]!;
          if (tk.kind === "whitespace") continue;
          if (tk.kind === "newline") {
            lineBreaks += countLineBreaks(tk.text);
            continue;
          }
          if (tk.kind === "lineComment" || tk.kind === "blockComment") {
            region.hasComment = true;
            continue;
          }
          // Anything else at depth zero shouldn't appear here (`open` was
          // skipped, non-import-non-trivia would have ended the region in
          // the branch below). Defensive end-region just in case.
          flushRegion();
          break;
        }
        if (region !== null && lineBreaks >= 2) flushRun();
      }
      const imp = parseImport(tokens, i);
      if (!imp) {
        // Malformed import — end whatever region we had and skip this token.
        flushRegion();
        lastBarrier = i + 1;
        i++;
        continue;
      }
      // Eagerly create the region on the first import we accept, so the
      // trivia inspection above sees a non-null `region` on the second
      // and subsequent imports. The leading-trivia walk from `lastBarrier`
      // to `i` taints the new region if a line/block comment sits above
      // the first import — same conservative bail as a comment between
      // two imports inside an existing region.
      if (region === null) {
        let leadingComment = false;
        for (let k = lastBarrier; k < i; k++) {
          const tk = tokens[k]!;
          if (tk.kind === "lineComment" || tk.kind === "blockComment") {
            leadingComment = true;
            break;
          }
        }
        region = { runs: [], hasComment: leadingComment };
      }
      run.push(imp);
      i = imp.tokenEnd;
      continue;
    }

    // Trivia between imports stays in the region. Only depth-zero CODE
    // (non-import, non-trivia, non-comment) ends the region. Comments
    // outside an import's body aren't a region terminator — they taint
    // the region's `hasComment` flag from whichever walk catches them
    // first: the inter-import trivia walk above (between two imports),
    // the leading-trivia walk when a region opens (above the first
    // import), or this branch (the trailing trivia after the last
    // import in a region, before the region barrier — without this,
    // a same-line comment like `import { a } from "a"; // wraps lib`
    // could survive the sort and end up next to whichever import
    // landed in the last slot).
    if (t.kind === "lineComment" || t.kind === "blockComment") {
      if (region !== null) region.hasComment = true;
      i++;
      continue;
    }
    if (
      t.kind !== "whitespace" &&
      t.kind !== "newline"
    ) {
      flushRegion();
      lastBarrier = i + 1;
    }
    i++;
  }
  flushRegion();

  if (regions.length === 0) return null;

  // Decide which runs actually need reordering. A run is sortable when:
  //   - its parent region has no interleaved comment (full-region bail);
  //   - it contains no side-effect import (per-run bail);
  //   - it has 2+ imports;
  //   - its current order isn't already sorted.
  // Already-sorted runs are skipped so the cheap path stays cheap — most
  // files are already in order on the second format.
  const dirtyRuns: Imp[][] = [];
  for (const reg of regions) {
    if (reg.hasComment) continue;
    for (const r of reg.runs) {
      if (r.length < 2) continue;
      if (r.some((imp) => imp.sideEffect)) continue;
      let alreadySorted = true;
      for (let k = 1; k < r.length; k++) {
        if (r[k - 1]!.path > r[k]!.path) {
          alreadySorted = false;
          break;
        }
      }
      if (!alreadySorted) dirtyRuns.push(r);
    }
  }
  if (dirtyRuns.length === 0) return null;

  // Apply patches right-to-left so earlier offsets stay valid. Within a
  // single run, the gap text between imports stays in source position
  // (sorting permutes only the import bodies, not the gaps).
  const patches: { start: number; end: number; replacement: string }[] = [];
  for (const r of dirtyRuns) {
    const sorted = [...r].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    let replacement = "";
    for (let k = 0; k < r.length; k++) {
      const slot = r[k]!;
      replacement += src.slice(sorted[k]!.start, sorted[k]!.end);
      if (k < r.length - 1) {
        replacement += src.slice(slot.end, r[k + 1]!.start);
      }
    }
    patches.push({ start: r[0]!.start, end: r[r.length - 1]!.end, replacement });
  }
  patches.sort((a, b) => b.start - a.start);
  let out = src;
  for (const p of patches) {
    out = out.slice(0, p.start) + p.replacement + out.slice(p.end);
  }
  return out === src ? null : out;
}

/**
 * Parse a single `import` statement starting at the `import` ident token.
 * Returns the start/end source offsets, the module path (sort key), and
 * the matching token-array indices. Returns null on a malformed import
 * (unterminated bracket group, no `from "..."` and no leading path string).
 *
 * Forms recognised:
 *   - `import { a, b } from "module";`           — named bindings
 *   - `import name from "module";`               — default
 *   - `import * as ns from "module";`            — namespace
 *   - `import "module";`                         — side-effect
 *   - `import name, { a, b } from "module";`     — default + named
 *   - `import type { T } from "module";`         — type-only
 *
 * The path is the raw text between the quotes of the *path* string literal —
 * i.e. the first depth-0 string after a `from` ident, or the first depth-0
 * string when no `from` appears (side-effect import). Comparison is JS-string
 * lex order on that raw text.
 *
 * The end offset lands just past the trailing `;` when one is present.
 * Without a `;`, the parser walks until the next newline or EOF and
 * stops at the LAST meaningful token consumed before that — usually
 * the path string itself, but TS forms with trailing tokens after the
 * path (an import attributes / assertions clause like
 * `import x from "p" with { type: "json" }`, or a renamed default
 * binding with an inline expression) extend the end past the path to
 * cover those tokens. Whitespace and newlines past the last meaningful
 * token belong to the gap between imports, not to the import itself,
 * and are spliced verbatim by `rewriteImportOrder`.
 */
function parseImport(
  tokens: Token[],
  startIdx: number,
): {
  start: number;
  end: number;
  tokenStart: number;
  tokenEnd: number;
  path: string;
  sideEffect: boolean;
} | null {
  const head = tokens[startIdx];
  if (!head || head.kind !== "ident" || head.text !== "import") return null;
  let i = startIdx + 1;
  let path: string | null = null;
  let pathTokenIdx = -1;
  let viaFrom = false;
  let lastMeaningful = startIdx;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "eof") break;
    if (t.kind === "punct" && t.text === ";") {
      // A `;` only ends the import after the path has been seen — otherwise
      // it's a malformed input and we bail.
      if (path === null) return null;
      return {
        start: head.start,
        end: t.end,
        tokenStart: startIdx,
        tokenEnd: i + 1,
        path,
        sideEffect: !viaFrom,
      };
    }
    if (t.kind === "newline") {
      // A newline after the path ends the import (no trailing `;`). A
      // newline before the path is fine — multi-line bracket-bound
      // bindings are common (`import {\n  a,\n  b,\n} from "m";`); the
      // bracket-group skip below has already jumped over the `{...}` part.
      if (path !== null) {
        return {
          start: head.start,
          end: tokens[lastMeaningful]!.end,
          tokenStart: startIdx,
          tokenEnd: lastMeaningful + 1,
          path,
          sideEffect: !viaFrom,
        };
      }
      i++;
      continue;
    }
    if (t.kind === "whitespace" || t.kind === "lineComment" || t.kind === "blockComment") {
      i++;
      continue;
    }
    if (t.kind === "open" && t.matchedAt !== undefined) {
      // `{ a, b }` named-bindings — skip the whole group.
      lastMeaningful = t.matchedAt;
      i = t.matchedAt + 1;
      continue;
    }
    if (t.kind === "ident" && t.text === "from") {
      // The next significant token must be the path string. Skip whitespace
      // and trivia. (Comments inside an `import` are unusual but the lexer
      // would surface them; we let them sit in place — they don't affect
      // the path discovery and they'll be re-emitted verbatim.)
      let j = i + 1;
      while (
        j < tokens.length &&
        (tokens[j]!.kind === "whitespace" ||
          tokens[j]!.kind === "newline" ||
          tokens[j]!.kind === "lineComment" ||
          tokens[j]!.kind === "blockComment")
      ) {
        j++;
      }
      const pathTok = tokens[j];
      if (!pathTok || pathTok.kind !== "string") return null;
      path = stripStringQuotes(pathTok.text);
      pathTokenIdx = j;
      viaFrom = true;
      lastMeaningful = j;
      i = j + 1;
      continue;
    }
    if (t.kind === "string" && path === null) {
      // Side-effect import: `import "module";`. The first depth-0 string is
      // the path. (Named-binding imports always go through the bracket
      // skip above before reaching their `from` clause, so we only land
      // here on the side-effect form.) `viaFrom` stays false — the caller
      // uses that flag to bail entire runs that contain a side-effect
      // import, since their evaluation order is observable.
      path = stripStringQuotes(t.text);
      pathTokenIdx = i;
      lastMeaningful = i;
      i++;
      continue;
    }
    lastMeaningful = i;
    i++;
  }
  // Reached EOF — accept if we found a path, otherwise bail.
  if (path !== null && pathTokenIdx >= 0) {
    return {
      start: head.start,
      end: tokens[lastMeaningful]!.end,
      tokenStart: startIdx,
      tokenEnd: lastMeaningful + 1,
      path,
      sideEffect: !viaFrom,
    };
  }
  return null;
}

/**
 * Strip the surrounding quote characters from a string-token's text. The
 * lexer captures the literal verbatim including its quotes (single, double,
 * or — though imports never use these — backtick). The path comparison key
 * is the raw text between the quotes; we don't decode escape sequences,
 * because two imports whose paths differ only by escape encoding are pretty
 * clearly distinct strings and a rewrite that "decoded" them would change
 * the source the user wrote.
 */
function stripStringQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0]!;
    const last = s[s.length - 1]!;
    if ((first === '"' || first === "'" || first === "`") && first === last) {
      return s.slice(1, -1);
    }
  }
  return s;
}

/**
 * Source-to-source rewrite: when a `type X = A | B | C;` declaration matches
 * the tagged-union shape (every alt is `TagIdent` or `TagIdent { fields }`,
 * with at least one body-bearing alt), sort the alts alphabetically by tag.
 * Returns the rewritten source, or `null` when no decl needed reordering.
 *
 * The shape detection (every alt is `Tag` or `Tag { fields }`, with at
 * least one body-bearing alt) mirrors `passTaggedUnion`'s `parseAlts` so
 * the formatter and the desugarer agree on which declarations look like
 * tagged unions. The formatter is intentionally STRICTER on one point:
 * `passTaggedUnion` treats line/block comments between alts as trivia
 * and proceeds to desugar the union, but the formatter bails when a
 * comment sits anywhere between (or above) the alts — reordering across
 * a comment would silently re-attach it to a different alt. The
 * conservative bail keeps the formatter semantics-preserving without
 * changing what the desugarer accepts.
 *
 * Plain TS unions like
 *   type X = number | string;
 *   type Mode = "open" | "closed";
 *   type T = { a: number } | { b: string };
 * are left alone — they have no tag idents (or every alt is an anonymous
 * object literal) and reordering would either be a no-op or change observable
 * type-identity in ways that aren't safe in general.
 *
 * Why bail when alts are already sorted? Same reason as the import
 * rewrite: the cheap-path check in `isCanonical` short-circuits to `false`
 * the moment any rewrite would fire, so returning `null` on a no-op keeps
 * idempotence cheap.
 */
function rewriteTaggedUnionOrder(src: string, preLexed?: Token[]): string | null {
  // Cheap pre-check: a candidate decl needs both `type` and `|` somewhere
  // in the source. Substring tests are O(n) and avoid the lex on already-
  // canonical input that has no tagged-union declarations. Skipped when
  // the caller already lexed.
  if (preLexed === undefined && (src.indexOf("type") < 0 || src.indexOf("|") < 0)) return null;
  const tokens = preLexed ?? lex(src);

  type AltSpan = { tag: string; start: number; end: number };
  const patches: { start: number; end: number; replacement: string }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "ident" || t.text !== "type") continue;
    if (!atTypeStmtStart(tokens, i)) continue;
    const decl = findTypeRhs(tokens, i);
    if (!decl) continue;
    const alts = parseTaggedAlts(tokens, decl.rhsStart, decl.rhsEnd);
    if (!alts) {
      i = decl.rhsEnd;
      continue;
    }
    const tags = alts.map((a) => a.tag);
    const sorted = [...tags].sort();
    let alreadySorted = true;
    for (let k = 0; k < tags.length; k++) {
      if (tags[k] !== sorted[k]) {
        alreadySorted = false;
        break;
      }
    }
    if (alreadySorted) {
      i = decl.rhsEnd;
      continue;
    }
    // Build the replacement by sorting the alt source slices. The text
    // between the alts (`|` plus surrounding whitespace) is captured per
    // gap from the original source so newline / blank-line layout is
    // preserved between sort positions.
    const sortedAlts = [...alts].sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
    let replacement = "";
    for (let k = 0; k < alts.length; k++) {
      const slot = alts[k]!;
      replacement += src.slice(sortedAlts[k]!.start, sortedAlts[k]!.end);
      if (k < alts.length - 1) {
        replacement += src.slice(slot.end, alts[k + 1]!.start);
      }
    }
    patches.push({
      start: alts[0]!.start,
      end: alts[alts.length - 1]!.end,
      replacement,
    });
    i = decl.rhsEnd;
  }
  if (patches.length === 0) return null;
  patches.sort((a, b) => b.start - a.start);
  let out = src;
  for (const p of patches) {
    out = out.slice(0, p.start) + p.replacement + out.slice(p.end);
  }
  return out === src ? null : out;
}

/**
 * Mirrors `passTaggedUnion`'s `atStatementStart`, with one difference: this
 * walk runs on the original source (before `passVersion` has stripped the
 * `?bs` / `?primer` directive), so the `directive` token is also treated
 * as a valid predecessor — a `type` decl on the line after a `?bs 0.5`
 * directive is at top-level statement start. The pass-time variant in
 * `passTaggedUnion` doesn't need this branch because the directive has
 * been stripped by the time the pass runs.
 *
 * Returns true when the `type` ident at index `idx` is the first
 * non-trivia token of a top-level statement (file start, after `;` or
 * `:`, after `{` / `(`, after `}`, after `export`, after a directive).
 * `:` is in the predicate to mirror `passTaggedUnion`'s `atStatementStart`
 * — practically it covers `case "x":` / labeled-statement starts and TS
 * conditional-type RHS positions; the `type` decl wouldn't actually parse
 * in those positions, but the formatter and the desugarer agree on what
 * counts as "statement start" so they decide on the same set of decls.
 * Avoids matching `type` used as an identifier inside expressions
 * (`const type = "a"`) or as a TS field-modifier (`{ type: "x" }`).
 */
function atTypeStmtStart(tokens: Token[], idx: number): boolean {
  for (let k = idx - 1; k >= 0; k--) {
    const t = tokens[k];
    if (!t) continue;
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      continue;
    }
    if (t.kind === "directive") return true;
    if (t.kind === "punct" && (t.text === ";" || t.text === ":")) return true;
    if (t.kind === "open" && (t.text === "{" || t.text === "(")) return true;
    if (t.kind === "close" && t.text === "}") return true;
    if (t.kind === "ident" && t.text === "export") return true;
    return false;
  }
  return true;
}

/**
 * Walk forward from a `type` ident to find the `=` and the depth-0 RHS span
 * up to the terminator (`;` or unambiguous newline). Same rules as
 * `passTaggedUnion`'s `parseTypeDecl` so that the formatter and the pass
 * see the same decl boundaries — drift here would be a silent bug where
 * the formatter and the desugarer disagreed on what counted as a single
 * type declaration.
 */
function findTypeRhs(
  tokens: Token[],
  typeIdx: number,
): { rhsStart: number; rhsEnd: number } | null {
  let i = typeIdx + 1;
  while (i < tokens.length && isFmtTrivia(tokens[i]!)) i++;
  const nameTok = tokens[i];
  if (!nameTok || nameTok.kind !== "ident") return null;
  i++;
  let eq = -1;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "eof") break;
    if (t.kind === "open" && t.matchedAt !== undefined) {
      i = t.matchedAt + 1;
      continue;
    }
    if (t.kind === "eq") {
      eq = i;
      break;
    }
    i++;
  }
  if (eq === -1) return null;
  let rhsStart = eq + 1;
  while (rhsStart < tokens.length && isFmtTrivia(tokens[rhsStart]!)) rhsStart++;
  let j = rhsStart;
  while (j < tokens.length) {
    const t = tokens[j]!;
    if (t.kind === "eof") break;
    if (t.kind === "open" && t.matchedAt !== undefined) {
      j = t.matchedAt + 1;
      continue;
    }
    if (t.kind === "punct" && t.text === ";") break;
    if (t.kind === "newline") {
      let next = j + 1;
      while (next < tokens.length && isFmtTrivia(tokens[next]!)) next++;
      const nextTok = tokens[next];
      if (nextTok?.kind === "operator" && nextTok.text === "|") {
        j++;
        continue;
      }
      break;
    }
    j++;
  }
  return { rhsStart, rhsEnd: j };
}

function isFmtTrivia(t: Token): boolean {
  return (
    t.kind === "whitespace" ||
    t.kind === "newline" ||
    t.kind === "lineComment" ||
    t.kind === "blockComment"
  );
}

/**
 * Parse the alternatives in a tagged-union RHS. Returns one entry per alt
 * with a precise source span (start of the tag ident, end of the trailing
 * `}` for body-bearing alts, end of the tag ident otherwise) and the tag
 * name itself. Returns null when the RHS isn't a tagged union — i.e. when
 * any alt is a non-ident, an ident with no following `|` or terminator,
 * when no alt carries a `{ ... }` body, OR when a line/block comment sits
 * between two alts (or in the leading-trivia slot before the first alt).
 *
 * The comment-bail rule mirrors `rewriteImportOrder`: a comment is tied
 * to a specific alt by source proximity, and reordering would silently
 * re-attach it to a different alt. The conservative answer is to bail —
 * the user can `botscript fmt --write` after stripping the comment, or
 * leave the unsorted form alone. The check uses `wsOnly` (whitespace +
 * newlines only, no comments) instead of `isFmtTrivia` for the gap
 * walks; the leading-trivia walk before the first alt also uses it,
 * so a comment ABOVE the first tag (rare but possible) bails too.
 *
 * The shape rule (every alt is `Tag` or `Tag { body }`, with at least one
 * `Tag { body }`) matches `passTaggedUnion`'s `parseAlts`. The
 * comment-bail above is an extra constraint THIS rewrite adds — the
 * desugarer doesn't need it (it doesn't reorder), so its `parseAlts`
 * still treats comments as trivia. Plain TS unions like `number | string`
 * and literal-type unions like `"a" | "b"` are caught by the "first
 * token must be ident" check on the very first alt.
 */
function parseTaggedAlts(
  tokens: Token[],
  from: number,
  to: number,
): { tag: string; start: number; end: number }[] | null {
  const alts: { tag: string; start: number; end: number }[] = [];
  let hasBody = false;
  let i = from;
  // Strict whitespace-only walk for the leading and inter-alt gaps. Any
  // comment in those slots bails; an alt body's interior is opaque (it's
  // skipped via `matchedAt`) so user comments inside `{ ... }` are fine.
  const skipWsOnly = (idx: number): { ok: boolean; idx: number } => {
    while (idx < to) {
      const t = tokens[idx]!;
      if (t.kind === "whitespace" || t.kind === "newline") {
        idx++;
        continue;
      }
      if (t.kind === "lineComment" || t.kind === "blockComment") {
        return { ok: false, idx };
      }
      break;
    }
    return { ok: true, idx };
  };
  let step = skipWsOnly(i);
  if (!step.ok) return null;
  i = step.idx;
  // Optional leading `|`.
  if (i < to && tokens[i]?.kind === "operator" && tokens[i]?.text === "|") {
    i++;
    step = skipWsOnly(i);
    if (!step.ok) return null;
    i = step.idx;
  }
  while (i < to) {
    const tagTok = tokens[i];
    if (!tagTok || tagTok.kind !== "ident") return null;
    const tag = tagTok.text;
    const start = tagTok.start;
    let end = tagTok.end;
    i++;
    step = skipWsOnly(i);
    if (!step.ok) return null;
    i = step.idx;
    const maybeBrace = tokens[i];
    if (
      maybeBrace?.kind === "open" &&
      maybeBrace.text === "{" &&
      maybeBrace.matchedAt !== undefined
    ) {
      const closeIdx = maybeBrace.matchedAt;
      const closeTok = tokens[closeIdx]!;
      end = closeTok.end;
      hasBody = true;
      i = closeIdx + 1;
    }
    alts.push({ tag, start, end });
    step = skipWsOnly(i);
    if (!step.ok) return null;
    i = step.idx;
    if (i >= to) break;
    const sep = tokens[i];
    if (sep?.kind === "operator" && sep.text === "|") {
      i++;
      step = skipWsOnly(i);
      if (!step.ok) return null;
      i = step.idx;
      continue;
    }
    return null;
  }
  if (alts.length === 0 || !hasBody) return null;
  return alts;
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
