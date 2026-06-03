/**
 * Throws declaration check (?bs 0.9+).
 *
 * Enforces transitivity of `throws { ... }` annotations across same-file
 * function calls, and checks that a fn's body does not directly construct
 * error types absent from its own `throws {}` declaration.
 *
 *   THR001  throws under-declared: fn A calls fn B which (transitively)
 *           declares `throws { X }` that A does not declare. For a direct
 *           call the diagnostic says "'B' which throws { X }"; for a multi-hop
 *           chain it names the path, e.g. "B -> C — 'C' throws { X }".
 *
 *   THR002  undeclared error construction: fn body contains `err(TypeName(...))`,
 *           `err(new TypeName(...))`, or bare `err(TypeName)` where TypeName
 *           (CapCase ident) is not in the fn's own `throws {}` set. Catches the
 *           case where a fn returns an error type it never declared, leaving
 *           callers' exhaustive match arms permanently dead. Indirect patterns
 *           (`err(e)` where e's type is inferred) are out of scope — token-based
 *           detection only.
 *
 *   THR004  throws over-declared: fn declares `throws { X }` but no same-file
 *           callee (direct or transitive) throws X, the fn's body does not
 *           construct `err(X...)` directly, and no callback param declares
 *           `throws { X }`. Warning-level (?bs 0.9), gated to fns with at
 *           least one non-self callee. Suppressed when the fn has untracked
 *           external calls (opaque callees whose effects are unknown).
 *
 * Same-file call resolution is performed by default. Cross-file calls extend
 * THR001/THR004 transitivity when a `moduleEffects` map is provided via
 * `TransformOptions.moduleEffects`.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { atLeast, type VersionInfo } from "./version.js";
import { locationOf } from "./_location.js";
import type { Token } from "../parser/lex.js";
import { computeNesting, collectCallees, hasOpaqueCall, nextSignificant, prevSignificant } from "./_callgraph.js";
import { buildImportAliasMap, type ModuleEffects } from "../module-effects.js";

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

export function passThrCheck(
  src: string,
  version: VersionInfo,
  moduleEffects?: ModuleEffects,
): { code: string; warnings: ReadonlyArray<Diagnostic> } {
  if (!atLeast(version.resolved, "0.9")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const decls = program.fns.map((s) => s.decl);

  if (decls.length === 0) return { code: src, warnings: [] };

  // Resolve import aliases: `import { fetchRow as fetchUser }` means a call
  // to `fetchUser` should look up `fetchRow` in moduleEffects.
  const importAliases = moduleEffects ? buildImportAliasMap(tokens) : new Map<string, string>();

  // Build map for external (cross-file) throws declarations.
  const extThrows = new Map<string, Set<string>>();
  if (moduleEffects) {
    for (const [name, eff] of Object.entries(moduleEffects)) {
      if (eff.throws?.length) extThrows.set(name, new Set(eff.throws));
    }
  }

  const records = new Map<FnDecl, FnRecord>();
  const declsByName = new Map<string, FnDecl[]>();
  const fnNames = new Set(decls.map((d) => d.name));

  // All fns listed in moduleEffects (with or without throws) are "known" externals.
  const knownExternalNames = new Set<string>(
    moduleEffects ? Object.keys(moduleEffects) : [],
  );

  const aliasedLocalNames = new Set(importAliases.keys());
  const allCalleeNames =
    knownExternalNames.size > 0 || aliasedLocalNames.size > 0
      ? new Set([...fnNames, ...knownExternalNames, ...aliasedLocalNames])
      : fnNames;

  const innerByDecl = computeNesting(decls);

  for (const decl of decls) {
    const inner = innerByDecl.get(decl) ?? [];
    const callees = collectCallees(tokens, decl, inner, allCalleeNames);
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

  // Fixed-point closure. Same-file callees via `records`; external callees
  // via `extThrows` from `moduleEffects`.
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
          continue;
        }

        // External callee from moduleEffects. Resolve import aliases first:
        // `import { fetchRow as fetchUser }` means calleeName="fetchUser"
        // should look up "fetchRow" in extThrows.
        const resolvedCallee = importAliases.get(calleeName) ?? calleeName;
        const extT = extThrows.get(resolvedCallee);
        if (extT) {
          for (const label of extT) {
            if (rec.transitiveThrows.has(label)) continue;
            rec.transitiveThrows.set(label, {
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

  // THR001: declared throws must cover transitive throws.
  for (const rec of records.values()) {
    const missing = [...rec.transitiveThrows.keys()]
      .filter((l) => !rec.declaredThrows.has(l))
      .sort();
    if (missing.length > 0) {
      throw mkThr001Error(src, rec, missing);
    }
  }

  // Pre-compute body error types for all fns once; shared by THR002 and THR004
  // to avoid running the same token scan twice per function.
  const bodyErrsByDecl = new Map<FnDecl, Map<string, { start: number; end: number }>>();
  for (const rec of records.values()) {
    bodyErrsByDecl.set(rec.decl, collectBodyErrorTypes(tokens, rec.decl, innerByDecl.get(rec.decl) ?? []));
  }

  // THR002: fn body must not directly construct undeclared error types.
  for (const rec of records.values()) {
    const err = checkBodyErrors(rec.decl, rec.declaredThrows, src, bodyErrsByDecl.get(rec.decl)!);
    if (err) throw err;
  }

  // THR004: over-declared throws — a declared label is not justified by any
  // callee (transitively) or by a direct err(X...) construction in the body.
  const warnings: Diagnostic[] = [];
  for (const rec of records.values()) {
    if (rec.callees.size === 0) continue;

    // Justified by: paramThrows + direct body construction + transitive callee throws.
    const justifiedThrows = new Set<string>(rec.decl.paramThrows);
    for (const t of bodyErrsByDecl.get(rec.decl)!.keys()) justifiedThrows.add(t);

    let hasNonSelfCallee = false;
    for (const calleeName of rec.callees) {
      const calleeDecls = declsByName.get(calleeName);
      if (calleeDecls) {
        for (const calleeDecl of calleeDecls) {
          if (calleeDecl === rec.decl) continue;
          hasNonSelfCallee = true;
          const callee = records.get(calleeDecl);
          if (!callee) continue;
          for (const label of callee.transitiveThrows.keys()) justifiedThrows.add(label);
        }
        continue;
      }
      const resolvedCallee = importAliases.get(calleeName) ?? calleeName;
      if (!knownExternalNames.has(resolvedCallee)) continue;
      hasNonSelfCallee = true;
      const extT = extThrows.get(resolvedCallee);
      if (extT) for (const label of extT) justifiedThrows.add(label);
    }
    if (!hasNonSelfCallee) continue;

    // Suppress when fn has opaque calls (unlisted external callee).
    // Fn parameter names are excluded from the opaque-call check because their
    // effect surface is already captured by `paramThrows` — calling a typed
    // callback param is not an unknown external call.
    const inner = innerByDecl.get(rec.decl) ?? [];
    const paramNames = collectParamNames(rec.decl);
    const knownForOpaque = paramNames.size > 0
      ? new Set([...allCalleeNames, ...paramNames])
      : allCalleeNames;
    if (hasOpaqueCall(tokens, rec.decl, inner, knownForOpaque)) continue;

    const overDeclared = [...rec.declaredThrows].filter((l) => !justifiedThrows.has(l)).sort();
    if (overDeclared.length > 0) {
      warnings.push(mkThr004Warning(src, rec, overDeclared));
    }
  }

  return { code: src, warnings };
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

function mkThr001Error(src: string, rec: FnRecord, missingLabels: string[]): BotscriptError {
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

  const proposed = [...new Set([...rec.declaredThrows, ...missingLabels])].sort().join(", ");

  const otherMissing = missingLabels.slice(1);
  const otherTail =
    otherMissing.length > 0
      ? `; also missing: ${otherMissing.map((l) => `"${l}"`).join(", ")}`
      : "";

  const callDescription = directCall
    ? `'${leaf}' which throws { ${firstLabel} }`
    : `${displayPath} — '${leaf}' throws { ${firstLabel} }`;

  const declSuffix =
    rec.declaredThrows.size === 0
      ? `has no throws clause`
      : `has throws { ${[...rec.declaredThrows].sort().join(", ")} } but not { ${missingLabels.join(", ")} }`;
  const message =
    `fn '${rec.decl.name}'${transitively} calls ${callDescription}, ` +
    `but '${rec.decl.name}' ${declSuffix}${otherTail}`;

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

/**
 * Collect all CapCase error type names directly constructed in `fn`'s body via
 * `err(TypeName(...))`, `err(new TypeName(...))`, or bare `err(TypeName)`.
 *
 * Returns a Map from type name to the `err` token's start/end position of its
 * first occurrence. Insertion order matches source order, so iteration order
 * preserves left-to-right source position.
 *
 * Used by THR002 (undeclared construction check) and THR004 (over-declared
 * justification) to avoid duplicating the body-scan logic.
 */
function collectBodyErrorTypes(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
): Map<string, { start: number; end: number }> {
  const result = new Map<string, { start: number; end: number }>();
  const open: FnDecl[] = [];
  let nextInner = 0;

  for (let i = fn.bodyTokenStart ?? fn.tokenStart; i < fn.tokenEnd; i++) {
    while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
    while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
      open.push(inner[nextInner]!);
      nextInner++;
    }
    if (open.length > 0) continue;

    const tok = tokens[i];
    // Look for `err` ident — must not be a property access.
    if (!tok || tok.kind !== "ident" || tok.text !== "err") continue;

    const prevIdx = prevSignificant(tokens, i - 1);
    const prev = tokens[prevIdx];
    if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot")) continue;

    // Next must be `(`
    const parenIdx = nextSignificant(tokens, i + 1);
    const parenTok = tokens[parenIdx];
    if (!parenTok || parenTok.kind !== "open" || parenTok.text !== "(") continue;

    // Look at the first argument.
    let argIdx = nextSignificant(tokens, parenIdx + 1);
    let argTok = tokens[argIdx];

    // Handle `err(new TypeName(...))` — skip `new` ident.
    if (argTok && argTok.kind === "ident" && argTok.text === "new") {
      argIdx = nextSignificant(tokens, argIdx + 1);
      argTok = tokens[argIdx];
    }

    if (!argTok || argTok.kind !== "ident") continue;
    const typeName = argTok.text;

    // CapCase: first character is an uppercase letter.
    if (!/^[A-Z]/.test(typeName)) continue;

    // The token after the type name must be `(` (constructor call) or `)` (bare ref).
    const afterIdx = nextSignificant(tokens, argIdx + 1);
    const after = tokens[afterIdx];
    if (!after) continue;
    const isCtor = after.kind === "open" && after.text === "(";
    const isRef = after.kind === "close" && after.text === ")";
    if (!isCtor && !isRef) continue;

    // Record only the first occurrence per type name.
    if (!result.has(typeName)) result.set(typeName, { start: tok.start, end: tok.end });
  }

  return result;
}

/**
 * Returns the set of parameter names for a function, parsed from `FnDecl.args`.
 * Used to exclude callback parameter calls from the opaque-call heuristic in THR004:
 * calling `cb()` where `cb` is a declared parameter is not an unknown external call.
 *
 * Depth-tracks parentheses and braces so names inside nested callback type
 * annotations (e.g. `(name: string) -> void`) and record type literals
 * (e.g. `user: { name: string }`) are not captured.
 */
function collectParamNames(fn: FnDecl): Set<string> {
  const names = new Set<string>();
  const args = fn.args; // verbatim args string, includes outer parens
  let parenDepth = 0;
  let braceDepth = 0;
  let i = 0;
  while (i < args.length) {
    const c = args[i]!;
    if (c === "(") { parenDepth++; i++; continue; }
    if (c === ")") { parenDepth--; i++; continue; }
    if (c === "{") { braceDepth++; i++; continue; }
    if (c === "}") { braceDepth--; i++; continue; }
    // Only capture param names at the top-level param list (parenDepth === 1, braceDepth === 0).
    if (parenDepth !== 1 || braceDepth !== 0) { i++; continue; }
    const m = /^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/.exec(args.slice(i));
    if (m) {
      names.add(m[1]!);
      i += m[0].length;
    } else {
      i++;
    }
  }
  return names;
}

/**
 * Returns true when `typeName` appears as the error type (second parameter)
 * of a `Result<T, E>` return type — in which case THR002 is suppressed, since
 * the error is signaled via the return value and no `throws {}` declaration is needed.
 *
 * Uses structural extraction: splits the E position on top-level `|` and compares
 * each union member's leading identifier exactly, avoiding regex metacharacter
 * issues and false matches on nested generics (e.g. `Wrapper<ParseError>`).
 */
function isErrorTypeInResult(returnType: string, typeName: string): boolean {
  // Match `Result<` or `Result <` (AST may preserve trivia between ident and `<`).
  const m = returnType.match(/\bResult\s*</);
  if (!m || m.index === undefined) return false;
  const idx = m.index;
  // Start scanning from the `<` that opens the generic arguments.
  const openAngle = returnType.indexOf("<", idx + 6);
  let depth = 0;         // angle-bracket depth (tracks Result<…> nesting)
  let braceDepth = 0;   // `{…}` depth — commas inside record types are not separators
  let parenDepth = 0;   // `(…)` depth — commas inside fn types are not separators
  let bracketDepth = 0; // `[…]` depth — commas inside tuple/array literals are not separators
  let firstCommaDepth1 = -1;
  let closingIdx = -1;
  for (let i = openAngle; i < returnType.length; i++) {
    const ch = returnType[i];
    if (ch === "<") depth++;
    else if (ch === ">" && (i === 0 || returnType[i - 1] !== "-")) {
      // Skip `>` that is part of `->` (arrow type syntax, not a generic close).
      depth--;
      if (depth === 0) { closingIdx = i; break; }
    } else if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth--;
    else if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth--;
    else if (ch === "[") bracketDepth++;
    else if (ch === "]") bracketDepth--;
    else if (ch === "," && depth === 1 && braceDepth === 0 && parenDepth === 0 && bracketDepth === 0 && firstCommaDepth1 === -1) {
      firstCommaDepth1 = i;
    }
  }
  if (firstCommaDepth1 === -1 || closingIdx === -1) return false;
  const errorPart = returnType.slice(firstCommaDepth1 + 1, closingIdx).trim();
  // Split on top-level `|` to handle union error types (e.g. `E1 | E2`).
  const members = splitOnTopLevelPipe(errorPart);
  return members.some((m) => leadingIdent(m) === typeName);
}

/** Split `s` on `|` characters that are not inside `<>`, `{}`, `()`, or `[]`. */
function splitOnTopLevelPipe(s: string): string[] {
  const parts: string[] = [];
  let angleDepth = 0;
  let braceDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "<") angleDepth++;
    else if (ch === ">" && (i === 0 || s[i - 1] !== "-")) angleDepth--;
    else if (ch === "{") braceDepth++;
    else if (ch === "}") braceDepth--;
    else if (ch === "(") parenDepth++;
    else if (ch === ")") parenDepth--;
    else if (ch === "[") bracketDepth++;
    else if (ch === "]") bracketDepth--;
    else if (ch === "|" && angleDepth === 0 && braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
      parts.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(s.slice(start).trim());
  return parts;
}

/** Extract the leading identifier from a type expression (stops at `<`, `(`, or whitespace). */
function leadingIdent(type: string): string {
  const m = type.trim().match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
  return m?.[1] ?? "";
}

/**
 * THR002: check pre-computed body error types against the fn's declared throws set.
 * Returns a BotscriptError on the first undeclared construction found, or null.
 */
function checkBodyErrors(
  fn: FnDecl,
  declaredThrows: Set<string>,
  src: string,
  bodyErrs: Map<string, { start: number; end: number }>,
): BotscriptError | null {
  const entry = getErrorCode("THR002")!;

  for (const [typeName, loc] of bodyErrs) {
    if (declaredThrows.has(typeName)) continue;
    // Suppress when the fn returns Result<T, E> and typeName is in E — the error
    // is signaled via the return value, not thrown; no throws declaration needed.
    if (isErrorTypeInResult(fn.returnType, typeName)) continue;

    const { line, column } = locationOf(src, loc.start);
    const proposed = [...new Set([...declaredThrows, typeName])].sort().join(", ");

    return new BotscriptError([{
      code: "THR002",
      severity: "error" as const,
      file: null,
      line,
      column,
      start: loc.start,
      end: loc.end,
      message:
        declaredThrows.size === 0
          ? `fn '${fn.name}' constructs err(${typeName}...) but has no throws clause`
          : `fn '${fn.name}' constructs err(${typeName}...) but '${typeName}' is not declared in throws { ${[...declaredThrows].sort().join(", ")} }`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: `fn ${fn.name}(...) throws { ${proposed} } -> ...`,
    }]);
  }

  return null;
}

function mkThr004Warning(src: string, rec: FnRecord, overLabels: string[]): Diagnostic {
  const entry = getErrorCode("THR004")!;
  const { line, column } = locationOf(src, rec.decl.fnKeywordStart);
  const nameEnd = rec.decl.nameStart + rec.decl.name.length;
  // Show the full declared throws set so the message is accurate even when only
  // a subset of labels are stale (the reader sees what the fn actually declares).
  const declaredList = [...rec.declaredThrows].sort().join(", ");
  const staleList = overLabels.join(", ");
  const notPropagated =
    overLabels.length === 1
      ? `'${overLabels[0]}' is not propagated by any callee or constructed directly`
      : `[${staleList}] are not propagated by any callee or constructed directly`;

  const remaining = [...rec.declaredThrows].filter((l) => !overLabels.includes(l)).sort();
  const rewriteThrows = remaining.length > 0 ? `throws { ${remaining.join(", ")} } ` : "";

  return {
    code: "THR004",
    severity: "warning" as const,
    file: null,
    line,
    column,
    start: rec.decl.fnKeywordStart,
    end: nameEnd,
    message:
      `fn '${rec.decl.name}' declares throws { ${declaredList} } but ${notPropagated}; annotation may be stale`,
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite: `fn ${rec.decl.name}(...) ${rewriteThrows}-> ...  // remove stale label${overLabels.length > 1 ? "s" : ""}: ${staleList}`,
  };
}
