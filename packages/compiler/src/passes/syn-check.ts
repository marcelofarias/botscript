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
 *   SYN009  A `new XMLHttpRequest()` or `XMLHttpRequest()` call was detected
 *           in a fn body (?bs 0.7+). XMLHttpRequest opens an HTTP connection
 *           that is invisible to CAP001 (which checks `http.*` member calls).
 *           A fn that constructs an XHR has an undeclared `net` dependency.
 *           Excluded: member calls (`obj.XMLHttpRequest`), object/class method
 *           shorthands, and TypeScript method signatures.
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
  const syn009 = getErrorCode("SYN009")!;
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

    // SYN009: new XMLHttpRequest() / XMLHttpRequest() detection.
    // Fires when a fn body constructs an XMLHttpRequest via `new XMLHttpRequest(url)`,
    // `XMLHttpRequest(url)`, or TypeScript instantiation form `new XMLHttpRequest<T>(url)`.
    // XMLHttpRequest opens an HTTP connection at runtime but is invisible to CAP001
    // (which only checks `http.*` member calls). A fn that constructs an XHR has an
    // undeclared `net` dependency.
    // Suppressed inside `unsafe "reason" { }` blocks and `unsafe "reason" fn` bodies.
    nextInner = 0;
    const open009: typeof inner = [];
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open009.length > 0 && open009[open009.length - 1]!.tokenEnd <= i) open009.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open009.push(inner[nextInner]!);
        nextInner++;
      }
      if (open009.length > 0) continue;

      const tok9 = tokens[i];
      if (!tok9 || tok9.kind !== "ident" || tok9.text !== "XMLHttpRequest") continue;

      // Exclude property accesses: obj.XMLHttpRequest(...)
      const prevIdx9 = prevSignificant(tokens, i - 1);
      const prev9 = tokens[prevIdx9];
      if (prev9 && ((prev9.kind === "punct" && prev9.text === ".") || prev9.kind === "questionDot"))
        continue;

      // `new XMLHttpRequest` without parens is valid JS/TS construction — fire on it too.
      const isNewExpr9 = prev9 && prev9.kind === "ident" && prev9.text === "new";

      // Must be followed by `(`, `?.(`, or `<T>(` — confirming this is a construction/call.
      // Exception: `new XMLHttpRequest` with no parens is also a valid construction.
      let afterXhrIdx = nextSignificant(tokens, i + 1);
      let afterXhr = tokens[afterXhrIdx];

      // TypeScript instantiation form: `XMLHttpRequest<T>(...)` — skip over `<...>` to find `(`
      if (afterXhr && afterXhr.kind === "operator" && afterXhr.text === "<") {
        let anglDepth = 1;
        afterXhrIdx++;
        while (afterXhrIdx < decl.tokenEnd && anglDepth > 0) {
          const at = tokens[afterXhrIdx];
          if (!at) { afterXhrIdx++; continue; }
          if (at.kind === "operator" && at.text === "<") { anglDepth++; }
          else if (at.kind === "operator" && (at.text === ">" || at.text === ">>" || at.text === ">>>")) {
            anglDepth -= at.text.length;
          }
          afterXhrIdx++;
        }
        afterXhrIdx = nextSignificant(tokens, afterXhrIdx);
        const afterAngle9 = tokens[afterXhrIdx];
        if (!afterAngle9 || !(afterAngle9.kind === "open" && afterAngle9.text === "(")) continue;
      } else if (afterXhr && afterXhr.kind === "questionDot") {
        // `XMLHttpRequest?.(...)` — optional call (unusual but possible)
        const afterQD9 = nextSignificant(tokens, afterXhrIdx + 1);
        const afterQDTok9 = tokens[afterQD9];
        if (!afterQDTok9 || !(afterQDTok9.kind === "open" && afterQDTok9.text === "(")) continue;
      } else if (!(afterXhr && afterXhr.kind === "open" && afterXhr.text === "(")) {
        // No parens — only fire if preceded by `new` (bare construction form)
        if (!isNewExpr9) continue;
      }

      // Suppression check: unsafe block or unsafe fn body
      if (isInsideRange(tok9.start, unsafeRanges)) continue;

      const loc9 = locationOf(src, tok9.start);
      warnings.push({
        code: "SYN009",
        severity: "warning",
        file: null,
        line: loc9.line,
        column: loc9.column,
        start: tok9.start,
        end: tok9.end,
        message:
          `fn '${decl.name}' constructs an XMLHttpRequest — XMLHttpRequest bypasses the net capability model; ` +
          `CAP001 cannot see it; wrap in ` +
          `unsafe "wraps XHR directly" { new XMLHttpRequest() }`,
        rule: syn009.rule,
        idiom: syn009.idiom,
        rewrite: syn009.rewrite,
      });
    }
  }

  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
