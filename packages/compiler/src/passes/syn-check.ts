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
import { parseProgram } from "../parser/parse.js";
import { locationOf } from "./_location.js";
import { computeNesting, prevSignificant, nextSignificant } from "./_callgraph.js";
import { atLeast, type VersionInfo } from "./version.js";

export interface SynCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

export function passSynCheck(src: string, version: VersionInfo): SynCheckResult {
  if (!atLeast(version.resolved, "0.7")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const warnings: Diagnostic[] = [];
  const entry = getErrorCode("SYN002")!;

  const nesting = computeNesting(program.fns.map((f) => f.decl));

  for (const { decl } of program.fns) {
    const inner = nesting.get(decl) ?? [];
    const open: typeof inner = [];
    let nextInner = 0;

    // Track brace depth within this function body. For block-bodied fns the
    // opening `{` is depth 1; any inner `{` pushes deeper. A throw at depth 1
    // in a block-bodied fn is always a statement. For expression-bodied fns
    // (`fn x() = ...`), the first `{` encountered might be an object literal —
    // detect this by checking whether the body starts with `{` (block) or not
    // (expression). Apply the method-shorthand suppression at depth > 1 always,
    // and at depth 1 only when the body is expression-bodied.
    const bodyStart = decl.bodyTokenStart ?? decl.tokenStart;
    const bodyFirstTok = tokens[bodyStart];
    const isBlockBody = bodyFirstTok?.kind === "open" && bodyFirstTok?.text === "{";
    let braceDepth = 0;
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open.push(inner[nextInner]!);
        nextInner++;
      }
      if (open.length > 0) continue;

      const tok = tokens[i];
      if (!tok) continue;

      // Track brace depth so we know when throw is directly in a block vs object literal.
      if (tok.kind === "open" && tok.text === "{") { braceDepth++; continue; }
      if (tok.kind === "close" && tok.text === "}") { braceDepth--; continue; }

      if (tok.kind !== "ident" || tok.text !== "throw") continue;

      // Exclude property accesses: obj.throw
      const prevIdx = prevSignificant(tokens, i - 1);
      const prev = tokens[prevIdx];
      if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
        continue;

      // Exclude getter/setter accessor names: { get throw() {} }, { set throw(v) {} }
      if (prev && prev.kind === "ident" && (prev.text === "get" || prev.text === "set")) continue;

      // Exclude object literal property keys: { throw: 1 }
      const nextIdx = nextSignificant(tokens, i + 1);
      const next = tokens[nextIdx];
      if (next && next.kind === "punct" && next.text === ":") continue;

      // Exclude object literal method shorthands: { throw() {} }, { a: 1, throw() {} }
      // but NOT throw (expr) — a throw statement with a parenthesized expression.
      // At depth 1 in a block-bodied fn, throw(...) is always a statement (the `{` at
      // depth 1 IS the fn body block, not an object literal). For expression-bodied fns,
      // depth 1 could be an object literal, so apply the check there too.
      if (next && next.kind === "open" && next.text === "(") {
        if (braceDepth > 1 || (!isBlockBody && braceDepth >= 1)) {
          // After a comma: definitely property context.
          if (prev && prev.kind === "punct" && prev.text === ",") continue;
          // After {: could be object literal or block — check the token before the {.
          if (prev && prev.kind === "open" && prev.text === "{") {
            const prevPrevIdx = prevSignificant(tokens, prevIdx - 1);
            const prevPrev = prevPrevIdx >= 0 ? tokens[prevPrevIdx] : undefined;
            const isBlock =
              prevPrev == null ||
              (prevPrev.kind === "close" && prevPrev.text === ")") ||
              prevPrev.kind === "fatArrow" ||
              prevPrev.kind === "keyword" ||
              (prevPrev.kind === "ident" &&
                ["else", "try", "catch", "finally", "do"].includes(prevPrev.text));
            if (!isBlock) continue;
          }
        }
      }

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
