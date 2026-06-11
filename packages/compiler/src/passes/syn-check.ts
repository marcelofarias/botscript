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
 *   SYN005  A `process.env` access was detected in a fn body (?bs 0.7+).
 *           `process.env` is a global deployment-environment namespace. Reads
 *           and writes to it are invisible to callers — no capability or
 *           resource declaration covers env-var access, so the fn silently
 *           depends on runtime deployment values that callers cannot see,
 *           audit, or mock in tests. The idiomatic fix is to pass config
 *           and secrets as explicit fn parameters.
 *
 *   SYN006  A `process.exit()` call was detected in a fn body (?bs 0.7+).
 *           `process.exit()` terminates the entire host process — not just the
 *           fn, not just the bot. It produces no return value and bypasses
 *           Result propagation, throws {}, match, and any caller recovery
 *           path. The idiomatic fix is `return err(...)` so the caller can
 *           decide whether to terminate.
 *
 *   SYN007  A `fetch(...)` call was detected in a fn body (?bs 0.7+).
 *           `fetch()` makes real HTTP requests at runtime but is invisible to
 *           botscript's capability model: CAP001 checks for `http.*` member
 *           calls, not the `fetch` global. A fn that calls `fetch` has an
 *           undeclared network dependency — no `uses { net }` in the fn header
 *           will reflect it. Use `http.get()` or `http.post()` instead so the
 *           net capability is declared and visible to callers.
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
  const syn005 = getErrorCode("SYN005")!;
  const syn006 = getErrorCode("SYN006")!;
  const syn007 = getErrorCode("SYN007")!;

  // Collect char-offset ranges where SYN002/SYN003/SYN005/SYN006/SYN007 are suppressed:
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
    // An `unsafe "reason" fn` body is an explicit acknowledgment — all SYN checks are skipped.
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

    // SYN005: process.env access detection.
    // Fires on any `process.env` access (read or write) — not just calls.
    // Detection: `process` not preceded by `.`/`?.`, followed by `.`/`?.` then `env`.
    nextInner = 0;
    const open005: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open005.length > 0 && open005[open005.length - 1]!.tokenEnd <= i) open005.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open005.push(inner[nextInner]!);
        nextInner++;
      }
      if (open005.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident" || tok.text !== "process") continue;

      // Exclude: `obj.process` — preceded by `.` or `?.`
      const prevIdx5 = prevSignificant(tokens, i - 1);
      const prev5 = tokens[prevIdx5];
      if (prev5 && ((prev5.kind === "punct" && prev5.text === ".") || prev5.kind === "questionDot"))
        continue;

      // Must be followed by `.` or `?.`
      const nextIdx5 = nextSignificant(tokens, i + 1);
      const next5 = tokens[nextIdx5];
      const isDot5 = next5 && next5.kind === "punct" && next5.text === ".";
      const isOptChain5 = next5 && next5.kind === "questionDot";
      if (!isDot5 && !isOptChain5) continue;

      // Next must be the ident `env`
      const envIdx = nextSignificant(tokens, nextIdx5 + 1);
      const envTok = tokens[envIdx];
      if (!envTok || envTok.kind !== "ident" || envTok.text !== "env") continue;

      // Check the *env* token position, not just `process`, so the suppression
      // boundary is the actual property access site rather than the object root.
      if (isInsideRange(envTok.start, unsafeRanges)) continue;

      const sep5 = isOptChain5 ? "?." : ".";
      const loc5 = locationOf(src, tok.start);
      warnings.push({
        code: "SYN005",
        severity: "warning",
        file: null,
        line: loc5.line,
        column: loc5.column,
        start: tok.start,
        end: envTok.end,
        message:
          `fn '${decl.name}' accesses process${sep5}env — ` +
          `env-var access is invisible to callers; pass config and secrets as explicit parameters, ` +
          `or wrap in unsafe "reads deployment env" { process.env.KEY }`,
        rule: syn005.rule,
        idiom: syn005.idiom,
        rewrite: syn005.rewrite,
      });
    }

    // SYN006: process.exit() detection.
    // Fires when a fn body calls `process.exit(...)`, `process?.exit(...)`,
    // or the optional-call form `process.exit?.(...)`.
    // `process.exit()` terminates the host process entirely — no return value,
    // no caller recovery, no Result propagation. It is the most severe silent-exit
    // pattern botscript's capability model does not currently cover.
    // Suppressed inside `unsafe { }` blocks and `unsafe fn` bodies.
    nextInner = 0;
    const open006: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open006.length > 0 && open006[open006.length - 1]!.tokenEnd <= i) open006.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open006.push(inner[nextInner]!);
        nextInner++;
      }
      if (open006.length > 0) continue;

      const tok6 = tokens[i];
      if (!tok6 || tok6.kind !== "ident" || tok6.text !== "process") continue;

      // Exclude: `obj.process.exit(...)` — `process` preceded by `.` or `?.`
      const prevIdx6 = prevSignificant(tokens, i - 1);
      const prev6 = tokens[prevIdx6];
      if (prev6 && ((prev6.kind === "punct" && prev6.text === ".") || prev6.kind === "questionDot"))
        continue;

      // Must be followed by `.` or `?.`
      const nextIdx6 = nextSignificant(tokens, i + 1);
      const next6 = tokens[nextIdx6];
      const isDot6 = next6 && next6.kind === "punct" && next6.text === ".";
      const isOptChain6 = next6 && next6.kind === "questionDot";
      if (!isDot6 && !isOptChain6) continue;

      // Next must be the ident `exit`
      const exitIdx = nextSignificant(tokens, nextIdx6 + 1);
      const exitTok = tokens[exitIdx];
      if (!exitTok || exitTok.kind !== "ident" || exitTok.text !== "exit") continue;

      // Must be followed by `(` or `?.(` — confirming this is a call, not `process.exit.bind`
      let afterExitIdx = nextSignificant(tokens, exitIdx + 1);
      let afterExit = tokens[afterExitIdx];
      let isOptCall6 = false;
      if (afterExit && afterExit.kind === "questionDot") {
        isOptCall6 = true;
        afterExitIdx = nextSignificant(tokens, afterExitIdx + 1);
        afterExit = tokens[afterExitIdx];
      }
      if (!afterExit || !(afterExit.kind === "open" && afterExit.text === "(")) continue;

      // Suppression is checked on the `exit` call token, not just `process`.
      if (isInsideRange(exitTok.start, unsafeRanges)) continue;

      const sep6 = isOptChain6 ? "?." : ".";
      const callSep6 = isOptCall6 ? "?." : "";
      const loc6 = locationOf(src, tok6.start);
      warnings.push({
        code: "SYN006",
        severity: "warning",
        file: null,
        line: loc6.line,
        column: loc6.column,
        start: tok6.start,
        end: exitTok.end,
        message:
          `fn '${decl.name}' calls process${sep6}exit${callSep6}() — ` +
          `process.exit terminates the entire host process; callers cannot catch it, ` +
          `no Result propagation runs; return err(...) instead or wrap in ` +
          `unsafe "exits on invalid config" { process.exit(1) }`,
        rule: syn006.rule,
        idiom: syn006.idiom,
        rewrite: syn006.rewrite,
      });
    }

    // SYN007: fetch() call detection.
    // Fires when a fn body calls `fetch(...)`, `fetch?.(...)`, or a TypeScript
    // instantiation form `fetch<T>(...)`. All forms make real HTTP requests
    // at runtime but are invisible to CAP001 (which only checks `http.*` member
    // calls). A fn that uses `fetch` directly has an undeclared `net` dependency.
    // Suppressed inside `unsafe { }` blocks and `unsafe fn` bodies.
    nextInner = 0;
    const open007: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open007.length > 0 && open007[open007.length - 1]!.tokenEnd <= i) open007.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open007.push(inner[nextInner]!);
        nextInner++;
      }
      if (open007.length > 0) continue;

      const tok7 = tokens[i];
      if (!tok7 || tok7.kind !== "ident" || tok7.text !== "fetch") continue;

      // Exclude: `obj.fetch(...)` or `obj?.fetch(...)` — member call on a local.
      const prevIdx7 = prevSignificant(tokens, i - 1);
      const prev7 = tokens[prevIdx7];
      if (prev7 && ((prev7.kind === "punct" && prev7.text === ".") || prev7.kind === "questionDot"))
        continue;

      // Must be followed by `(`, `?.(`, or `<T>(` — confirming this is a call,
      // not a bare `fetch` reference or a property access like `fetch.name`.
      let afterFetchIdx = nextSignificant(tokens, i + 1);
      const afterFetch = tokens[afterFetchIdx];
      if (!afterFetch) continue;

      // TypeScript instantiation form: `fetch<T>(...)` — skip over `<...>` to find `(`
      if (afterFetch.kind === "operator" && afterFetch.text === "<") {
        let anglDepth = 1;
        afterFetchIdx++;
        while (afterFetchIdx < decl.tokenEnd && anglDepth > 0) {
          const at = tokens[afterFetchIdx];
          if (!at) { afterFetchIdx++; continue; }
          if (at.kind === "operator" && at.text === "<") { anglDepth++; }
          else if (at.kind === "operator" && (at.text === ">" || at.text === ">>" || at.text === ">>>")) {
            anglDepth -= at.text.length;
          }
          afterFetchIdx++;
        }
        afterFetchIdx = nextSignificant(tokens, afterFetchIdx);
        const afterAngle = tokens[afterFetchIdx];
        if (!afterAngle || !(afterAngle.kind === "open" && afterAngle.text === "(")) continue;
      } else if (afterFetch.kind === "questionDot") {
        // `fetch?.(...)` — optional call
        const afterQD7 = nextSignificant(tokens, afterFetchIdx + 1);
        const afterQDTok = tokens[afterQD7];
        if (!afterQDTok || !(afterQDTok.kind === "open" && afterQDTok.text === "(")) continue;
      } else if (!(afterFetch.kind === "open" && afterFetch.text === "(")) {
        continue;
      }

      // Exclude object-literal method shorthands and type-literal method signatures:
      // `{ fetch(url) { ... } }` and `{ fetch(url): RetType }` inside a fn body.
      // Detection: if the `(` has a matching `)` and the token after `)` is `{`, `=>`,
      // or `:`, this is a method definition/annotation, not a runtime call.
      if (afterFetch.kind === "open" && afterFetch.text === "(") {
        const closeParenIdx7 = afterFetch.matchedAt;
        if (closeParenIdx7 !== undefined) {
          const afterParenIdx7 = nextSignificant(tokens, closeParenIdx7 + 1);
          const afterParen7 = tokens[afterParenIdx7];
          if (
            afterParen7 &&
            ((afterParen7.kind === "open" && afterParen7.text === "{") ||
              afterParen7.kind === "fatArrow" ||
              (afterParen7.kind === "punct" && afterParen7.text === ":"))
          )
            continue;
        }
      }

      // Suppression check: unsafe block or unsafe fn body
      if (isInsideRange(tok7.start, unsafeRanges)) continue;

      const loc7 = locationOf(src, tok7.start);
      warnings.push({
        code: "SYN007",
        severity: "warning",
        file: null,
        line: loc7.line,
        column: loc7.column,
        start: tok7.start,
        end: tok7.end,
        message:
          `fn '${decl.name}' calls fetch() — fetch bypasses the net capability model; ` +
          `CAP001 cannot see it; use http.get() or http.post() and declare uses { net }, ` +
          `or wrap in unsafe "wraps fetch directly" { fetch(...) }`,
        rule: syn007.rule,
        idiom: syn007.idiom,
        rewrite: syn007.rewrite,
      });
    }
  }

  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
