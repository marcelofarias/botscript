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
 *   SYN010  A `setTimeout(...)`, `setInterval(...)`, or `queueMicrotask(...)`
 *           call was detected in a fn body (?bs 0.7+). These globals schedule
 *           callbacks to run after the current fn returns — any effects inside
 *           those callbacks are invisible to callers: no capability declaration,
 *           no `writes {}` label, and no `throws {}` entry covers them.
 *           Excluded: member calls (`obj.setTimeout`), function declarations
 *           named `setTimeout`, and object/class method shorthands.
 *
 *   SYN011  A dynamic `import(specifier)` call was detected in a fn body (?bs 0.7+).
 *           Dynamic imports load a module at runtime whose capability surface is
 *           unbounded: CAP001 checks for stdlib namespace calls, not dynamic module
 *           loads. A fn that calls `import()` has an undeclared capability surface
 *           proportional to everything the dynamically loaded module might do at runtime.
 *           `import.meta` (followed by `.`) is excluded — it's a property, not a call.
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

const TIMER_GLOBALS = new Set(["setTimeout", "setInterval", "queueMicrotask"]);

export function passSynCheck(src: string, version: VersionInfo): SynCheckResult {
  if (!atLeast(version.resolved, "0.7")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const warnings: Diagnostic[] = [];
  const syn002 = getErrorCode("SYN002")!;
  const syn003 = getErrorCode("SYN003")!;
  const syn004 = getErrorCode("SYN004")!;
  const syn005 = getErrorCode("SYN005")!;
  const syn006 = getErrorCode("SYN006")!;
  const syn010 = getErrorCode("SYN010")!;
  const syn011 = getErrorCode("SYN011")!;

  // Collect char-offset ranges where all SYN checks are suppressed:
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

    // SYN004: eval() and Function() / new Function() call detection.
    // Fires on:
    //   eval(...)          — global eval not preceded by `.`/`?.`, followed by `(`
    //   Function(…)        — bare Function call not preceded by `.`/`?.`, followed by `(`
    //   new Function(…)    — same as bare Function call, `new` prefix only affects message
    // Suppressed inside `unsafe { }` blocks and `unsafe fn` bodies.
    // `.eval(...)` (method call on a local) and `Function.*` member accesses are NOT flagged.
    let nextInner4 = 0;
    const open4: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open4.length > 0 && open4[open4.length - 1]!.tokenEnd <= i) open4.pop();
      while (nextInner4 < inner.length && inner[nextInner4]!.tokenStart <= i) {
        open4.push(inner[nextInner4]!);
        nextInner4++;
      }
      if (open4.length > 0) continue;

      const tok4 = tokens[i];
      if (!tok4 || tok4.kind !== "ident") continue;

      // --- eval(...) detection ---
      if (tok4.text === "eval") {
        // Exclude: `obj.eval(...)` — preceded by `.` or `?.`
        const prevIdx4 = prevSignificant(tokens, i - 1);
        const prev4 = tokens[prevIdx4];
        if (prev4 && ((prev4.kind === "punct" && prev4.text === ".") || prev4.kind === "questionDot"))
          continue;

        // Must be followed by `(` (direct call), `?.(` (optional call), or `<T>(` (TS instantiation).
        const nextIdx4 = nextSignificant(tokens, i + 1);
        const next4 = tokens[nextIdx4];
        let isOptEval = false;
        let callIdx4 = nextIdx4;
        if (next4 && next4.kind === "questionDot") {
          isOptEval = true;
          callIdx4 = nextSignificant(tokens, nextIdx4 + 1);
        } else if (next4 && next4.kind === "operator" && next4.text === "<") {
          // TypeScript instantiation form: eval<T>(...)
          let depth = 1;
          let j = nextIdx4 + 1;
          while (j < tokens.length && depth > 0) {
            const t = tokens[j];
            if (!t) break;
            if (t.kind === "operator" && t.text === "<") depth++;
            else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
              depth -= t.text.length;
            j++;
          }
          const afterGenericIdx4 = nextSignificant(tokens, j);
          const afterGeneric4 = tokens[afterGenericIdx4];
          if (afterGeneric4 && afterGeneric4.kind === "open" && afterGeneric4.text === "(")
            callIdx4 = afterGenericIdx4;
        }
        const callTok4 = tokens[callIdx4];
        if (!callTok4 || !(callTok4.kind === "open" && callTok4.text === "(")) continue;

        // Exclude declarations: `function eval(params) {}`, `{ eval(params) {} }`, and
        // return-type-annotated forms `function eval(params): T {}` / `{ eval(params): T {} }`.
        // The `:` check is guarded: in a ternary (`? eval(x) : y`), the token before `eval`
        // is `?` (question) — that is a call, not a declaration, so `:` is skipped there.
        if (callTok4.matchedAt !== undefined) {
          const afterCloseIdx = nextSignificant(tokens, callTok4.matchedAt + 1);
          const afterClose = tokens[afterCloseIdx];
          const isTernaryConsequent = prev4 && prev4.kind === "question";
          if (afterClose && (
            (afterClose.kind === "open" && afterClose.text === "{") ||
            afterClose.kind === "fatArrow" ||
            (!isTernaryConsequent && afterClose.kind === "punct" && afterClose.text === ":")
          )) continue;
        }

        if (isInsideRange(tok4.start, unsafeRanges)) continue;

        const callSep4 = isOptEval ? "?." : "";
        const loc4 = locationOf(src, tok4.start);
        warnings.push({
          code: "SYN004",
          severity: "warning",
          file: null,
          line: loc4.line,
          column: loc4.column,
          start: tok4.start,
          end: callTok4.start + 1,
          message:
            `fn '${decl.name}' calls eval${callSep4}() — ` +
            `eval executes a string as code and bypasses all static capability, ` +
            `resource, and safety checks; refactor to explicit code or wrap in unsafe "reason" { eval(src) }`,
          rule: syn004.rule,
          idiom: syn004.idiom,
          rewrite: syn004.rewrite,
        });
        continue;
      }

      // --- new Function(...) / Function(...) detection ---
      // Both `new Function(body)` and bare `Function(body)` execute a string as
      // code at runtime and are equivalent bypasses.
      if (tok4.text === "Function") {
        const prevIdx4 = prevSignificant(tokens, i - 1);
        const prev4 = tokens[prevIdx4];

        // Exclude: `obj.Function(...)` — preceded by `.` or `?.`
        if (prev4 && ((prev4.kind === "punct" && prev4.text === ".") || prev4.kind === "questionDot"))
          continue;

        // Exclude: `Function.prototype.*` — followed by `.` (member access, not a call)
        // Must be followed by `(` (direct call), `?.(` (optional call), or `<T>(` (TS instantiation).
        const nextIdx4 = nextSignificant(tokens, i + 1);
        const next4 = tokens[nextIdx4];
        let isOptFunc = false;
        let callIdx4 = nextIdx4;
        if (next4 && next4.kind === "questionDot") {
          isOptFunc = true;
          callIdx4 = nextSignificant(tokens, nextIdx4 + 1);
        } else if (next4 && next4.kind === "operator" && next4.text === "<") {
          // TypeScript instantiation form: Function<T>(...) / new Function<T>(...)
          let depth = 1;
          let j = nextIdx4 + 1;
          while (j < tokens.length && depth > 0) {
            const t = tokens[j];
            if (!t) break;
            if (t.kind === "operator" && t.text === "<") depth++;
            else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
              depth -= t.text.length;
            j++;
          }
          const afterGenericIdx4 = nextSignificant(tokens, j);
          const afterGeneric4 = tokens[afterGenericIdx4];
          if (afterGeneric4 && afterGeneric4.kind === "open" && afterGeneric4.text === "(")
            callIdx4 = afterGenericIdx4;
        }
        const callTok4 = tokens[callIdx4];
        if (!callTok4 || !(callTok4.kind === "open" && callTok4.text === "(")) continue;

        // Exclude declarations: `function Function(params) {}`, method shorthands, and
        // return-type-annotated forms `function Function(params): T {}` / `{ Function(params): T {} }`.
        // Guard `:` against ternary then-branch: `? Function(body) :` has `?` before Function.
        // `? new Function(body) :` has `new` before Function but `?` before `new` — check both.
        if (callTok4.matchedAt !== undefined) {
          const afterCloseIdx = nextSignificant(tokens, callTok4.matchedAt + 1);
          const afterClose = tokens[afterCloseIdx];
          const prevBeforeNew4 = (prev4 && prev4.kind === "ident" && prev4.text === "new")
            ? tokens[prevSignificant(tokens, prevIdx4 - 1)]
            : undefined;
          const isTernaryConsequent4 = (prev4 && prev4.kind === "question") ||
            (prevBeforeNew4 !== undefined && prevBeforeNew4 !== null && prevBeforeNew4.kind === "question");
          if (afterClose && (
            (afterClose.kind === "open" && afterClose.text === "{") ||
            afterClose.kind === "fatArrow" ||
            (!isTernaryConsequent4 && afterClose.kind === "punct" && afterClose.text === ":")
          )) continue;
        }

        if (isInsideRange(tok4.start, unsafeRanges)) continue;

        const hasNew = prev4 && prev4.kind === "ident" && prev4.text === "new";
        const funcCallSep = isOptFunc ? "?." : "";
        const warnStart = hasNew ? prev4!.start : tok4.start;
        const loc4 = locationOf(src, warnStart);
        warnings.push({
          code: "SYN004",
          severity: "warning",
          file: null,
          line: loc4.line,
          column: loc4.column,
          start: warnStart,
          end: callTok4.start + 1,
          message:
            `fn '${decl.name}' constructs ${hasNew ? "new " : ""}Function${funcCallSep}() — ` +
            `the Function constructor executes a string as code and bypasses all static checks; ` +
            `refactor to explicit code or wrap in unsafe "reason" { ${hasNew ? "new Function(body)" : "Function(body)"} }`,
          rule: syn004.rule,
          idiom: syn004.idiom,
          rewrite: syn004.rewrite,
        });
      }
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

    // SYN010: setTimeout / setInterval / queueMicrotask detection.
    // Fires when a fn body calls any of these timer/microtask globals, which schedule
    // callbacks to run after the fn returns. Any side effects inside those callbacks are
    // invisible to callers: no capability, writes {}, or throws {} can reflect them.
    // Suppressed inside `unsafe "reason" { }` blocks and `unsafe "reason" fn` bodies.
    nextInner = 0;
    const open010: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open010.length > 0 && open010[open010.length - 1]!.tokenEnd <= i) open010.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open010.push(inner[nextInner]!);
        nextInner++;
      }
      if (open010.length > 0) continue;

      const tok10 = tokens[i];
      if (!tok10 || tok10.kind !== "ident" || !TIMER_GLOBALS.has(tok10.text)) continue;

      // Exclude property accesses: obj.setTimeout(...)
      const prevIdx10 = prevSignificant(tokens, i - 1);
      const prev10 = tokens[prevIdx10];
      if (prev10 && ((prev10.kind === "punct" && prev10.text === ".") || prev10.kind === "questionDot"))
        continue;

      // Exclude function declarations: function setTimeout(fn, ms) {} or fn setTimeout(...) -> void {}
      if (prev10 && prev10.kind === "ident" && prev10.text === "function") continue;
      if (prev10 && prev10.kind === "keyword" && prev10.text === "fn") continue;

      // Must be followed by `(` or `?.(` — confirming this is a call, not a reference.
      let afterIdx10 = nextSignificant(tokens, i + 1);
      let afterTok10 = tokens[afterIdx10];
      if (afterTok10 && afterTok10.kind === "questionDot") {
        afterIdx10 = nextSignificant(tokens, afterIdx10 + 1);
        afterTok10 = tokens[afterIdx10];
      }
      if (!afterTok10 || !(afterTok10.kind === "open" && afterTok10.text === "(")) continue;

      // Exclude method shorthands and class methods: { setTimeout(fn) { ... } }
      // When after the closing `)` is `{` (method body) or `:` (return type), it's a definition.
      const closeParenIdx10 = afterTok10.matchedAt;
      if (closeParenIdx10 !== undefined) {
        const afterParenIdx10 = nextSignificant(tokens, closeParenIdx10 + 1);
        const afterParen10 = tokens[afterParenIdx10];
        if (
          afterParen10 &&
          ((afterParen10.kind === "open" && afterParen10.text === "{") ||
            (afterParen10.kind === "punct" && afterParen10.text === ":"))
        ) continue;
      }

      if (isInsideRange(tok10.start, unsafeRanges)) continue;

      const loc10 = locationOf(src, tok10.start);
      warnings.push({
        code: "SYN010",
        severity: "warning",
        file: null,
        line: loc10.line,
        column: loc10.column,
        start: tok10.start,
        end: tok10.end,
        message:
          `fn '${decl.name}' calls ${tok10.text}() — ` +
          `${tok10.text} schedules a callback that runs after the fn returns; ` +
          `any effects inside that callback are invisible to callers and cannot be declared in the fn header; ` +
          `wrap in unsafe "schedules deferred effect" { ${tok10.text}(...) }`,
        rule: syn010.rule,
        idiom: syn010.idiom,
        rewrite: syn010.rewrite,
      });
    }

    // SYN011: dynamic import() detection.
    // Fires when a fn body calls `import(specifier)` — the dynamic import form.
    // Dynamic imports load a module at runtime whose capability surface is unbounded:
    // CAP001 cannot see what the dynamically loaded module does at runtime.
    // `import.meta` (followed by `.`) is excluded — it's a property, not a call.
    // Suppressed inside `unsafe "reason" { }` blocks and `unsafe "reason" fn` bodies.
    nextInner = 0;
    const open011: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open011.length > 0 && open011[open011.length - 1]!.tokenEnd <= i) open011.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open011.push(inner[nextInner]!);
        nextInner++;
      }
      if (open011.length > 0) continue;

      const tok11 = tokens[i];
      if (!tok11 || tok11.kind !== "ident" || tok11.text !== "import") continue;

      // Exclude property accesses: obj.import(...)
      const prevIdx11 = prevSignificant(tokens, i - 1);
      const prev11 = tokens[prevIdx11];
      if (prev11 && ((prev11.kind === "punct" && prev11.text === ".") || prev11.kind === "questionDot"))
        continue;

      // Exclude fn / function declarations: `fn import(...)` or `function import(...)`
      if (prev11 && prev11.kind === "ident" && (prev11.text === "fn" || prev11.text === "function"))
        continue;

      // Must be followed by `(` — import.meta is followed by `.` and must be excluded.
      const afterIdx11 = nextSignificant(tokens, i + 1);
      const afterTok11 = tokens[afterIdx11];
      if (!afterTok11 || !(afterTok11.kind === "open" && afterTok11.text === "(")) continue;

      // Exclude method shorthands and class methods: { import(x) { ... } }
      // When after the closing `)` is `{` (method body) or `:` (return type), it's a definition.
      const closeParenIdx11 = afterTok11.matchedAt;
      if (closeParenIdx11 !== undefined) {
        const afterParenIdx11 = nextSignificant(tokens, closeParenIdx11 + 1);
        const afterParen11 = tokens[afterParenIdx11];
        if (
          afterParen11 &&
          ((afterParen11.kind === "open" && afterParen11.text === "{") ||
            (afterParen11.kind === "punct" && afterParen11.text === ":"))
        ) continue;
      }

      if (isInsideRange(tok11.start, unsafeRanges)) continue;

      const loc11 = locationOf(src, tok11.start);
      warnings.push({
        code: "SYN011",
        severity: "warning",
        file: null,
        line: loc11.line,
        column: loc11.column,
        start: tok11.start,
        end: tok11.end,
        message:
          `fn '${decl.name}' calls import() — dynamic import bypasses the capability model; ` +
          `use static import or wrap in unsafe "loads plugin dynamically" { import(specifier) }`,
        rule: syn011.rule,
        idiom: syn011.idiom,
        rewrite: syn011.rewrite,
      });
    }
  }

  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
