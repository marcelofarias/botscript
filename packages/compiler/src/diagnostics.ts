/**
 * Structured diagnostics — the contract bots use to loop compile → patch → recompile
 * without regexing English error text.
 *
 * Every compiler error is a `BotscriptError` carrying one or more
 * `Diagnostic` records. The CLI renders them as either human-readable text
 * (default) or JSON (`--format=json`). The text format preserves the
 * "rule / idiom / rewrite" shape the manifesto promises.
 */

export type DiagnosticSeverity = "error";

export interface Diagnostic {
  /** Stable, machine-parseable code. e.g. "CAP001". */
  code: string;
  severity: DiagnosticSeverity;
  /** Source filename if known. */
  file: string | null;
  /** 1-indexed line number into the *original* source. */
  line: number;
  /** 1-indexed column. */
  column: number;
  /**
   * Byte offset where the offending range begins in the source as the pass
   * sees it — that is, after the `?bs` directive at the top of the file has
   * been stripped (passVersion runs first). Line and column above use the
   * same coordinate system, but happen to coincide with original-source
   * line numbering because passVersion preserves the trailing newline.
   *
   * Optional because passes that don't track ranges still emit (line,
   * column) only. When present, callers (LSP, agent loops) can map straight
   * to a source span without re-walking the file. Available from ?bs 0.4
   * onward for diagnostics emitted by passes that consume the AST.
   */
  start?: number;
  /** Byte offset just after the offending range ends. Pairs with `start`. */
  end?: number;
  /** One-line summary, no embedded newlines. */
  message: string;
  /** The language rule that was violated (full sentence). */
  rule?: string;
  /** Canonical pattern that solves this class of problem. */
  idiom?: string;
  /** Suggested literal rewrite the bot can apply. */
  rewrite?: string;
}

export class BotscriptError extends Error {
  readonly diagnostics: ReadonlyArray<Diagnostic>;

  constructor(diagnostics: Diagnostic[]) {
    super(formatDiagnostics(diagnostics));
    this.name = "BotscriptError";
    this.diagnostics = diagnostics;
  }
}

/** Format one diagnostic as the human-readable block bots / humans both read. */
export function formatDiagnostic(d: Diagnostic): string {
  const loc = d.file ? `${d.file}:${d.line}:${d.column}` : `line ${d.line}:${d.column}`;
  const head = `botscript[${d.code}]: ${d.message} (${loc})`;
  const lines = [head];
  if (d.rule) lines.push(`  Rule:    ${d.rule}`);
  if (d.idiom) lines.push(`  Idiom:   ${d.idiom}`);
  if (d.rewrite) lines.push(`  Rewrite: ${d.rewrite}`);
  return lines.join("\n");
}

export function formatDiagnostics(ds: ReadonlyArray<Diagnostic>): string {
  return ds.map(formatDiagnostic).join("\n\n");
}
