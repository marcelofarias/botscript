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
 *            Planned for future versions: idempotent, total, monotonic, …
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

/** stdlib namespace -> capability it consumes (subset mirrored from cap-check). */
const STDLIB_TO_CAP: Readonly<Record<string, string>> = {
  http: "net",
  time: "time",
  random: "random",
  fs: "fs",
  stdout: "stdout",
  stderr: "stderr",
};

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

    if (!containsPureClaim(decl.intent)) continue;

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
        end: intentStart + decl.intent.length + 2,
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
      continue;
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
        end: intentStart + decl.intent.length + 2,
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

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

/**
 * Scan the fn body for a direct stdlib capability reference, excluding inner
 * fn declarations. Returns the first match or null if the body is clean.
 */
function findFirstCapabilityUse(
  tokens: Token[],
  fn: FnDecl,
  allDecls: FnDecl[],
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

