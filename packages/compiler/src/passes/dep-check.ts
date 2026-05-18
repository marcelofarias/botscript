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

import { BotscriptError } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import type { Token } from "../parser/lex.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { atLeast, type VersionInfo } from "./version.js";

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

  // Precompute each fn's nested (descendant) decls once via a single sweep,
  // instead of an O(n²) `decls.filter` per fn. Each `inner` list comes out
  // sorted by `tokenStart`, which `collectCallees` relies on.
  const innerByDecl = computeNesting(decls);

  for (const decl of decls) {
    const inner = innerByDecl.get(decl) ?? [];
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
 * Compute, for every fn decl, the list of decls nested anywhere inside it.
 *
 * A single sweep over `decls` sorted by `tokenStart` replaces a per-fn
 * `decls.filter` (which is O(n²) overall). Fn ranges are properly nested —
 * never partially overlapping — so a stack of "currently open" ancestors is
 * sufficient: every decl is appended to each ancestor still on the stack.
 * Each returned `inner` list is in ascending `tokenStart` order.
 */
function computeNesting(decls: FnDecl[]): Map<FnDecl, FnDecl[]> {
  const inner = new Map<FnDecl, FnDecl[]>();
  for (const d of decls) inner.set(d, []);

  const sorted = [...decls].sort((a, b) => a.tokenStart - b.tokenStart);
  const stack: FnDecl[] = [];

  for (const d of sorted) {
    while (stack.length > 0 && stack[stack.length - 1]!.tokenEnd <= d.tokenStart) {
      stack.pop();
    }
    for (const ancestor of stack) inner.get(ancestor)!.push(d);
    stack.push(d);
  }

  return inner;
}

/**
 * Collect the names of same-file fns called inside `fn`'s body, excluding
 * any tokens inside inner (nested) fn declarations.
 *
 * `inner` must be sorted by `tokenStart` (as produced by `computeNesting`).
 * Containment is tracked with a stack advanced in lockstep with the token
 * cursor, so the scan is O(tokens + innerFns) rather than O(tokens·innerFns).
 */
function collectCallees(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
  fnNames: Set<string>,
): Set<string> {
  const callees = new Set<string>();
  const open: FnDecl[] = [];
  let nextInner = 0;

  for (let i = fn.tokenStart; i < fn.tokenEnd; i++) {
    while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
    while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
      open.push(inner[nextInner]!);
      nextInner++;
    }
    if (open.length > 0) continue;

    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    if (!fnNames.has(tok.text)) continue;
    if (tok.text === fn.name) continue;

    // Skip property accesses: `obj.helper(...)` or `obj?.helper(...)`.
    const prevIdx = prevSignificant(tokens, i - 1);
    const prev = tokens[prevIdx];
    if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
      continue;

    // Must be followed by `(` to be a call.
    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];
    if (!next || next.kind !== "open" || next.text !== "(") continue;

    callees.add(tok.text);
  }

  return callees;
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
      ? [...new Set([...rec.declaredReads, ...missingLabels])].join(", ")
      : [...new Set([...rec.declaredWrites, ...missingLabels])].join(", ");

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
