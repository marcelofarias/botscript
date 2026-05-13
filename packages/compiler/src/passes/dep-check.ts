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
 *           reads a resource category that A does not declare. Diagnostic
 *           names the call path: "A -> B -> C [reads { x }]".
 *
 *   DEP002  writes under-declared: same for writes { ... }.
 *
 * Only same-file call resolution is performed (same as cap-check). External
 * calls, dynamic dispatch, and higher-order function arguments are not
 * tracked — the rule is "the declaration is the authority; transitive static
 * calls must be covered."
 *
 * Over-declaration is intentionally NOT checked here. The reads/writes labels
 * are user-defined strings; unlike stdlib capability names, the compiler has
 * no way to verify that a declared label is actually accessed in the body.
 * Over-declaration is therefore always allowed (conservative declarations are
 * harmless and may even be intentional for documentation purposes).
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import type { Token } from "../parser/lex.js";
import { atLeast, type VersionInfo } from "./version.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The transitive path through which a resource dependency arrived in a fn —
 * always via a callee chain (there is no "direct" inference from the body,
 * unlike capability check).
 */
type DepPath =
  | { kind: "declared"; fnName: string; label: string }
  | { kind: "via"; fnName: string; callee: string; next: DepPath };

interface FnRecord {
  decl: FnDecl;
  /** Labels declared on the fn's own `reads {}` clause. */
  declaredReads: Set<string>;
  /** Labels declared on the fn's own `writes {}` clause. */
  declaredWrites: Set<string>;
  /** Names of fns called in the body (same-file, excluding inner decls). */
  callees: Set<string>;
  /** Transitive reads set: label -> example path. Populated by closure. */
  transitiveReads: Map<string, DepPath>;
  /** Transitive writes set: label -> example path. Populated by closure. */
  transitiveWrites: Map<string, DepPath>;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function passDepCheck(src: string, version: VersionInfo): string {
  if (!atLeast(version.resolved, "0.9")) return src;

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const decls = program.fns.map((s) => s.decl);

  if (decls.length === 0) return src;

  // 1. Build per-fn records.
  const records = new Map<FnDecl, FnRecord>();
  const declsByName = new Map<string, FnDecl[]>();
  const fnNames = new Set(decls.map((d) => d.name));

  for (const decl of decls) {
    const inner = decls.filter(
      (g) => g !== decl && g.tokenStart >= decl.tokenStart && g.tokenEnd <= decl.tokenEnd,
    );
    const callees = collectCallees(tokens, decl, inner, fnNames);
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
      }
    }
  }

  // 4. Validate: for each fn, declared reads/writes must cover transitive sets.
  //    Self-only fns are trivially consistent because step 2 seeds the
  //    transitive set from the same `declaredReads` / `declaredWrites` sets
  //    that step 4 then checks against — no explicit skip needed.
  for (const rec of records.values()) {
    // DEP001: reads under-declared.
    const missingReads = [...rec.transitiveReads.keys()].filter(
      (l) => !rec.declaredReads.has(l),
    );
    if (missingReads.length > 0) {
      throw mkError(src, rec, "reads", missingReads, rec.transitiveReads);
    }

    // DEP002: writes under-declared.
    const missingWrites = [...rec.transitiveWrites.keys()].filter(
      (l) => !rec.declaredWrites.has(l),
    );
    if (missingWrites.length > 0) {
      throw mkError(src, rec, "writes", missingWrites, rec.transitiveWrites);
    }
  }

  return src;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Collect the names of same-file fns called inside `fn`'s body, excluding
 * any tokens inside inner (nested) fn declarations.
 */
function collectCallees(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
  fnNames: Set<string>,
): Set<string> {
  const callees = new Set<string>();
  for (let i = fn.tokenStart; i < fn.tokenEnd; i++) {
    if (insideAny(i, inner)) continue;
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    if (!fnNames.has(tok.text)) continue;
    if (tok.text === fn.name) continue; // skip self-references
    // Skip property accesses like `obj.helper(...)` or `obj?.helper(...)` —
    // these are not same-file fn calls even if `helper` matches a top-level
    // fn name. Mirrors cap-check's member-access guard.
    const prevIdx = prevSignificant(tokens, i - 1);
    const prev = tokens[prevIdx];
    if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot")) continue;
    // Must be followed by `(` to be a call (not just a reference).
    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];
    if (!next || next.kind !== "open" || next.text !== "(") continue;
    callees.add(tok.text);
  }
  return callees;
}

function insideAny(idx: number, inner: FnDecl[]): boolean {
  return inner.some((g) => idx >= g.tokenStart && idx < g.tokenEnd);
}

function nextSignificant(tokens: Token[], start: number): number {
  let i = start;
  while (i < tokens.length) {
    const t = tokens[i];
    if (!t) return i;
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

function prevSignificant(tokens: Token[], start: number): number {
  let i = start;
  while (i >= 0) {
    const t = tokens[i];
    if (!t) return i;
    if (
      t.kind === "whitespace" ||
      t.kind === "newline" ||
      t.kind === "lineComment" ||
      t.kind === "blockComment"
    ) {
      i--;
      continue;
    }
    return i;
  }
  return i;
}

/** Format a DepPath as a human-readable call chain for diagnostic messages. */
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

  // Build a description of the first missing label and its path.
  const firstLabel = missingLabels[0]!;
  const firstPath = transitiveMap.get(firstLabel)!;
  const pathStr = formatPath(firstPath);
  const leaf = pathStr.split(" -> ").at(-1)!;
  const transitively = firstPath.kind === "via" ? " transitively" : "";

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
      ? [...new Set([...rec.declaredReads, ...missingLabels])].join(", ")
      : [...new Set([...rec.declaredWrites, ...missingLabels])].join(", ");

  const otherMissing = missingLabels.slice(1);
  const otherTail =
    otherMissing.length > 0
      ? `; also missing: ${otherMissing.map((l) => `"${l}"`).join(", ")}`
      : "";

  // For via-paths, name the call chain in the main message so the caller
  // sees that the dependency arrives through a callee, not from a direct call.
  const callDescription =
    firstPath.kind === "via"
      ? `${pathStr} — '${leaf}' ${kind} { ${firstLabel} }`
      : `'${leaf}' which ${kind} { ${firstLabel} }`;

  const message =
    `fn '${rec.decl.name}'${transitively} calls ${callDescription}, ` +
    `but '${rec.decl.name}' only declares ${kind} { ${currentDecl} }${otherTail}`;

  const callPath =
    firstPath.kind === "via"
      ? `call path: ${pathStr}`
      : `directly declared on '${rec.decl.name}'`;

  // Anchor the diagnostic span through the fn name (not just the `fn`
  // keyword) for better editor / LSP highlighting — mirrors cap-check.
  const nameEnd = rec.decl.nameStart + rec.decl.name.length;
  const diagnostic: Diagnostic = {
    code,
    severity: "error",
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

function locationOf(src: string, offset: number): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let k = 0; k < offset && k < src.length; k++) {
    if (src[k] === "\n") {
      line++;
      lineStart = k + 1;
    }
  }
  return { line, column: offset - lineStart + 1 };
}
