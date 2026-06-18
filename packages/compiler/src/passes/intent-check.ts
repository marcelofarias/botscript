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
 *            Planned for future versions: total, monotonic, …
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
import { STDLIB_TO_CAP, STATEFUL_FREE_NAMESPACES } from "./_stdlib.js";
import { aliasesForFn, blockShadowsForFn, isInBlockShadow, collectStdlibAliases, type BlockShadowRange } from "./_alias.js";

export function passIntentCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.7")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const checksReadsWrites = atLeast(version.resolved, "0.8");
  const checksThrows = atLeast(version.resolved, "0.9");
  const trackAliases = atLeast(version.resolved, "0.8");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const allDecls = program.fns.map((s) => s.decl);
  const aliases = trackAliases ? collectStdlibAliases(tokens) : new Map<string, string>();
  const diagnostics: Diagnostic[] = [];

  for (const slot of program.fns) {
    const decl = slot.decl;

    // Use === undefined (not falsiness) so an explicitly empty intent: ""
    // is still treated as an intent clause being present.
    if (decl.intent === undefined) continue;

    // Each claim is checked independently — a fn may carry several
    // (e.g. intent: "pure idempotent"), and each gets its own diagnostics.
    if (containsPureClaim(decl.intent)) {
      checkPureClaim(decl, src, tokens, allDecls, checksReadsWrites, checksThrows, aliases, diagnostics, trackAliases);
    }
    if (containsIdempotentClaim(decl.intent)) {
      checkIdempotentClaim(decl, src, tokens, allDecls, checksReadsWrites, aliases, diagnostics, trackAliases);
    }
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

/**
 * "pure" claim: INT001 (header conflict) and INT002 (body under-declaration).
 */
function checkPureClaim(
  decl: FnDecl,
  src: string,
  tokens: Token[],
  allDecls: FnDecl[],
  checksReadsWrites: boolean,
  checksThrows: boolean,
  aliases: Map<string, string>,
  diagnostics: Diagnostic[],
  acceptOptionalChain = false,
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
    return;
  }

  // INT002: stateful-free namespace variant — clock.sequence() and similar are
  // capability-free (no `uses {}` required) but non-deterministic. A pure fn
  // must be deterministic, so calling these still violates the claim.
  const statefulFreeUse = findFirstStatefulFreeUse(tokens, decl, allDecls, declAliases, declBlockShadows);
  if (statefulFreeUse) {
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
        `fn '${decl.name}' declares intent: "pure" but body calls ` +
        `'${statefulFreeUse.namespace}${statefulFreeUse.accessOp}${statefulFreeUse.member}' which is stateful (non-deterministic) — ` +
        `pure functions must be deterministic`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — remove the stateful call from the body:\n` +
        `fn ${decl.name}(...) intent: "pure" -> ...\n\n` +
        `// option B — remove the pure intent claim:\n` +
        `fn ${decl.name}(...) -> ...`,
    });
  }
}

// Capabilities whose values change on every call — fundamentally non-idempotent.
const NON_IDEMPOTENT = new Set(["random", "time"]);

/**
 * "idempotent" claim: INT003 (header conflict), INT004 (body under-declaration),
 * INT005 (writes {} conflict).
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
    return;
  }

  // INT004: stateful-free namespace variant — clock.sequence() is capability-free
  // but non-deterministic (returns a new value each call). An idempotent fn must
  // produce the same observable result on retries; calling clock.sequence() breaks that.
  const statefulFreeUse4 = findFirstStatefulFreeUse(tokens, decl, allDecls, declAliases4, declBlockShadows4);
  if (statefulFreeUse4) {
    const entry = getErrorCode("INT004")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    diagnostics.push({
      code: "INT004",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: intentStart,
      end: intentStart + decl.intent!.length + 2,
      message:
        `fn '${decl.name}' declares intent: "idempotent" but body calls ` +
        `'${statefulFreeUse4.namespace}${statefulFreeUse4.accessOp}${statefulFreeUse4.member}' which returns a different value on each call — ` +
        `idempotent functions must be safe to retry with the same result`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `// option A — remove the stateful call from the body:\n` +
        `fn ${decl.name}(...) intent: "idempotent" -> ...\n\n` +
        `// option B — remove the idempotent intent claim:\n` +
        `fn ${decl.name}(...) -> ...`,
    });
  }
}

/**
 * Scan the fn body for a stateful-free namespace call (e.g. clock.sequence()).
 * These namespaces require no capability declaration but are non-deterministic,
 * so they still violate `intent: "pure"` and `intent: "idempotent"` claims.
 * Mirrors findFirstCapabilityUse: resolves module-level aliases and suppresses
 * block-shadowed identifiers so `const clock = {...}` doesn't false-positive.
 */
function findFirstStatefulFreeUse(
  tokens: Token[],
  fn: FnDecl,
  allDecls: FnDecl[],
  aliases: Map<string, string> = new Map(),
  blockShadows: BlockShadowRange[] = [],
): { namespace: string; member: string; accessOp: "." | "?." } | null {
  const inner = allDecls.filter(
    (g) => g !== fn && g.tokenStart >= fn.tokenStart && g.tokenEnd <= fn.tokenEnd,
  );
  for (let i = fn.bodyTokenStart ?? fn.tokenStart; i < fn.tokenEnd; i++) {
    if (insideAny(i, inner)) continue;
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    // Resolve module-level alias before checking the namespace set.
    const aliasCanonical = !isInBlockShadow(tok.text, i, blockShadows)
      ? aliases.get(tok.text)
      : undefined;
    const canonical = aliasCanonical ?? tok.text;
    if (!STATEFUL_FREE_NAMESPACES.has(canonical)) continue;
    // Suppress if the identifier is block-shadowed by a local binding.
    if (isInBlockShadow(tok.text, i, blockShadows)) continue;
    const j = nextSignificant(tokens, i + 1);
    const next = tokens[j];
    const isDot = next?.kind === "punct" && next.text === ".";
    const isOptChain = next?.kind === "questionDot";
    if (!isDot && !isOptChain) continue;
    const memberIdx = nextSignificant(tokens, j + 1);
    const memberTok = tokens[memberIdx];
    if (!memberTok || memberTok.kind !== "ident") continue;
    const member = memberTok.text;
    // Only flag actual invocations (clock.sequence()), not bare member reads (clock.sequence).
    const afterMemberIdx = nextSignificant(tokens, memberIdx + 1);
    const afterMember = tokens[afterMemberIdx];
    // questionDot alone is not enough — clock.sequence?.length uses questionDot for property access.
    // Require the token after questionDot to be `(` to confirm it's an optional call.
    const isCall =
      (afterMember?.kind === "open" && afterMember.text === "(") ||
      (afterMember?.kind === "questionDot" &&
        tokens[nextSignificant(tokens, afterMemberIdx + 1)]?.kind === "open" &&
        tokens[nextSignificant(tokens, afterMemberIdx + 1)]?.text === "("); // clock.sequence?.()
    if (!isCall) continue;
    return { namespace: canonical, member, accessOp: isDot ? "." : "?." };
  }
  return null;
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

