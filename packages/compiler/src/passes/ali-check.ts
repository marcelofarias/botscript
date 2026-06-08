/**
 * ALI001 / ALI002 / ALI003: stdlib namespace alias checks.
 *
 * ALI001 — stdlib namespace aliased via a non-trivial expression (member access,
 *           operator, call). The alias is silently ignored by static checks.
 *           Warning at ?bs 0.8+.
 *
 * ALI002 — alias-of-alias chain: `const x = t` where `t` is already a tracked
 *           alias for a stdlib namespace. Chain aliases are not transitively tracked;
 *           `x.now()` won't be caught by cap/intent/uns checks.
 *           Warning at ?bs 0.8+.
 *
 * ALI003 — stdlib namespace destructuring: `const { now } = time` extracts member
 *           references that no static check follows.
 *           Warning at ?bs 0.8. Error (blocking) at ?bs 0.9+ — no defensible use case
 *           exists; the pattern is always either a mistake or a static-check bypass.
 *
 * ALI001/ALI002 are warning-level (non-blocking). Gated on ?bs 0.8.
 * ALI003 is warning at 0.8, error at 0.9+. Gated on ?bs 0.8.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { atLeast, type VersionInfo } from "./version.js";
import { locationOf } from "./_location.js";
import {
  collectStdlibAliases,
  collectAliasWarningCandidates,
  collectChainAliasWarningCandidates,
  collectDestructuringWarningCandidates,
} from "./_alias.js";

export function passAliCheck(src: string, version: VersionInfo): { code: string; warnings: Diagnostic[] } {
  if (!atLeast(version.resolved, "0.8")) return { code: src, warnings: [] };

  const program = parseProgram(src, { allowGenerics: true });
  const { tokens } = program;

  const warnings: Diagnostic[] = [];

  // Pre-compute stdlib aliases once; shared by ALI001 (alias bypass), ALI002, and ALI003.
  const aliases = collectStdlibAliases(tokens);

  // ALI001: non-trivial RHS forms (member access, operator, call) — including
  // forms where the leading ident is a tracked alias (e.g. `const x = t.now`
  // where `const t = time`).
  const ali001Candidates = collectAliasWarningCandidates(tokens, aliases);
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

  // ALI003: stdlib namespace destructuring (`const { now } = time` or via alias).
  // Warning at ?bs 0.8; error (blocking) at ?bs 0.9+ — there is no defensible use case.
  const ali003AsError = atLeast(version.resolved, "0.9");
  const ali003Candidates = collectDestructuringWarningCandidates(tokens, aliases);
  if (ali003Candidates.length > 0) {
    const entry = getErrorCode("ALI003")!;
    const ali003Diagnostics: Diagnostic[] = [];
    for (const c of ali003Candidates) {
      const loc = locationOf(src, c.start);
      ali003Diagnostics.push({
        code: "ALI003",
        severity: ali003AsError ? "error" : "warning",
        file: null,
        line: loc.line,
        column: loc.column,
        start: c.start,
        end: c.end,
        message:
          `destructuring '${c.stdlibName}' extracts member references that static checks won't follow — ` +
          `use a direct binding (\`const t = ${c.stdlibName}\`) or the canonical namespace name directly`,
        rule: entry.rule,
        idiom: entry.idiom,
        rewrite: entry.rewrite,
      });
    }
    if (ali003AsError) {
      throw new BotscriptError(ali003Diagnostics);
    }
    warnings.push(...ali003Diagnostics);
  }

  return { code: src, warnings };
}
