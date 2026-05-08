/**
 * Whole-file AST.
 *
 * Shipped at ?bs 0.4. The model is shallow on purpose: top-level statements
 * are surfaced as typed nodes carrying byte ranges into the original source,
 * but expression-level structure inside fn bodies stays as token spans. That
 * way cap-check (and future passes) get the structural information they need
 * — fn boundaries, source offsets — without paying for a full expression
 * parser the rest of the language doesn't yet need.
 *
 * AGENTS.md rule 5 ("don't add abstractions speculatively") says the same
 * thing in plain English: we add what passes today's passes need; deeper
 * nodes (TypeStmt, TestStmt, ExprNode) land when a real consumer appears.
 */

import type { FnDecl } from "./parse-fn.js";

/**
 * Statement-level node in a Program. Each node carries byte offsets into
 * the source text so consumers can produce diagnostics with precise ranges
 * and tooling can map AST positions to user-visible locations without
 * walking tokens twice.
 */
export interface SourceRange {
  /** Byte offset where the node starts. */
  start: number;
  /** Byte offset just after the node ends. */
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
  /** The source text the AST was built from (after `?bs` directive stripping). */
  src: string;
  /** Top-level statements in source order. */
  statements: Stmt[];
  /**
   * Convenience accessor for the fn declarations. Same objects as the
   * matching FnStmt nodes — duplicating here saves callers a `.filter()`.
   */
  fns: FnStmt[];
}
