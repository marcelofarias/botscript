/**
 * Syntax-level warnings for constructs that are legal TypeScript but
 * off-idiom for botscript's safety model.
 *
 *   SYN002  A native `throw` statement was detected in a fn body (?bs 0.7+).
 *           Native throws bypass botscript's Result-based error contract:
 *           callers relying on `?` unwrap, `match`, or declared `throws {}`
 *           propagation will not observe exceptions raised via `throw`. The
 *           idiomatic fix is `return err(new ErrorType(...))`.
 *
 *   SYN003  A `console.*` call was detected in a fn body (?bs 0.7+).
 *           Direct console calls bypass botscript's capability model: the
 *           compiler cannot see or enforce the `stdout`/`stderr` capability
 *           declaration for output that goes through `console`. Use
 *           `stdout.write(...)` or `stderr.write(...)` so the output surface
 *           is explicit in the fn's `uses { stdout }` / `uses { stderr }`
 *           clause and visible to callers.
 *
 *   SYN004  A `process.exit()`, `process.abort()`, or `process.exitCode = N` call/assignment
 *           was detected in a fn body (?bs 0.7+).
 *           `process.exit()` / `process.abort()` terminate the entire worker process — any
 *           co-located bots sharing the process are killed, no Result error path is available
 *           to callers, and even a wrapping try/catch cannot intercept the termination.
 *           `process.exitCode = N` sets the exit code that will be used when the process
 *           eventually terminates, which has the same effect from the orchestrator's perspective.
 *           Both forms are the most severe bypass of botscript's safety model. The idiomatic
 *           fix is to bubble the exit intent as a Result return and let the orchestrator decide.
 */

import type { Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { locationOf } from "./_location.js";
import { computeNesting, prevSignificant, nextSignificant } from "./_callgraph.js";
import { atLeast, type VersionInfo } from "./version.js";
import { collectUnsafeBlockRanges, isInsideRange } from "./_unsafe-ranges.js";

export interface SynCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

// console method names that are output/logging calls (not console.assert, console.time, etc.)
const CONSOLE_OUTPUT_METHODS = new Set([
  "log", "error", "warn", "info", "debug", "dir", "dirxml",
  "table", "trace", "group", "groupCollapsed", "groupEnd",
]);

export function passSynCheck(src: string, version: VersionInfo): SynCheckResult {
  if (!atLeast(version.resolved, "0.7")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const warnings: Diagnostic[] = [];
  const syn002 = getErrorCode("SYN002")!;
  const syn003 = getErrorCode("SYN003")!;
  const syn004 = getErrorCode("SYN004")!;

  // Collect char-offset ranges where SYN002/SYN003/SYN004 are suppressed:
  // 1. `unsafe "reason" { ... }` expression blocks — explicit acknowledgment.
  // 2. `unsafe "reason" fn` bodies — the entire body is exempt, including any
  //    non-unsafe nested fns declared inside it (matching uns-check's pattern).
  const unsafeRanges = collectUnsafeBlockRanges(tokens);
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) {
      unsafeRanges.push({ start: decl.body.start, end: decl.body.end });
    }
  }

  const nesting = computeNesting(program.fns.map((f) => f.decl));

  for (const { decl } of program.fns) {
    // An `unsafe "reason" fn` body is an explicit acknowledgment — skip SYN002/SYN003/SYN004.
    // The range-based suppression above also covers nested non-unsafe fns within it,
    // so this early-continue is kept purely as an optimisation.
    if (decl.unsafeReason !== undefined) continue;

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
          else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
            depth -= t.text.length;
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

      if (isInsideRange(tok.start, unsafeRanges)) continue;

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
        rule: syn002.rule,
        idiom: syn002.idiom,
        rewrite: syn002.rewrite,
      });
    }

    // SYN003: console.* call detection.
    // Reset state for this fn's SYN003 scan.
    nextInner = 0;
    const open003: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open003.length > 0 && open003[open003.length - 1]!.tokenEnd <= i) open003.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open003.push(inner[nextInner]!);
        nextInner++;
      }
      if (open003.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident" || tok.text !== "console") continue;

      // Exclude: `obj.console` — preceded by `.` or `?.`
      const prevIdx = prevSignificant(tokens, i - 1);
      const prev = tokens[prevIdx];
      if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
        continue;

      // Must be followed by `.` or `?.` (member access). This correctly excludes
      // `{ console: ... }` (property key — next token is `:`, not `.`/`?.`) and
      // any other context where `console` is not a member-access receiver.
      const nextIdx = nextSignificant(tokens, i + 1);
      const next = tokens[nextIdx];
      const isDot = next && next.kind === "punct" && next.text === ".";
      const isOptChain = next && next.kind === "questionDot";
      if (!isDot && !isOptChain) continue;

      // Next must be a `.` / `?.` then a known console output method.
      const methodIdx = nextSignificant(tokens, nextIdx + 1);
      const method = tokens[methodIdx];
      if (!method || method.kind !== "ident" || !CONSOLE_OUTPUT_METHODS.has(method.text)) continue;

      // Must be a call: next after the method must be `(` or `?.(` (optional call).
      let afterMethodIdx = nextSignificant(tokens, methodIdx + 1);
      let afterMethod = tokens[afterMethodIdx];
      // Track whether the call itself is optional (`console.log?.()`) so the
      // warning message renders the correct syntax.
      let isOptCall = false;
      if (afterMethod && afterMethod.kind === "questionDot") {
        isOptCall = true;
        afterMethodIdx = nextSignificant(tokens, afterMethodIdx + 1);
        afterMethod = tokens[afterMethodIdx];
      }
      if (!afterMethod || !(afterMethod.kind === "open" && afterMethod.text === "(")) continue;

      if (isInsideRange(tok.start, unsafeRanges)) continue;

      const sep = isOptChain ? "?." : ".";
      const callSep = isOptCall ? "?." : "";
      const loc = locationOf(src, tok.start);
      warnings.push({
        code: "SYN003",
        severity: "warning",
        file: null,
        line: loc.line,
        column: loc.column,
        start: tok.start,
        end: method.end,
        message:
          `fn '${decl.name}' calls console${sep}${method.text}${callSep}() — ` +
          `direct console output bypasses the stdout/stderr capability model; ` +
          `use stdout.write(...) or stderr.write(...) and declare uses { stdout } or uses { stderr }`,
        rule: syn003.rule,
        idiom: syn003.idiom,
        rewrite: syn003.rewrite,
      });
    }

    // SYN004: process.exit() / process.abort() detection.
    nextInner = 0;
    const open004: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open004.length > 0 && open004[open004.length - 1]!.tokenEnd <= i) open004.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open004.push(inner[nextInner]!);
        nextInner++;
      }
      if (open004.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident" || tok.text !== "process") continue;

      // Exclude: `obj.process` — preceded by `.` or `?.`
      const prevIdx = prevSignificant(tokens, i - 1);
      const prev = tokens[prevIdx];
      if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
        continue;

      // Must be followed by `.` or `?.`
      const nextIdx = nextSignificant(tokens, i + 1);
      const next = tokens[nextIdx];
      const isDot4 = next && next.kind === "punct" && next.text === ".";
      const isOptChain4 = next && next.kind === "questionDot";
      if (!isDot4 && !isOptChain4) continue;

      // Next must be `exit`, `abort`, or `exitCode`
      const methodIdx = nextSignificant(tokens, nextIdx + 1);
      const method = tokens[methodIdx];
      if (
        !method ||
        method.kind !== "ident" ||
        (method.text !== "exit" && method.text !== "abort" && method.text !== "exitCode")
      )
        continue;

      if (isInsideRange(tok.start, unsafeRanges)) continue;

      const sep4 = isOptChain4 ? "?." : ".";
      const loc = locationOf(src, tok.start);

      if (method.text === "exitCode") {
        // Assignment form: process.exitCode = N
        const afterMethodIdx = nextSignificant(tokens, methodIdx + 1);
        const afterMethod4 = tokens[afterMethodIdx];
        if (!afterMethod4 || afterMethod4.kind !== "eq") continue;
        warnings.push({
          code: "SYN004",
          severity: "warning",
          file: null,
          line: loc.line,
          column: loc.column,
          start: tok.start,
          end: method.end,
          message:
            `fn '${decl.name}' assigns process${sep4}exitCode — ` +
            `this sets the exit code the worker uses on termination; ` +
            `use Result<T, E> and let the orchestrator decide, or wrap in unsafe`,
          rule: syn004.rule,
          idiom: syn004.idiom,
          rewrite: syn004.rewrite,
        });
        continue;
      }

      // Must be a call: method followed by `(` or `?.(`.
      let afterMethodIdx = nextSignificant(tokens, methodIdx + 1);
      let afterMethod4 = tokens[afterMethodIdx];
      let isOptCall4 = false;
      if (afterMethod4 && afterMethod4.kind === "questionDot") {
        isOptCall4 = true;
        afterMethodIdx = nextSignificant(tokens, afterMethodIdx + 1);
        afterMethod4 = tokens[afterMethodIdx];
      }
      if (!afterMethod4 || !(afterMethod4.kind === "open" && afterMethod4.text === "(")) continue;

      const callSep4 = isOptCall4 ? "?." : "";
      warnings.push({
        code: "SYN004",
        severity: "warning",
        file: null,
        line: loc.line,
        column: loc.column,
        start: tok.start,
        end: method.end,
        message:
          `fn '${decl.name}' calls process${sep4}${method.text}${callSep4}() — ` +
          `this terminates the worker process; co-located bots are killed and callers cannot intercept the termination; ` +
          `use Result<T, E> and let the orchestrator decide, or wrap in unsafe`,
        rule: syn004.rule,
        idiom: syn004.idiom,
        rewrite: syn004.rewrite,
      });
    }
  }

  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
