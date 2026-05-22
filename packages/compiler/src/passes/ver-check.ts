/**
 * Version-floor warning for unenforced effect declarations (?bs < 0.9).
 *
 * Effect annotations are parsed and accepted at any version, but enforcement
 * only kicks in from `?bs 0.9`:
 *
 *   - `reads {}` / `writes {}` + DEP001/DEP002: enforced from `?bs 0.9`
 *   - `throws {}` + THR001/THR002: enforced from `?bs 0.9`
 *
 * When a non-empty clause is present on a file pinned below its enforcement
 * floor, the compiler accepts it silently — the annotation is documentation,
 * not a verified claim. A reviewer reading the header would reasonably assume
 * the compiler has verified the transitivity claim; it has not.
 *
 *   VER001  A non-empty `reads {}` or `writes {}` clause is declared on a fn
 *           whose file is pinned below `?bs 0.9`. DEP001/DEP002 are not
 *           enforced; the annotation is documentation only.
 *
 *   VER002  A non-empty `throws {}` clause is declared on a fn whose file is
 *           pinned below `?bs 0.9`. THR001/THR002 are not enforced; the
 *           annotation is documentation only.
 *
 * Both VER001 and VER002 are warnings (non-blocking) — the intended pattern
 * of "annotate first, then upgrade the pin" is valid. The warning makes the
 * lack of enforcement visible so reviewers are not given false assurance.
 *
 * Only non-empty clauses are flagged. An empty `reads {}` / `throws {}` on
 * an old-pin file is likely an intentional forward-declaration placeholder
 * and does not create false assurance.
 *
 *   ?bs 0.9+  This pass is not run (enforcement is active, no warning needed).
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
  // Enforcement is active at 0.9 — no warning needed.
  if (atLeast(version.resolved, "0.9")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: false });
  const warnings: Diagnostic[] = [];

  const ver001 = getErrorCode("VER001")!;
  const ver002 = getErrorCode("VER002")!;

  for (const { decl } of program.fns) {
    const hasUnenforceReads = (decl.reads?.length ?? 0) > 0;
    const hasUnenforceWrites = (decl.writes?.length ?? 0) > 0;
    const hasUnenforceThrows = (decl.throws?.length ?? 0) > 0;

    if (hasUnenforceReads || hasUnenforceWrites) {
      const { line, column } = locationOf(src, decl.fnKeywordStart);
      const clauses: string[] = [];
      if (hasUnenforceReads) clauses.push(`reads { ${decl.reads!.join(", ")} }`);
      if (hasUnenforceWrites) clauses.push(`writes { ${decl.writes!.join(", ")} }`);
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

    if (hasUnenforceThrows) {
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
          `THR001/THR002 enforcement requires ?bs 0.9; this annotation is unenforced`,
        rule: ver002.rule,
        idiom: ver002.idiom,
        rewrite: ver002.rewrite,
      });
    }
  }

  return { code: src, warnings };
}
