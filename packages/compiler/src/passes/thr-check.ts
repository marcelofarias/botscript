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
 * Only same-file call resolution is performed for THR001 (same as cap-check /
 * dep-check). Over-declaration is intentionally NOT checked — a caller may
 * conservatively declare more exception types than it strictly needs.
 */

import { BotscriptError } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import type { FnDecl } from "../parser/parse-fn.js";
import { atLeast, type VersionInfo } from "./version.js";
import { locationOf } from "./_location.js";
import type { Token } from "../parser/lex.js";
import { computeNesting, collectCallees, nextSignificant, prevSignificant } from "./_callgraph.js";

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

  // THR001: declared throws must cover transitive throws.
  for (const rec of records.values()) {
    const missing = [...rec.transitiveThrows.keys()]
      .filter((l) => !rec.declaredThrows.has(l))
      .sort();
    if (missing.length > 0) {
      throw mkThr001Error(src, rec, missing);
    }
  }

  // THR002: fn body must not directly construct undeclared error types.
  for (const rec of records.values()) {
    const inner = innerByDecl.get(rec.decl) ?? [];
    const err = checkBodyErrors(tokens, rec.decl, inner, rec.declaredThrows, src);
    if (err) throw err;
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

  const currentDeclStr =
    rec.declaredThrows.size === 0
      ? "no throws clause"
      : `throws { ${[...rec.declaredThrows].sort().join(", ")} }`;

  const proposed = [...new Set([...rec.declaredThrows, ...missingLabels])].sort().join(", ");

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
    `but '${rec.decl.name}' declares ${currentDeclStr}${otherTail}`;

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
 * THR002: scan fn body for `err(TypeName(...))`, `err(new TypeName(...))`, or
 * bare `err(TypeName)` where TypeName (CapCase ident) is not in the fn's own
 * `throws {}` set. Returns a BotscriptError on the first violation found, or null.
 */
function checkBodyErrors(
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
  declaredThrows: Set<string>,
  src: string,
): BotscriptError | null {
  const entry = getErrorCode("THR002")!;

  // Cursor-based inner-fn exclusion.
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

    // Already declared — fine.
    if (declaredThrows.has(typeName)) continue;

    const { line, column } = locationOf(src, tok.start);
    const currentDeclStr =
      declaredThrows.size === 0
        ? "no throws clause"
        : `throws { ${[...declaredThrows].sort().join(", ")} }`;
    const proposed = [...new Set([...declaredThrows, typeName])].sort().join(", ");

    return new BotscriptError([{
      code: "THR002",
      severity: "error" as const,
      file: null,
      line,
      column,
      start: tok.start,
      end: tok.end,
      message:
        `fn '${fn.name}' constructs err(${typeName}...) but '${typeName}' ` +
        `is not in ${currentDeclStr}`,
      rule: entry.rule,
      idiom: entry.idiom,
      rewrite: `fn ${fn.name}(...) throws { ${proposed} } -> ...`,
    }]);
  }

  return null;
}
