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
 *   ?bs 0.9  EFF003 / EFF004 added. Same principle as EFF002 but for
 *            `reads {}` and `writes {}` annotations on callback parameters.
 *
 *            EFF003  A function-typed parameter carries `reads { labels }`,
 *                    but the containing fn does not declare those read labels.
 *
 *            EFF004  A function-typed parameter carries `writes { labels }`,
 *                    but the containing fn does not declare those write labels.
 *
 * Background (issue #56):
 *   The pure-intent check (INT001/INT002) and the capability check (CAP001)
 *   both miss the case where an effectful closure is passed to a combinator
 *   that accepts arbitrary callbacks. Body inference sees `action()` as a call
 *   to a `() -> T` variable — no stdlib name, no direct capability reference —
 *   so the outer fn can claim fewer effects than it can actually exercise.
 *   EFF002 closes the "legal header but lying callback" vector by making the
 *   outer fn own the effect surface of every callback it accepts.
 *   EFF003/EFF004 extend the same principle to read/write resource labels.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import { atLeast, type VersionInfo } from "./version.js";

export function passEffCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.7")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const check09 = atLeast(version.resolved, "0.9");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const diagnostics: Diagnostic[] = [];

  for (const slot of program.fns) {
    const decl = slot.decl;

    // EFF002: uses {} on callback not propagated to outer fn.
    if (decl.paramCaps.length > 0) {
      const declared = new Set(decl.capabilities);
      const uniqueMissing = [...new Set(decl.paramCaps.filter((c) => !declared.has(c)))];
      if (uniqueMissing.length > 0) {
        const entry = getErrorCode("EFF002")!;
        const loc = locationOf(src, decl.fnKeywordStart);
        const paramCapsStr = [...new Set(decl.paramCaps)].join(", ");
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
            `but only declares uses ${declared.size > 0 ? `{ ${[...declared].join(", ")} }` : "{}"} — ` +
            `missing: { ${uniqueMissing.join(", ")} }`,
          rule: entry.rule,
          idiom: entry.idiom,
          rewrite:
            `fn ${decl.name}(...) uses { ${[...declared, ...uniqueMissing].join(", ")} } -> ...`,
        });
      }
    }

    // EFF003/EFF004: reads/writes on callbacks not propagated — gated on ?bs 0.9.
    if (check09) {
      // EFF003: reads {} on callback.
      if (decl.paramReads.length > 0) {
        const declaredReads = new Set(decl.reads ?? []);
        const uniqueMissing = [...new Set(decl.paramReads.filter((l) => !declaredReads.has(l)))];
        if (uniqueMissing.length > 0) {
          const entry = getErrorCode("EFF003")!;
          const loc = locationOf(src, decl.fnKeywordStart);
          const paramReadsStr = [...new Set(decl.paramReads)].join(", ");
          diagnostics.push({
            code: "EFF003",
            severity: "error",
            file: null,
            line: loc.line,
            column: loc.column,
            start: decl.fnKeywordStart,
            end: decl.fnKeywordStart + decl.name.length + 3,
            message:
              `fn '${decl.name}' accepts callback parameter(s) that declare reads { ${paramReadsStr} } ` +
              `but only declares reads ${declaredReads.size > 0 ? `{ ${[...declaredReads].join(", ")} }` : "{}"} — ` +
              `missing: { ${uniqueMissing.join(", ")} }`,
            rule: entry.rule,
            idiom: entry.idiom,
            rewrite:
              `fn ${decl.name}(...) reads { ${[...declaredReads, ...uniqueMissing].join(", ")} } -> ...`,
          });
        }
      }

      // EFF004: writes {} on callback.
      if (decl.paramWrites.length > 0) {
        const declaredWrites = new Set(decl.writes ?? []);
        const uniqueMissing = [...new Set(decl.paramWrites.filter((l) => !declaredWrites.has(l)))];
        if (uniqueMissing.length > 0) {
          const entry = getErrorCode("EFF004")!;
          const loc = locationOf(src, decl.fnKeywordStart);
          const paramWritesStr = [...new Set(decl.paramWrites)].join(", ");
          diagnostics.push({
            code: "EFF004",
            severity: "error",
            file: null,
            line: loc.line,
            column: loc.column,
            start: decl.fnKeywordStart,
            end: decl.fnKeywordStart + decl.name.length + 3,
            message:
              `fn '${decl.name}' accepts callback parameter(s) that declare writes { ${paramWritesStr} } ` +
              `but only declares writes ${declaredWrites.size > 0 ? `{ ${[...declaredWrites].join(", ")} }` : "{}"} — ` +
              `missing: { ${uniqueMissing.join(", ")} }`,
            rule: entry.rule,
            idiom: entry.idiom,
            rewrite:
              `fn ${decl.name}(...) writes { ${[...declaredWrites, ...uniqueMissing].join(", ")} } -> ...`,
          });
        }
      }
    }
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
