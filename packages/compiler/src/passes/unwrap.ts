/**
 * Token-AST-based unwrap pass.
 *
 * Looks for `?` postfix tokens that appear at the end of a let/const/var,
 * return, or bare-expression statement and rewrites the entire statement to
 * an unwrap-or-short-circuit pair.
 *
 * Bracket pairing comes from the lexer; comments/strings/templates can never
 * be mistaken for statement endings because they're separate tokens.
 */
import { lex } from "../parser/lex.js";
import type { Token } from "../parser/lex.js";

interface Unwrap {
  /** Token index of the start of the rewritten statement. */
  start: number;
  /** Token index just past the `?` (and any trailing `;`). */
  end: number;
  form: "let-binding" | "return" | "bare";
  binder?: "let" | "const" | "var";
  name?: string;
  typeAnnotation?: string;
  /** Verbatim expression text before the `?`. */
  expr: string;
}

export function passUnwrap(src: string): string {
  const tokens = lex(src);
  const unwraps: Unwrap[] = [];

  // Scan for `?` tokens that are actually postfix unwraps. A real unwrap is
  // followed (after trivia) by `;`, newline, or EOF — i.e. it terminates a
  // statement.
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "question") continue;

    // Lookahead: is this end-of-statement?
    let j = i + 1;
    while (j < tokens.length) {
      const t2 = tokens[j]!;
      if (t2.kind === "whitespace") { j++; continue; }
      if (t2.kind === "punct" && t2.text === ";") break;
      if (t2.kind === "newline") break;
      if (t2.kind === "eof") break;
      // Anything else means this `?` is not a postfix unwrap (likely ternary).
      j = -1;
      break;
    }
    if (j === -1) continue;

    // Walk backwards from `i` to find the start of the statement.
    const stmtStart = findStatementStart(tokens, i - 1);
    if (stmtStart === -1) continue;

    const form = classifyForm(tokens, stmtStart, i);
    if (!form) continue;

    // Past the `?`, also consume optional `;`.
    let end = i + 1;
    if (tokens[end]?.kind === "whitespace") end++;
    if (tokens[end]?.kind === "punct" && tokens[end]?.text === ";") end++;

    unwraps.push({ start: stmtStart, end, ...form });
  }

  // Emit. Walk source, replacing each unwrap range with the rewrite.
  let out = "";
  let cursor = 0;
  let counter = 0;
  for (const u of unwraps) {
    counter++;
    const startSrc = tokens[u.start]!.start;
    const endSrc = u.end >= tokens.length ? src.length : tokens[u.end]?.start ?? src.length;
    out += src.slice(cursor, startSrc);
    // Preserve leading whitespace of the original line for indentation.
    const lineStart = src.lastIndexOf("\n", startSrc - 1) + 1;
    const indent = src.slice(lineStart, startSrc).match(/^[ \t]*/)?.[0] ?? "";
    out += renderUnwrap(u, counter, indent);
    cursor = endSrc;
  }
  out += src.slice(cursor);
  return out;
}

function renderUnwrap(u: Unwrap, n: number, indent: string): string {
  const id = `__r${n}`;
  const decl = `${indent}const ${id} = ${u.expr.trim()};\n`;
  const guard = `${indent}if (${id}.kind === "err") return ${id};\n`;
  if (u.form === "let-binding") {
    const binder = u.binder === "var" ? "let" : u.binder ?? "const";
    const typeAnnot = u.typeAnnotation ? `: ${u.typeAnnotation}` : "";
    return `${decl}${guard}${indent}${binder} ${u.name}${typeAnnot} = ${id}.value;`;
  }
  if (u.form === "return") {
    return `${decl}${guard}${indent}return ${id}.value;`;
  }
  return `${decl}${guard.replace(/\n$/, "")}`;
}

interface FormInfo {
  form: "let-binding" | "return" | "bare";
  binder?: "let" | "const" | "var";
  name?: string;
  typeAnnotation?: string;
  expr: string;
}

function classifyForm(tokens: Token[], start: number, qIdx: number): FormInfo | null {
  let i = start;
  i = skipTrivia(tokens, i);
  const head = tokens[i];
  if (!head) return null;

  // Bail when the apparent statement-start is an operator that this lexer
  // can't disambiguate. The walk-back from `?` to a preceding `;`, `{`, or
  // boundary-newline can cross JSX text content (e.g. `<a>foo bar?</a>`)
  // because `<` and `>` are tokenised as comparison-shaped operators and
  // are never paired. A `<` token at statement-start could be a JSX
  // element, a TSX generic call/cast, or a stray comparison fragment —
  // each is a different real shape, and the unwrap pass (which has no AST)
  // can't tell them apart from a token stream alone. The conservative
  // choice is to refuse to rewrite. The unary-prefix operators below can
  // unambiguously begin a bare expression statement and stay allowed.
  if (head.kind === "operator" && !isUnaryPrefixOp(head.text)) return null;

  // let/const/var binding form.
  if (head.kind === "ident" && (head.text === "let" || head.text === "const" || head.text === "var")) {
    const binder = head.text as "let" | "const" | "var";
    let j = i + 1;
    j = skipTrivia(tokens, j);
    const nameTok = tokens[j];
    if (!nameTok || nameTok.kind !== "ident") return null;
    const name = nameTok.text;
    j++;
    j = skipTrivia(tokens, j);
    let typeAnnotation: string | undefined;
    if (tokens[j]?.kind === "punct" && tokens[j]?.text === ":") {
      const tStart = j + 1;
      // Read type until `=`.
      let tEnd = tStart;
      while (tEnd < qIdx && tokens[tEnd]?.kind !== "eq") tEnd++;
      typeAnnotation = sliceText(tokens, tStart, tEnd).trim();
      j = tEnd;
    }
    if (tokens[j]?.kind !== "eq") return null;
    j++;
    const expr = sliceText(tokens, j, qIdx).trim();
    if (!expr) return null;
    return { form: "let-binding", binder, name, typeAnnotation, expr };
  }

  // return form.
  if (head.kind === "ident" && head.text === "return") {
    const expr = sliceText(tokens, i + 1, qIdx).trim();
    if (!expr) return null;
    return { form: "return", expr };
  }

  // Bare expression form.
  const expr = sliceText(tokens, i, qIdx).trim();
  if (!expr) return null;
  return { form: "bare", expr };
}

/**
 * Walk backwards from `from` to find the start of the statement containing it.
 * "Start" is the token immediately after the most recent `;`, `{`, newline at
 * depth 0, or BOF. Comments and whitespace at that point are skipped forward.
 */
function findStatementStart(tokens: Token[], from: number): number {
  let depth = 0;
  for (let i = from; i >= 0; i--) {
    const t = tokens[i]!;
    if (t.kind === "close") depth++;
    else if (t.kind === "open") {
      if (depth === 0) {
        return skipTrivia(tokens, i + 1);
      }
      depth--;
      continue;
    }
    if (depth === 0) {
      if (t.kind === "punct" && t.text === ";") return skipTrivia(tokens, i + 1);
      if (t.kind === "question") {
        // A postfix `?` (unwrap) ends a statement and acts as a boundary.
        // Distinguish from a ternary `?` by looking forward: a postfix `?` is
        // followed (with only inline whitespace — spaces/tabs but NOT newlines)
        // by a newline, `;`, or EOF. A ternary `?` is always followed by an
        // expression on the same line (or immediately after the `?`).
        //
        // Edge case: `cond ?\n  expr : other` (ternary with `?` at line end)
        // would also match this check. This coding style is not recommended in
        // botscript (prefer `match`); the practical risk is negligible.
        let j = i + 1;
        while (j < tokens.length && tokens[j]?.kind === "whitespace") j++;
        const fwd = tokens[j];
        if (!fwd || fwd.kind === "newline" || fwd.kind === "eof" || (fwd.kind === "punct" && fwd.text === ";")) {
          return skipTrivia(tokens, i + 1);
        }
        continue;
      }
      if (t.kind === "newline") {
        // Newlines aren't statement boundaries on their own — `let x =\nfoo()?`
        // is one statement. Only treat as boundary if the next significant
        // token starts a new statement keyword (let/const/var/return).
        const nextSig = nextSignificant(tokens, i + 1);
        if (nextSig === -1) continue;
        const nt = tokens[nextSig]!;
        if (nt.kind === "ident" && (nt.text === "let" || nt.text === "const" || nt.text === "var" || nt.text === "return")) {
          return nextSig;
        }
        continue;
      }
    }
  }
  return 0;
}

function isUnaryPrefixOp(text: string): boolean {
  return (
    text === "+" ||
    text === "-" ||
    text === "!" ||
    text === "~" ||
    text === "++" ||
    text === "--"
  );
}

function nextSignificant(tokens: Token[], from: number): number {
  for (let i = from; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") continue;
    return i;
  }
  return -1;
}

function skipTrivia(tokens: Token[], i: number): number {
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.kind === "whitespace" || t.kind === "newline" || t.kind === "lineComment" || t.kind === "blockComment") {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

function sliceText(tokens: Token[], from: number, to: number): string {
  let out = "";
  for (let i = from; i < to; i++) {
    const t = tokens[i];
    if (!t) break;
    out += t.text;
  }
  return out;
}
