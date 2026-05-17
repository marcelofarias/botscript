/**
 * Effect-annotation check for function-typed parameters.
 *
 *   ?bs 0.7  Enabled alongside `passIntentCheck`.
 *
 *            EFF002  A function-typed parameter carries `uses { caps }`, but
 *                    the containing fn does not declare those capabilities.
 *                    Accepting an effectful callback without declaring its
 *                    effects hides the blast radius from callers — the outer
 *                    fn's `uses {}` must be a superset of all callback
 *                    parameters' declared effects.
 *
 *            EFF001 (call-site check — effectful closure passed to pure slot)
 *            requires closure-level type inference and is out of scope for
 *            this pass. It is reserved for a future version.
 *
 * Background (issue #56):
 *   The pure-intent check (INT001/INT002) and the capability check (CAP001)
 *   both miss the case where an effectful closure is passed to a combinator
 *   that accepts arbitrary callbacks. Body inference sees `action()` as a call
 *   to a `() -> T` variable — no stdlib name, no direct capability reference —
 *   so the outer fn can claim fewer effects than it can actually exercise.
 *   EFF002 closes the "legal header but lying callback" vector by making the
 *   outer fn own the effect surface of every callback it accepts.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { atLeast, type VersionInfo } from "./version.js";

export function passEffCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.7")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const diagnostics: Diagnostic[] = [];

  for (const slot of program.fns) {
    const decl = slot.decl;
    if (decl.paramCaps.length === 0) continue;

    const declared = new Set(decl.capabilities);
    const missing = decl.paramCaps.filter((c) => !declared.has(c));
    // De-duplicate: report each missing capability once.
    const uniqueMissing = [...new Set(missing)];
    if (uniqueMissing.length === 0) continue;

    const entry = getErrorCode("EFF002")!;
    const loc = locationOf(src, decl.fnKeywordStart);
    const paramCapsStr = [...new Set(decl.paramCaps)].join(", ");
    const missingStr = uniqueMissing.join(", ");
    const declaredStr = decl.capabilities.length > 0
      ? `{ ${decl.capabilities.join(", ")} }`
      : "{}";

    diagnostics.push({
      code: "EFF002",
      severity: "error",
      file: null,
      line: loc.line,
      column: loc.column,
      start: decl.fnKeywordStart,
      end: decl.fnKeywordStart + decl.name.length + 3,
      message:
        `fn '${decl.name}' accepts callback parameter(s) that declare { ${paramCapsStr} } ` +
        `but only declares uses ${declaredStr} — ` +
        `missing: { ${missingStr} }`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite:
        `fn ${decl.name}(...) uses { ${[...declared, ...uniqueMissing].join(", ")} } -> ...`,
    });
  }

  if (diagnostics.length > 0) {
    throw new BotscriptError(diagnostics);
  }

  return src;
}

function locationOf(src: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset && i < src.length; i++) {
    if (src[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}
