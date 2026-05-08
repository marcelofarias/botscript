/**
 * Static capability check.
 *
 *   ?bs 0.2  Direct check only — every fn must declare the capability for any
 *            stdlib namespace it directly references. Aliasing, transitive
 *            propagation, and over-declaration are NOT enforced. (Behaviour
 *            shipped in 0.2 must not change in place — see AGENTS.md rule 4.)
 *
 *   ?bs 0.3  Full inference — direct refs PLUS transitive call-graph
 *            propagation across fns in the same file. Two errors:
 *
 *              CAP001  inferred ⊄ declared (under-declared). The diagnostic
 *                      names the call path: `f -> g -> http.get`.
 *              CAP002  declared ⊄ inferred (over-declared). Declaration names
 *                      a capability nothing in the body reaches.
 *
 *            Inner `fn` declarations are excluded from the parent's body scan.
 *            Aliasing of stdlib namespaces (`const t = time`) is still not
 *            tracked — the rule remains "the canonical names are tripwires".
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { lex, type Token } from "../parser/lex.js";
import { parseFn, type FnDecl } from "../parser/parse-fn.js";
import type { VersionInfo } from "./version.js";

/** stdlib namespace -> capability it consumes. */
const STDLIB_TO_CAP: Readonly<Record<string, string>> = {
  http: "net",
  time: "time",
  random: "random",
  fs: "fs",
  stdout: "stdout",
  stderr: "stderr",
};

/**
 * Subclass of BotscriptError so callers can `instanceof` against the specific
 * cap-check failure if they want to. The `diagnostics` array always has length 1.
 */
export class CapabilityCheckError extends BotscriptError {
  readonly fnName: string;
  readonly capability: string;
  readonly namespace: string;
  readonly line: number;
  readonly column: number;

  constructor(diagnostic: Diagnostic, fnName: string, capability: string, namespace: string) {
    super([diagnostic]);
    this.name = "CapabilityCheckError";
    this.fnName = fnName;
    this.capability = capability;
    this.namespace = namespace;
    this.line = diagnostic.line;
    this.column = diagnostic.column;
  }
}

/**
 * One direct stdlib usage inside a fn body. We keep one per (cap, namespace)
 * pair so the diagnostic can point at the actual offending source location.
 */
interface DirectUse {
  capability: string;
  namespace: string;
  member: string;
  line: number;
  column: number;
}

/**
 * The transitive path of how a capability arrived in a fn — either a direct
 * stdlib reference inside the fn itself, or a call to a callee that
 * (recursively) consumes it.
 */
type Path =
  | { kind: "direct"; fnName: string; use: DirectUse }
  | { kind: "via"; fnName: string; callee: string; next: Path };

interface FnRecord {
  decl: FnDecl;
  declared: Set<string>;
  /** First direct use seen for each capability. */
  direct: Map<string, DirectUse>;
  /** Names of fns called inside the body, excluding inner fn decls. */
  callees: Set<string>;
  /** Transitive consumed set, computed by closure. cap -> example path. */
  consumed: Map<string, Path>;
}

export function passCapCheck(src: string, version: VersionInfo): string {
  if (atLeast(version.resolved, "0.3")) return checkStrict(src);
  return checkDirect(src);
}

function atLeast(actual: string, min: string): boolean {
  const a = actual.split(".").map(Number);
  const m = min.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, m.length); i++) {
    const av = a[i] ?? 0;
    const mv = m[i] ?? 0;
    if (av > mv) return true;
    if (av < mv) return false;
  }
  return true;
}

/**
 * 0.2 behavior: scan each fn's own body for direct stdlib refs whose
 * capability isn't declared. No transitive propagation, no over-declaration.
 * Preserved verbatim from the 0.2 release; do not modify.
 */
function checkDirect(src: string): string {
  const tokens = lex(src);
  const fns: FnDecl[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "fn") continue;
    const decl = parseFn(tokens, i);
    if (decl) fns.push(decl);
  }
  for (const fn of fns) {
    const inner = fns.filter((g) => g !== fn && g.start >= fn.start && g.end <= fn.end);
    checkDirectFn(src, tokens, fn, inner);
  }
  return src;
}

function checkDirectFn(src: string, tokens: Token[], fn: FnDecl, inner: FnDecl[]): void {
  const declared = new Set(fn.capabilities);
  for (let i = fn.start; i < fn.end; i++) {
    if (insideAny(i, inner)) continue;
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    const cap = STDLIB_TO_CAP[tok.text];
    if (!cap) continue;
    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];
    if (next?.kind !== "punct" || next.text !== ".") continue;
    if (declared.has(cap)) continue;
    const { line, column } = locationOf(src, tok.start);
    const granted = fn.capabilities.length === 0 ? "(none — pure scope)" : fn.capabilities.join(", ");
    const proposed = [...fn.capabilities, cap].join(", ");
    const memberName = nextIdent(tokens, nextIdx) ?? "…";
    const diagnostic: Diagnostic = {
      code: "CAP001",
      severity: "error",
      file: null,
      line,
      column,
      message: `fn '${fn.name}' calls '${tok.text}.${memberName}' which requires capability '${cap}', but uses clause is { ${granted} }`,
      rule: `a function declared 'uses { ${granted} }' may not call '${tok.text}.…' which requires capability '${cap}'`,
      idiom: `declare every capability the function consumes; pure helpers stay pure`,
      rewrite: `fn ${fn.name}(...) uses { ${proposed} } -> ...`,
    };
    throw new CapabilityCheckError(diagnostic, fn.name, cap, tok.text);
  }
}

/**
 * 0.3 behavior: full inference + over-declaration check.
 */
function checkStrict(src: string): string {
  const tokens = lex(src);

  // 1. Parse every fn declaration in the module.
  const decls: FnDecl[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "fn") continue;
    const decl = parseFn(tokens, i);
    if (decl) decls.push(decl);
  }

  // 2. Build per-fn records: direct stdlib uses + intra-module callees.
  const records = new Map<string, FnRecord>();
  for (const decl of decls) {
    const inner = decls.filter((g) => g !== decl && g.start >= decl.start && g.end <= decl.end);
    const { direct, callNames } = scanBody(src, tokens, decl, inner, decls);
    records.set(decl.name, {
      decl,
      declared: new Set(decl.capabilities),
      direct,
      callees: callNames,
      consumed: new Map(),
    });
  }

  // 3. Seed `consumed` with each fn's direct uses.
  for (const rec of records.values()) {
    for (const use of rec.direct.values()) {
      rec.consumed.set(use.capability, { kind: "direct", fnName: rec.decl.name, use });
    }
  }

  // 4. Closure: propagate callees' consumed caps back to callers until fixed point.
  let changed = true;
  while (changed) {
    changed = false;
    for (const rec of records.values()) {
      for (const calleeName of rec.callees) {
        const callee = records.get(calleeName);
        if (!callee) continue;
        for (const [cap, path] of callee.consumed) {
          if (rec.consumed.has(cap)) continue;
          rec.consumed.set(cap, {
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

  // 5. Validate: under-declaration first (CAP001), then over-declaration (CAP002).
  for (const rec of records.values()) {
    const missing = [...rec.consumed.keys()].filter((c) => !rec.declared.has(c));
    if (missing.length > 0) {
      throw mkUnderDeclaredError(src, rec, missing);
    }
  }
  for (const rec of records.values()) {
    const extra = [...rec.declared].filter((c) => !rec.consumed.has(c));
    if (extra.length > 0) {
      throw mkOverDeclaredError(src, rec, extra);
    }
  }

  return src;
}

/**
 * Scan a fn body for direct stdlib uses and intra-module callees.
 *
 * `decls` is the module-level fn list; we use it to recognize which `name(`
 * calls reach a fn defined in the same file.
 */
function scanBody(
  src: string,
  tokens: Token[],
  fn: FnDecl,
  inner: FnDecl[],
  decls: FnDecl[],
): { direct: Map<string, DirectUse>; callNames: Set<string> } {
  const direct = new Map<string, DirectUse>();
  const callNames = new Set<string>();
  const fnNames = new Set(decls.map((d) => d.name));

  for (let i = fn.start; i < fn.end; i++) {
    if (insideAny(i, inner)) continue;
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;

    const nextIdx = nextSignificant(tokens, i + 1);
    const next = tokens[nextIdx];

    // (a) direct stdlib usage: `<stdlibName>.<member>`
    const cap = STDLIB_TO_CAP[tok.text];
    if (cap && next?.kind === "punct" && next.text === ".") {
      if (!direct.has(cap)) {
        const memberName = nextIdent(tokens, nextIdx) ?? "…";
        const { line, column } = locationOf(src, tok.start);
        direct.set(cap, {
          capability: cap,
          namespace: tok.text,
          member: memberName,
          line,
          column,
        });
      }
      continue;
    }

    // (b) intra-module callee: `<fnName>(`
    if (
      tok.text !== fn.name &&
      fnNames.has(tok.text) &&
      next?.kind === "open" &&
      next.text === "("
    ) {
      callNames.add(tok.text);
    }
  }

  return { direct, callNames };
}

function mkUnderDeclaredError(src: string, rec: FnRecord, missing: string[]): CapabilityCheckError {
  // Pick a representative cap to anchor the error on. Prefer one that's a
  // direct use (we have a precise location); fall back to the first transitive.
  const directMissing = missing.find((c) => rec.direct.has(c));
  const repCap = directMissing ?? missing[0]!;
  const path = rec.consumed.get(repCap)!;
  const leafUse = leafDirectUse(path);

  const declaredList = rec.decl.capabilities;
  const granted = declaredList.length === 0 ? "(none — pure scope)" : declaredList.join(", ");
  // Proposed declaration: declared ∪ all missing, in stable order.
  const proposed = [...declaredList, ...missing].join(", ");

  const entry = getErrorCode("CAP001")!;
  const isTransitive = path.kind === "via";
  const pathStr = renderPath(path);

  // For a direct usage we anchor the diagnostic at the offending stdlib token
  // (precise). For a transitive usage we anchor at the fn header — that's the
  // declaration the bot has to edit, and the path string says where the
  // requirement actually comes from.
  const headerLoc = fnHeaderLocation(src, rec.decl);
  const line = isTransitive ? headerLoc.line : leafUse.line;
  const column = isTransitive ? headerLoc.column : leafUse.column;

  const tail =
    missing.length > 1
      ? ` (also missing: ${missing.filter((c) => c !== repCap).join(", ")})`
      : "";
  const message = isTransitive
    ? `fn '${rec.decl.name}' transitively consumes capability '${repCap}' via ${pathStr}, but uses clause is { ${granted} }${tail}`
    : `fn '${rec.decl.name}' calls '${leafUse.namespace}.${leafUse.member}' which requires capability '${repCap}', but uses clause is { ${granted} }${tail}`;

  const diagnostic: Diagnostic = {
    code: "CAP001",
    severity: "error",
    file: null,
    line,
    column,
    message,
    rule: `a function declared 'uses { ${granted} }' may not consume capability '${repCap}'${isTransitive ? ` (reached via ${pathStr})` : ` (via '${leafUse.namespace}.…')`}`,
    idiom: entry.idiom,
    rewrite: `fn ${rec.decl.name}(...) uses { ${proposed} } -> ...`,
  };

  return new CapabilityCheckError(diagnostic, rec.decl.name, repCap, leafUse.namespace);
}

function mkOverDeclaredError(src: string, rec: FnRecord, extra: string[]): BotscriptError {
  const headerLoc = fnHeaderLocation(src, rec.decl);
  const remaining = rec.decl.capabilities.filter((c) => !extra.includes(c));
  const remainingStr = remaining.length === 0 ? "" : ` uses { ${remaining.join(", ")} }`;
  const entry = getErrorCode("CAP002")!;

  const message =
    extra.length === 1
      ? `fn '${rec.decl.name}' declares capability '${extra[0]}' but its body never reaches it (no direct stdlib use, no callee consumes it)`
      : `fn '${rec.decl.name}' declares capabilities { ${extra.join(", ")} } but its body never reaches them`;

  const diagnostic: Diagnostic = {
    code: "CAP002",
    severity: "error",
    file: null,
    line: headerLoc.line,
    column: headerLoc.column,
    message,
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite: `fn ${rec.decl.name}(...)${remainingStr} -> ...`,
  };
  return new BotscriptError([diagnostic]);
}

/** Render a Path as a human-readable arrow chain: `f -> g -> http.get`. */
function renderPath(path: Path): string {
  const parts: string[] = [];
  let cur: Path = path;
  while (cur.kind === "via") {
    parts.push(cur.fnName);
    cur = cur.next;
  }
  parts.push(cur.fnName);
  parts.push(`${cur.use.namespace}.${cur.use.member}`);
  return parts.join(" -> ");
}

function leafDirectUse(path: Path): DirectUse {
  let cur: Path = path;
  while (cur.kind === "via") cur = cur.next;
  return cur.use;
}

/** Line/column of the `fn` keyword for a declaration. */
function fnHeaderLocation(src: string, decl: FnDecl): { line: number; column: number } {
  // The declaration start may include a leading `async` keyword; either way,
  // walking forward to the `fn ` literal in the original source gives the
  // header location stably.
  // Decl tokens carry start = the token-array index of the start; we don't
  // have offsets directly, so fall back to scanning from the decl name.
  // Simpler: locate `fn <name>` in `src`. There may be many; rely on the fact
  // that the parser already produced a unique decl per name — we pick the
  // first occurrence by name. Good enough for diagnostics; precise offsets
  // can be threaded later if needed.
  const re = new RegExp(`\\bfn\\s+${escapeRegex(decl.name)}\\b`);
  const match = re.exec(src);
  if (!match) return { line: 1, column: 1 };
  return locationOf(src, match.index);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function insideAny(idx: number, ranges: FnDecl[]): boolean {
  for (const r of ranges) {
    if (idx >= r.start && idx < r.end) return true;
  }
  return false;
}

function nextSignificant(tokens: Token[], from: number): number {
  let i = from;
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

function nextIdent(tokens: Token[], dotIdx: number): string | null {
  const j = nextSignificant(tokens, dotIdx + 1);
  const t = tokens[j];
  return t && t.kind === "ident" ? t.text : null;
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
