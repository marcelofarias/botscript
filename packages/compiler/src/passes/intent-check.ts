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
 *            Planned for future versions: total, monotonic, …
 *            (mechanical vocabulary grows one INT code at a time).
 *
 *   ?bs 0.8  INT001 extended: also fires when `reads { ... }` or `writes { ... }`
 *            conflict with a "pure" intent claim. A pure function must have no
 *            resource dependencies either.
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
import { STDLIB_TO_CAP } from "./cap-check.js";

export function passIntentCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.7")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const checksReadsWrites = atLeast(version.resolved, "0.8");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const allDecls = program.fns.map((s) => s.decl);
  const diagnostics: Diagnostic[] = [];

  for (const slot of program.fns) {
    const decl = slot.decl;

    // Use === undefined (not falsiness) so an explicitly empty intent: ""
    // is still treated as an intent clause being present.
    if (decl.intent === undefined) continue;

    // Each claim is checked independently — a fn may carry several
    // (e.g. intent: "pure idempotent"), and each gets its own diagnostics.
    if (containsPureClaim(decl.intent)) {
      checkPureClaim(decl, src, tokens, allDecls, checksReadsWrites, diagnostics);
    }
    if (containsIdempotentClaim(decl.intent)) {
      checkIdempotentClaim(decl, src, tokens, allDecls, diagnostics);
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
  diagnostics: Diagnostic[],
): void {
    const hasUses = decl.capabilities.length > 0;
    const hasReads = checksReadsWrites && (decl.reads?.length ?? 0) > 0;
    const hasWrites = checksReadsWrites && (decl.writes?.length ?? 0) > 0;

    if (hasUses || hasReads || hasWrites) {
      // INT001: header-level conflict — intent claims "pure" but the function
      // has capability or (from 0.8) read/write resource declarations.
      const entry = getErrorCode("INT001")!;
      const intentStart = decl.intentStart!;
      const loc = locationOf(src, intentStart);

      const parts: string[] = [];
      if (hasUses) parts.push(`uses { ${decl.capabilities.join(", ")} }`);
      if (hasReads) parts.push(`reads { ${decl.reads!.join(", ")} }`);
      if (hasWrites) parts.push(`writes { ${decl.writes!.join(", ")} }`);
      const conflictsStr = parts.join(", ");
      const conflictsRewrite = parts.join(" ");

      diagnostics.push({
        code: "INT001",
        severity: "error",
        file: null,
        line: loc.line,
        column: loc.column,
        start: intentStart,
        end: intentStart + decl.intent!.length + 2,
        message:
          `fn '${decl.name}' intent claims 'pure' but declares ${conflictsStr} — ` +
          `pure functions may not consume external resources or have resource dependencies`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite:
          `// remove the conflicting header clauses (uses/reads/writes):\nfn ${decl.name}(...) intent: "pure" -> ...\n` +
          `// or remove the pure intent claim:\nfn ${decl.name}(...) ${conflictsRewrite} -> ...`,
      });
      // INT001 already fired — skip INT002 for this fn (header conflict subsumes body check).
      return;
    }

    // INT002: intent claims "pure", uses {} is empty (and reads/writes are
    // absent or not yet enforced), but the body directly references a stdlib
    // capability. This is the under-declaration case that INT001 cannot catch.
    const bodyUse = findFirstCapabilityUse(tokens, decl, allDecls);
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
          `'${bodyUse.namespace}.${bodyUse.member}' which requires capability '${bodyUse.capability}' — ` +
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
}

// Capabilities whose values change on every call — fundamentally non-idempotent.
const NON_IDEMPOTENT = new Set(["random", "time"]);

/**
 * "idempotent" claim: INT003 (header conflict) and INT004 (body under-declaration).
 *
 * An idempotent fn is safe to retry: same inputs → same observable result.
 * `random` and `time` break that — they yield different values per call — so a
 * fn that declares or directly calls either cannot honour the claim. Other
 * capabilities (net, fs, …) are not structurally flagged — INT003 is a narrow
 * header heuristic, not a proof of idempotence.
 */
function checkIdempotentClaim(
  decl: FnDecl,
  src: string,
  tokens: Token[],
  allDecls: FnDecl[],
  diagnostics: Diagnostic[],
): void {
  // INT003: header-level — uses { } declares a non-idempotent capability.
  const nonIdem = decl.capabilities.filter((c) => NON_IDEMPOTENT.has(c));
  if (nonIdem.length > 0) {
    const entry = getErrorCode("INT003")!;
    const intentStart = decl.intentStart!;
    const loc = locationOf(src, intentStart);
    const nonIdemStr = nonIdem.join(", ");
    const allCapsStr = decl.capabilities.join(", ");
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
        `// option A — remove the non-idempotent capability:\n` +
        `fn ${decl.name}(...) intent: "idempotent" -> ...\n\n` +
        `// option B — remove the idempotent intent claim:\n` +
        `fn ${decl.name}(...) uses { ${allCapsStr} } -> ...`,
    });
    // INT003 already fired — header conflict subsumes the body check.
    return;
  }

  // INT004: body-level under-declaration — body directly references a
  // non-idempotent namespace that is not declared in uses { }.
  const bodyUse = findFirstCapabilityUse(tokens, decl, allDecls, (ns) =>
    NON_IDEMPOTENT.has(ns),
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
        `'${bodyUse.namespace}.${bodyUse.member}' which produces a different value on each call — ` +
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
}

/**
 * Scan the fn body for a direct stdlib capability reference, excluding inner
 * fn declarations. Returns the first match or null if the body is clean.
 */
function findFirstCapabilityUse(
  tokens: Token[],
  fn: FnDecl,
  allDecls: FnDecl[],
  filter?: (namespace: string) => boolean,
): { capability: string; namespace: string; member: string } | null {
  // Inner fns to exclude from the scan (same pattern as cap-check).
  const inner = allDecls.filter(
    (g) => g !== fn && g.tokenStart >= fn.tokenStart && g.tokenEnd <= fn.tokenEnd,
  );

  for (let i = fn.bodyTokenStart ?? fn.tokenStart; i < fn.tokenEnd; i++) {
    if (insideAny(i, inner)) continue;
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    const cap = STDLIB_TO_CAP[tok.text];
    if (!cap) continue;
    if (filter && !filter(tok.text)) continue;
    const j = nextSignificant(tokens, i + 1);
    const next = tokens[j];
    if (next?.kind !== "punct" || next.text !== ".") continue;
    const member = nextIdent(tokens, j) ?? "…";
    return { capability: cap, namespace: tok.text, member };
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

