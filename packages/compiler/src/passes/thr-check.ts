/**
 * Throws declaration check (?bs 0.9+).
 *
 * Enforces transitivity of `throws { ... }` annotations across same-file
 * function calls.
 *
 *   Rule: if fn A calls fn B (defined in the same file) and B declares
 *   `throws { X }`, then A must also declare `throws { X }`.
 *
 * This makes the failure surface of each fn complete from a caller's
 * perspective — reading A's header tells you every exception type A (or
 * anything it calls) may throw, without tracing through the call graph.
 *
 *   THR001  throws under-declared: fn A calls fn B which (transitively)
 *           declares `throws { X }` that A does not declare. For a direct
 *           call the diagnostic says "'B' which throws { X }"; for a multi-hop
 *           chain it names the path, e.g. "B -> C — 'C' throws { X }".
 *
 * Only same-file call resolution is performed (same as cap-check / dep-check).
 * Over-declaration is intentionally NOT checked — a caller may conservatively
 * declare more exception types than it strictly needs.
 *
 * NOTE: This pass enforces transitivity only — it does NOT verify that a fn's
 * body actually throws the types it declares (a leaf fn can lie). Body-level
 * soundness requires the effect inference pass; see issue #14.
 */

import { BotscriptError } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { atLeast, type VersionInfo } from "./version.js";
import { locationOf } from "./_location.js";
import { computeNesting, collectCallees } from "./_callgraph.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ThrPath =
  | { kind: "declared"; fnName: string; label: string }
  | { kind: "via"; fnName: string; callee: string; next: ThrPath };

interface FnRecord {
  decl: FnDecl;
  declaredThrows: Set<string>;
  callees: Set<string>;
  transitiveThrows: Map<string, ThrPath>;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function passThrCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const decls = program.fns.map((s) => s.decl);

  if (decls.length === 0) return src;

  const records = new Map<FnDecl, FnRecord>();
  const declsByName = new Map<string, FnDecl[]>();
  const fnNames = new Set(decls.map((d) => d.name));
  const innerByDecl = computeNesting(decls);

  for (const decl of decls) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, fnNames);
    records.set(decl, {
      decl,
      declaredThrows: new Set(decl.throws ?? []),
      callees,
      transitiveThrows: new Map(),
    });
    const sameName = declsByName.get(decl.name) ?? [];
    sameName.push(decl);
    declsByName.set(decl.name, sameName);
  }

  // Seed transitive sets from each fn's own declared throws.
  for (const rec of records.values()) {
    for (const label of rec.declaredThrows) {
      rec.transitiveThrows.set(label, { kind: "declared", fnName: rec.decl.name, label });
    }
  }

  // Fixed-point closure.
  let changed = true;
  while (changed) {
    changed = false;
    for (const rec of records.values()) {
      for (const calleeName of rec.callees) {
        const calleeDecls = declsByName.get(calleeName);
        if (!calleeDecls) continue;
        for (const calleeDecl of calleeDecls) {
          if (calleeDecl === rec.decl) continue;
          const callee = records.get(calleeDecl);
          if (!callee) continue;
          for (const [label, path] of callee.transitiveThrows) {
            if (rec.transitiveThrows.has(label)) continue;
            rec.transitiveThrows.set(label, {
              kind: "via",
              fnName: rec.decl.name,
              callee: calleeName,
              next: path,
            });
            changed = true;
          }
        }
      }
    }
  }

  // Validate: declared throws must cover transitive throws.
  for (const rec of records.values()) {
    const missing = [...rec.transitiveThrows.keys()].filter(
      (l) => !rec.declaredThrows.has(l),
    );
    if (missing.length > 0) {
      throw mkError(src, rec, missing);
    }
  }

  return src;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPath(path: ThrPath): string {
  const segments: string[] = [];
  let cur: ThrPath = path;
  while (cur.kind === "via") {
    segments.push(cur.fnName);
    cur = cur.next;
  }
  segments.push(cur.fnName);
  return segments.join(" -> ");
}

function mkError(src: string, rec: FnRecord, missingLabels: string[]): BotscriptError {
  const entry = getErrorCode("THR001")!;
  const { line, column } = locationOf(src, rec.decl.fnKeywordStart);

  const firstLabel = missingLabels[0]!;
  const firstPath = rec.transitiveThrows.get(firstLabel)!;
  const pathStr = formatPath(firstPath);
  const leaf = pathStr.split(" -> ").at(-1);

  const directCall = firstPath.kind === "via" && firstPath.next.kind === "declared";
  const transitively = directCall ? "" : " transitively";

  const displayPath =
    !directCall && firstPath.kind === "via"
      ? formatPath(firstPath.next)
      : pathStr;

  const currentDecl =
    rec.declaredThrows.size === 0
      ? "(none)"
      : [...rec.declaredThrows].join(", ");

  const proposed = [...new Set([...rec.declaredThrows, ...missingLabels])].join(", ");

  const otherMissing = missingLabels.slice(1);
  const otherTail =
    otherMissing.length > 0
      ? `; also missing: ${otherMissing.map((l) => `"${l}"`).join(", ")}`
      : "";

  const callDescription = directCall
    ? `'${leaf}' which throws { ${firstLabel} }`
    : `${displayPath} — '${leaf}' throws { ${firstLabel} }`;

  const message =
    `fn '${rec.decl.name}'${transitively} calls ${callDescription}, ` +
    `but '${rec.decl.name}' only declares throws { ${currentDecl} }${otherTail}`;

  const callPath = `call path: ${pathStr}`;
  const nameEnd = rec.decl.nameStart + rec.decl.name.length;

  const diagnostic = {
    code: "THR001",
    severity: "error" as const,
    file: null,
    line,
    column,
    start: rec.decl.fnKeywordStart,
    end: nameEnd,
    message,
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite: `fn ${rec.decl.name}(...) throws { ${proposed} } -> ...  // ${callPath}`,
  };

  return new BotscriptError([diagnostic]);
}
