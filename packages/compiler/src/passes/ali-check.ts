/**
 * ALI001: stdlib namespace aliased via a non-trivial expression.
 *
 * Gated on ?bs 0.8 — same floor as alias tracking.
 */

import { type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { atLeast, type VersionInfo } from "./version.js";
import { locationOf } from "./_location.js";
import { collectAliasWarningCandidates } from "./_alias.js";

export function passAliCheck(src: string, version: VersionInfo): { code: string; warnings: Diagnostic[] } {
  if (!atLeast(version.resolved, "0.8")) return { code: src, warnings: [] };

  const program = parseProgram(src, { allowGenerics: true });
  const { tokens } = program;
  const candidates = collectAliasWarningCandidates(tokens);

  if (candidates.length === 0) return { code: src, warnings: [] };

  const entry = getErrorCode("ALI001")!;
  const warnings: Diagnostic[] = candidates.map((c) => {
    const loc = locationOf(src, c.start);
    return {
      code: "ALI001",
      severity: "warning" as const,
      file: null,
      line: loc.line,
      column: loc.column,
      start: c.start,
      end: c.end,
      message:
        `stdlib namespace '${c.stdlibName}' assigned via a non-trivial expression — ` +
        `static alias tracking is not guaranteed; use a direct binding ` +
        `(\`const ${c.name} = ${c.stdlibName}\`) or reference '${c.stdlibName}' directly`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: entry.rewrite,
    };
  });

  return { code: src, warnings };
}
