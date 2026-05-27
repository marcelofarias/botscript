/**
 * ALI001 / ALI002: stdlib namespace alias warnings.
 *
 * ALI001 — stdlib namespace aliased via a non-trivial expression (member access,
 *           operator, call). The alias is silently ignored by static checks.
 *
 * ALI002 — alias-of-alias chain: `const x = t` where `t` is already a tracked
 *           alias for a stdlib namespace. Chain aliases are not transitively tracked;
 *           `x.now()` won't be caught by cap/intent/uns checks.
 *
 * Both are warning-level (non-blocking). Gated on ?bs 0.8.
 */

import { type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { atLeast, type VersionInfo } from "./version.js";
import { locationOf } from "./_location.js";
import {
  collectStdlibAliases,
  collectAliasWarningCandidates,
  collectChainAliasWarningCandidates,
} from "./_alias.js";

export function passAliCheck(src: string, version: VersionInfo): { code: string; warnings: Diagnostic[] } {
  if (!atLeast(version.resolved, "0.8")) return { code: src, warnings: [] };

  const program = parseProgram(src, { allowGenerics: true });
  const { tokens } = program;

  const warnings: Diagnostic[] = [];

  // ALI001: non-trivial RHS forms (member access, operator, call).
  const ali001Candidates = collectAliasWarningCandidates(tokens);
  if (ali001Candidates.length > 0) {
    const entry = getErrorCode("ALI001")!;
    for (const c of ali001Candidates) {
      const loc = locationOf(src, c.start);
      warnings.push({
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
      });
    }
  }

  // ALI002: alias-of-alias chains (`const x = t` where t is a tracked alias).
  const aliases = collectStdlibAliases(tokens);
  const ali002Candidates = collectChainAliasWarningCandidates(tokens, aliases);
  if (ali002Candidates.length > 0) {
    const entry = getErrorCode("ALI002")!;
    for (const c of ali002Candidates) {
      const loc = locationOf(src, c.start);
      warnings.push({
        code: "ALI002",
        severity: "warning" as const,
        file: null,
        line: loc.line,
        column: loc.column,
        start: c.start,
        end: c.end,
        message:
          `'${c.name}' is an alias of tracked alias '${c.aliasName}' (→ '${c.stdlibName}') — ` +
          `chain aliases are not tracked; use a direct binding ` +
          `(\`const ${c.name} = ${c.stdlibName}\`) or the canonical namespace name directly`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite: entry.rewrite,
      });
    }
  }

  return { code: src, warnings };
}
