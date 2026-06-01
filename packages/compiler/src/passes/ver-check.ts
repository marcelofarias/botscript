/**
 * Version-floor warnings for unenforced annotations.
 *
 * Annotations are parsed and accepted at any version, but enforcement only
 * kicks in at the following floors:
 *
 *   - `reads {}` / `writes {}` + DEP001/DEP002: enforced from `?bs 0.9`
 *   - `throws {}` + THR001: enforced from `?bs 0.9`
 *   - `intent: "..."` + INT001–INT005: enforced from `?bs 0.7`
 *
 * When a non-empty annotation is present on a file pinned below its
 * enforcement floor, the compiler accepts it silently — the annotation is
 * documentation, not a verified claim. A reviewer reading the header would
 * reasonably assume the compiler has verified the claim; it has not.
 *
 *   VER001  A non-empty `reads {}` or `writes {}` clause is declared on a fn
 *           whose file is pinned below `?bs 0.9`. DEP001/DEP002 are not
 *           enforced; the annotation is documentation only.
 *
 *   VER002  A non-empty `throws {}` clause is declared on a fn whose file is
 *           pinned below `?bs 0.9`. THR001 is not enforced; the annotation
 *           is documentation only.
 *
 *   VER003  A non-empty `intent: "..."` clause is declared on a fn whose file
 *           is pinned below `?bs 0.7`. INT001–INT005 are not enforced; the
 *           annotation is documentation only.
 *
 * All three are warnings (non-blocking) — the intended pattern of
 * "annotate first, then upgrade the pin" is valid. The warning makes the
 * lack of enforcement visible so reviewers are not given false assurance.
 *
 * Only non-empty clauses are flagged. An empty `reads {}` / `writes {}` /
 * `throws {}` on an old-pin file is likely an intentional forward-declaration
 * placeholder and does not create false assurance.
 */

import type { Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";

export interface VerCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

export function passVerCheck(src: string, version: VersionInfo): VerCheckResult {
  const isAtLeast07 = atLeast(version.resolved, "0.7");
  const isAtLeast09 = atLeast(version.resolved, "0.9");

  // At ?bs 0.9+ all three checks are no-ops (0.9 implies 0.7).
  if (isAtLeast09) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const warnings: Diagnostic[] = [];

  const ver001 = getErrorCode("VER001")!;
  const ver002 = getErrorCode("VER002")!;
  const ver003 = getErrorCode("VER003")!;

  for (const { decl } of program.fns) {
    // VER001/VER002: always active here — ?bs 0.9+ already returned early above
    const hasUnenforcedReads = (decl.reads?.length ?? 0) > 0;
    const hasUnenforcedWrites = (decl.writes?.length ?? 0) > 0;
    const hasUnenforcedThrows = (decl.throws?.length ?? 0) > 0;

    if (hasUnenforcedReads || hasUnenforcedWrites) {
      const { line, column } = locationOf(src, decl.fnKeywordStart);
      const clauses: string[] = [];
      if (hasUnenforcedReads) clauses.push(`reads { ${decl.reads!.join(", ")} }`);
      if (hasUnenforcedWrites) clauses.push(`writes { ${decl.writes!.join(", ")} }`);
      const clauseStr = clauses.join(" / ");

      warnings.push({
        code: "VER001",
        severity: "warning",
        file: null,
        line,
        column,
        start: decl.fnKeywordStart,
        end: decl.nameStart + decl.name.length,
        message:
          `fn '${decl.name}' declares ${clauseStr} at ?bs ${version.resolved} — ` +
          `DEP001/DEP002 enforcement requires ?bs 0.9; this annotation is unenforced`,
        rule: ver001.rule,
        idiom: ver001.idiom,
        rewrite: ver001.rewrite,
      });
    }

    if (hasUnenforcedThrows) {
      const { line, column } = locationOf(src, decl.fnKeywordStart);
      const throwsStr = `throws { ${decl.throws!.join(", ")} }`;

      warnings.push({
        code: "VER002",
        severity: "warning",
        file: null,
        line,
        column,
        start: decl.fnKeywordStart,
        end: decl.nameStart + decl.name.length,
        message:
          `fn '${decl.name}' declares ${throwsStr} at ?bs ${version.resolved} — ` +
          `THR001 enforcement requires ?bs 0.9; this annotation is unenforced`,
        rule: ver002.rule,
        idiom: ver002.idiom,
        rewrite: ver002.rewrite,
      });
    }

    // VER003: active below ?bs 0.7
    if (!isAtLeast07 && decl.intent) {
      const { line, column } = locationOf(src, decl.fnKeywordStart);
      warnings.push({
        code: "VER003",
        severity: "warning",
        file: null,
        line,
        column,
        start: decl.fnKeywordStart,
        end: decl.nameStart + decl.name.length,
        message:
          `fn '${decl.name}' declares intent: "${decl.intent}" at ?bs ${version.resolved} — ` +
          `INT001–INT005 enforcement requires ?bs 0.7; this annotation is unenforced`,
        rule: ver003.rule,
        idiom: ver003.idiom,
        rewrite: ver003.rewrite,
      });
    }
  }

  return { code: src, warnings };
}
