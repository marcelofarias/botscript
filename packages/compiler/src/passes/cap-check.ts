/**
 * Static capability check (botscript 0.2+).
 *
 * The runtime `$enter`/`$require` pair catches capability violations only when
 * the offending branch executes. That's the wrong moment for a bot — a test
 * passes locally, prod throws on a code path the bot never exercised.
 *
 * This pass walks every `fn` declaration and rejects any direct reference to a
 * capability-checked stdlib namespace (`http`, `time`, `random`, `fs`,
 * `stdout`, `stderr`) when the enclosing fn does not declare the matching
 * capability in its `uses { ... }` clause. Inner fn bodies are excluded — a
 * `pure` outer that *defines* an `uses { net }` inner is still pure as long
 * as it doesn't itself touch the network.
 *
 * Limits, deliberate:
 *  - We don't (yet) propagate capabilities through fn-to-fn calls inside the
 *    same module. A `pure` caller of an `uses { net }` callee compiles; the
 *    runtime still catches the violation. Static call-graph propagation is a
 *    follow-up.
 *  - We only flag *direct* references to the stdlib names. Aliasing
 *    (`const t = time`) defeats the check; that's by design — the rule is
 *    "the canonical names are tripwires", not "we tracked your variable".
 *  - `process` is not in the map. The runtime tags it but the stdlib has no
 *    wrapped namespace for it; raw `process.argv` is allowed under any uses
 *    clause that lists `process`.
 */

import { BotscriptError, type Diagnostic } from "../diagnostics.js";
import { lex, type Token } from "../parser/lex.js";
import { parseFn, type FnDecl } from "../parser/parse-fn.js";

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

export function passCapCheck(src: string): string {
  const tokens = lex(src);

  const fns: FnDecl[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t || t.kind !== "keyword" || t.keyword !== "fn") continue;
    const decl = parseFn(tokens, i);
    if (decl) fns.push(decl);
  }

  for (const fn of fns) {
    const inner = fns.filter(
      (g) => g !== fn && g.start >= fn.start && g.end <= fn.end,
    );
    checkFn(src, tokens, fn, inner);
  }

  return src;
}

function checkFn(src: string, tokens: Token[], fn: FnDecl, inner: FnDecl[]): void {
  const declared = new Set(fn.capabilities);

  for (let i = fn.start; i < fn.end; i++) {
    if (insideAny(i, inner)) continue;
    const tok = tokens[i];
    if (!tok || tok.kind !== "ident") continue;
    const cap = STDLIB_TO_CAP[tok.text];
    if (!cap) continue;

    // Must be followed by `.` to count as a stdlib member access.
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
