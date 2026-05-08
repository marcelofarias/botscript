/**
 * Whole-file AST.
 *
 * Shipped at ?bs 0.4. The model is shallow on purpose: top-level statements
 * are surfaced as typed nodes carrying source ranges (UTF-16 code-unit
 * offsets) into the source, but expression-level structure inside fn
 * bodies stays as token spans. That way cap-check (and future passes) get
 * the structural information they need — fn boundaries, source offsets —
 * without paying for a full expression parser the rest of the language
 * doesn't yet need.
 *
 * AGENTS.md rule 5 ("don't add abstractions speculatively") says the same
 * thing in plain English: we add what passes today's passes need; deeper
 * nodes (TypeStmt, TestStmt, ExprNode) land when a real consumer appears.
 */

import type { Token } from "./lex.js";
import type { FnDecl } from "./parse-fn.js";

/**
 * Statement-level node in a Program. Each node carries source offsets so
 * consumers can produce diagnostics with precise ranges and tooling can map
 * AST positions to user-visible locations without walking tokens twice.
 *
 * Offsets are UTF-16 code units (JS string indices), not UTF-8 bytes — the
 * lexer increments `i++` over `string`, and every position in the AST
 * shares that coordinate system.
 */
export interface SourceRange {
  /** Offset where the node starts. UTF-16 code units. */
  start: number;
  /** End offset (exclusive) of the node. UTF-16 code units. */
  end: number;
}

/**
 * Wrapper around a parsed `fn` declaration. The decl shape itself comes from
 * `parser/parse-fn.ts` and is shared with passes that consume tokens directly.
 * The wrapper exists so the AST stays a closed set of node kinds even when a
 * single feature (fn) needs the rich underlying decl object.
 */
export interface FnStmt extends SourceRange {
  kind: "FnStmt";
  decl: FnDecl;
}

export type Stmt = FnStmt;

/** The whole-file AST. */
export interface Program {
  kind: "Program";
  /**
   * The exact source string `parseProgram` was handed. parseProgram does
   * not strip `?bs` directives — when called from inside the pipeline
   * (cap-check), `passVersion` has already stripped the directive before
   * the pass runs; when called directly by external tools, the directive
   * is whatever the caller passed in. Either way, all SourceRange offsets
   * in this AST are positions in `src`.
   */
  src: string;
  /**
   * The token stream `parseProgram` lexed. Exposed so consumers (cap-check
   * today, future tooling tomorrow) can do their own structural scans
   * without paying for a second tokenization. Treat as immutable.
   */
  tokens: Token[];
  /**
   * Top-level statements in source order. Today the AST only models fn
   * declarations as nodes (per AGENTS.md rule 5 — deeper structure when a
   * real consumer needs it), so `statements` is the same set as `fns`.
   */
  statements: Stmt[];
  /**
   * Convenience accessor for the parsed fn declarations. By default
   * (`includeNestedFns: false`) this is top-level fns only — the
   * LSP-friendly view. When the parser is invoked with
   * `includeNestedFns: true` (cap-check does this), nested fn decls
   * inside another fn's body are surfaced here too, in source order.
   * Same objects as the matching FnStmt nodes — duplicating here saves
   * callers a `.filter()`.
   */
  fns: FnStmt[];
}
