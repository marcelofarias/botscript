/**
 * Intent-vs-capability consistency check.
 *
 *   ?bs 0.7  Enabled. Every `fn` whose header carries an `intent: "..."` clause
 *            is checked against its declared capabilities, read/write
 *            dependencies (`uses { }`, `reads { }`, `writes { }`), and body.
 *
 *            Currently enforced claims:
 *
 *              INT001  intent contains "pure" but the function has one or more
 *                      capability declarations in its `uses { ... }` clause.
 *                      A pure function is deterministic and side-effect-free;
 *                      any external resource access contradicts that claim.
 *                      (header-level consistency check)
 *
 *              INT002  intent contains "pure" and `uses { }` is empty, but the
 *                      function body directly references a stdlib capability.
 *                      Closes the "under-declaration" gap where a fn claims
 *                      pure and declares nothing, but the body lies.
 *                      (body-level verification — fires when INT001 does not)
 *
 *              INT003  intent contains "idempotent" but the function declares
 *                      `random` or `time` in its `uses { ... }` clause. Both
 *                      namespaces produce different values on each call, so any
 *                      fn that uses them is inherently non-idempotent.
 *                      (header-level consistency check)
 *
 *              INT004  intent contains "idempotent" but the function body
 *                      directly references `random` or `time` without declaring
 *                      the capability (under-declaration variant of INT003).
 *                      (body-level verification — fires when INT003 does not)
 *
 *              INT005  intent contains "idempotent" but the function declares
 *                      `writes { ... }`. A fn that mutates a resource produces
 *                      different observable side effects on each call, making
 *                      it structurally non-idempotent.
 *                      (header-level consistency check, 0.8+)
 *
 *              INT006  intent contains "total" but the function declares
 *                      `throws { ... }`. A total function handles all inputs
 *                      and never propagates exceptions — declaring throws {}
 *                      contradicts that guarantee. Use Result<T, E> instead.
 *                      (header-level consistency check, 0.9+)
 *
 *              INT007  intent contains "total" but the function body directly
 *                      calls a same-file function that declares `throws { ... }`.
 *                      When INT006 does not fire (no throws {} header), the body
 *                      can still open the exception channel by calling a throwing
 *                      callee without catching. Closes the "body lies" gap for
 *                      the total claim.
 *                      (body-level verification — fires when INT006 does not, 0.9+)
 *
 *              INT008  intent contains "infallible" but the function's return type
 *                      contains Result<> or Option<> — those types expose a failure arm
 *                      (err / none) that callers must handle, contradicting the infallible
 *                      guarantee. Use a plain type, or downgrade to intent: "total".
 *                      (header-level return-type consistency check, 0.9+)
 *
 *              INT009  intent contains "infallible" but the function declares
 *                      `throws { ... }`. Throwing propagates a failure to callers;
 *                      an infallible fn may never do that. Encode failure in Result
 *                      and downgrade to intent: "total", or remove throws {} entirely.
 *                      (header-level consistency check, 0.9+)
 *
 *              INT010  intent contains "infallible" but the function body directly
 *                      calls a same-file function that declares `throws { ... }` without
 *                      catching. Closes the "body lies" gap for the infallible claim.
 *                      Fires only when INT009 does not (no throws {} header on this fn).
 *                      (body-level verification — fires when INT009 does not, 0.9+)
 *
 *            The infallible/total hierarchy: infallible ⊂ total. A total fn always
 *            returns but may return err. An infallible fn always returns and always
 *            succeeds — the failure path is absent at both the type level (INT008)
 *            and the exception channel (INT009/INT010).
 *
 *              INT011  intent contains "pure" but the function is declared `async`.
 *                      An async fn always returns a Promise — two calls with identical
 *                      arguments return distinct, non-equal objects — and suspends by
 *                      yielding to the event loop, which is a timing side effect. Both
 *                      properties contradict the pure claim of determinism and
 *                      referential transparency. Make the body synchronous, or remove
 *                      the pure claim. Alternatively, keep the return type sync and
 *                      wrap the result in `Promise.resolve(...)` from a non-async body.
 *                      (header-level structural check, 0.9+)
 *
 *              INT012  intent contains "pure" but the function body calls a same-file
 *                      fn that declares `uses { ... }`. A callee that consumes external
 *                      resources makes the caller non-pure by transitivity, even when
 *                      the caller itself declares no capabilities and INT001/INT002 do
 *                      not fire. Fires only when INT001 and INT002 do not.
 *                      (body-level callee-transitivity check, 0.9+)
 *
 *              INT013  intent contains "idempotent" but the function body calls a
 *                      same-file fn that declares `uses { random }` or `uses { time }`.
 *                      Those namespaces produce a different value on each call; calling
 *                      such a fn makes the outer fn non-idempotent by transitivity even
 *                      when the outer fn itself declares no non-idempotent capabilities
 *                      and INT003/INT004 do not fire. Closes the callee-transitivity gap
 *                      for the idempotent claim, parallel to INT012 for pure.
 *                      (body-level callee-transitivity check, 0.9+)
 *
 *              INT015  intent contains "idempotent" but the function body calls a
 *                      same-file fn that declares `writes { ... }`. A callee that
 *                      mutates a resource makes the caller non-idempotent by
 *                      transitivity — repeated calls produce different side effects even
 *                      when the caller itself declares no writes {} and INT005 does not
 *                      fire. Closes the callee-transitivity gap for the writes-idempotent
 *                      axis, parallel to INT013 for random/time.
 *                      Fires only when INT005, INT003, and INT004 do not.
 *                      (body-level callee-transitivity check, 0.9+)
 *
 *              INT019  intent contains "idempotent" but the function body calls a
 *                      same-file fn that is declared `async`. An async callee schedules
 *                      microtasks on every invocation (a timing side effect) and always
 *                      returns a distinct Promise object — two calls with identical
 *                      arguments produce different Promise instances and different
 *                      event-loop schedules, violating the idempotent guarantee that
 *                      repeated calls produce the same observable outcome.
 *                      Parallel to INT017 (pure + async callee) on the idempotent axis.
 *                      Fires only when INT003, INT004, INT005, INT013, and INT015 do not.
 *                      (body-level callee-async transitivity check, 0.9+)
 *
 *              INT014  intent string carries a claim that is subsumed by a stronger
 *                      claim in the same string. Two cases:
 *                        — 'pure' + 'idempotent': pure bans all uses (superset of
 *                          idempotent's random/time ban); idempotent is redundant.
 *                        — 'infallible' + 'total': infallible = total + no-Result-return;
 *                          total is redundant.
 *                      Fix: remove the weaker claim.
 *                      (?bs 0.9+, fires on the redundant claim)
 *
 *              INT017  intent contains "pure" but the function body calls a same-file
 *                      fn that is declared `async`. An async callee yields to the event
 *                      loop on every call (a timing side effect) and always returns a
 *                      distinct Promise object — two calls with identical arguments
 *                      return non-equal values — contradicting the pure guarantee of
 *                      determinism and referential transparency, even when the caller
 *                      itself is synchronous and INT011 does not fire.
 *                      Fires only when INT001, INT002, INT011, INT012, and INT016 do not.
 *                      (body-level callee-async transitivity check, 0.9+)
 *
 *              INT018  intent contains "pure" but the function body calls a same-file
 *                      fn that declares `throws { ... }`. Throwing an exception is a
 *                      side effect that escapes the fn boundary; a pure fn may never
 *                      produce side effects, so calling a throwing callee makes the
 *                      outer fn non-pure by transitivity even when the outer fn itself
 *                      does not declare throws {} and INT001 does not fire. Fix: wrap
 *                      the callee call in try/catch and return Result<T, E>, use a
 *                      non-throwing variant, or remove the pure intent claim.
 *                      Fires only when INT001 and INT002 do not.
 *                      (body-level callee-throws transitivity check, 0.9+)
 *
 *              INT020  intent contains "total" but the function body calls a
 *                      same-file fn that is declared `async`. A sync fn claiming
 *                      "total" (no exception propagation) that calls an async
 *                      callee returns a Promise that can reject; any unhandled
 *                      rejection escapes the fn boundary as an uncaught exception,
 *                      contradicting the total guarantee.
 *                      Fires only when INT006 and INT007 do not, and when the
 *                      total fn itself is synchronous.
 *                      (body-level callee-async transitivity check, 0.9+)
 *
 *              INT021  intent contains "infallible" but the function body calls a
 *                      same-file fn that is declared `async`. Parallel to INT020
 *                      on the infallible axis — an async callee's rejection path
 *                      violates the no-failure guarantee.
 *                      Fires only when INT008, INT009, and INT010 do not, and when
 *                      the infallible fn itself is synchronous.
 *                      (body-level callee-async transitivity check, 0.9+)
 *
 *            Planned for future versions: monotonic, …
 *            (mechanical vocabulary grows one INT code at a time).
 *
 *   ?bs 0.8  INT001 extended: also fires when `reads { ... }` or `writes { ... }`
 *            conflict with a "pure" intent claim. A pure function must have no
 *            resource dependencies either.
 *
 *   ?bs 0.9  INT001 extended: also fires when `throws { ... }` conflicts with a
 *            "pure" intent claim. Throwing an exception is a side effect; pure
 *            functions should use `Result<T, E>` instead.
 *
 *   pre-0.7  This pass is not run. Files on earlier pins may parse `intent:`
 *            without triggering any check.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import type { Token } from "../parser/lex.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";
import { STDLIB_TO_CAP } from "./_stdlib.js";
import { aliasesForFn, blockShadowsForFn, isInBlockShadow, collectStdlibAliases, type BlockShadowRange } from "./_alias.js";
import { computeNesting, collectCallees } from "./_callgraph.js";

export function passIntentCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.7")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const checksReadsWrites = atLeast(version.resolved, "0.8");
  const checksThrows = atLeast(version.resolved, "0.9");
  const checksAsync = atLeast(version.resolved, "0.9");
  const trackAliases = atLeast(version.resolved, "0.8");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const allDecls = program.fns.map((s) => s.decl);
  const aliases = trackAliases ? collectStdlibAliases(tokens) : new Map<string, string>();
  const diagnostics: Diagnostic[] = [];

  // INT007/INT010/INT012 body-level checks need the callgraph. Build once, reuse per fn.
  const innerByDecl = checksThrows ? computeNesting(allDecls) : new Map<FnDecl, FnDecl[]>();
  const fnNames = new Set(allDecls.map((d) => d.name));
  // Map fn name → union of declared throws types across all same-file decls with that name.
  const fnNameToThrows = new Map<string, string[]>();
  // Map fn name → union of declared uses capabilities across all same-file decls with that name.
  const fnNameToUses = new Map<string, string[]>();
  // Map fn name → union of declared writes labels across all same-file decls with that name.
  const fnNameToWrites = new Map<string, string[]>();
  // Map fn name → union of declared reads labels across all same-file decls with that name.
  const fnNameToReads = new Map<string, string[]>();
  // Map fn name → true if any same-file decl with that name is declared async.
  const fnNameToIsAsync = new Map<string, boolean>();
  if (checksThrows) {
    for (const d of allDecls) {
      if ((d.throws?.length ?? 0) === 0) continue;
      const existing = fnNameToThrows.get(d.name);
      if (existing) {
        for (const t of d.throws!) if (!existing.includes(t)) existing.push(t);
      } else {
        fnNameToThrows.set(d.name, [...d.throws!]);
      }
    }
    for (const d of allDecls) {
      if (d.capabilities.length === 0) continue;
      const existing = fnNameToUses.get(d.name);
      if (existing) {
        for (const c of d.capabilities) if (!existing.includes(c)) existing.push(c);
      } else {
        fnNameToUses.set(d.name, [...d.capabilities]);
      }
    }
    for (const d of allDecls) {
      if ((d.writes?.length ?? 0) === 0) continue;
      const existing = fnNameToWrites.get(d.name);
      if (existing) {
        for (const w of d.writes!) if (!existing.includes(w)) existing.push(w);
      } else {
        fnNameToWrites.set(d.name, [...d.writes!]);
      }
    }
    for (const d of allDecls) {
      if ((d.reads?.length ?? 0) === 0) continue;
      const existing = fnNameToReads.get(d.name);
      if (existing) {
        for (const r of d.reads!) if (!existing.includes(r)) existing.push(r);
      } else {
        fnNameToReads.set(d.name, [...d.reads!]);
      }
    }
    for (const d of allDecls) {
      if (!d.isAsync) continue;
      fnNameToIsAsync.set(d.name, true);
    }
  }

  for (const slot of program.fns) {
    const decl = slot.decl;

    // Use === undefined (not falsiness) so an explicitly empty intent: ""
    // is still treated as an intent clause being present.
    if (decl.intent === undefined) continue;

    // Each claim is checked independently — a fn may carry several
    // (e.g. intent: "pure idempotent"), and each gets its own diagnostics.
    if (containsPureClaim(decl.intent)) {
      checkPureClaim(decl, src, tokens, allDecls, checksReadsWrites, checksThrows, checksAsync, aliases, diagnostics, trackAliases, innerByDecl, fnNames, fnNameToUses, fnNameToReads, fnNameToWrites, fnNameToIsAsync, fnNameToThrows);
    }
    if (containsIdempotentClaim(decl.intent)) {
      checkIdempotentClaim(decl, src, tokens, allDecls, checksReadsWrites, aliases, diagnostics, trackAliases, checksThrows, innerByDecl, fnNames, fnNameToUses, fnNameToWrites, fnNameToIsAsync);
    }
    if (checksThrows && containsTotalClaim(decl.intent)) {
      checkTotalClaim(decl, src, tokens, innerByDecl, fnNames, fnNameToThrows, diagnostics, fnNameToIsAsync);
    }
    if (checksThrows && containsInfallibleClaim(decl.intent)) {
      checkInfallibleClaim(decl, src, tokens, innerByDecl, fnNames, fnNameToThrows, diagnostics, fnNameToIsAsync);
    }
    if (checksThrows) {
      checkRedundantIntentClaims(decl, src, diagnostics);
    }
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

/**
 * "pure" claim: INT001 (header conflict), INT002 (body under-declaration),
 * and INT012 (body calls same-file fn with uses {}).
 */
function checkPureClaim(
  decl: FnDecl,
  src: string,
  tokens: Token[],
  allDecls: FnDecl[],
  checksReadsWrites: boolean,
  checksThrows: boolean,
  checksAsync: boolean,
  aliases: Map<string, string>,
  diagnostics: Diagnostic[],
  acceptOptionalChain = false,
  innerByDecl: Map<FnDecl, FnDecl[]> = new Map(),
  fnNames: Set<string> = new Set(),
  fnNameToUses: Map<string, string[]> = new Map(),
  fnNameToReads: Map<string, string[]> = new Map(),
  fnNameToWrites: Map<string, string[]> = new Map(),
  fnNameToIsAsync: Map<string, boolean> = new Map(),
  fnNameToThrows: Map<string, string[]> = new Map(),
): void {
  const hasUses = decl.capabilities.length > 0;
  const hasReads = checksReadsWrites && (decl.reads?.length ?? 0) > 0;
  const hasWrites = checksReadsWrites && (decl.writes?.length ?? 0) > 0;
  const hasThrows = checksThrows && (decl.throws?.length ?? 0) > 0;

  if (hasUses || hasReads || hasWrites || hasThrows) {
    // INT001: header-level conflict — intent claims "pure" but the function
    // has capability, read/write resource declarations, or throws declarations.
    const entry = getErrorCode("INT001")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);

    const parts: string[] = [];
    if (hasUses) parts.push(`uses { ${decl.capabilities.join(", ")} }`);
    if (hasReads) parts.push(`reads { ${decl.reads!.join(", ")} }`);
    if (hasWrites) parts.push(`writes { ${decl.writes!.join(", ")} }`);
    if (hasThrows) parts.push(`throws { ${decl.throws!.join(", ")} }`);
    const conflictsStr = parts.join(", ");
    const conflictsRewrite = parts.join(" ");

    const hasOnlyThrows = hasThrows && !hasUses && !hasReads && !hasWrites;
    const baseMsg = `fn '${decl.name}' intent claims 'pure' but declares ${conflictsStr}`;
    const detail = hasOnlyThrows
      ? `pure functions may not declare throws — use Result<T, E> for error conditions instead`
      : `pure functions may not have resource dependencies${hasThrows ? " or declare throws" : ""}`;

    diagnostics.push({
      code: "INT001",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message: `${baseMsg} — ${detail}`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: hasOnlyThrows
        ? `// option A — remove the throws {} declaration (keep intent: "pure"):\nfn ${decl.name}(...) intent: "pure" -> ...\n\n` +
          `// option B — remove the pure intent claim:\nfn ${decl.name}(...) ${conflictsRewrite} -> ...\n\n` +
          `// option C — replace throws with Result (preferred for pure fns):\nfn ${decl.name}(...) intent: "pure" -> Result<type, ErrorType> { ... }`
        : `// option A — remove the conflicting header clauses (${parts.join(" / ")}):\nfn ${decl.name}(...) intent: "pure" -> ...\n\n` +
          `// option B — remove the pure intent claim:\nfn ${decl.name}(...) ${conflictsRewrite} -> ...` +
          (hasThrows
            ? `\n\n// option C — if throws is the last remaining conflict after removing uses/reads/writes, replace it with Result:\nfn ${decl.name}(...) intent: "pure" -> Result<type, ErrorType> { ... }`
            : ``),
    });
    // INT001 already fired — skip INT002 for this fn (header conflict subsumes body check).
    return;
  }

  // INT002: intent claims "pure", uses {} is empty (and reads/writes are
  // absent or not yet enforced), but the body directly references a stdlib
  // capability. This is the under-declaration case that INT001 cannot catch.
  const declAliases = aliasesForFn(tokens, decl, allDecls, aliases);
  const declBlockShadows = acceptOptionalChain
    ? blockShadowsForFn(tokens, decl, allDecls, new Set(aliases.keys()))
    : [];
  const bodyUse = findFirstCapabilityUse(tokens, decl, allDecls, declAliases, undefined, acceptOptionalChain, declBlockShadows);
  if (bodyUse) {
    const entry = getErrorCode("INT002")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    diagnostics.push({
      code: "INT002",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message:
        `fn '${decl.name}' declares intent: "pure" but body directly calls ` +
        `'${bodyUse.namespace}${bodyUse.accessOp}${bodyUse.member}' which requires capability '${bodyUse.capability}' — ` +
        `pure functions may not consume external resources`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — remove the capability call from the body:\n` +
        `fn ${decl.name}(...) intent: "pure" -> ...\n\n` +
        `// option B — declare the capability and remove the pure claim:\n` +
        `fn ${decl.name}(...) uses { ${bodyUse.capability} } -> ...`,
    });
  }

  // INT012: body-level callee-transitivity check (0.9+) — intent claims "pure" but
  // body calls a same-file fn that declares uses { ... }. Only fires when INT001 and
  // INT002 did not (no direct header conflict, no direct stdlib reference in body).
  if (checksThrows && !bodyUse && decl.bodyTokenStart !== undefined && fnNameToUses.size > 0) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    const entry12 = getErrorCode("INT012")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const fired12 = new Set<string>();

    for (const calleeName of callees) {
      if (fired12.has(calleeName)) continue;
      const calleeUses = fnNameToUses.get(calleeName);
      if (!calleeUses || calleeUses.length === 0) continue;
      fired12.add(calleeName);

      const usesStr = calleeUses.join(", ");
      diagnostics.push({
        code: "INT012",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'pure' but calls '${calleeName}' which declares uses { ${usesStr} } — ` +
          `a callee with capability declarations makes the caller non-pure by transitivity; ` +
          `inject the callee's return value as a parameter, or remove the pure intent claim`,
        rule: entry12.rule,
        idiom: entry12.idiom,
        rewrite:
          `// option A — inject the computed value as a parameter (preferred):\n` +
          `fn ${decl.name}(..., precomputed: T) intent: "pure" -> R {\n` +
          `  // use precomputed instead of calling '${calleeName}'\n` +
          `}\n\n` +
          `// option B — remove the pure intent claim:\n` +
          `fn ${decl.name}(...) uses { ${usesStr} } -> R {\n` +
          `  const v = ${calleeName}(...)\n` +
          `  return compute(v)\n` +
          `}`,
      });
    }
  }

  // INT016: body-level callee-transitivity check (0.9+) — intent claims "pure" but
  // body calls a same-file fn that declares reads { } or writes { }. A reads callee
  // makes the caller's output depend on external state (non-deterministic). A writes
  // callee introduces a side effect. Both contradict the pure guarantee.
  // Only fires when INT001 and INT002 did not (no direct header conflict, no direct
  // stdlib reference in body). Parallel to INT012 (uses {}) for the reads/writes axis.
  if (checksThrows && !bodyUse && decl.bodyTokenStart !== undefined &&
      (fnNameToReads.size > 0 || fnNameToWrites.size > 0)) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    const entry16 = getErrorCode("INT016")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const fired16 = new Set<string>();

    for (const calleeName of callees) {
      if (fired16.has(calleeName)) continue;
      const calleeReads = fnNameToReads.get(calleeName);
      const calleeWrites = fnNameToWrites.get(calleeName);
      if ((!calleeReads || calleeReads.length === 0) && (!calleeWrites || calleeWrites.length === 0)) continue;
      fired16.add(calleeName);

      const effectParts: string[] = [];
      if (calleeReads && calleeReads.length > 0) effectParts.push(`reads { ${calleeReads.join(", ")} }`);
      if (calleeWrites && calleeWrites.length > 0) effectParts.push(`writes { ${calleeWrites.join(", ")} }`);
      const effectStr = effectParts.join(", ");
      const effectKind = (calleeReads?.length ?? 0) > 0 && (calleeWrites?.length ?? 0) > 0
        ? "reads and writes external state"
        : (calleeReads?.length ?? 0) > 0
          ? "reads external state (non-deterministic)"
          : "writes external state (side effect)";

      diagnostics.push({
        code: "INT016",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'pure' but calls '${calleeName}' which declares ${effectStr} — ` +
          `a callee that ${effectKind} makes the caller non-pure by transitivity; ` +
          `inject the external value as a parameter, or remove the pure intent claim`,
        rule: entry16.rule,
        idiom: entry16.idiom,
        rewrite:
          `// option A — inject the external value as a parameter (preferred):\n` +
          `fn ${decl.name}(..., preloaded: T) intent: "pure" -> R {\n` +
          `  // use preloaded instead of calling '${calleeName}'\n` +
          `}\n\n` +
          `// option B — remove the pure intent claim and surface the effect:\n` +
          `fn ${decl.name}(...) ${effectStr} -> R {\n` +
          `  const v = ${calleeName}(...)\n` +
          `  return compute(v)\n` +
          `}`,
      });
    }
  }

  // INT017: body-level callee-async transitivity check (0.9+) — intent claims "pure"
  // but body calls a same-file fn that is declared async. An async callee yields to
  // the event loop (timing side effect) and returns a distinct Promise on every call,
  // making the caller non-pure by transitivity even when the caller itself is sync.
  // Only fires when INT001 and INT002 did not and the caller is not async (INT011).
  if (checksAsync && !decl.isAsync && !bodyUse && decl.bodyTokenStart !== undefined && fnNameToIsAsync.size > 0) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    const entry17 = getErrorCode("INT017")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const fired17 = new Set<string>();

    for (const calleeName of callees) {
      if (fired17.has(calleeName)) continue;
      if (!fnNameToIsAsync.get(calleeName)) continue;
      fired17.add(calleeName);

      diagnostics.push({
        code: "INT017",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'pure' but calls '${calleeName}' which is declared async — ` +
          `an async callee yields to the event loop (a timing side effect) and returns a distinct ` +
          `Promise on every call, making the caller non-pure by transitivity; ` +
          `make '${calleeName}' synchronous, inject its resolved value as a parameter, or remove the pure intent claim`,
        rule: entry17.rule,
        idiom: entry17.idiom,
        rewrite:
          `// option A — make the callee synchronous (preferred):\n` +
          `fn ${calleeName}(...) -> T = compute(...)\n\n` +
          `fn ${decl.name}(...) intent: "pure" -> T = ${calleeName}(...)\n\n` +
          `// option B — inject the resolved value as a parameter:\n` +
          `fn ${decl.name}(precomputed: T) intent: "pure" -> R {\n` +
          `  // use precomputed instead of calling '${calleeName}'\n` +
          `}\n\n` +
          `// call site: ${decl.name}(await ${calleeName}(...))\n\n` +
          `// option C — remove the pure claim:\n` +
          `fn ${decl.name}(...) -> R {\n` +
          `  const v = ${calleeName}(...)\n` +
          `  return compute(v)\n` +
          `}`,
      });
    }
  }

  // INT018: body-level callee-throws transitivity check (0.9+) — intent claims "pure"
  // but body calls a same-file fn that declares throws {}. Throwing an exception is a
  // side effect; a pure fn cannot propagate exceptions by transitivity, even when the
  // outer fn itself does not declare throws {} and INT001 does not fire.
  // Only fires when INT001 and INT002 did not (no direct header or body conflict).
  if (checksThrows && !bodyUse && decl.bodyTokenStart !== undefined && fnNameToThrows.size > 0) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    const entry18 = getErrorCode("INT018")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const fired18 = new Set<string>();

    for (const calleeName of callees) {
      if (fired18.has(calleeName)) continue;
      const calleeThrows = fnNameToThrows.get(calleeName);
      if (!calleeThrows || calleeThrows.length === 0) continue;
      fired18.add(calleeName);

      const throwsStr = calleeThrows.join(", ");
      diagnostics.push({
        code: "INT018",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'pure' but calls '${calleeName}' which declares throws { ${throwsStr} } — ` +
          `exceptions are side effects; a pure fn cannot propagate exceptions by transitivity; ` +
          `wrap '${calleeName}' in try/catch returning Result<T, ${throwsStr}>, or remove the pure intent claim`,
        rule: entry18.rule,
        idiom: entry18.idiom,
        rewrite:
          `// option A — catch the exception and return Result (preferred):\n` +
          `fn ${decl.name}(...) intent: "pure" -> Result<T, ${throwsStr}> {\n` +
          `  try {\n` +
          `    return ok(${calleeName}(...))\n` +
          `  } catch (e) {\n` +
          `    return err(new ${calleeThrows[0]!}(e))\n` +
          `  }\n` +
          `}\n\n` +
          `// option B — remove the pure claim:\n` +
          `fn ${decl.name}(...) throws { ${throwsStr} } -> T {\n` +
          `  return ${calleeName}(...)\n` +
          `}`,
      });
    }
  }

  // INT011: header-level structural check (0.9+) — intent claims "pure" but the
  // function is declared async. An async fn always returns a Promise (two calls
  // with identical arguments return distinct, non-equal objects) and suspends by
  // yielding to the event loop, producing timing side effects. Both contradict
  // the pure guarantee of determinism and referential transparency.
  if (checksAsync && decl.isAsync) {
    const entry = getErrorCode("INT011")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    diagnostics.push({
      code: "INT011",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message:
        `fn '${decl.name}' intent claims 'pure' but is declared async — ` +
        `an async function yields to the event loop (a timing side effect) and returns a ` +
        `distinct Promise on every call, contradicting the pure claim of determinism and ` +
        `referential transparency; make the body synchronous or remove the pure intent`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — make the function synchronous (preferred):\n` +
        `fn ${decl.name}(...) intent: "pure" -> T {\n` +
        `  return compute(...)  // sync body, no await\n` +
        `}\n\n` +
        `// option B — remove the pure claim and keep async:\n` +
        `async fn ${decl.name}(...) -> Promise<T> {\n` +
        `  return await compute(...)\n` +
        `}\n\n` +
        `// option C — sync body returning a resolved Promise (if callers need Promise<T>):\n` +
        `fn ${decl.name}(...) intent: "pure" -> Promise<T> {\n` +
        `  return Promise.resolve(compute(...))  // sync, no timing side effect\n` +
        `}`,
    });
  }
}

// Capabilities whose values change on every call — fundamentally non-idempotent.
const NON_IDEMPOTENT = new Set(["random", "time"]);

/**
 * "idempotent" claim: INT003 (header conflict), INT004 (body under-declaration),
 * INT005 (writes {} conflict), INT013 (callee-transitivity gap).
 *
 * An idempotent fn is safe to retry: same inputs → same observable result.
 * `random` and `time` break that — they yield different values per call — so a
 * fn that declares or directly calls either cannot honour the claim. `writes {}`
 * also contradicts idempotency: a fn that writes to a resource on every call
 * produces different observable side effects across invocations. Other
 * capabilities (net, fs, …) are not structurally flagged — INT003/INT005 are
 * narrow header heuristics, not proofs of idempotence.
 */
function checkIdempotentClaim(
  decl: FnDecl,
  src: string,
  tokens: Token[],
  allDecls: FnDecl[],
  checksReadsWrites: boolean,
  aliases: Map<string, string>,
  diagnostics: Diagnostic[],
  acceptOptionalChain = false,
  checksThrows = false,
  innerByDecl: Map<FnDecl, FnDecl[]> = new Map(),
  fnNames: Set<string> = new Set(),
  fnNameToUses: Map<string, string[]> = new Map(),
  fnNameToWrites: Map<string, string[]> = new Map(),
  fnNameToIsAsync: Map<string, boolean> = new Map(),
): void {
  // INT005: header-level — writes { } contradicts idempotency (0.8+, same gate as
  // the writes {} enforcement). A fn that mutates a resource cannot be idempotent:
  // repeated calls produce different side effects. Checked before INT003 so that
  // a fn with both writes and random/time gets INT005 first (the writes conflict
  // is the broader structural contradiction).
  if (checksReadsWrites && (decl.writes?.length ?? 0) > 0) {
    const entry = getErrorCode("INT005")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const writesStr = decl.writes!.join(", ");
    diagnostics.push({
      code: "INT005",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message:
        `fn '${decl.name}' intent claims 'idempotent' but declares writes { ${writesStr} } — ` +
        `a function that writes to a resource produces different side effects on each call, ` +
        `making it non-idempotent`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — remove the writes declaration if the fn does not actually mutate:\n` +
        `fn ${decl.name}(...) intent: "idempotent" -> ...\n\n` +
        `// option B — remove the idempotent intent claim:\n` +
        `fn ${decl.name}(...) writes { ${writesStr} } -> ...`,
    });
    // INT005 already fired — do not also fire INT003/INT004.
    return;
  }

  // INT003: header-level — uses { } declares a non-idempotent capability.
  const nonIdem = decl.capabilities.filter((c) => NON_IDEMPOTENT.has(c));
  if (nonIdem.length > 0) {
    const entry = getErrorCode("INT003")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const nonIdemStr = nonIdem.join(", ");
    const allCapsStr = decl.capabilities.join(", ");
    const remainingCaps = decl.capabilities.filter((c) => !NON_IDEMPOTENT.has(c));
    const optionAUses = remainingCaps.length > 0 ? ` uses { ${remainingCaps.join(", ")} }` : "";
    diagnostics.push({
      code: "INT003",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message:
        `fn '${decl.name}' intent claims 'idempotent' but declares uses { ${allCapsStr} } — ` +
        `${nonIdemStr} produce${nonIdem.length === 1 ? "s" : ""} different values on each call, ` +
        `making the function non-idempotent`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — remove the non-idempotent capability (preserve other caps):\n` +
        `fn ${decl.name}(...)${optionAUses} intent: "idempotent" -> ...\n\n` +
        `// option B — remove the idempotent intent claim:\n` +
        `fn ${decl.name}(...) uses { ${allCapsStr} } -> ...`,
    });
    // INT003 already fired — header conflict subsumes the body check.
    return;
  }

  // INT004: body-level under-declaration — body directly references a
  // non-idempotent namespace that is not declared in uses { }.
  const declAliases4 = aliasesForFn(tokens, decl, allDecls, aliases);
  const declBlockShadows4 = acceptOptionalChain
    ? blockShadowsForFn(tokens, decl, allDecls, new Set(aliases.keys()))
    : [];
  const bodyUse = findFirstCapabilityUse(tokens, decl, allDecls, declAliases4, (ns) =>
    NON_IDEMPOTENT.has(ns), acceptOptionalChain, declBlockShadows4,
  );
  if (bodyUse) {
    const entry = getErrorCode("INT004")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const proposedCaps = [...decl.capabilities, bodyUse.capability].join(", ");
    diagnostics.push({
      code: "INT004",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message:
        `fn '${decl.name}' declares intent: "idempotent" but body directly calls ` +
        `'${bodyUse.namespace}${bodyUse.accessOp}${bodyUse.member}' which produces a different value on each call — ` +
        `idempotent functions must be safe to retry with the same result`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — remove the non-idempotent call from the body:\n` +
        `fn ${decl.name}(...) intent: "idempotent" -> ...\n\n` +
        `// option B — declare the capability and remove the idempotent claim:\n` +
        `fn ${decl.name}(...) uses { ${proposedCaps} } -> ...`,
    });
  }

  // INT013: body-level callee-transitivity check (0.9+) — intent claims "idempotent"
  // but body calls a same-file fn that declares uses { random } or uses { time }.
  // Fires only when INT003/INT004 did not (no direct header or body conflict).
  if (checksThrows && !bodyUse && decl.bodyTokenStart !== undefined && fnNameToUses.size > 0) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    const entry13 = getErrorCode("INT013")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const fired13 = new Set<string>();

    for (const calleeName of callees) {
      if (fired13.has(calleeName)) continue;
      const calleeUses = fnNameToUses.get(calleeName);
      if (!calleeUses) continue;
      const nonIdemCaps = calleeUses.filter((c) => NON_IDEMPOTENT.has(c));
      if (nonIdemCaps.length === 0) continue;
      fired13.add(calleeName);

      const usesStr = nonIdemCaps.join(", ");
      diagnostics.push({
        code: "INT013",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'idempotent' but calls '${calleeName}' which declares uses { ${usesStr} } — ` +
          `a callee with non-idempotent capability makes the caller non-idempotent by transitivity; ` +
          `inject the callee's return value as a parameter, or remove the idempotent intent claim`,
        rule: entry13.rule,
        idiom: entry13.idiom,
        rewrite:
          `// option A — inject the computed value as a parameter (preferred):\n` +
          `fn ${decl.name}(..., precomputed: T) intent: "idempotent" -> R {\n` +
          `  // use precomputed instead of calling '${calleeName}'\n` +
          `}\n\n` +
          `// option B — remove the idempotent intent claim:\n` +
          `fn ${decl.name}(...) uses { ${usesStr} } -> R {\n` +
          `  const v = ${calleeName}(...)\n` +
          `  return compute(v)\n` +
          `}`,
      });
    }
  }

  // INT015: body-level callee-transitivity check (0.9+) — intent claims "idempotent"
  // but body calls a same-file fn that declares writes { }.
  // A callee that mutates a resource makes the caller non-idempotent by transitivity.
  // Fires only when INT005, INT003, and INT004 did not (no direct header or body conflict).
  if (checksThrows && !bodyUse && decl.bodyTokenStart !== undefined && fnNameToWrites.size > 0) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    const entry15 = getErrorCode("INT015")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const fired15 = new Set<string>();

    for (const calleeName of callees) {
      if (fired15.has(calleeName)) continue;
      const calleeWrites = fnNameToWrites.get(calleeName);
      if (!calleeWrites || calleeWrites.length === 0) continue;
      fired15.add(calleeName);

      const writesStr = calleeWrites.join(", ");
      diagnostics.push({
        code: "INT015",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'idempotent' but calls '${calleeName}' which declares writes { ${writesStr} } — ` +
          `a callee that mutates a resource makes the caller non-idempotent by transitivity; ` +
          `move the write outside the idempotent boundary, or remove the idempotent intent claim`,
        rule: entry15.rule,
        idiom: entry15.idiom,
        rewrite:
          `// option A — split into an idempotent compute fn and a separate write fn:\n` +
          `fn ${decl.name}(...) intent: "idempotent" -> T {\n` +
          `  return compute(...)  // no writes inside\n` +
          `}\n` +
          `// call ${calleeName} outside, after the idempotent step\n\n` +
          `// option B — remove the idempotent intent claim and declare writes on outer fn:\n` +
          `fn ${decl.name}(...) writes { ${writesStr} } -> R {\n` +
          `  return ${calleeName}(...)\n` +
          `}`,
      });
    }
  }

  // INT019: body-level callee-async transitivity check (0.9+) — intent claims "idempotent"
  // but body calls a same-file fn that is declared async. An async callee schedules
  // microtasks on every invocation (timing side effect) and returns a distinct Promise
  // object each time, violating the idempotent guarantee by transitivity.
  // Fires only when INT003, INT004, INT005, INT013, and INT015 did not.
  if (checksThrows && !bodyUse && !decl.isAsync && decl.bodyTokenStart !== undefined && fnNameToIsAsync.size > 0) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    const entry19 = getErrorCode("INT019")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const fired19 = new Set<string>();

    for (const calleeName of callees) {
      if (fired19.has(calleeName)) continue;
      if (!fnNameToIsAsync.get(calleeName)) continue;
      fired19.add(calleeName);

      diagnostics.push({
        code: "INT019",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'idempotent' but calls '${calleeName}' which is declared async — ` +
          `an async callee schedules microtasks on every invocation (a timing side effect) and returns a ` +
          `distinct Promise on every call, violating the idempotent guarantee by transitivity; ` +
          `make '${calleeName}' synchronous, inject its resolved value as a parameter, or remove the idempotent intent claim`,
        rule: entry19.rule,
        idiom: entry19.idiom,
        rewrite:
          `// option A — make the callee synchronous (preferred):\n` +
          `fn ${calleeName}(...) -> T = compute(...)\n\n` +
          `fn ${decl.name}(...) intent: "idempotent" -> T = ${calleeName}(...)\n\n` +
          `// option B — inject the resolved value as a parameter:\n` +
          `fn ${decl.name}(precomputed: T) intent: "idempotent" -> R {\n` +
          `  // use precomputed instead of calling '${calleeName}'\n` +
          `}\n\n` +
          `// call site: ${decl.name}(await ${calleeName}(...))\n\n` +
          `// option C — remove the idempotent claim:\n` +
          `fn ${decl.name}(...) -> R {\n` +
          `  const v = ${calleeName}(...)\n` +
          `  return compute(v)\n` +
          `}`,
      });
    }
  }
}

/**
 * Scan the fn body for a direct stdlib capability reference, excluding inner
 * fn declarations. Returns the first match or null if the body is clean.
 * Resolves module-level aliases (e.g. `const t = time`) when `aliases` is provided.
 */
function findFirstCapabilityUse(
  tokens: Token[],
  fn: FnDecl,
  allDecls: FnDecl[],
  aliases: Map<string, string> = new Map(),
  filter?: (namespace: string) => boolean,
  acceptOptionalChain = false,
  blockShadows: BlockShadowRange[] = [],
): { capability: string; namespace: string; member: string; accessOp: "." | "?." } | null {
  // Inner fns to exclude from the scan (same pattern as cap-check).
  const inner = allDecls.filter(
    (g) => g !== fn && g.tokenStart >= fn.tokenStart && g.tokenEnd <= fn.tokenEnd,
  );

  for (let i = fn.bodyTokenStart ?? fn.tokenStart; i < fn.tokenEnd; i++) {
    if (insideAny(i, inner)) continue;
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    const aliasCanonical = !isInBlockShadow(tok.text, i, blockShadows)
      ? aliases.get(tok.text)
      : undefined;
    const canonical = aliasCanonical ?? tok.text;
    const cap = STDLIB_TO_CAP[canonical];
    if (!cap) continue;
    if (filter && !filter(canonical)) continue;
    const j = nextSignificant(tokens, i + 1);
    const next = tokens[j];
    const isDot = next?.kind === "punct" && next.text === ".";
    const isOptChain = acceptOptionalChain && next?.kind === "questionDot";
    if (!isDot && !isOptChain) continue;
    const member = nextIdent(tokens, j) ?? "…";
    return { capability: cap, namespace: tok.text, member, accessOp: isDot ? "." : "?." };
  }
  return null;
}

function insideAny(idx: number, ranges: FnDecl[]): boolean {
  for (const r of ranges) {
    if (idx >= r.tokenStart && idx < r.tokenEnd) return true;
  }
  return false;
}

function nextSignificant(tokens: Token[], from: number): number {
  let i = from;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t) return i;
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

function nextIdent(tokens: Token[], dotIdx: number): string | null {
  const j = nextSignificant(tokens, dotIdx + 1);
  const t = tokens[j];
  return t && t.kind === "ident" ? t.text : null;
}

/**
 * True when the intent string contains the word "pure" as a whole token.
 * Matches: "pure", "pure function", "idempotent and pure", etc.
 * Does NOT match: "impure", "not-pure".
 */
function containsPureClaim(intent: string): boolean {
  // Case-insensitive: "Pure", "PURE", "pure function" all carry the same claim.
  return /(?<![a-zA-Z0-9_-])pure(?![a-zA-Z0-9_-])/i.test(intent);
}

/**
 * True when the intent string contains the word "idempotent" as a whole token.
 * Matches: "idempotent", "idempotent and pure", "Idempotent". Does NOT match
 * substrings inside other identifiers (e.g. "non-idempotent" is excluded via
 * the `-` boundary, since that is a negation, not a claim).
 */
function containsIdempotentClaim(intent: string): boolean {
  return /(?<![a-zA-Z0-9_-])idempotent(?![a-zA-Z0-9_-])/i.test(intent);
}

/**
 * True when the intent string contains the word "total" as a whole token.
 * Matches: "total", "total function", "pure and total". Does NOT match
 * substrings: "subtotal", "totally" are excluded by the word boundaries.
 */
function containsTotalClaim(intent: string): boolean {
  return /(?<![a-zA-Z0-9_-])total(?![a-zA-Z0-9_-])/i.test(intent);
}

/**
 * True when the intent string contains the word "infallible" as a whole token.
 * Matches: "infallible", "pure infallible", "Infallible". Does NOT match
 * substrings: "non-infallible" is excluded by the hyphen boundary.
 */
function containsInfallibleClaim(intent: string): boolean {
  return /(?<![a-zA-Z0-9_-])infallible(?![a-zA-Z0-9_-])/i.test(intent);
}

/**
 * "total" claim: INT006 (header — throws {} declared) and INT007 (body — calls
 * a same-file fn that throws without catching).
 *
 * INT006: A total function handles all inputs without exception propagation.
 * Declaring throws {} contradicts that guarantee. Fix: use Result<T, E>.
 *
 * INT007: Even without a throws {} header, a total fn can re-open the exception
 * channel by calling a same-file callee that does declare throws {}. Fix: wrap
 * the call in try/catch converting to Result, or use a non-throwing variant.
 * Only fires when INT006 does not (no throws {} header on this fn).
 */
function checkTotalClaim(
  decl: FnDecl,
  src: string,
  tokens: Token[],
  innerByDecl: Map<FnDecl, FnDecl[]>,
  fnNames: Set<string>,
  fnNameToThrows: Map<string, string[]>,
  diagnostics: Diagnostic[],
  fnNameToIsAsync: Map<string, boolean> = new Map(),
): void {
  // INT006: header-level — throws {} declared on this fn.
  if ((decl.throws?.length ?? 0) > 0) {
    const entry = getErrorCode("INT006")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const throwsStr = decl.throws!.join(", ");

    diagnostics.push({
      code: "INT006",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message:
        `fn '${decl.name}' intent claims 'total' but declares throws { ${throwsStr} } — ` +
        `a total function handles all inputs without exception propagation; ` +
        `declaring throws {} means callers must catch, contradicting the total guarantee; ` +
        `use Result<T, ${throwsStr}> to encode failure in the return type instead`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — remove throws {} and return Result (preferred for total fns):\n` +
        `fn ${decl.name}(...) intent: "total" -> Result<type, ${throwsStr}> { ... }\n\n` +
        `// option B — remove the total intent claim (keep throws {}):\n` +
        `fn ${decl.name}(...) throws { ${throwsStr} } -> type { ... }`,
    });
    return; // INT006 and INT007 are mutually exclusive
  }

  // INT007: body-level — calls a same-file fn that declares throws {}.
  // Skip fns with no body (abstract / declaration-only).
  if (decl.bodyTokenStart === undefined) return;

  const intentStart = decl.intentStart!;
  const loc = locationOf(src, intentStart);
  const inner = innerByDecl.get(decl) ?? [];
  const callees = collectCallees(tokens, decl, inner, fnNames);

  // INT007: body-level — calls a same-file fn that declares throws {}.
  if (fnNameToThrows.size > 0) {
    const entry7 = getErrorCode("INT007")!;
    const fired = new Set<string>();

    for (const calleeName of callees) {
      if (fired.has(calleeName)) continue;
      const calleeThrows = fnNameToThrows.get(calleeName);
      if (!calleeThrows || calleeThrows.length === 0) continue;
      fired.add(calleeName);

      const throwsStr = calleeThrows.join(", ");
      diagnostics.push({
        code: "INT007",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'total' but calls '${calleeName}' which declares throws { ${throwsStr} } — ` +
          `a total function must handle all error paths; ` +
          `catch '${calleeName}'s exception or use a non-throwing variant`,
        rule: entry7.rule,
        idiom: entry7.idiom,
        rewrite:
          `// option A — catch '${calleeName}'s exception and convert to Result:\n` +
          `fn ${decl.name}(...) intent: "total" -> Result<T, ${throwsStr}> {\n` +
          `  try {\n` +
          `    const v = ${calleeName}(...)\n` +
          `    return ok(v)\n` +
          `  } catch (e) {\n` +
          `    return err(new ${calleeThrows[0]!}(e))\n` +
          `  }\n` +
          `}\n\n` +
          `// option B — remove the total intent claim:\n` +
          `fn ${decl.name}(...) throws { ${throwsStr} } -> T {\n` +
          `  return ${calleeName}(...)\n` +
          `}`,
      });
    }
  }

  // INT020: body-level — total sync fn calls a same-file async fn.
  // An async callee returns a Promise that can reject; a sync total fn forwarding
  // that Promise cannot catch the rejection, so it escapes as an uncaught exception.
  // Only fires when INT006 and INT007 did not (diagnostics check covers INT006 via the
  // early return above; INT007 may have fired but INT020 is still an independent axis).
  // Fires only when the total fn itself is synchronous.
  if (!decl.isAsync && fnNameToIsAsync.size > 0) {
    const entry20 = getErrorCode("INT020")!;
    const fired20 = new Set<string>();

    for (const calleeName of callees) {
      if (fired20.has(calleeName)) continue;
      if (!fnNameToIsAsync.get(calleeName)) continue;
      fired20.add(calleeName);

      diagnostics.push({
        code: "INT020",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'total' but calls '${calleeName}' which is declared async — ` +
          `an async callee returns a Promise that can reject; a sync total fn forwarding that Promise ` +
          `cannot catch the rejection, so it escapes the fn boundary as an uncaught exception, ` +
          `contradicting the total guarantee; use a synchronous callee or remove the total intent claim`,
        rule: entry20.rule,
        idiom: entry20.idiom,
        rewrite:
          `// option A — use a synchronous callee (preferred):\n` +
          `fn ${calleeName}(...) -> T = compute(...)\n\n` +
          `fn ${decl.name}(...) intent: "total" -> T = ${calleeName}(...)\n\n` +
          `// option B — remove the total intent claim:\n` +
          `fn ${decl.name}(...) -> Promise<T> = ${calleeName}(...)`,
      });
    }
  }
}

/**
 * "infallible" claim: INT008 (return type exposes failure path), INT009
 * (throws {} declared in header), and INT010 (body calls throwing callee).
 *
 * INT008: An infallible fn cannot return Result<T, E> or Option<T> — those
 * types carry a failure arm (err / none) that callers must handle.
 *
 * INT009: An infallible fn cannot declare throws {} — throwing propagates
 * a failure to callers. Parallel to INT006 for total.
 *
 * INT010: Even without a throws {} header, an infallible fn can re-open the
 * exception channel by calling a same-file callee that does declare throws {}
 * without catching. Parallel to INT007 for total.
 * Only fires when INT009 does not (no throws {} header on this fn).
 *
 * INT008 fires independently of INT009/INT010 (different violation axis).
 * INT009 and INT010 are mutually exclusive (INT009 takes priority).
 */
function checkInfallibleClaim(
  decl: FnDecl,
  src: string,
  tokens: Token[],
  innerByDecl: Map<FnDecl, FnDecl[]>,
  fnNames: Set<string>,
  fnNameToThrows: Map<string, string[]>,
  diagnostics: Diagnostic[],
  fnNameToIsAsync: Map<string, boolean> = new Map(),
): void {
  const intentStart = decl.intentStart!;
  const loc = locationOf(src, intentStart);
  const intentSpanEnd = intentStart + decl.intent!.length + 2;

  // INT008: header-level — return type contains Result<> or Option<>.
  const rt = decl.returnType;
  if (rt.includes("Result<") || rt.includes("Option<")) {
    const entry8 = getErrorCode("INT008")!;
    const failureType = rt.includes("Result<") ? "Result<>" : "Option<>";
    diagnostics.push({
      code: "INT008",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentSpanEnd,
      message:
        `fn '${decl.name}' intent claims 'infallible' but return type is '${rt.trim()}' — ` +
        `${failureType} exposes a failure arm that callers must handle, contradicting the infallible guarantee; ` +
        `use a plain return type, or downgrade to intent: "total" which allows failure in the return type`,
      rule: entry8.rule,
      idiom: entry8.idiom,
      rewrite:
        `// option A — plain return type (fn truly never fails):\n` +
        `fn ${decl.name}(...) intent: "infallible" -> T { ... }\n\n` +
        `// option B — downgrade to total (fn may fail but always returns):\n` +
        `fn ${decl.name}(...) intent: "total" -> ${rt.trim()} { ... }`,
    });
  }

  // INT009: header-level — throws {} declared on this fn.
  if ((decl.throws?.length ?? 0) > 0) {
    const entry9 = getErrorCode("INT009")!;
    const throwsStr = decl.throws!.join(", ");
    diagnostics.push({
      code: "INT009",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentSpanEnd,
      message:
        `fn '${decl.name}' intent claims 'infallible' but declares throws { ${throwsStr} } — ` +
        `throwing propagates a failure outside the fn's boundary, contradicting the infallible guarantee; ` +
        `encode failure in Result<T, E> and downgrade to intent: "total", or remove throws {} if the fn won't throw`,
      rule: entry9.rule,
      idiom: entry9.idiom,
      rewrite:
        `// option A — remove throws {} and return Result (downgrade to total):\n` +
        `fn ${decl.name}(...) intent: "total" -> Result<type, ${throwsStr}> { ... }\n\n` +
        `// option B — remove throws {} if the fn truly won't propagate exceptions:\n` +
        `fn ${decl.name}(...) intent: "infallible" -> type { ... }`,
    });
    return; // INT009 and INT010 are mutually exclusive
  }

  // INT010 + INT021: body-level checks — skip fns with no body (abstract / declaration-only).
  if (decl.bodyTokenStart === undefined) return;

  const inner = innerByDecl.get(decl) ?? [];
  const callees = collectCallees(tokens, decl, inner, fnNames);

  // INT010: calls a same-file fn that declares throws {}.
  if (fnNameToThrows.size > 0) {
    const entry10 = getErrorCode("INT010")!;
    const fired = new Set<string>();

    for (const calleeName of callees) {
      if (fired.has(calleeName)) continue;
      const calleeThrows = fnNameToThrows.get(calleeName);
      if (!calleeThrows || calleeThrows.length === 0) continue;
      fired.add(calleeName);

      const throwsStr = calleeThrows.join(", ");
      diagnostics.push({
        code: "INT010",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentSpanEnd,
        message:
          `fn '${decl.name}' intent claims 'infallible' but calls '${calleeName}' which declares throws { ${throwsStr} } — ` +
          `a throwing callee can propagate an exception through the infallible fn, reopening the failure channel; ` +
          `catch '${calleeName}'s exception (suppress or encode in Result) or use a non-throwing variant`,
        rule: entry10.rule,
        idiom: entry10.idiom,
        rewrite:
          `// option A — catch and suppress, keep infallible:\n` +
          `fn ${decl.name}(...) intent: "infallible" -> T {\n` +
          `  try {\n` +
          `    return ${calleeName}(...)\n` +
          `  } catch {\n` +
          `    return defaultValue\n` +
          `  }\n` +
          `}\n\n` +
          `// option B — encode in Result, downgrade to total:\n` +
          `fn ${decl.name}(...) intent: "total" -> Result<T, ${throwsStr}> {\n` +
          `  try {\n` +
          `    return ok(${calleeName}(...))\n` +
          `  } catch (e) {\n` +
          `    return err(new ${calleeThrows[0]!}(e))\n` +
          `  }\n` +
          `}`,
      });
    }
  }

  // INT021: body-level — infallible sync fn calls a same-file async fn.
  // Fires only when INT009 did not (early return above covers that) and the fn is synchronous.
  if (!decl.isAsync && fnNameToIsAsync.size > 0) {
    const entry21 = getErrorCode("INT021")!;
    const fired21 = new Set<string>();

    for (const calleeName of callees) {
      if (fired21.has(calleeName)) continue;
      if (!fnNameToIsAsync.get(calleeName)) continue;
      fired21.add(calleeName);

      diagnostics.push({
        code: "INT021",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentSpanEnd,
        message:
          `fn '${decl.name}' intent claims 'infallible' but calls '${calleeName}' which is declared async — ` +
          `an async callee returns a Promise that can reject; a sync infallible fn forwarding that Promise ` +
          `cannot catch the rejection, so it escapes the fn boundary as an uncaught exception, ` +
          `violating the infallible guarantee that the fn never fails; ` +
          `use a synchronous callee or downgrade to intent: "total"`,
        rule: entry21.rule,
        idiom: entry21.idiom,
        rewrite:
          `// option A — use a synchronous callee (preferred):\n` +
          `fn ${calleeName}(...) -> T = compute(...)\n\n` +
          `fn ${decl.name}(...) intent: "infallible" -> T = ${calleeName}(...)\n\n` +
          `// option B — downgrade intent claim:\n` +
          `fn ${decl.name}(...) intent: "total" -> Promise<T> = ${calleeName}(...)`,
      });
    }
  }
}

/**
 * INT014: intent string contains a redundant claim implied by a stronger claim (?bs 0.9+).
 *
 * Subsumption rules enforced here:
 *   pure → idempotent  — pure bans all uses (superset of idempotent's random/time ban)
 *   infallible → total — infallible = total + no-Result-return (strictly stronger)
 *
 * When both a stronger and weaker claim appear together, the weaker one is noise.
 * Fix: remove the weaker claim and keep only the stronger one.
 */
function checkRedundantIntentClaims(
  decl: FnDecl,
  src: string,
  diagnostics: Diagnostic[],
): void {
  const intent = decl.intent!;
  const intentStart = decl.intentStart!;
  const loc = locationOf(src, intentStart);
  const spanEnd = intentStart + intent.length + 2;
  const entry = getErrorCode("INT014")!;

  const hasPure = containsPureClaim(intent);
  const hasIdempotent = containsIdempotentClaim(intent);
  const hasTotal = containsTotalClaim(intent);
  const hasInfallible = containsInfallibleClaim(intent);

  if (hasPure && hasIdempotent) {
    diagnostics.push({
      code: "INT014",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: spanEnd,
      message:
        `fn '${decl.name}' intent: "${intent}" — 'idempotent' claim is redundant: ` +
        `'pure' already implies it (pure bans all uses, which is strictly stronger than ` +
        `idempotent's ban on random and time); remove 'idempotent' and keep 'pure'`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// remove the weaker 'idempotent' claim — 'pure' already guarantees it:\n` +
        `fn ${decl.name}(...) intent: "pure" -> T = ...`,
    });
  }

  if (hasInfallible && hasTotal) {
    diagnostics.push({
      code: "INT014",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: spanEnd,
      message:
        `fn '${decl.name}' intent: "${intent}" — 'total' claim is redundant: ` +
        `'infallible' already implies it (infallible is total plus a no-Result-return ` +
        `constraint; the no-throws guarantee of total is a strict subset); ` +
        `remove 'total' and keep 'infallible'`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// remove the weaker 'total' claim — 'infallible' already guarantees it:\n` +
        `fn ${decl.name}(...) intent: "infallible" -> T = ...`,
    });
  }
}

