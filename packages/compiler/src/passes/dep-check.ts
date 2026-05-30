/**
 * Resource dependency check (?bs 0.9+).
 *
 * Enforces transitivity of `reads { ... }` and `writes { ... }` annotations
 * across same-file function calls.
 *
 *   Rule: if fn A calls fn B (defined in the same file) and B declares
 *   `reads { x }` (or `writes { x }`), then A must also declare
 *   `reads { x }` (or `writes { x }`).
 *
 * This makes the dependency surface of each fn complete from a caller's
 * perspective — reading A's header tells you every resource category A (or
 * anything it calls) touches, without having to trace through the call graph
 * manually.
 *
 *   DEP001  reads under-declared: fn A calls fn B which (transitively)
 *           reads a resource category that A does not declare. For a direct
 *           call the diagnostic says "'B' which reads { x }"; for a multi-hop
 *           chain it names the path from the direct callee, e.g.
 *           "B -> C — 'C' reads { x }".
 *
 *   DEP002  writes under-declared: same for writes { ... }.
 *
 *   DEP003  reads over-declared (warning): fn has at least one same-file (or
 *           moduleEffects) callee but no callee (transitively) declares `reads { x }`.
 *           The label likely became stale after a refactor removed the callee that
 *           originally justified it. Leaf fns are excluded — they may be the actual
 *           access point and the compiler cannot verify the body directly.
 *
 *   DEP004  writes over-declared (warning): same for writes { ... }.
 *
 * Same-file call resolution is performed by default. Cross-file calls are
 * opaque unless the caller provides a `moduleEffects` map (via
 * `TransformOptions.moduleEffects`): any function listed there is treated as
 * if its declaration were in the current file, so a caller that omits its
 * reads/writes labels fires DEP001/DEP002 exactly as for a same-file callee.
 * Dynamic dispatch and higher-order function arguments are not tracked.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { atLeast, type VersionInfo } from "./version.js";
import { locationOf } from "./_location.js";
import { computeNesting, collectCallees } from "./_callgraph.js";
import { buildImportAliasMap, type ModuleEffects } from "../module-effects.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Represents how a transitive resource label arrived at a fn. */
type DepPath =
  | { kind: "declared"; fnName: string; label: string }
  | { kind: "via"; fnName: string; callee: string; next: DepPath };

interface FnRecord {
  decl: FnDecl;
  declaredReads: Set<string>;
  declaredWrites: Set<string>;
  callees: Set<string>;
  transitiveReads: Map<string, DepPath>;
  transitiveWrites: Map<string, DepPath>;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface DepCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

export function passDepCheck(
  src: string,
  version: VersionInfo,
  moduleEffects?: ModuleEffects,
): DepCheckResult {
  if (!atLeast(version.resolved, "0.9")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const decls = program.fns.map((s) => s.decl);

  if (decls.length === 0) return { code: src, warnings: [] };

  // Resolve import aliases: `import { fetchRow as fetchUser }` means a call
  // to `fetchUser` in this file should look up `fetchRow` in moduleEffects.
  const importAliases = moduleEffects ? buildImportAliasMap(tokens) : new Map<string, string>();

  // Build maps for external (cross-file) effect declarations.
  const extReads = new Map<string, Set<string>>();
  const extWrites = new Map<string, Set<string>>();
  if (moduleEffects) {
    for (const [name, eff] of Object.entries(moduleEffects)) {
      if (eff.reads?.length) extReads.set(name, new Set(eff.reads));
      if (eff.writes?.length) extWrites.set(name, new Set(eff.writes));
    }
  }

  // 1. Build per-fn records.
  const records = new Map<FnDecl, FnRecord>();
  const declsByName = new Map<string, FnDecl[]>();
  const fnNames = new Set(decls.map((d) => d.name));

  // Include external function names (and their local aliases) in the callee
  // scan so cross-file calls appear in the callees set.
  const aliasedLocalNames = new Set(importAliases.keys());
  const allCalleeNames =
    extReads.size > 0 || extWrites.size > 0 || aliasedLocalNames.size > 0
      ? new Set([...fnNames, ...extReads.keys(), ...extWrites.keys(), ...aliasedLocalNames])
      : fnNames;

  // Precompute each fn's nested (descendant) decls once via a single sweep,
  // instead of an O(n²) `decls.filter` per fn. Each `inner` list comes out
  // sorted by `tokenStart`, which `collectCallees` relies on.
  const innerByDecl = computeNesting(decls);

  for (const decl of decls) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, allCalleeNames);
    records.set(decl, {
      decl,
      declaredReads: new Set(decl.reads ?? []),
      declaredWrites: new Set(decl.writes ?? []),
      callees,
      transitiveReads: new Map(),
      transitiveWrites: new Map(),
    });
    const sameName = declsByName.get(decl.name) ?? [];
    sameName.push(decl);
    declsByName.set(decl.name, sameName);
  }

  // 2. Seed transitive sets with each fn's own declared labels.
  for (const rec of records.values()) {
    for (const label of rec.declaredReads) {
      rec.transitiveReads.set(label, { kind: "declared", fnName: rec.decl.name, label });
    }
    for (const label of rec.declaredWrites) {
      rec.transitiveWrites.set(label, { kind: "declared", fnName: rec.decl.name, label });
    }
  }

  // 3. Fixed-point closure: propagate callees' transitive sets back to callers.
  //    Same-file callees are resolved via `records`; external callees via the
  //    `extReads` / `extWrites` maps seeded from `moduleEffects`.
  let changed = true;
  while (changed) {
    changed = false;
    for (const rec of records.values()) {
      for (const calleeName of rec.callees) {
        // Same-file callee.
        const calleeDecls = declsByName.get(calleeName);
        if (calleeDecls) {
          for (const calleeDecl of calleeDecls) {
            if (calleeDecl === rec.decl) continue;
            const callee = records.get(calleeDecl);
            if (!callee) continue;
            for (const [label, path] of callee.transitiveReads) {
              if (rec.transitiveReads.has(label)) continue;
              rec.transitiveReads.set(label, {
                kind: "via",
                fnName: rec.decl.name,
                callee: calleeName,
                next: path,
              });
              changed = true;
            }
            for (const [label, path] of callee.transitiveWrites) {
              if (rec.transitiveWrites.has(label)) continue;
              rec.transitiveWrites.set(label, {
                kind: "via",
                fnName: rec.decl.name,
                callee: calleeName,
                next: path,
              });
              changed = true;
            }
          }
          continue;
        }

        // External callee from moduleEffects. Resolve import aliases first:
        // `import { fetchRow as fetchUser }` means calleeName="fetchUser"
        // should look up "fetchRow" in extReads/extWrites.
        const resolvedCallee = importAliases.get(calleeName) ?? calleeName;
        const extR = extReads.get(resolvedCallee);
        if (extR) {
          for (const label of extR) {
            if (rec.transitiveReads.has(label)) continue;
            rec.transitiveReads.set(label, {
              kind: "via",
              fnName: rec.decl.name,
              callee: calleeName,
              // Report the call-site name the source actually uses (the alias),
              // not the resolved declared name, so the call path is accurate.
              next: { kind: "declared", fnName: calleeName, label },
            });
            changed = true;
          }
        }
        const extW = extWrites.get(resolvedCallee);
        if (extW) {
          for (const label of extW) {
            if (rec.transitiveWrites.has(label)) continue;
            rec.transitiveWrites.set(label, {
              kind: "via",
              fnName: rec.decl.name,
              callee: calleeName,
              // Report the call-site name the source actually uses (the alias),
              // not the resolved declared name, so the call path is accurate.
              next: { kind: "declared", fnName: calleeName, label },
            });
            changed = true;
          }
        }
      }
    }
  }

  // 4. Validate: for each fn, declared reads/writes must cover transitive sets.
  //    Self-only fns are trivially consistent because step 2 seeds the
  //    transitive set from the same `declaredReads` / `declaredWrites` sets
  //    that step 4 then checks against — no explicit skip needed.
  for (const rec of records.values()) {
    // DEP001: reads under-declared.
    const missingReads = [...rec.transitiveReads.keys()]
      .filter((l) => !rec.declaredReads.has(l))
      .sort();
    if (missingReads.length > 0) {
      throw mkError(src, rec, "reads", missingReads, rec.transitiveReads);
    }
    // DEP002: writes under-declared.
    const missingWrites = [...rec.transitiveWrites.keys()]
      .filter((l) => !rec.declaredWrites.has(l))
      .sort();
    if (missingWrites.length > 0) {
      throw mkError(src, rec, "writes", missingWrites, rec.transitiveWrites);
    }
  }

  // 5. DEP003/DEP004: over-declared (warning-level).
  //    For each fn that has at least one same-file (or moduleEffects) callee,
  //    compute which declared reads/writes labels are not justified by any callee.
  //    Leaf fns (no tracked callees) are excluded — they may be the actual
  //    access point and the compiler can't verify the body directly.
  //    The primary target is stale annotations left after a refactor removed the
  //    callee that originally justified the label.
  const warnings: Diagnostic[] = [];
  for (const rec of records.values()) {
    if (rec.callees.size === 0) continue;

    // Collect labels that propagate from callees (excluding this fn's own declaration).
    const calleeReads = new Set<string>();
    const calleeWrites = new Set<string>();
    for (const calleeName of rec.callees) {
      const calleeDecls = declsByName.get(calleeName);
      if (calleeDecls) {
        for (const calleeDecl of calleeDecls) {
          if (calleeDecl === rec.decl) continue;
          const callee = records.get(calleeDecl);
          if (!callee) continue;
          for (const label of callee.transitiveReads.keys()) calleeReads.add(label);
          for (const label of callee.transitiveWrites.keys()) calleeWrites.add(label);
        }
        continue;
      }
      const resolvedCallee = importAliases.get(calleeName) ?? calleeName;
      const extR = extReads.get(resolvedCallee);
      if (extR) for (const label of extR) calleeReads.add(label);
      const extW = extWrites.get(resolvedCallee);
      if (extW) for (const label of extW) calleeWrites.add(label);
    }

    const overDeclaredReads = [...rec.declaredReads].filter(l => !calleeReads.has(l)).sort();
    if (overDeclaredReads.length > 0) {
      warnings.push(mkOverDeclaredWarning(src, rec, "reads", overDeclaredReads));
    }
    const overDeclaredWrites = [...rec.declaredWrites].filter(l => !calleeWrites.has(l)).sort();
    if (overDeclaredWrites.length > 0) {
      warnings.push(mkOverDeclaredWarning(src, rec, "writes", overDeclaredWrites));
    }
  }

  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPath(path: DepPath): string {
  const segments: string[] = [];
  let cur: DepPath = path;
  while (cur.kind === "via") {
    segments.push(cur.fnName);
    cur = cur.next;
  }
  segments.push(cur.fnName);
  return segments.join(" -> ");
}

function mkError(
  src: string,
  rec: FnRecord,
  kind: "reads" | "writes",
  missingLabels: string[],
  transitiveMap: Map<string, DepPath>,
): BotscriptError {
  const code = kind === "reads" ? "DEP001" : "DEP002";
  const entry = getErrorCode(code)!;
  const { line, column } = locationOf(src, rec.decl.fnKeywordStart);

  const firstLabel = missingLabels[0]!;
  const firstPath = transitiveMap.get(firstLabel)!;
  const pathStr = formatPath(firstPath);
  const leaf = pathStr.split(" -> ").at(-1);

  const directCall =
    firstPath.kind === "via" && firstPath.next.kind === "declared";
  const transitively = directCall ? "" : " transitively";

  const displayPath =
    !directCall && firstPath.kind === "via"
      ? formatPath(firstPath.next)
      : pathStr;

  const currentDecl =
    kind === "reads"
      ? rec.declaredReads.size === 0
        ? "(none)"
        : [...rec.declaredReads].join(", ")
      : rec.declaredWrites.size === 0
        ? "(none)"
        : [...rec.declaredWrites].join(", ");

  const proposed =
    kind === "reads"
      ? [...new Set([...rec.declaredReads, ...missingLabels])].sort().join(", ")
      : [...new Set([...rec.declaredWrites, ...missingLabels])].sort().join(", ");

  const otherMissing = missingLabels.slice(1);
  const otherTail =
    otherMissing.length > 0
      ? `; also missing: ${otherMissing.map((l) => `"${l}"`).join(", ")}`
      : "";

  const callDescription = directCall
    ? `'${leaf}' which ${kind} { ${firstLabel} }`
    : `${displayPath} — '${leaf}' ${kind} { ${firstLabel} }`;

  const message =
    `fn '${rec.decl.name}'${transitively} calls ${callDescription}, ` +
    `but '${rec.decl.name}' only declares ${kind} { ${currentDecl} }${otherTail}`;

  const callPath = `call path: ${pathStr}`;

  const nameEnd = rec.decl.nameStart + rec.decl.name.length;

  const diagnostic = {
    code,
    severity: "error" as const,
    file: null,
    line,
    column,
    start: rec.decl.fnKeywordStart,
    end: nameEnd,
    message,
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite: `fn ${rec.decl.name}(...) ${kind} { ${proposed} } -> ...  // ${callPath}`,
  };

  return new BotscriptError([diagnostic]);
}

function mkOverDeclaredWarning(
  src: string,
  rec: FnRecord,
  kind: "reads" | "writes",
  overLabels: string[],
): Diagnostic {
  const code = kind === "reads" ? "DEP003" : "DEP004";
  const entry = getErrorCode(code)!;
  const { line, column } = locationOf(src, rec.decl.fnKeywordStart);
  const nameEnd = rec.decl.nameStart + rec.decl.name.length;

  const labelList = overLabels.join(", ");
  const firstLabel = overLabels[0]!;

  const message =
    `fn '${rec.decl.name}' declares ${kind} { ${labelList} } ` +
    `but no callee in this file transitively declares ${kind} { ${firstLabel} }; ` +
    `annotation may be stale`;

  const proposed =
    kind === "reads"
      ? [...rec.declaredReads].filter((l) => !overLabels.includes(l)).sort()
      : [...rec.declaredWrites].filter((l) => !overLabels.includes(l)).sort();

  return {
    code,
    severity: "warning",
    file: null,
    line,
    column,
    start: rec.decl.fnKeywordStart,
    end: nameEnd,
    message,
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite:
      proposed.length > 0
        ? `fn ${rec.decl.name}(...) ${kind} { ${proposed.join(", ")} } -> ...  // remove stale label: ${labelList}`
        : `fn ${rec.decl.name}(...) -> ...  // remove stale ${kind} {} clause: ${labelList}`,
  };
}
