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
 *           Excluded: member calls (`obj.fetch`), function/fn/function* declarations named
 *           `fetch`, object/class method shorthands, and TypeScript method
 *           signatures (`{ fetch(url): T; }`). The `:` exclusion is guarded
 *           against ternary consequents (`cond ? fetch(url) : other`).
 *
 *   SYN008  A `new WebSocket(url)` / `WebSocket(url)` call was detected in a fn body (?bs 0.7+).
 *           `WebSocket` opens a persistent bidirectional connection at runtime but is
 *           invisible to botscript's capability model: CAP001 checks for `http.*` member
 *           calls, not the `WebSocket` global. A fn that constructs a WebSocket has an
 *           undeclared network dependency that no capability declaration can see.
 *           Excluded: member calls (`obj.WebSocket`), `function`/`fn`/`function*` declarations named
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
 *           Excluded: member calls (`obj.setTimeout`), function/fn/function* declarations
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
 *   SYN012  A `new EventSource(url)`, `EventSource(url)`, `EventSource?.(url)`, or TypeScript
 *           instantiation form `new EventSource<T>(url)` was detected in a fn body (?bs 0.7+).
 *           `EventSource` opens a persistent server-sent-events connection at runtime but is
 *           invisible to botscript's capability model: CAP001 checks for `http.*` member
 *           calls, not the `EventSource` global. A fn that constructs an EventSource has an
 *           undeclared network dependency.
 *           Excluded: member calls (`obj.EventSource`), `function`/`fn` declarations named
 *           `EventSource`, object/class method shorthands, and TypeScript method signatures.
 *           The `:` exclusion is guarded against ternary consequents.
 *
 *   SYN013  A `new Worker(scriptURL)`, `Worker(scriptURL)`, `Worker?.(scriptURL)`,
 *           `new SharedWorker(scriptURL)`, `SharedWorker(scriptURL)`, or
 *           `SharedWorker?.(scriptURL)` was detected in a fn body (?bs 0.7+). Worker construction
 *           spawns a new JS execution context whose capability surface is unbounded: the worker
 *           script can make network requests, access storage, and perform any operation — none of
 *           it visible in the spawning fn's `uses {}`, `reads {}`, or `writes {}` declarations.
 *           Excluded: member calls (`obj.Worker`), `function`/`fn` declarations named
 *           `Worker`/`SharedWorker`, object/class method shorthands, and TypeScript method
 *           signatures. The `:` exclusion is guarded against ternary consequents.
 *
 *   SYN014  A `new BroadcastChannel(name)`, `BroadcastChannel(name)`, or TypeScript
 *           instantiation form `new BroadcastChannel<T>(name)` was detected in a fn body
 *           (?bs 0.7+). `BroadcastChannel` opens a cross-context message channel at runtime
 *           that any tab, window, or worker on the same origin can post to or receive from —
 *           invisible to botscript's capability model: CAP001 checks for stdlib namespace
 *           calls, not the `BroadcastChannel` global. A fn that constructs a BroadcastChannel
 *           has an undeclared cross-context messaging dependency.
 *           Excluded: member calls (`obj.BroadcastChannel`), `function`/`fn`/`function*` declarations
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
 *   SYN017  A `new Notification(title)`, `Notification(title)`, `Notification?.(title)`, or
 *           TypeScript instantiation form `new Notification<T>(title)` was detected in a fn body (?bs 0.7+).
 *           `Notification` fires a user-visible browser notification at runtime — a UI side
 *           effect invisible to botscript's capability model: no `uses {}`, `reads {}`, or
 *           `writes {}` declaration covers notification dispatch. Callers cannot observe,
 *           audit, or suppress the effect from the fn's declared surface.
 *           Excluded: member calls (`obj.Notification`), `function`/`fn` declarations named
 *           `Notification`, object/class method shorthands, and TypeScript method signatures.
 *           The `:` exclusion is guarded against ternary consequents.
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
 *   SYN019  A `crypto.getRandomValues(...)` or `crypto.randomUUID()` call was detected in a
 *           fn body (?bs 0.7+). These calls generate cryptographic randomness at runtime but
 *           are invisible to botscript's capability model: `uses { random }` covers `random.*`
 *           stdlib calls, not the `crypto` global. A fn that calls `crypto.getRandomValues()`
 *           or `crypto.randomUUID()` has an undeclared randomness dependency — tests cannot
 *           control the output and callers cannot see the dependency in the fn header.
 *           Detection: `crypto` ident not preceded by `.`/`?.`, followed by `.` or `?.`,
 *           followed by `getRandomValues` or `randomUUID`, followed by `(` or `?.(`.
 *           `fn`/`function` declarations named `crypto` and non-randomness members are excluded.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN020  A `localStorage.*` or `sessionStorage.*` access was detected in a fn body
 *           (?bs 0.7+). Both are ambient Web Storage API globals — `localStorage` persists
 *           across page loads; `sessionStorage` persists for the tab session — neither is
 *           visible to botscript's `reads {}` / `writes {}` resource model. A fn that accesses
 *           them has undeclared persistent or session-scoped state dependencies: callers cannot
 *           see the dependency and tests cannot mock or isolate storage without global state
 *           manipulation. Detection: `localStorage` / `sessionStorage` ident not preceded by
 *           `.`/`?.`, followed by `.` or `?.` (member access confirmation).
 *           `fn`/`function` declarations with those names are excluded.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN022  A `process.argv`, `process.cwd`, `process.platform`, `process.arch`,
 *           `process.pid`, `process.ppid`, `process.version`, `process.versions`,
 *           `process.hrtime`, `process.uptime`, `process.memoryUsage`,
 *           `process.cpuUsage`, or `process.resourceUsage` access was detected in a fn body
 *           (?bs 0.7+). These read ambient Node.js runtime or deployment state at runtime but
 *           are invisible to botscript's capability model — no `uses {}`, `reads {}`, or
 *           `writes {}` declaration covers them. A fn that reads these values has an undeclared
 *           dependency: callers cannot see it and tests cannot control the observed value.
 *           Note: `process.env` is covered by SYN005; `process.exit` is covered by SYN006.
 *           Excluded: member calls on a local binding (`obj.process.*`), fn/function declarations
 *           named `process`. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN023  A `navigator.<member>` access was detected in a fn body (?bs 0.7+), where the
 *           member is one of the ambient browser capability surfaces:
 *             geolocation     — requests user location; a real capability concern
 *             clipboard       — clipboard read/write (sensitive data access)
 *             mediaDevices    — camera/microphone access
 *             serviceWorker   — background worker registration
 *             permissions     — browser permission queries
 *             onLine          — ambient network connectivity state
 *             userAgent       — ambient browser fingerprint
 *             language / languages — ambient locale
 *             platform        — ambient device/OS type
 *             hardwareConcurrency — CPU core count
 *             deviceMemory    — RAM available
 *             connection      — NetworkInformation API (ambient connectivity detail)
 *             wakeLock        — screen wake lock requests
 *           These are invisible to botscript's capability model: `uses {}`, `reads {}`, and
 *           `writes {}` declarations cover declared stdlib namespaces and resource labels, not
 *           the `navigator` global. A fn that accesses these members has undeclared browser
 *           capability dependencies — callers cannot see them and tests cannot control or mock them.
 *           Excluded: `obj.navigator.*` (member on a local binding), fn/function declarations
 *           named `navigator`, member accesses not in the high-concern list above.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 * All checks share a single token scan per fn body. The outer loop runs once,
 * skipping nested fn bodies once. Per-token dispatch is a switch on tok.text
 * after a kind==="ident" guard.
 */

import type { Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import type { Token } from "../parser/lex.js";
import { locationOf } from "./_location.js";
import { computeNesting, prevSignificant, nextSignificant } from "./_callgraph.js";
import { atLeast, type VersionInfo } from "./version.js";
import { collectUnsafeBlockRanges, isInsideRange } from "./_unsafe-ranges.js";

// Returns true when the token at `starIdx` is a `*` operator preceded by `function`,
// i.e. this ident is the name in a `function* name(...)` generator declaration.
function isFunctionStarDecl(tokens: Token[], starIdx: number): boolean {
  const star = tokens[starIdx];
  if (!star || star.kind !== "operator" || star.text !== "*") return false;
  const prevIdx = prevSignificant(tokens, starIdx - 1);
  const prev = tokens[prevIdx];
  return !!(prev && prev.kind === "ident" && prev.text === "function");
}

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
// process.* members covered by SYN022 (env → SYN005, exit → SYN006 are handled separately)
const SYN022_PROCESS_MEMBERS = new Set([
  "argv", "cwd", "platform", "arch", "pid", "ppid",
  "version", "versions", "hrtime", "uptime", "memoryUsage", "cpuUsage", "resourceUsage",
]);
// navigator.* members covered by SYN023 (high-concern ambient browser capability surfaces)
const SYN023_NAVIGATOR_MEMBERS = new Set([
  "geolocation", "clipboard", "mediaDevices", "serviceWorker", "permissions",
  "onLine", "userAgent", "language", "languages", "platform",
  "hardwareConcurrency", "deviceMemory", "connection", "wakeLock",
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
  const syn005 = getErrorCode("SYN005")!;
  const syn006 = getErrorCode("SYN006")!;
  const syn007 = getErrorCode("SYN007")!;
  const syn008 = getErrorCode("SYN008")!;
  const syn010 = getErrorCode("SYN010")!;
  const syn011 = getErrorCode("SYN011")!;
  const syn012 = getErrorCode("SYN012")!;
  const syn013 = getErrorCode("SYN013")!;
  const syn014 = getErrorCode("SYN014")!;
  const syn016 = getErrorCode("SYN016")!;
  const syn017 = getErrorCode("SYN017")!;
  const syn020 = getErrorCode("SYN020")!;
  const syn018 = getErrorCode("SYN018")!;
  const syn019 = getErrorCode("SYN019")!;
  const syn022 = getErrorCode("SYN022")!;
  const syn023 = getErrorCode("SYN023")!;

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
          } else if (SYN022_PROCESS_MEMBERS.has(memberTok.text)) {
            // SYN022: ambient process state access (argv, cwd, platform, arch, pid, etc.)
            if (isInsideRange(memberTok.start, unsafeRanges)) continue;

            const loc22 = locationOf(src, tok.start);
            // Distinguish calls (cwd(), hrtime(), etc.) from property reads (argv, pid, etc.)
            // Also distinguish optional-call form (process.cwd?.()) to preserve semantics in message.
            const afterMemberIdx22 = nextSignificant(tokens, memberIdx + 1);
            const afterMember22 = tokens[afterMemberIdx22];
            let isCall22 = false;
            let isOptCall22 = false;
            if (afterMember22 && afterMember22.kind === "open" && afterMember22.text === "(") {
              isCall22 = true;
            } else if (afterMember22 && afterMember22.kind === "questionDot") {
              const afterQD22 = tokens[nextSignificant(tokens, afterMemberIdx22 + 1)];
              if (afterQD22 && afterQD22.kind === "open" && afterQD22.text === "(") {
                isCall22 = true;
                isOptCall22 = true;
              }
            }
            const callSuffix22 = isCall22 ? (isOptCall22 ? "?.()" : "()") : "";
            const form22 = `process${sep5}${memberTok.text}${callSuffix22}`;
            warnings.push({
              code: "SYN022",
              severity: "warning",
              file: null,
              line: loc22.line,
              column: loc22.column,
              start: tok.start,
              end: memberTok.end,
              message:
                `fn '${decl.name}' accesses ${form22} — ` +
                `ambient Node.js process state invisible to the capability model; ` +
                `pass the value as an explicit parameter (preferred) or wrap in ` +
                `unsafe "accesses process.${memberTok.text} for <reason>" { ${form22} }`,
              rule: syn022.rule,
              idiom: syn022.idiom,
              rewrite: syn022.rewrite,
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

          // Exclude: function/fn/function* declarations named fetch
          if (prev7 && prev7.kind === "ident" && prev7.text === "function") continue;
          if (prev7 && prev7.kind === "keyword" && prev7.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx7)) continue;

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

          // Exclude: function/fn/function* declarations named WebSocket
          if (prev8 && prev8.kind === "ident" && prev8.text === "function") continue;
          if (prev8 && prev8.kind === "keyword" && prev8.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx8)) continue;

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

        // ── SYN012: new EventSource() / EventSource() call ──────────────────
        case "EventSource": {
          // Exclude: `obj.EventSource(...)` — preceded by `.` or `?.`
          const prevIdx12 = prevSignificant(tokens, i - 1);
          const prev12 = tokens[prevIdx12];
          if (prev12 && ((prev12.kind === "punct" && prev12.text === ".") || prev12.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named EventSource
          if (prev12 && prev12.kind === "ident" && prev12.text === "function") continue;
          if (prev12 && prev12.kind === "keyword" && prev12.text === "fn") continue;
          // Generator: `function* EventSource` — prev token is `*` (operator kind), token before that is `function`
          if (prev12 && prev12.kind === "operator" && prev12.text === "*") {
            const prevPrevIdx12 = prevSignificant(tokens, prevIdx12 - 1);
            const prevPrev12 = tokens[prevPrevIdx12];
            if (prevPrev12 && prevPrev12.kind === "ident" && prevPrev12.text === "function") continue;
          }

          const hasNew12 = prev12 && prev12.kind === "ident" && prev12.text === "new";
          // Ternary guard: `cond ? EventSource(url) : other` / `cond ? new EventSource(url) : other`
          const prevBeforeNew12 = hasNew12
            ? tokens[prevSignificant(tokens, prevIdx12 - 1)]
            : undefined;
          const isTernaryConsequent12 =
            (prev12 !== undefined && prev12 !== null && prev12.kind === "question") ||
            (prevBeforeNew12 !== undefined && prevBeforeNew12 !== null && prevBeforeNew12.kind === "question");

          const nextIdx12 = nextSignificant(tokens, i + 1);
          const next12 = tokens[nextIdx12];

          let isOpt12 = false;
          let callIdx12 = nextIdx12;

          if (next12 && next12.kind === "questionDot") {
            // EventSource?.( — optional call (no generic scan to avoid false-positives)
            isOpt12 = true;
            callIdx12 = nextSignificant(tokens, nextIdx12 + 1);
          } else if (hasNew12 && next12 && next12.kind === "operator" && next12.text === "<") {
            // new EventSource<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx12 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx12 = nextSignificant(tokens, j);
          }

          const callTok12 = tokens[callIdx12];
          if (!callTok12 || !(callTok12.kind === "open" && callTok12.text === "(")) continue;

          // Exclude method shorthands and TS method signatures: { EventSource(url) { } } / { EventSource(url): T; }
          if (callTok12.matchedAt !== undefined) {
            const afterCloseIdx12 = nextSignificant(tokens, callTok12.matchedAt + 1);
            const afterClose12 = tokens[afterCloseIdx12];
            if (afterClose12 && (
              (afterClose12.kind === "open" && afterClose12.text === "{") ||
              afterClose12.kind === "fatArrow" ||
              (!isTernaryConsequent12 && afterClose12.kind === "punct" && afterClose12.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type:
            // `{ EventSource(url: string) }` — a `:` at depth 0 inside the parens.
            // Also handles optional params: `{ EventSource(url?: string) }`.
            let hasTypeAnnotation12 = false;
            let depth12 = 0;
            let ternaryDepth12 = 0;
            for (let k12 = callIdx12 + 1; k12 < callTok12.matchedAt; k12++) {
              const at12 = tokens[k12];
              if (!at12) continue;
              if (at12.kind === "open") { depth12++; continue; }
              if (at12.kind === "close") { depth12--; continue; }
              if (depth12 !== 0) continue;
              if (at12.kind === "question") {
                // `?:` is an optional-parameter marker, not a ternary — peek ahead
                const nextAfterQ12 = nextSignificant(tokens, k12 + 1);
                const nextTokQ12 = tokens[nextAfterQ12];
                if (nextTokQ12 && nextTokQ12.kind === "punct" && nextTokQ12.text === ":") {
                  hasTypeAnnotation12 = true;
                  break;
                }
                ternaryDepth12++;
                continue;
              }
              if (at12.kind === "punct" && at12.text === ":") {
                if (ternaryDepth12 > 0) { ternaryDepth12--; continue; }
                hasTypeAnnotation12 = true;
                break;
              }
            }
            if (hasTypeAnnotation12) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep12 = isOpt12 ? "?." : "";
          const warnStart12 = hasNew12 ? prev12!.start : tok.start;
          const loc12 = locationOf(src, warnStart12);
          warnings.push({
            code: "SYN012",
            severity: "warning",
            file: null,
            line: loc12.line,
            column: loc12.column,
            start: warnStart12,
            end: callTok12.start + 1,
            message:
              `fn '${decl.name}' ${hasNew12 ? "constructs new " : "calls "}EventSource${callSep12}() — ` +
              `EventSource opens a server-sent-events connection invisible to the capability model; ` +
              `wrap in unsafe "wraps EventSource for <reason>" { ${hasNew12 ? "new " : ""}EventSource${isOpt12 ? "?." : ""}(url) }`,
            rule: syn012.rule,
            idiom: syn012.idiom,
            rewrite: syn012.rewrite,
          });
          break;
        }

        // ── SYN013: new Worker() / new SharedWorker() ───────────────────────
        case "Worker":
        case "SharedWorker": {
          // Exclude: `obj.Worker(...)` — preceded by `.` or `?.`
          const prevIdx13 = prevSignificant(tokens, i - 1);
          const prev13 = tokens[prevIdx13];
          if (prev13 && ((prev13.kind === "punct" && prev13.text === ".") || prev13.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named Worker/SharedWorker
          if (prev13 && prev13.kind === "ident" && prev13.text === "function") continue;
          if (prev13 && prev13.kind === "keyword" && prev13.text === "fn") continue;
          // Generator: `function* Worker` — prev token is `*` (operator kind), token before that is `function`
          if (prev13 && prev13.kind === "operator" && prev13.text === "*") {
            const prevPrevIdx13 = prevSignificant(tokens, prevIdx13 - 1);
            const prevPrev13 = tokens[prevPrevIdx13];
            if (prevPrev13 && prevPrev13.kind === "ident" && prevPrev13.text === "function") continue;
          }

          const hasNew13 = prev13 && prev13.kind === "ident" && prev13.text === "new";
          // Ternary guard: `cond ? new Worker(url) : other`
          const prevBeforeNew13 = hasNew13
            ? tokens[prevSignificant(tokens, prevIdx13 - 1)]
            : undefined;
          const isTernaryConsequent13 =
            (prev13 !== undefined && prev13 !== null && prev13.kind === "question") ||
            (prevBeforeNew13 !== undefined && prevBeforeNew13 !== null && prevBeforeNew13.kind === "question");

          const nextIdx13 = nextSignificant(tokens, i + 1);
          const next13 = tokens[nextIdx13];

          let isOpt13 = false;
          let callIdx13 = nextIdx13;

          if (next13 && next13.kind === "questionDot") {
            // Worker?.( — optional call
            isOpt13 = true;
            callIdx13 = nextSignificant(tokens, nextIdx13 + 1);
          } else if (hasNew13 && next13 && next13.kind === "operator" && next13.text === "<") {
            // new Worker<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx13 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx13 = nextSignificant(tokens, j);
          }

          const callTok13 = tokens[callIdx13];
          if (!callTok13 || !(callTok13.kind === "open" && callTok13.text === "(")) continue;

          // Exclude method shorthands and TS method signatures: { Worker(url) { } } / { Worker(url): T; }
          if (callTok13.matchedAt !== undefined) {
            const afterCloseIdx13 = nextSignificant(tokens, callTok13.matchedAt + 1);
            const afterClose13 = tokens[afterCloseIdx13];
            if (afterClose13 && (
              (afterClose13.kind === "open" && afterClose13.text === "{") ||
              afterClose13.kind === "fatArrow" ||
              (!isTernaryConsequent13 && afterClose13.kind === "punct" && afterClose13.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type:
            // `{ Worker(url: string) }` — a `:` at depth 0 inside the parens.
            // Also handles optional params: `{ Worker(url?: string) }`.
            let hasTypeAnnotation13 = false;
            let depth13 = 0;
            let ternaryDepth13 = 0;
            for (let k13 = callIdx13 + 1; k13 < callTok13.matchedAt; k13++) {
              const at13 = tokens[k13];
              if (!at13) continue;
              if (at13.kind === "open") { depth13++; continue; }
              if (at13.kind === "close") { depth13--; continue; }
              if (depth13 !== 0) continue;
              if (at13.kind === "question") {
                // `?:` is an optional-parameter marker, not a ternary — peek ahead
                const nextAfterQ13 = nextSignificant(tokens, k13 + 1);
                const nextTokQ13 = tokens[nextAfterQ13];
                if (nextTokQ13 && nextTokQ13.kind === "punct" && nextTokQ13.text === ":") {
                  hasTypeAnnotation13 = true;
                  break;
                }
                ternaryDepth13++;
                continue;
              }
              if (at13.kind === "punct" && at13.text === ":") {
                if (ternaryDepth13 > 0) { ternaryDepth13--; continue; }
                hasTypeAnnotation13 = true;
                break;
              }
            }
            if (hasTypeAnnotation13) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const workerName13 = tok.text;
          const warnStart13 = hasNew13 ? prev13!.start : tok.start;
          const loc13 = locationOf(src, warnStart13);
          warnings.push({
            code: "SYN013",
            severity: "warning",
            file: null,
            line: loc13.line,
            column: loc13.column,
            start: warnStart13,
            end: callTok13.start + 1,
            message:
              `fn '${decl.name}' ${hasNew13 ? "constructs new " : "calls "}${workerName13}${isOpt13 ? "?." : ""}() — ` +
              `${workerName13} spawns a new execution context with an unbounded capability surface invisible to the capability model; ` +
              `wrap in unsafe "<reason>" { ${hasNew13 ? "new " : ""}${workerName13}${isOpt13 ? "?." : ""}(scriptURL) }`,
            rule: syn013.rule,
            idiom: syn013.idiom,
            rewrite: syn013.rewrite,
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

          // Exclude: function/fn/function* declarations named BroadcastChannel
          if (prev14 && prev14.kind === "ident" && prev14.text === "function") continue;
          if (prev14 && prev14.kind === "keyword" && prev14.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx14)) continue;

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
          if (isFunctionStarDecl(tokens, prevIdx16)) continue;

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

        // ── SYN020: localStorage.* / sessionStorage.* access ─────────────────
        case "localStorage":
        case "sessionStorage": {
          // Exclude: `obj.localStorage.*` — preceded by `.` or `?.`
          const prevIdx20 = prevSignificant(tokens, i - 1);
          const prev20 = tokens[prevIdx20];
          if (prev20 && ((prev20.kind === "punct" && prev20.text === ".") || prev20.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named localStorage or sessionStorage
          if (prev20 && prev20.kind === "keyword" && prev20.text === "fn") continue;
          if (prev20 && prev20.kind === "ident" && prev20.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx20)) continue;

          // Must be followed by `.` or `?.` — confirming this is a member access on the global, not a bare reference
          const nextIdx20 = nextSignificant(tokens, i + 1);
          const next20 = tokens[nextIdx20];
          const isDot20 = next20 && next20.kind === "punct" && next20.text === ".";
          const isOptChain20 = next20 && next20.kind === "questionDot";
          if (!isDot20 && !isOptChain20) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep20 = isOptChain20 ? "?." : ".";
          const storeName20 = tok.text;
          const loc20 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN020",
            severity: "warning",
            file: null,
            line: loc20.line,
            column: loc20.column,
            start: tok.start,
            end: next20!.end,
            message:
              `fn '${decl.name}' accesses ${storeName20}${sep20} — ` +
              `${storeName20} is ambient Web Storage invisible to the capability model; ` +
              `no reads {} / writes {} label covers it; ` +
              `pass a storage handle as a parameter or wrap in unsafe "reads/writes ${storeName20} for <reason>" { ${storeName20}${sep20}... }`,
            rule: syn020.rule,
            idiom: syn020.idiom,
            rewrite: syn020.rewrite,
          });
          break;
        }

        // ── SYN017: new Notification() / Notification() call ─────────────────
        case "Notification": {
          // Exclude: `obj.Notification(...)` — preceded by `.` or `?.`
          const prevIdx17 = prevSignificant(tokens, i - 1);
          const prev17 = tokens[prevIdx17];
          if (prev17 && ((prev17.kind === "punct" && prev17.text === ".") || prev17.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named Notification
          if (prev17 && prev17.kind === "ident" && prev17.text === "function") continue;
          if (prev17 && prev17.kind === "keyword" && prev17.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx17)) continue;

          const hasNew17 = prev17 && prev17.kind === "ident" && prev17.text === "new";
          // Ternary guard: `cond ? Notification(title) : other`, `cond ? new Notification(title) : other`,
          // `cond ? await Notification(title) : other`, `cond ? await new Notification(title) : other`
          const prevBeforeNew17 = hasNew17
            ? tokens[prevSignificant(tokens, prevIdx17 - 1)]
            : undefined;
          // Look through `await` between ternary `?` and the call/construction
          const awaitIdx17 = (!hasNew17 && prev17 && prev17.kind === "ident" && prev17.text === "await")
            ? prevIdx17
            : (prevBeforeNew17 && prevBeforeNew17.kind === "ident" && prevBeforeNew17.text === "await")
              ? prevSignificant(tokens, prevIdx17 - 1)
              : -1;
          const prevBeforeAwait17 = awaitIdx17 >= 0 ? tokens[prevSignificant(tokens, awaitIdx17 - 1)] : undefined;
          const isTernaryConsequent17 =
            (prev17 !== undefined && prev17 !== null && prev17.kind === "question") ||
            (prevBeforeNew17 !== undefined && prevBeforeNew17 !== null && prevBeforeNew17.kind === "question") ||
            (prevBeforeAwait17 !== undefined && prevBeforeAwait17 !== null && prevBeforeAwait17.kind === "question");

          const nextIdx17 = nextSignificant(tokens, i + 1);
          const next17 = tokens[nextIdx17];

          let isOpt17 = false;
          let callIdx17 = nextIdx17;

          if (next17 && next17.kind === "questionDot") {
            // Notification?.( — optional call
            isOpt17 = true;
            callIdx17 = nextSignificant(tokens, nextIdx17 + 1);
          } else if (hasNew17 && next17 && next17.kind === "operator" && next17.text === "<") {
            // new Notification<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx17 + 1;
            while (j < decl.tokenEnd && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx17 = nextSignificant(tokens, j);
          }

          const callTok17 = tokens[callIdx17];
          if (!callTok17 || !(callTok17.kind === "open" && callTok17.text === "(")) continue;

          // Exclude method shorthands and TS method signatures.
          if (callTok17.matchedAt !== undefined) {
            const afterCloseIdx17 = nextSignificant(tokens, callTok17.matchedAt + 1);
            const afterClose17 = tokens[afterCloseIdx17];
            if (afterClose17 && (
              (afterClose17.kind === "open" && afterClose17.text === "{") ||
              afterClose17.kind === "fatArrow" ||
              (!isTernaryConsequent17 && afterClose17.kind === "punct" && afterClose17.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type or optional params:
            // `{ Notification(title: string) }` / `{ Notification(title?: string) }`.
            let hasTypeAnnotation17 = false;
            let depth17 = 0;
            let ternaryDepth17 = 0;
            for (let k17 = callIdx17 + 1; k17 < callTok17.matchedAt; k17++) {
              const at17 = tokens[k17];
              if (!at17) continue;
              if (at17.kind === "open") { depth17++; continue; }
              if (at17.kind === "close") { depth17--; continue; }
              if (depth17 !== 0) continue;
              if (at17.kind === "question") {
                const nextAfterQ17 = nextSignificant(tokens, k17 + 1);
                const nextTokQ17 = tokens[nextAfterQ17];
                if (nextTokQ17 && nextTokQ17.kind === "punct" && nextTokQ17.text === ":") {
                  hasTypeAnnotation17 = true;
                  break;
                }
                ternaryDepth17++;
                continue;
              }
              if (at17.kind === "punct" && at17.text === ":") {
                if (ternaryDepth17 > 0) { ternaryDepth17--; continue; }
                hasTypeAnnotation17 = true;
                break;
              }
            }
            if (hasTypeAnnotation17) continue;

            // Exclude TS type-literal method signatures with no annotations at all:
            // `{ Notification() }`, `{ x: string; Notification() }`, `{ Notification(); }` etc.
            // Only applies to empty-parens forms — annotated params are handled by hasTypeAnnotation17
            // above. The token after `)` may be `}` directly, or a separator then `}`.
            // Conditions: (a) parens are empty (no significant tokens between `(` and `)`),
            //             (b) enclosing `{` is in a type context (preceded by `=` or `:`),
            //             (c) `Notification` is at a method-signature position: either the first
            //                 significant token inside the `{`, or preceded by `;` / `,`
            //                 (subsequent type member, e.g. `{ x: string; Notification() }`).
            {
              const isEmptyParens17 = nextSignificant(tokens, callIdx17 + 1) >= (callTok17.matchedAt as number);
              if (isEmptyParens17) {
                let closeBrace17 = afterClose17;
                if (closeBrace17 &&
                    closeBrace17.kind === "punct" &&
                    (closeBrace17.text === ";" || closeBrace17.text === ",")) {
                  const nextAfterSepIdx17 = nextSignificant(tokens, afterCloseIdx17 + 1);
                  closeBrace17 = tokens[nextAfterSepIdx17];
                }
                if (closeBrace17 && closeBrace17.kind === "close" && closeBrace17.text === "}" &&
                    closeBrace17.matchedAt !== undefined) {
                  const openBraceIdx17 = closeBrace17.matchedAt;
                  const prevOpenIdx17 = prevSignificant(tokens, openBraceIdx17 - 1);
                  const prevOpen17 = tokens[prevOpenIdx17];
                  const firstInsideBraceIdx17 = nextSignificant(tokens, openBraceIdx17 + 1);
                  // Method-signature position: first token in the type literal, or preceded by
                  // a member separator (handles `{ x: string; Notification() }` etc.)
                  const isAtMemberPos17 =
                    firstInsideBraceIdx17 === i ||
                    (prev17 && prev17.kind === "punct" && (prev17.text === ";" || prev17.text === ","));
                  if (isAtMemberPos17 && prevOpen17 && (
                    prevOpen17.kind === "eq" ||                                       // type T = { ... }
                    (prevOpen17.kind === "punct" && prevOpen17.text === ":") ||       // x: { ... }
                    (prevOpen17.kind === "operator" && (                              // intersection / union / generic
                      prevOpen17.text === "&" ||                                     //   Foo & { ... }
                      prevOpen17.text === "|" ||                                     //   Foo | { ... }
                      prevOpen17.text === "<"                                        //   Foo<{ ... }>
                    )) ||
                    (prevOpen17.kind === "punct" && prevOpen17.text === ",") ||      //   Foo<Bar, { ... }> — non-first type arg
                    (prevOpen17.kind === "ident" && (                                // keyword-led type positions
                      prevOpen17.text === "as" ||                                    //   x as { ... }
                      prevOpen17.text === "extends" ||                               //   T extends { ... }
                      prevOpen17.text === "satisfies"                               //   x satisfies { ... }
                    ))
                  )) continue;
                }
              }
            }
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep17 = isOpt17 ? "?." : "";
          const warnStart17 = hasNew17 ? prev17!.start : tok.start;
          const loc17 = locationOf(src, warnStart17);
          warnings.push({
            code: "SYN017",
            severity: "warning",
            file: null,
            line: loc17.line,
            column: loc17.column,
            start: warnStart17,
            end: callTok17.start + 1,
            message:
              `fn '${decl.name}' ${hasNew17 ? "constructs new " : "calls "}Notification${callSep17}() — ` +
              `Notification fires a user-visible browser notification invisible to the capability model; ` +
              `wrap in unsafe "sends browser notification for <reason>" { ${hasNew17 ? "new " : ""}Notification${callSep17}(...) }`,
            rule: syn017.rule,
            idiom: syn017.idiom,
            rewrite: syn017.rewrite,
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

        // ── SYN019: crypto.getRandomValues() / crypto.randomUUID() ───────────
        case "crypto": {
          // Exclude: `obj.crypto` — preceded by `.` or `?.`
          const prevIdx19 = prevSignificant(tokens, i - 1);
          const prev19 = tokens[prevIdx19];
          if (prev19 && ((prev19.kind === "punct" && prev19.text === ".") || prev19.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named crypto
          if (prev19 && prev19.kind === "keyword" && prev19.text === "fn") continue;
          if (prev19 && prev19.kind === "ident" && prev19.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx19)) continue;

          // Must be followed by `.` or `?.`
          const nextIdx19 = nextSignificant(tokens, i + 1);
          const next19 = tokens[nextIdx19];
          const isDot19 = next19 && next19.kind === "punct" && next19.text === ".";
          const isOptChain19 = next19 && next19.kind === "questionDot";
          if (!isDot19 && !isOptChain19) continue;

          // Next token after the dot must be `getRandomValues` or `randomUUID`
          const methodIdx19 = nextSignificant(tokens, nextIdx19 + 1);
          const method19 = tokens[methodIdx19];
          if (!method19 || method19.kind !== "ident") continue;
          if (method19.text !== "getRandomValues" && method19.text !== "randomUUID") continue;

          // Confirm it's a call: next token is `(` or `?.(`
          let callIdx19 = nextSignificant(tokens, methodIdx19 + 1);
          let callTok19 = tokens[callIdx19];
          let isOptCall19 = false;
          if (callTok19 && callTok19.kind === "questionDot") {
            isOptCall19 = true;
            callIdx19 = nextSignificant(tokens, callIdx19 + 1);
            callTok19 = tokens[callIdx19];
          }
          if (!callTok19 || !(callTok19.kind === "open" && callTok19.text === "(")) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep19 = isOptChain19 ? "?." : ".";
          const callSep19 = isOptCall19 ? "?." : "";
          const methodName19 = method19.text;
          const argSuffix19 = methodName19 === "getRandomValues" ? "(buf)" : "()";
          const callForm19 = `crypto${sep19}${methodName19}${callSep19}${argSuffix19}`;
          const loc19 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN019",
            severity: "warning",
            file: null,
            line: loc19.line,
            column: loc19.column,
            start: tok.start,
            end: callTok19.start + 1,
            message:
              `fn '${decl.name}' calls ${callForm19} — ` +
              `crypto.getRandomValues and crypto.randomUUID generate cryptographic randomness invisible to the capability model; ` +
              `uses { random } does not cover the crypto global; ` +
              `use random.next() or random.int() from the random stdlib with uses { random } so callers see the dependency and tests can control the output; ` +
              `for crypto-specific needs (cryptographic randomness, UUIDs) wrap in unsafe "uses crypto for <reason>" { ${callForm19} }`,
            rule: syn019.rule,
            idiom: syn019.idiom,
            rewrite: syn019.rewrite,
          });
          break;
        }

        // ── SYN023: navigator.* ambient browser capability ───────────────────
        case "navigator": {
          // Exclude: `obj.navigator.*` — navigator preceded by `.` or `?.`
          const prevIdx23 = prevSignificant(tokens, i - 1);
          const prev23 = tokens[prevIdx23];
          if (prev23 && ((prev23.kind === "punct" && prev23.text === ".") || prev23.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named navigator
          if (prev23 && prev23.kind === "keyword" && prev23.text === "fn") continue;
          if (prev23 && prev23.kind === "ident" && prev23.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx23)) continue;

          // Must be followed by `.` or `?.`
          const nextIdx23 = nextSignificant(tokens, i + 1);
          const next23 = tokens[nextIdx23];
          const isDot23 = next23 && next23.kind === "punct" && next23.text === ".";
          const isOptChain23 = next23 && next23.kind === "questionDot";
          if (!isDot23 && !isOptChain23) continue;

          // Member must be in the high-concern navigator capability set
          const memberIdx23 = nextSignificant(tokens, nextIdx23 + 1);
          const memberTok23 = tokens[memberIdx23];
          if (!memberTok23 || memberTok23.kind !== "ident") continue;
          if (!SYN023_NAVIGATOR_MEMBERS.has(memberTok23.text)) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep23 = isOptChain23 ? "?." : ".";
          const memberName23 = memberTok23.text;
          const loc23 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN023",
            severity: "warning",
            file: null,
            line: loc23.line,
            column: loc23.column,
            start: tok.start,
            end: memberTok23.end,
            message:
              `fn '${decl.name}' accesses navigator${sep23}${memberName23} — ` +
              `navigator.${memberName23} reads ambient browser capability state invisible to the capability model; ` +
              `no uses {} / reads {} / writes {} declaration covers navigator; ` +
              `pass the required value as a parameter so callers can see the dependency and tests can inject a mock, ` +
              `or wrap in unsafe "accesses navigator.${memberName23} for <reason>" { navigator${sep23}${memberName23} }`,
            rule: syn023.rule,
            idiom: syn023.idiom,
            rewrite: syn023.rewrite,
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

          // Exclude function/fn/function* declarations named setTimeout/setInterval/queueMicrotask
          if (prev10 && prev10.kind === "ident" && prev10.text === "function") continue;
          if (prev10 && prev10.kind === "keyword" && prev10.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx10)) continue;

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
