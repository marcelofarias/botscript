/**
 * Whole-file parse entry. ?bs 0.4+.
 *
 * This is the single tokenization + structural-parse step shared by passes
 * (today: cap-check) and external tooling that needs source ranges without
 * re-tokenizing the file. The pipeline does NOT thread a single AST through
 * every pass — passes that don't need an AST keep operating on the source
 * text directly. cap-check builds its own Program when version >= 0.2.
 *
 * The parser is intentionally narrow: it only surfaces fn declarations as
 * typed nodes. Everything else is left to the existing passes that already
 * scan the source. The AST grows when a new consumer needs deeper nodes,
 * not before (AGENTS.md rule 5).
 */

import { lex } from "./lex.js";
import type { FnStmt, Program, Stmt } from "./ast.js";
import { parseFn, type ParseFnOptions } from "./parse-fn.js";

export interface ParseOptions {
  /** Forwarded to `parseFn` — opt in to generics (?bs 0.4+). */
  allowGenerics?: boolean;
  /**
   * When true, fn declarations nested inside another fn's body are also
   * surfaced in `fns` / `statements`. The default (false) is the LSP-
   * friendly view: only top-level decls. cap-check sets this to true
   * because it needs every fn in the file to compute the inner-range
   * exclusion when scanning each fn's body for stdlib references.
   */
  includeNestedFns?: boolean;
}

/**
 * Parse all fn declarations in `src`. May throw `BotscriptError` (SYN001)
 * when a declaration has duplicate header clauses or invalid label tokens —
 * the same throwing contract as `parseFn` with `src` provided.
 */
export function parseProgram(src: string, opts: ParseOptions = {}): Program {
  const tokens = lex(src);
  const statements: Stmt[] = [];
  const fns: FnStmt[] = [];

  const parseFnOpts: ParseFnOptions = { allowGenerics: opts.allowGenerics, src };
  const includeNested = !!opts.includeNestedFns;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (t.kind !== "keyword" || t.keyword !== "fn") continue;
    const decl = parseFn(tokens, i, parseFnOpts);
    if (!decl) continue;
    const stmt: FnStmt = {
      kind: "FnStmt",
      start: decl.start,
      end: decl.end,
      decl,
    };
    statements.push(stmt);
    fns.push(stmt);
    // When includeNested is on, keep walking into the body so nested `fn`
    // declarations are picked up too. Otherwise advance past the consumed
    // run — a fn nested in a body is irrelevant at the program level for
    // the default LSP-style view.
    if (!includeNested) {
      i = decl.tokenEnd - 1;
    }
  }

  return {
    kind: "Program",
    src,
    tokens,
    statements,
    fns,
  };
}
