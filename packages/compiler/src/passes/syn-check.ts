/**
 * Syntax-level warnings for constructs that are legal TypeScript but
 * off-idiom for botscript's safety model.
 *
 *   SYN002  A native `throw` statement was detected in a fn body (?bs 0.7+).
 *           Native throws bypass botscript's Result-based error contract:
 *           callers relying on `?` unwrap, `match`, or declared `throws {}`
 *           propagation will not observe exceptions raised via `throw`. The
 *           idiomatic fix is `return err(new ErrorType(...))`.
 */

import type { Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex } from "../parser/lex.js";
import { parseProgram } from "../parser/parse.js";
import { locationOf } from "./_location.js";
import { computeNesting } from "./_callgraph.js";
import { prevSignificant } from "./_callgraph.js";
import { atLeast, type VersionInfo } from "./version.js";

export interface SynCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

export function passSynCheck(src: string, version: VersionInfo): SynCheckResult {
  if (!atLeast(version.resolved, "0.7")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = lex(src);
  const warnings: Diagnostic[] = [];
  const entry = getErrorCode("SYN002")!;

  const nesting = computeNesting(program.fns.map((f) => f.decl));

  for (const { decl } of program.fns) {
    const inner = nesting.get(decl) ?? [];
    const open: typeof inner = [];
    let nextInner = 0;

    for (let i = decl.bodyTokenStart ?? decl.tokenStart; i < decl.tokenEnd; i++) {
      while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open.push(inner[nextInner]!);
        nextInner++;
      }
      if (open.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident" || tok.text !== "throw") continue;

      // Exclude property accesses: obj.throw (unlikely but possible in JS).
      const prevIdx = prevSignificant(tokens, i - 1);
      const prev = tokens[prevIdx];
      if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
        continue;

      const loc = locationOf(src, tok.start);
      warnings.push({
        code: "SYN002",
        severity: "warning",
        file: null,
        line: loc.line,
        column: loc.column,
        start: tok.start,
        end: tok.end,
        message:
          `fn '${decl.name}' contains a native throw statement — ` +
          `callers using ? unwrap or match on Result will not observe this error; ` +
          `use return err(new ErrorType(...)) instead`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite: entry.rewrite,
      });
    }
  }

  return { code: src, warnings };
}
