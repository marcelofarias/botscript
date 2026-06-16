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
 *   SYN004  An `eval(...)`, `Function(...)`, or `new Function(...)` call was
 *           detected in a fn body (?bs 0.7+). These execute a string as code
 *           at runtime, bypassing all static capability, resource, and safety
 *           checks the compiler would otherwise enforce.
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
 *   SYN007  A `fetch(url)` or `fetch?.(url)` call was detected in a fn body (?bs 0.7+).
 *           `fetch` makes HTTP requests at runtime but is invisible to botscript's
 *           capability model: CAP001 checks for `http.*` member calls, not the `fetch`
 *           global. A fn that calls `fetch` has an undeclared network dependency.
 *           Excluded: member calls (`obj.fetch`), function/fn declarations named
 *           `fetch`, object/class method shorthands, and TypeScript method
 *           signatures (`{ fetch(url): T; }`). The `:` exclusion is guarded
 *           against ternary consequents (`cond ? fetch(url) : other`).
 *
 *   SYN008  A `new WebSocket(url)` / `WebSocket(url)` call was detected in a fn body (?bs 0.7+).
 *           `WebSocket` opens a persistent bidirectional connection at runtime but is
 *           invisible to botscript's capability model: CAP001 checks for `http.*` member
 *           calls, not the `WebSocket` global. A fn that constructs a WebSocket has an
 *           undeclared network dependency that no capability declaration can see.
 *           Excluded: member calls (`obj.WebSocket`), `function`/`fn` declarations named
 *           `WebSocket`, object/class method shorthands, and TypeScript method
 *           signatures (`{ WebSocket(url): T; }`). The `:` exclusion is guarded
 *           against ternary consequents (`cond ? WebSocket(url) : other`, including
 *           `cond ? new WebSocket(url) : other`). Generic `<T>` detection only when
 *           preceded by `new` (avoids false-positives on `WebSocket < x > (y)` comparisons).
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
 *           Excluded: member calls, `fn import(...)` declarations, object method shorthands.
 *
 *   SYN014  A `new BroadcastChannel(name)`, `BroadcastChannel(name)`, or TypeScript
 *           instantiation form `new BroadcastChannel<T>(name)` was detected in a fn body
 *           (?bs 0.7+). `BroadcastChannel` opens a cross-context message channel at runtime
 *           that any tab, window, or worker on the same origin can post to or receive from —
 *           invisible to botscript's capability model: CAP001 checks for stdlib namespace
 *           calls, not the `BroadcastChannel` global. A fn that constructs a BroadcastChannel
 *           has an undeclared cross-context messaging dependency.
 *           Excluded: member calls (`obj.BroadcastChannel`), `function`/`fn` declarations
 *           named `BroadcastChannel`, object/class method shorthands, and TypeScript method
 *           signatures. The `:` exclusion is guarded against ternary consequents.
 *
 *   SYN016  An `indexedDB.*` access was detected in a fn body (?bs 0.7+).
 *           `indexedDB` is same-origin persistent database storage invisible to botscript's
 *           capability model: `reads {}` / `writes {}` labels cover declared resource
 *           identifiers, not the Web Storage API globals. Unlike `localStorage`, `indexedDB`
 *           is asynchronous and has no practical size limit. A fn that accesses `indexedDB`
 *           has undeclared persistent state dependencies — callers cannot observe or audit
 *           them from the fn's declared surface.
 *           Detection: `indexedDB` not preceded by `.`/`?.`, followed by `.` or `?.`.
 *           `fn`/`function` declarations named `indexedDB` and bare references are excluded.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN018  A `Math.random()`, `Math?.random()`, or `Math.random?.()` call was detected in a fn body (?bs 0.7+).
 *           `Math.random` generates a random float at runtime but is invisible to botscript's
 *           capability model: `uses { random }` covers `random.*` stdlib calls, not the
 *           `Math` global. A fn that calls `Math.random()` has an undeclared randomness
 *           dependency — callers cannot see it, and tests cannot deterministically mock or
 *           suppress it the way they can the `random` stdlib namespace.
 *           Detection: `Math` not preceded by `.`/`?.`, followed by `.` or `?.`, member is
 *           `random`, followed by `(` or `?.(` (call confirmation). Bare `Math.random`
 *           references (without `()`) are excluded. `unsafe {}` blocks and `unsafe "reason" fn`
 *           bodies are suppressed.
 *
 *   SYN020  A `Date.now()`, `new Date()`, or `Date()` call was detected in a fn body (?bs 0.7+).
 *           These forms inject the current time at runtime but are invisible to botscript's
 *           capability model: `uses { time }` covers `time.*` stdlib calls, not the `Date` global.
 *           A fn that calls these forms has an undeclared time dependency — callers cannot see it
 *           and tests cannot control the time value observed by the fn.
 *           Detection paths:
 *           1. `Date.now()` / `Date?.now()` / `Date.now?.()` — `Date` not preceded by `.`/`?.`,
 *              followed by `.`/`?.`, member is `now`, followed by `(`/`?.(`.
 *           2. `new Date()` / `new Date<T>()` — `Date` preceded by `new`, followed by empty
 *              parens (arg-count check: first token inside `(…)` must be `)`). Generic scan
 *              only when `new` precedes to avoid `Date < x > (y)` comparison false-positives.
 *           3. `Date()` / `Date?.()` — bare call with empty parens.
 *           Excluded: `new Date(timestamp)` / `new Date("str")` / `new Date(y,m,d,…)` (explicit
 *           args), `Date.parse(str)` / `Date.UTC(…)` (no ambient time), `obj.Date()` (member
 *           call), fn/function/function* declarations named `Date`, method shorthands, TS method
 *           signatures. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN021  A `performance.now()` or `performance.timeOrigin` access was detected in a fn body (?bs 0.7+).
 *           `performance.now()` returns a high-resolution monotonic timestamp (milliseconds since
 *           the page/process started) and `performance.timeOrigin` exposes the absolute epoch of
 *           that clock. Both inject ambient timing information at runtime but are invisible to
 *           botscript's capability model: `uses { time }` covers `time.*` stdlib calls, not the
 *           `performance` global. A fn that reads these values has an undeclared time dependency —
 *           callers cannot see it and tests cannot control the clock value observed by the fn.
 *           Detection:
 *           1. `performance.now()` / `performance?.now()` / `performance.now?.()` — `performance`
 *              not preceded by `.`/`?.`, followed by `.`/`?.`, member is `now`, followed by `(`/`?.(`.
 *           2. `performance.timeOrigin` / `performance?.timeOrigin` — `performance` not preceded
 *              by `.`/`?.`, followed by `.`/`?.`, member is `timeOrigin` (property, no call needed).
 *           Excluded: `obj.performance.*` (member call), fn/function/function* declarations named `performance`,
 *           TS method signatures. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 * All checks share a single token scan per fn body. The outer loop runs once,
 * skipping nested fn bodies once. Per-token dispatch is a switch on tok.text
 * after a kind==="ident" guard.
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
  const syn007 = getErrorCode("SYN007")!;
  const syn008 = getErrorCode("SYN008")!;
  const syn010 = getErrorCode("SYN010")!;
  const syn011 = getErrorCode("SYN011")!;
  const syn014 = getErrorCode("SYN014")!;
  const syn016 = getErrorCode("SYN016")!;
  const syn018 = getErrorCode("SYN018")!;
  const syn020 = getErrorCode("SYN020")!;
  const syn021 = getErrorCode("SYN021")!;

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

    // Single dispatch loop: nesting bookkeeping runs once per token position.
    // All SYN checks are dispatched via a switch on tok.text after an ident guard.
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open.push(inner[nextInner]!);
        nextInner++;
      }
      if (open.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident") continue;

      switch (tok.text) {

        // ── SYN002: native throw ─────────────────────────────────────────────
        case "throw": {
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
          if (next && next.kind === "eq") continue;

          // Exclude definite-assignment assertions: class X { throw!: T }
          if (next && next.kind === "operator" && next.text === "!") {
            const afterBangIdx = nextSignificant(tokens, nextIdx + 1);
            const afterBang = tokens[afterBangIdx];
            if (afterBang && (afterBang.kind === "punct" && afterBang.text === ":" || afterBang.kind === "eq")) continue;
          }

          // Exclude optional method signatures: throw?() / throw?(): T
          if (next && next.kind === "question") continue;

          // Exclude generic method names: throw<T>() — skip over `<…>` to find `(`.
          let effectiveNextIdx = nextIdx;
          let effectiveNext = next;
          if (next && next.kind === "operator" && next.text === "<") {
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

          // Exclude object literal method shorthands: { throw() {} }
          // and type-literal method signatures: { throw() }, { throw(): T; }
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
          break;
        }

        // ── SYN003: console.* call ───────────────────────────────────────────
        case "console": {
          // Exclude: `obj.console` — preceded by `.` or `?.`
          const prevIdx = prevSignificant(tokens, i - 1);
          const prev = tokens[prevIdx];
          if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
            continue;

          // Must be followed by `.` or `?.` (member access).
          const nextIdx = nextSignificant(tokens, i + 1);
          const next = tokens[nextIdx];
          const isDot = next && next.kind === "punct" && next.text === ".";
          const isOptChain = next && next.kind === "questionDot";
          if (!isDot && !isOptChain) continue;

          // Next must be a known console output method.
          const methodIdx = nextSignificant(tokens, nextIdx + 1);
          const method = tokens[methodIdx];
          if (!method || method.kind !== "ident" || !CONSOLE_OUTPUT_METHODS.has(method.text)) continue;

          // Must be a call: next after the method must be `(` or `?.(`.
          let afterMethodIdx = nextSignificant(tokens, methodIdx + 1);
          let afterMethod = tokens[afterMethodIdx];
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
          break;
        }

        // ── SYN004: eval(...) ────────────────────────────────────────────────
        case "eval": {
          // Exclude: `obj.eval(...)` — preceded by `.` or `?.`
          const prevIdx4 = prevSignificant(tokens, i - 1);
          const prev4 = tokens[prevIdx4];
          if (prev4 && ((prev4.kind === "punct" && prev4.text === ".") || prev4.kind === "questionDot"))
            continue;

          // Must be followed by `(`, `?.(`, or `<T>(`.
          const nextIdx4 = nextSignificant(tokens, i + 1);
          const next4 = tokens[nextIdx4];
          let isOptEval = false;
          let callIdx4 = nextIdx4;
          if (next4 && next4.kind === "questionDot") {
            isOptEval = true;
            callIdx4 = nextSignificant(tokens, nextIdx4 + 1);
          } else if (next4 && next4.kind === "operator" && next4.text === "<") {
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

          // Exclude declarations: `function eval(params) {}`, method shorthands, etc.
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

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep4 = isOptEval ? "?." : "";
          const loc4 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN004",
            severity: "warning",
            file: null,
            line: loc4.line,
            column: loc4.column,
            start: tok.start,
            end: callTok4.start + 1,
            message:
              `fn '${decl.name}' calls eval${callSep4}() — ` +
              `eval executes a string as code and bypasses all static capability, ` +
              `resource, and safety checks; refactor to explicit code or wrap in unsafe "reason" { eval(src) }`,
            rule: syn004.rule,
            idiom: syn004.idiom,
            rewrite: syn004.rewrite,
          });
          break;
        }

        // ── SYN004: new Function(...) / Function(...) ────────────────────────
        case "Function": {
          const prevIdx4 = prevSignificant(tokens, i - 1);
          const prev4 = tokens[prevIdx4];

          // Exclude: `obj.Function(...)` — preceded by `.` or `?.`
          if (prev4 && ((prev4.kind === "punct" && prev4.text === ".") || prev4.kind === "questionDot"))
            continue;

          // Must be followed by `(`, `?.(`, or `<T>(`.
          const nextIdx4 = nextSignificant(tokens, i + 1);
          const next4 = tokens[nextIdx4];
          let isOptFunc = false;
          let callIdx4 = nextIdx4;
          if (next4 && next4.kind === "questionDot") {
            isOptFunc = true;
            callIdx4 = nextSignificant(tokens, nextIdx4 + 1);
          } else if (next4 && next4.kind === "operator" && next4.text === "<") {
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

          // Exclude declarations and method shorthands. Guard `:` against ternary.
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

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const hasNew = prev4 && prev4.kind === "ident" && prev4.text === "new";
          const funcCallSep = isOptFunc ? "?." : "";
          const warnStart = hasNew ? prev4!.start : tok.start;
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
          break;
        }

        // ── SYN005 + SYN006: process.env / process.exit ──────────────────────
        case "process": {
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

          // Check the member name: `env` → SYN005, `exit` → SYN006.
          const memberIdx = nextSignificant(tokens, nextIdx5 + 1);
          const memberTok = tokens[memberIdx];
          if (!memberTok || memberTok.kind !== "ident") continue;

          const sep5 = isOptChain5 ? "?." : ".";

          if (memberTok.text === "env") {
            // SYN005: process.env access.
            // Suppression is checked on the `env` token, not just `process`.
            if (isInsideRange(memberTok.start, unsafeRanges)) continue;

            const loc5 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN005",
              severity: "warning",
              file: null,
              line: loc5.line,
              column: loc5.column,
              start: tok.start,
              end: memberTok.end,
              message:
                `fn '${decl.name}' accesses process${sep5}env — ` +
                `env-var access is invisible to callers; pass config and secrets as explicit parameters, ` +
                `or wrap in unsafe "reads deployment env" { process.env.KEY }`,
              rule: syn005.rule,
              idiom: syn005.idiom,
              rewrite: syn005.rewrite,
            });

          } else if (memberTok.text === "exit") {
            // SYN006: process.exit() call.
            // Must be followed by `(` or `?.(` — confirming this is a call, not `process.exit.bind`.
            let afterExitIdx = nextSignificant(tokens, memberIdx + 1);
            let afterExit = tokens[afterExitIdx];
            let isOptCall6 = false;
            if (afterExit && afterExit.kind === "questionDot") {
              isOptCall6 = true;
              afterExitIdx = nextSignificant(tokens, afterExitIdx + 1);
              afterExit = tokens[afterExitIdx];
            }
            if (!afterExit || !(afterExit.kind === "open" && afterExit.text === "(")) continue;

            // Suppression is checked on the `exit` call token, not just `process`.
            if (isInsideRange(memberTok.start, unsafeRanges)) continue;

            const callSep6 = isOptCall6 ? "?." : "";
            const loc6 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN006",
              severity: "warning",
              file: null,
              line: loc6.line,
              column: loc6.column,
              start: tok.start,
              end: memberTok.end,
              message:
                `fn '${decl.name}' calls process${sep5}exit${callSep6}() — ` +
                `process.exit terminates the entire host process; callers cannot catch it, ` +
                `no Result propagation runs; return err(...) instead or wrap in ` +
                `unsafe "exits on invalid config" { process.exit(1) }`,
              rule: syn006.rule,
              idiom: syn006.idiom,
              rewrite: syn006.rewrite,
            });
          }
          break;
        }

        // ── SYN007: fetch() call ─────────────────────────────────────────────
        case "fetch": {
          const prevIdx7 = prevSignificant(tokens, i - 1);
          const prev7 = tokens[prevIdx7];

          // Exclude: `obj.fetch(...)` — preceded by `.` or `?.`
          if (prev7 && ((prev7.kind === "punct" && prev7.text === ".") || prev7.kind === "questionDot"))
            continue;

          // Exclude: function/fn declarations named fetch
          if (prev7 && prev7.kind === "ident" && prev7.text === "function") continue;
          if (prev7 && prev7.kind === "keyword" && prev7.text === "fn") continue;

          // Must be followed by `(` or `?.(` — confirming this is a call.
          const nextIdx7 = nextSignificant(tokens, i + 1);
          const next7 = tokens[nextIdx7];

          let callIdx7 = nextIdx7;
          let isOpt7 = false;
          if (next7 && next7.kind === "questionDot") {
            isOpt7 = true;
            callIdx7 = nextSignificant(tokens, nextIdx7 + 1);
          }
          const callTok7 = tokens[callIdx7];
          if (!callTok7 || !(callTok7.kind === "open" && callTok7.text === "(")) continue;

          // Exclude method shorthands and TS method signatures: { fetch(url) { } } / { fetch(url): T; }
          // Guard the `:` check against ternary consequents: `cond ? fetch(url) : other`
          // Also handles `cond ? await fetch(url) : other` — if prev is `await`, look one further back.
          const prevBeforeAwait7 = (prev7 && prev7.kind === "ident" && prev7.text === "await")
            ? tokens[prevSignificant(tokens, prevIdx7 - 1)]
            : undefined;
          const isTernaryConsequent7 = (prev7 !== undefined && prev7 !== null && prev7.kind === "question") ||
            (prevBeforeAwait7 !== undefined && prevBeforeAwait7 !== null && prevBeforeAwait7.kind === "question");
          if (callTok7.matchedAt !== undefined) {
            const afterCloseIdx7 = nextSignificant(tokens, callTok7.matchedAt + 1);
            const afterClose7 = tokens[afterCloseIdx7];
            if (afterClose7 && (
              (afterClose7.kind === "open" && afterClose7.text === "{") ||
              afterClose7.kind === "fatArrow" ||
              (!isTernaryConsequent7 && afterClose7.kind === "punct" && afterClose7.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep7 = isOpt7 ? "?." : "";
          const loc7 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN007",
            severity: "warning",
            file: null,
            line: loc7.line,
            column: loc7.column,
            start: tok.start,
            end: callTok7.start + 1,
            message:
              `fn '${decl.name}' calls fetch${callSep7}() — ` +
              `fetch makes an HTTP request invisible to the capability model; ` +
              `replace with http.get(url)/http.post(url, { body }) and add uses { net }, ` +
              `or wrap in unsafe "calls fetch directly" { fetch(url) }`,
            rule: syn007.rule,
            idiom: syn007.idiom,
            rewrite: syn007.rewrite,
          });
          break;
        }

        // ── SYN008: new WebSocket() / WebSocket() call ───────────────────────
        case "WebSocket": {
          const prevIdx8 = prevSignificant(tokens, i - 1);
          const prev8 = tokens[prevIdx8];

          // Exclude: `obj.WebSocket(...)` — preceded by `.` or `?.`
          if (prev8 && ((prev8.kind === "punct" && prev8.text === ".") || prev8.kind === "questionDot"))
            continue;

          // Exclude: function/fn declarations named WebSocket
          if (prev8 && prev8.kind === "ident" && prev8.text === "function") continue;
          if (prev8 && prev8.kind === "keyword" && prev8.text === "fn") continue;

          const hasNew8 = prev8 && prev8.kind === "ident" && prev8.text === "new";
          // For ternary guard: check if token before WebSocket (or before `new`) is `?`
          const prevBeforeNew8 = hasNew8
            ? tokens[prevSignificant(tokens, prevIdx8 - 1)]
            : undefined;
          const isTernaryConsequent8 = (prev8 !== undefined && prev8 !== null && prev8.kind === "question") ||
            (prevBeforeNew8 !== undefined && prevBeforeNew8 !== null && prevBeforeNew8.kind === "question");

          const nextIdx8 = nextSignificant(tokens, i + 1);
          const next8 = tokens[nextIdx8];

          let isOpt8 = false;
          let callIdx8 = nextIdx8;

          if (next8 && next8.kind === "questionDot") {
            // WebSocket?.( — optional call (no generic scan to avoid false-positives)
            isOpt8 = true;
            callIdx8 = nextSignificant(tokens, nextIdx8 + 1);
          } else if (hasNew8 && next8 && next8.kind === "operator" && next8.text === "<") {
            // new WebSocket<T>( — generic scan only when `new` precedes, preventing
            // `WebSocket < x > (y)` comparison expressions from false-firing.
            let depth = 1;
            let j = nextIdx8 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx8 = nextSignificant(tokens, j);
          }

          const callTok8 = tokens[callIdx8];
          if (!callTok8 || !(callTok8.kind === "open" && callTok8.text === "(")) continue;

          // Exclude method shorthands and TS method signatures: { WebSocket(url) { ... } } / { WebSocket(url): T; }
          // Guard the `:` check against ternary consequents: `cond ? WebSocket(url) : other`
          if (callTok8.matchedAt !== undefined) {
            const afterCloseIdx8 = nextSignificant(tokens, callTok8.matchedAt + 1);
            const afterClose8 = tokens[afterCloseIdx8];
            if (afterClose8 && (
              (afterClose8.kind === "open" && afterClose8.text === "{") ||
              afterClose8.kind === "fatArrow" ||
              (!isTernaryConsequent8 && afterClose8.kind === "punct" && afterClose8.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep8 = isOpt8 ? "?." : "";
          const warnStart8 = hasNew8 ? prev8!.start : tok.start;
          const loc8 = locationOf(src, warnStart8);
          warnings.push({
            code: "SYN008",
            severity: "warning",
            file: null,
            line: loc8.line,
            column: loc8.column,
            start: warnStart8,
            end: callTok8.start + 1,
            message:
              `fn '${decl.name}' ${hasNew8 ? "constructs new " : "calls "}WebSocket${callSep8}() — ` +
              `WebSocket opens a network connection invisible to the capability model; ` +
              `wrap in unsafe "wraps WebSocket for <reason>" { ${hasNew8 ? "new " : ""}WebSocket${isOpt8 ? "?." : ""}(url) }`,
            rule: syn008.rule,
            idiom: syn008.idiom,
            rewrite: syn008.rewrite,
          });
          break;
        }

        // ── SYN011: dynamic import() call ────────────────────────────────────
        case "import": {
          // Exclude: `obj.import(...)` — preceded by `.` or `?.`
          const prevIdx11 = prevSignificant(tokens, i - 1);
          const prev11 = tokens[prevIdx11];
          if (prev11 && ((prev11.kind === "punct" && prev11.text === ".") || prev11.kind === "questionDot"))
            continue;

          // Exclude: `fn import(...)` botscript declarations — `fn` is kind="keyword".
          if (prev11 && prev11.kind === "keyword" && prev11.text === "fn") continue;

          // Exclude: `import.meta` and other `import.something` property accesses.
          const nextIdx11 = nextSignificant(tokens, i + 1);
          const next11 = tokens[nextIdx11];
          if (next11 && next11.kind === "punct" && next11.text === ".") continue;

          // Must be followed by `(` or `?.(` — confirming this is a dynamic import call.
          let isOptImport = false;
          let callIdx11 = nextIdx11;
          if (next11 && next11.kind === "questionDot") {
            isOptImport = true;
            callIdx11 = nextSignificant(tokens, nextIdx11 + 1);
          }
          const callTok11 = tokens[callIdx11];
          if (!callTok11 || !(callTok11.kind === "open" && callTok11.text === "(")) continue;

          // Exclude object/class method shorthands: { import(x) { ... } }
          // and TypeScript method signatures: { import(x): T; }
          // Exception: when prev11 is `?` (ternary), a trailing `:` is the
          // ternary else-branch, not a method return type — don't suppress.
          const isTernaryConsequent = prev11 && prev11.kind === "question";
          if (callTok11.matchedAt !== undefined) {
            const afterCloseIdx = nextSignificant(tokens, callTok11.matchedAt + 1);
            const afterClose = tokens[afterCloseIdx];
            if (afterClose && (
              (afterClose.kind === "open" && afterClose.text === "{") ||
              afterClose.kind === "fatArrow" ||
              (!isTernaryConsequent && afterClose.kind === "punct" && afterClose.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep11 = isOptImport ? "?." : "";
          const loc11 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN011",
            severity: "warning",
            file: null,
            line: loc11.line,
            column: loc11.column,
            start: tok.start,
            end: callTok11.start + 1,
            message:
              `fn '${decl.name}' calls import${callSep11}() — ` +
              `dynamic imports load a module at runtime whose capability surface is unbounded; ` +
              `wrap in unsafe "loads <module> for <reason>" { import(specifier) }`,
            rule: syn011.rule,
            idiom: syn011.idiom,
            rewrite: syn011.rewrite,
          });
          break;
        }

        // ── SYN014: new BroadcastChannel() / BroadcastChannel() ─────────────
        case "BroadcastChannel": {
          const prevIdx14 = prevSignificant(tokens, i - 1);
          const prev14 = tokens[prevIdx14];

          // Exclude: `obj.BroadcastChannel(...)` — preceded by `.` or `?.`
          if (prev14 && ((prev14.kind === "punct" && prev14.text === ".") || prev14.kind === "questionDot"))
            continue;

          // Exclude: function/fn declarations named BroadcastChannel
          if (prev14 && prev14.kind === "ident" && prev14.text === "function") continue;
          if (prev14 && prev14.kind === "keyword" && prev14.text === "fn") continue;

          // Must be followed by `(` or `?.(` — or `<T>(` when preceded by `new`
          // (generic scan is gated on `new` to avoid `<`/`>` comparison false-positives).
          const nextIdx14 = nextSignificant(tokens, i + 1);
          const next14 = tokens[nextIdx14];

          let callIdx14 = nextIdx14;
          let isOpt14 = false;
          if (next14 && next14.kind === "questionDot") {
            isOpt14 = true;
            callIdx14 = nextSignificant(tokens, nextIdx14 + 1);
          }

          // TypeScript generic instantiation: `new BroadcastChannel<T>(name)`
          let afterGenericIdx14 = callIdx14;
          if (!isOpt14 && next14 && next14.kind === "operator" && next14.text === "<") {
            const hasNew14 = prev14 && prev14.kind === "ident" && prev14.text === "new";
            if (hasNew14) {
              let depth14 = 1;
              let j14 = nextIdx14 + 1;
              while (j14 < decl.tokenEnd && depth14 > 0) {
                const at14 = tokens[j14];
                if (!at14) { j14++; continue; }
                if (at14.kind === "operator" && at14.text === "<") depth14++;
                else if (at14.kind === "operator" && (at14.text === ">" || at14.text === ">>" || at14.text === ">>>"))
                  depth14 = Math.max(0, depth14 - at14.text.length);
                j14++;
              }
              afterGenericIdx14 = nextSignificant(tokens, j14);
              callIdx14 = afterGenericIdx14;
            }
          }

          const callTok14 = tokens[callIdx14];
          if (!callTok14 || !(callTok14.kind === "open" && callTok14.text === "(")) continue;

          // Exclude method shorthands and TS method signatures.
          // Guard `:` check against ternary consequents.
          const prevBeforeNew14 = (prev14 && prev14.kind === "ident" && prev14.text === "new")
            ? tokens[prevSignificant(tokens, prevIdx14 - 1)]
            : undefined;
          const isTernaryConsequent14 = (prev14 && prev14.kind === "question") ||
            (prevBeforeNew14 !== undefined && prevBeforeNew14 !== null && prevBeforeNew14.kind === "question");
          if (callTok14.matchedAt !== undefined) {
            const afterCloseIdx14 = nextSignificant(tokens, callTok14.matchedAt + 1);
            const afterClose14 = tokens[afterCloseIdx14];
            if (afterClose14 && (
              (afterClose14.kind === "open" && afterClose14.text === "{") ||
              afterClose14.kind === "fatArrow" ||
              (!isTernaryConsequent14 && afterClose14.kind === "punct" && afterClose14.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type:
            // `{ BroadcastChannel(name: string) }` — no `{`, `=>`, or `:` after `)`,
            // but a `:` at depth 0 inside the parens that isn't part of a ternary.
            // Also handles optional params: `{ BroadcastChannel(name?: string) }`.
            let hasTypeAnnotation14 = false;
            let depth14 = 0;
            let ternaryDepth14 = 0;
            for (let k14 = callIdx14 + 1; k14 < callTok14.matchedAt; k14++) {
              const at14 = tokens[k14];
              if (!at14) continue;
              if (at14.kind === "open") { depth14++; continue; }
              if (at14.kind === "close") { depth14--; continue; }
              if (depth14 !== 0) continue;
              if (at14.kind === "question") {
                // `?:` is an optional-parameter marker, not a ternary — peek ahead
                const nextAfterQ14 = nextSignificant(tokens, k14 + 1);
                const nextTokQ14 = tokens[nextAfterQ14];
                if (nextTokQ14 && nextTokQ14.kind === "punct" && nextTokQ14.text === ":") {
                  hasTypeAnnotation14 = true;
                  break;
                }
                ternaryDepth14++;
                continue;
              }
              if (at14.kind === "punct" && at14.text === ":") {
                if (ternaryDepth14 > 0) { ternaryDepth14--; continue; }
                hasTypeAnnotation14 = true;
                break;
              }
            }
            if (hasTypeAnnotation14) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const hasNew14 = prev14 && prev14.kind === "ident" && prev14.text === "new";
          const callSep14 = isOpt14 ? "?." : "";
          const warnStart14 = hasNew14 ? prev14!.start : tok.start;
          const loc14 = locationOf(src, warnStart14);
          warnings.push({
            code: "SYN014",
            severity: "warning",
            file: null,
            line: loc14.line,
            column: loc14.column,
            start: warnStart14,
            end: callTok14.start + 1,
            message:
              `fn '${decl.name}' ${hasNew14 ? "constructs new " : "calls "}BroadcastChannel${callSep14}() — ` +
              `BroadcastChannel opens a cross-context message channel any same-origin tab or worker can post to, ` +
              `invisible to the capability model; wrap in unsafe "<reason>" { ${hasNew14 ? "new " : ""}BroadcastChannel${callSep14}(name) }`,
            rule: syn014.rule,
            idiom: syn014.idiom,
            rewrite: syn014.rewrite,
          });
          break;
        }

        // ── SYN016: indexedDB.* access ───────────────────────────────────────
        case "indexedDB": {
          // Exclude: `obj.indexedDB` — preceded by `.` or `?.`
          const prevIdx16 = prevSignificant(tokens, i - 1);
          const prev16 = tokens[prevIdx16];
          if (prev16 && ((prev16.kind === "punct" && prev16.text === ".") || prev16.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named indexedDB
          if (prev16 && prev16.kind === "keyword" && prev16.text === "fn") continue;
          if (prev16 && prev16.kind === "ident" && prev16.text === "function") continue;
          // Generator: `function* indexedDB` — prev token is `*`, token before that is `function`
          if (prev16 && prev16.kind === "punct" && prev16.text === "*") {
            const prevPrevIdx16 = prevSignificant(tokens, prevIdx16 - 1);
            const prevPrev16 = tokens[prevPrevIdx16];
            if (prevPrev16 && prevPrev16.kind === "ident" && prevPrev16.text === "function") continue;
          }

          // Must be followed by `.` or `?.` — confirming this is an access on the global, not a bare reference
          const nextIdx16 = nextSignificant(tokens, i + 1);
          const next16 = tokens[nextIdx16];
          const isDot16 = next16 && next16.kind === "punct" && next16.text === ".";
          const isOptChain16 = next16 && next16.kind === "questionDot";
          if (!isDot16 && !isOptChain16) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep16 = isOptChain16 ? "?." : ".";
          const loc16 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN016",
            severity: "warning",
            file: null,
            line: loc16.line,
            column: loc16.column,
            start: tok.start,
            end: next16!.end,
            message:
              `fn '${decl.name}' accesses indexedDB${sep16} — ` +
              `indexedDB is persistent same-origin database storage invisible to the capability model; ` +
              `no reads {} / writes {} label covers it; ` +
              `pass a database handle as a parameter or wrap in unsafe "accesses indexedDB for <reason>" { indexedDB.open(name) }`,
            rule: syn016.rule,
            idiom: syn016.idiom,
            rewrite: syn016.rewrite,
          });
          break;
        }

        // ── SYN018: Math.random() ────────────────────────────────────────────
        case "Math": {
          // Exclude: `obj.Math.random(...)` — Math preceded by `.` or `?.`
          const prevIdx18 = prevSignificant(tokens, i - 1);
          const prev18 = tokens[prevIdx18];
          if (prev18 && ((prev18.kind === "punct" && prev18.text === ".") || prev18.kind === "questionDot"))
            continue;

          // Must be followed by `.` or `?.`
          const nextIdx18 = nextSignificant(tokens, i + 1);
          const next18 = tokens[nextIdx18];
          const isDot18 = next18 && next18.kind === "punct" && next18.text === ".";
          const isOptChain18 = next18 && next18.kind === "questionDot";
          if (!isDot18 && !isOptChain18) continue;

          // Member must be `random`
          const memberIdx18 = nextSignificant(tokens, nextIdx18 + 1);
          const memberTok18 = tokens[memberIdx18];
          if (!memberTok18 || memberTok18.kind !== "ident" || memberTok18.text !== "random") continue;

          // Must be a call: next after `random` is `(` or `?.(`
          let afterRandomIdx18 = nextSignificant(tokens, memberIdx18 + 1);
          let afterRandom18 = tokens[afterRandomIdx18];
          let isOptCall18 = false;
          if (afterRandom18 && afterRandom18.kind === "questionDot") {
            isOptCall18 = true;
            afterRandomIdx18 = nextSignificant(tokens, afterRandomIdx18 + 1);
            afterRandom18 = tokens[afterRandomIdx18];
          }
          if (!afterRandom18 || !(afterRandom18.kind === "open" && afterRandom18.text === "(")) continue;

          if (isInsideRange(memberTok18.start, unsafeRanges)) continue;

          const sep18 = isOptChain18 ? "?." : ".";
          const callSep18 = isOptCall18 ? "?." : "";
          const loc18 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN018",
            severity: "warning",
            file: null,
            line: loc18.line,
            column: loc18.column,
            start: tok.start,
            end: memberTok18.end,
            message:
              `fn '${decl.name}' calls Math${sep18}random${callSep18}() — ` +
              `Math.random is invisible to the capability model; use random.next() with uses { random } ` +
              `so tests can control the output, or wrap in unsafe "uses Math.random for <reason>" { Math.random() }`,
            rule: syn018.rule,
            idiom: syn018.idiom,
            rewrite: syn018.rewrite,
          });
          break;
        }

        // ── SYN020: Date.now() / new Date() / Date() — ambient time dependency ─
        case "Date": {
          // Exclude: `obj.Date` — preceded by `.` or `?.`
          const prevIdx20 = prevSignificant(tokens, i - 1);
          const prev20 = tokens[prevIdx20];
          if (prev20 && ((prev20.kind === "punct" && prev20.text === ".") || prev20.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named Date
          if (prev20 && prev20.kind === "keyword" && prev20.text === "fn") continue;
          if (prev20 && prev20.kind === "ident" && prev20.text === "function") continue;
          if (prev20 && prev20.kind === "operator" && prev20.text === "*") {
            const prevPrevIdx20 = prevSignificant(tokens, prevIdx20 - 1);
            const prevPrev20 = tokens[prevPrevIdx20];
            if (prevPrev20 && prevPrev20.kind === "ident" && prevPrev20.text === "function") continue;
          }

          const hasNew20 = prev20 && prev20.kind === "ident" && prev20.text === "new";

          const nextIdx20 = nextSignificant(tokens, i + 1);
          const next20 = tokens[nextIdx20];

          // ── Pattern 1: Date.now() / Date?.now() ──────────────────────────
          // Followed by `.` or `?.`, then `now`, then `(` or `?.(`.
          const isDotNext20 = next20 && next20.kind === "punct" && next20.text === ".";
          const isOptChain20 = next20 && next20.kind === "questionDot";
          if (isDotNext20 || isOptChain20) {
            const memberIdx20 = nextSignificant(tokens, nextIdx20 + 1);
            const memberTok20 = tokens[memberIdx20];
            // Only enter Pattern 1 when the member is `now`.
            // `Date?.()` has `?.` followed directly by `(` — fall through to Pattern 2.
            if (!memberTok20 || memberTok20.kind !== "ident" || memberTok20.text !== "now") {
              // `.xxx` that isn't `.now` is not an ambient-time call (e.g. Date.parse).
              // `?.xxx` that isn't `?.now` — still not ambient time, except `Date?.()` where
              // the `(` appears as member. That is handled below in Pattern 2 (next20 === `?.`).
              if (isDotNext20) continue;
              // isOptChain20 && member isn't `now`: fall through to Pattern 2.
            } else {

            // Confirm call: next after `now` is `(` or `?.(`
            let afterNowIdx20 = nextSignificant(tokens, memberIdx20 + 1);
            let afterNow20 = tokens[afterNowIdx20];
            let isOptCall20 = false;
            if (afterNow20 && afterNow20.kind === "questionDot") {
              isOptCall20 = true;
              afterNowIdx20 = nextSignificant(tokens, afterNowIdx20 + 1);
              afterNow20 = tokens[afterNowIdx20];
            }
            if (!afterNow20 || !(afterNow20.kind === "open" && afterNow20.text === "(")) continue;
            if (isInsideRange(tok.start, unsafeRanges)) continue;

            const sep20 = isOptChain20 ? "?." : ".";
            const callSep20 = isOptCall20 ? "?." : "";
            const loc20 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN020",
              severity: "warning",
              file: null,
              line: loc20.line,
              column: loc20.column,
              start: tok.start,
              end: afterNow20.start + 1,
              message:
                `fn '${decl.name}' calls Date${sep20}now${callSep20}() — ` +
                `Date.now() injects the current time invisible to the capability model; ` +
                `pass nowMs as a parameter or use time.now() with uses { time }, ` +
                `or wrap in unsafe "uses current time for <reason>" { Date.now() }`,
              rule: syn020.rule,
              idiom: syn020.idiom,
              rewrite: syn020.rewrite,
            });
            break;
          }
          }

          // ── Pattern 2: new Date() / Date() / new Date<T>() (no args) ─────
          // Check: followed by `(`, `?.(`, or (when `new`) `<T>(`.
          // Only fire when the argument list is empty.
          let callIdx20 = nextIdx20;
          let isOpt20 = false;

          if (next20 && next20.kind === "questionDot") {
            // Date?.( — optional bare call
            isOpt20 = true;
            callIdx20 = nextSignificant(tokens, nextIdx20 + 1);
          } else if (hasNew20 && next20 && next20.kind === "operator" && next20.text === "<") {
            // new Date<T>( — generic scan only when `new` precedes (avoids comparison false-positives)
            let depth = 1;
            let j = nextIdx20 + 1;
            while (j < decl.tokenEnd && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx20 = nextSignificant(tokens, j);
          }

          const callTok20 = tokens[callIdx20];
          if (!callTok20 || !(callTok20.kind === "open" && callTok20.text === "(")) continue;

          // Exclude method shorthands and TS method signatures: `{ Date(str): T; }`
          // Guard against ternary consequents: `cond ? Date(str) : other`
          const prevBeforeNew20 = hasNew20 ? tokens[prevSignificant(tokens, prevIdx20 - 1)] : undefined;
          const isTernary20 = (prev20 !== undefined && prev20 !== null && prev20.kind === "question") ||
            (prevBeforeNew20 !== undefined && prevBeforeNew20 !== null && prevBeforeNew20.kind === "question");
          if (callTok20.matchedAt !== undefined) {
            const afterCloseIdx20 = nextSignificant(tokens, callTok20.matchedAt + 1);
            const afterClose20 = tokens[afterCloseIdx20];
            if (afterClose20 && (
              (afterClose20.kind === "open" && afterClose20.text === "{") ||
              afterClose20.kind === "fatArrow" ||
              (!isTernary20 && afterClose20.kind === "punct" && afterClose20.text === ":")
            )) continue;
          }

          // Only fire when arg list is empty (no args = ambient time; with args = explicit, not ambient).
          // Check the first significant token inside the parens — if it's `)` we have empty args.
          const firstInsideIdx20 = nextSignificant(tokens, callIdx20 + 1);
          if (firstInsideIdx20 !== callTok20.matchedAt) continue; // has args → skip

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const warnStart20 = hasNew20 ? prev20!.start : tok.start;
          const loc20b = locationOf(src, warnStart20);
          const formDesc20 = hasNew20
            ? `constructs new Date()`
            : isOpt20 ? `calls Date?.()` : `calls Date()`;
          warnings.push({
            code: "SYN020",
            severity: "warning",
            file: null,
            line: loc20b.line,
            column: loc20b.column,
            start: warnStart20,
            end: callTok20.start + 1,
            message:
              `fn '${decl.name}' ${formDesc20} — ` +
              `${hasNew20 ? "new Date()" : isOpt20 ? "Date?.()" : "Date()"} injects the current time invisible to the capability model; ` +
              `pass nowMs as a parameter or use time.now() with uses { time }, ` +
              `or wrap in unsafe "uses current time for <reason>" { ${hasNew20 ? "new Date()" : isOpt20 ? "Date?.()" : "Date()"} }`,
            rule: syn020.rule,
            idiom: syn020.idiom,
            rewrite: syn020.rewrite,
          });
          break;
        }

        // ── SYN021: performance.now() / performance.timeOrigin ───────────────
        case "performance": {
          // Exclude: `obj.performance.*` — performance preceded by `.` or `?.`
          const prevIdx21 = prevSignificant(tokens, i - 1);
          const prev21 = tokens[prevIdx21];
          if (prev21 && ((prev21.kind === "punct" && prev21.text === ".") || prev21.kind === "questionDot"))
            continue;

          // Exclude function declarations: function performance(…), fn performance(…), function* performance(…)
          if (prev21 && prev21.kind === "ident" && prev21.text === "function") continue;
          if (prev21 && prev21.kind === "keyword" && prev21.text === "function") continue;
          if (prev21 && prev21.kind === "keyword" && prev21.text === "fn") continue;
          if (prev21 && prev21.kind === "operator" && prev21.text === "*") {
            const prevPrevIdx21 = prevSignificant(tokens, prevIdx21 - 1);
            const prevPrev21 = tokens[prevPrevIdx21];
            if (prevPrev21 && prevPrev21.kind === "ident" && prevPrev21.text === "function") continue;
          }

          // Must be followed by `.` or `?.`
          const nextIdx21 = nextSignificant(tokens, i + 1);
          const next21 = tokens[nextIdx21];
          const isDot21 = next21 && next21.kind === "punct" && next21.text === ".";
          const isOptChain21 = next21 && next21.kind === "questionDot";
          if (!isDot21 && !isOptChain21) continue;

          // Member must be `now` or `timeOrigin`
          const memberIdx21 = nextSignificant(tokens, nextIdx21 + 1);
          const memberTok21 = tokens[memberIdx21];
          if (!memberTok21 || memberTok21.kind !== "ident") continue;
          if (memberTok21.text !== "now" && memberTok21.text !== "timeOrigin") continue;

          if (memberTok21.text === "now") {
            // `performance.now` must be followed by a call: `(` or `?.(`
            let afterNowIdx21 = nextSignificant(tokens, memberIdx21 + 1);
            let afterNow21 = tokens[afterNowIdx21];
            let isOptCall21 = false;
            if (afterNow21 && afterNow21.kind === "questionDot") {
              isOptCall21 = true;
              afterNowIdx21 = nextSignificant(tokens, afterNowIdx21 + 1);
              afterNow21 = tokens[afterNowIdx21];
            }
            if (!afterNow21 || !(afterNow21.kind === "open" && afterNow21.text === "(")) continue;

            if (isInsideRange(memberTok21.start, unsafeRanges)) continue;

            const sep21 = isOptChain21 ? "?." : ".";
            const callSep21 = isOptCall21 ? "?." : "";
            const loc21 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN021",
              severity: "warning",
              file: null,
              line: loc21.line,
              column: loc21.column,
              start: tok.start,
              end: memberTok21.end,
              message:
                `fn '${decl.name}' calls performance${sep21}now${callSep21}() — ` +
                `performance.now() injects monotonic time (ms since process start) invisible to the capability model; ` +
                `pass nowMs as a parameter (preferred); ` +
                `note: time.now() is wall-clock epoch time and does NOT replace performance.now() for elapsed-time measurement; ` +
                `or wrap in unsafe "uses performance.now for <reason>" { performance.now() }`,
              rule: syn021.rule,
              idiom: syn021.idiom,
              rewrite: syn021.rewrite,
            });
          } else {
            // `performance.timeOrigin` — property access, no call required
            // Exclude TS method signatures: `{ performance: { timeOrigin: number } }`
            // Guard against ternary consequents: `cond ? performance.timeOrigin : other`
            // (the `:` there belongs to the ternary, not a type annotation)
            const afterMemberIdx21 = nextSignificant(tokens, memberIdx21 + 1);
            const afterMember21 = tokens[afterMemberIdx21];
            const isTernaryConsequent21 = prev21 && prev21.kind === "question";
            if (!isTernaryConsequent21 && afterMember21 && afterMember21.kind === "punct" && afterMember21.text === ":") continue;

            if (isInsideRange(memberTok21.start, unsafeRanges)) continue;

            const sep21b = isOptChain21 ? "?." : ".";
            const loc21b = locationOf(src, tok.start);
            warnings.push({
              code: "SYN021",
              severity: "warning",
              file: null,
              line: loc21b.line,
              column: loc21b.column,
              start: tok.start,
              end: memberTok21.end,
              message:
                `fn '${decl.name}' reads performance${sep21b}timeOrigin — ` +
                `performance.timeOrigin exposes the epoch of the monotonic clock, invisible to the capability model; ` +
                `pass the origin as a parameter (preferred), ` +
                `or wrap in unsafe "uses performance.timeOrigin for <reason>" { performance.timeOrigin }`,
              rule: syn021.rule,
              idiom: syn021.idiom,
              rewrite: syn021.rewrite,
            });
          }
          break;
        }

        // ── SYN010: setTimeout / setInterval / queueMicrotask ────────────────
        default: {
          if (!TIMER_GLOBALS.has(tok.text)) continue;

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

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const loc10 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN010",
            severity: "warning",
            file: null,
            line: loc10.line,
            column: loc10.column,
            start: tok.start,
            end: tok.end,
            message:
              `fn '${decl.name}' calls ${tok.text}() — ` +
              `${tok.text} schedules a callback that runs after the fn returns; ` +
              `any effects inside that callback are invisible to callers and cannot be declared in the fn header; ` +
              `wrap in unsafe "schedules deferred effect" { ${tok.text}(...) }`,
            rule: syn010.rule,
            idiom: syn010.idiom,
            rewrite: syn010.rewrite,
          });
          break;
        }
      }
    }
  }

  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
