/**
 * Capability assertion check (?bs 0.9+).
 *
 *   CAP003  A `uses {}` declaration on an `unsafe fn` is programmer-asserted,
 *           not compiler-proven. The capability inference pass (CAP001/CAP002)
 *           still runs on the body — but an `unsafe fn` can contain `as` casts
 *           that alias stdlib namespaces, bypassing name-based detection. The
 *           claim is therefore only as trustworthy as the author's intent.
 *
 *           CAP003 is a warning, not an error — the function still compiles.
 *           It annotates the claim so callers and audit tooling can distinguish
 *           "proven by the compiler" from "asserted by the author."
 *
 *   pre-0.9  This pass is not run.
 */

import type { Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { locationOf } from "./_location.js";
import { atLeast, type VersionInfo } from "./version.js";

export interface CapAssertResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

export function passCapAssert(src: string, version: VersionInfo): CapAssertResult {
  if (!atLeast(version.resolved, "0.9")) return { code: src, warnings: [] };

  const program = parseProgram(src, { allowGenerics: true, includeNestedFns: false });
  const warnings: Diagnostic[] = [];
  const entry = getErrorCode("CAP003")!;

  for (const { decl } of program.fns) {
    if (!decl.unsafeReason) continue;
    if (decl.capabilities.length === 0) continue;

    const { line, column } = locationOf(src, decl.fnKeywordStart);
    warnings.push({
      code: "CAP003",
      severity: "warning",
      file: null,
      line,
      column,
      start: decl.fnKeywordStart,
      end: decl.nameStart + decl.name.length,
      message:
        `fn '${decl.name}' declares capability { ${decl.capabilities.join(", ")} } inside an unsafe fn — ` +
        `claim is programmer-asserted, not compiler-proven`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: entry.rewrite,
    });
  }

  return { code: src, warnings };
}
