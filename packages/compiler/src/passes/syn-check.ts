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

    const bodyStart = decl.bodyTokenStart ?? decl.tokenStart;
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open.push(inner[nextInner]!);
        nextInner++;
      }
      if (open.length > 0) continue;

      const tok = tokens[i];
      if (!tok) continue;

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

      // Exclude class/object field assignments: class X { throw = 1 }
      // The lexer emits `eq` (kind="eq") for `=`; a real throw expression can never start with `=`.
      if (next && next.kind === "eq") continue;

      // Exclude definite-assignment assertions: class X { throw!: T }
      // A `!` directly after the field name (non-null assertion) always precedes `:` or `=`.
      if (next && next.kind === "operator" && next.text === "!") {
        const afterBangIdx = nextSignificant(tokens, nextIdx + 1);
        const afterBang = tokens[afterBangIdx];
        if (afterBang && (afterBang.kind === "punct" && afterBang.text === ":" || afterBang.kind === "eq")) continue;
      }

      // Exclude optional method signatures: throw?() / throw?(): T
      // A standalone `throw` statement cannot be followed by `?`; only method
      // signatures in type literals / interfaces use optional-method syntax.
      if (next && next.kind === "question") continue;

      // Exclude generic method names: throw<T>() — skip over `<…>` to find `(`.
      // When `throw` is followed by `<`, look past the matching `>` for a `(`.
      let effectiveNextIdx = nextIdx;
      let effectiveNext = next;
      if (next && next.kind === "operator" && next.text === "<") {
        // Find the matching `>` for the generic parameter list.
        let depth = 1;
        let j = nextIdx + 1;
        while (j < tokens.length && depth > 0) {
          const t = tokens[j];
          if (!t) break;
          if (t.kind === "operator" && t.text === "<") depth++;
          else if (t.kind === "operator" && t.text === ">") depth--;
          j++;
        }
        const afterGenericIdx = nextSignificant(tokens, j);
        const afterGeneric = tokens[afterGenericIdx];
        if (afterGeneric && afterGeneric.kind === "open" && afterGeneric.text === "(") {
          effectiveNextIdx = afterGenericIdx;
          effectiveNext = afterGeneric;
        }
      }

      // Exclude object literal method shorthands: { throw() {} }, { a: 1, throw() {} }
      // and type-literal method signatures: { throw() }, { throw(): T; }
      // but NOT throw (expr) — a throw statement with a parenthesized expression.
      // Detection rules:
      //  1. Empty parens (`throw()`) cannot be a throw statement (no-argument grouping
      //     `()` is a syntax error in JS/TS), so they must be a method signature.
      //  2. Non-empty parens: `throw(` is a method shorthand/signature when the token
      //     immediately after its matching `)` is `{` (block body), `=>` (arrow method),
      //     or `:` (return type annotation, e.g. `throw(): T { ... }` or `throw(): T;`).
      if (effectiveNext && effectiveNext.kind === "open" && effectiveNext.text === "(") {
        const closeParenIdx = effectiveNext.matchedAt;
        if (closeParenIdx !== undefined) {
          const firstInsideIdx = nextSignificant(tokens, effectiveNextIdx + 1);
          if (firstInsideIdx === closeParenIdx) continue; // empty parens → method signature
          const afterParenIdx = nextSignificant(tokens, closeParenIdx + 1);
          const afterParen = tokens[afterParenIdx];
          if (
            afterParen &&
            ((afterParen.kind === "open" && afterParen.text === "{") ||
              afterParen.kind === "fatArrow" ||
              (afterParen.kind === "punct" && afterParen.text === ":"))
          ) continue;
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
