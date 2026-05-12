import { atLeast, type VersionInfo } from "./version.js";

/**
 * Final pass. Scans the rewritten output for runtime symbols the compiler
 * emits (the `$`-prefixed helpers) and, from `?bs 0.6` onwards, also for the
 * user-facing stdlib names documented in the primer (`ok`, `err`, `Result`,
 * `http`, etc.). When any are found and not already imported, a single
 * import from `@mbfarias/botscript-runtime` is prepended (or merged into
 * the existing one).
 *
 * Pre-0.6 files keep the old behaviour: only `$`-prefixed helpers are
 * auto-imported. User-facing names must be imported explicitly in those
 * files. 0.1–0.5 are SHIPPED — their emitted TS is frozen by the
 * forward-compat rule in AGENTS.md ("Never modify a shipped version's
 * behaviour in place"). The new auto-import lives behind 0.6 so existing
 * pinned files keep producing byte-identical output.
 *
 * Value-vs-type split: stdlib symbols that the runtime exports as types
 * only (`Ok`, `Err`, `Result`, `Some`, `None`, `Option`) are emitted via a
 * dedicated `import type { ... } from "@mbfarias/botscript-runtime";` line.
 * This keeps the output safe under TS `verbatimModuleSyntax` and similar
 * preserve-imports settings — without the split, the emitted value import
 * would reference names that don't exist at runtime.
 */

/** Internal helpers emitted by the compiler itself. Always auto-imported. */
const RUNTIME_SYMBOLS = [
  "$enter",
  "$require",
  "$test",
  "$assert",
  "$match",
  "$tagMatch",
  "$wildcard",
  "$literalMatch",
  "$withMocks",
  "$resultTry",
  "$resultTryAsync",
] as const;

/**
 * User-facing stdlib value exports auto-imported from `?bs 0.6` onwards.
 * These are `export const` / runtime values \u2014 importing them as values is
 * always correct.
 */
const STDLIB_VALUE_SYMBOLS = [
  // Result helpers
  "err",
  "isErr",
  "isOk",
  "mapErr",
  "mapResult",
  "ok",
  "unwrap",
  // Option helpers
  "isNone",
  "isSome",
  "mapOption",
  "none",
  "optionFromNullable",
  "some",
  "unwrapOption",
  "unwrapOr",
  // Effects
  "http",
  "random",
  "stderr",
  "stdout",
  "time",
] as const;

/**
 * User-facing stdlib type exports auto-imported from `?bs 0.6` onwards.
 * Emitted via `import type { ... }` so consumers using
 * `verbatimModuleSyntax` (TS 5.0+) don't get a runtime reference to a name
 * the runtime never exported as a value.
 */
const STDLIB_TYPE_SYMBOLS = [
  // Result
  "Err",
  "Ok",
  "Result",
  // Option
  "None",
  "Option",
  "Some",
] as const;

/**
 * Return a copy of `src` with the literal text of string literals, template
 * literals, regex literals, and line/block comments replaced by spaces (same
 * byte count, newlines preserved). The CODE bodies of template-literal
 * `${...}` interpolations are kept as-is so the scanner can still see real
 * expressions there, but any strings/comments NESTED inside those bodies
 * also get blanked.
 *
 * Implementation is a single-pass state machine with an explicit stack:
 *   ctx[]: stack of contexts. Each context is either
 *     - { kind: "template" }: we're inside backticks; literal-text chars
 *       blank, `${` pushes a "code" context for the interpolation body.
 *     - { kind: "code" }: regular JS/TS scanning. `}` pops back to the
 *       enclosing template if it matches an open `${`. This is what makes
 *       arbitrarily-nested templates safe — `\`a${`b${c}d`}e\`` works.
 *
 * O(n): every character is visited exactly once. Earlier versions recursed
 * into `${...}` by re-blanking the rest of the source, which made the
 * scanner O(n²) in the number of interpolations.
 *
 * Caveat: regex literals are parsed heuristically — a `/` is treated as the
 * start of a regex iff the previous non-whitespace token is one that cannot
 * directly precede a divide operator (the same heuristic JavaScript itself
 * uses). This is good enough for compiled botscript output, which is shaped
 * code rather than minified expression soup. If the heuristic misfires, the
 * worst case is a false-positive stdlib import in a file that wasn't going
 * to typecheck anyway.
 */
function blankStringsAndComments(src: string): string {
  type Ctx = { kind: "template" } | { kind: "code"; braceDepth: number };
  const stack: Ctx[] = [{ kind: "code", braceDepth: 0 }];
  const out: string[] = [];

  // Track the last meaningful character emitted in "code" mode AND the last
  // identifier-shaped token, so the regex-vs-divide decision can see
  // keywords like `return` / `typeof` immediately preceding a `/`.
  let lastCode = "";
  let lastIdent = "";
  const REGEX_PRECEDENT_KEYWORDS = new Set([
    "return", "typeof", "void", "delete", "in", "of", "instanceof",
    "new", "throw", "yield", "await", "case", "do", "else", "if",
  ]);

  const top = (): Ctx => stack[stack.length - 1]!;
  const emit = (ch: string): void => {
    out.push(ch);
  };
  const emitBlank = (ch: string): void => {
    out.push(ch === "\n" ? "\n" : " ");
  };
  // Note: `emitBlank` for `\n` is set up via a sentinel below; this comment  // exists in case the helpers are extracted later.

  const canStartRegex = (last: string, ident: string): boolean => {
    if (last === "") return true;
    // A keyword like `return /x/` allows a regex even though the last char
    // is alphabetic. Trust those keywords explicitly.
    if (/[A-Za-z_$]/.test(last) && REGEX_PRECEDENT_KEYWORDS.has(ident)) return true;
    // Identifier / number / `)` / `]` otherwise means `/` is divide.
    return !/[A-Za-z0-9_$)\]]/.test(last);
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    const next = src[i + 1] ?? "";
    const ctx = top();

    if (ctx.kind === "template") {
      // Inside backticks: literal text gets blanked, escape sequences are
      // dropped (preserve newlines), `${` opens a nested code context, and
      // a bare `` ` `` closes the template.
      if (ch === "\\") {
        out.push(" ");
        out.push(next === "\n" ? "\n" : " ");
        i += 2;
        continue;
      }
      if (ch === "$" && next === "{") {
        out.push("${");
        stack.push({ kind: "code", braceDepth: 1 });
        lastCode = "{";
        i += 2;
        continue;
      }
      if (ch === "`") {
        out.push("`");
        stack.pop();
        // We were inside a template that lived in some outer code ctx; the
        // outer ctx already had its own brace depth, which is unaffected.
        lastCode = "`";
        i++;
        continue;
      }
      out.push(ch === "\n" ? "\n" : " ");
      i++;
      continue;
    }

    // ctx.kind === "code"
    // Line comment.
    if (ch === "/" && next === "/") {
      const end = src.indexOf("\n", i + 2);
      const len = end === -1 ? src.length - i : end - i;
      out.push(" ".repeat(len));
      i += len;
      lastCode = " ";
      continue;
    }
    // Block comment.
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const len = end === -1 ? src.length - i : end - i + 2;
      // Preserve newlines so line numbers stay accurate.
      out.push(src.slice(i, i + len).replace(/[^\n]/g, " "));
      i += len;
      lastCode = " ";
      continue;
    }
    // Regex literal (heuristic: `/` after a token that can't precede divide).
    if (ch === "/" && canStartRegex(lastCode, lastIdent)) {
      let j = i + 1;
      let inClass = false;
      while (j < src.length) {
        const rc = src[j]!;
        if (rc === "\\") {
          j += 2;
          continue;
        }
        if (rc === "[") inClass = true;
        else if (rc === "]") inClass = false;
        else if (rc === "/" && !inClass) {
          j++;
          // skip flags
          while (j < src.length && /[A-Za-z]/.test(src[j]!)) j++;
          break;
        }
        else if (rc === "\n") break; // unterminated regex — bail
        j++;
      }
      out.push("/".padEnd(j - i, " "));
      i = j;
      lastCode = "x"; // an "identifier-like" sentinel so the next `/` is divide
      continue;
    }
    // Double-quoted string.
    if (ch === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\") j++;
        j++;
      }
      const len = j - i + 1;
      out.push(" ".repeat(len));
      i += len;
      lastCode = "x";
      continue;
    }
    // Single-quoted string.
    if (ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== "'") {
        if (src[j] === "\\") j++;
        j++;
      }
      const len = j - i + 1;
      out.push(" ".repeat(len));
      i += len;
      lastCode = "x";
      continue;
    }
    // Template literal opener — push a template ctx onto the stack.
    if (ch === "`") {
      out.push("`");
      stack.push({ kind: "template" });
      lastCode = "`";
      i++;
      continue;
    }
    // Brace tracking for `${...}` interpolation contexts.
    if (ch === "{" && ctx.braceDepth > 0) {
      ctx.braceDepth++;
      out.push(ch);
      lastCode = ch;
      i++;
      continue;
    }
    if (ch === "}" && ctx.braceDepth > 0) {
      ctx.braceDepth--;
      out.push(ch);
      lastCode = ch;
      if (ctx.braceDepth === 0) {
        // Closed the interpolation — pop back to the enclosing template.
        stack.pop();
      }
      i++;
      continue;
    }
    // Regular code character. Maintain lastIdent so the regex heuristic
    // can see trailing keywords (e.g. `return /x/` should NOT be divide).
    out.push(ch);
    if (/[A-Za-z0-9_$]/.test(ch)) {
      lastIdent = /[A-Za-z0-9_$]/.test(lastCode) ? lastIdent + ch : ch;
      lastCode = ch;
    } else if (/\s/.test(ch)) {
      // Whitespace ends the current ident in `lastCode` terms but we keep
      // `lastIdent` so a following `/` can still see the keyword. `lastCode`
      // is also left unchanged so the regex heuristic looks at the last
      // non-whitespace character.
    } else {
      lastIdent = "";
      lastCode = ch;
    }
    i++;
  }
  return out.join("");
}

/**
 * Match an existing runtime import (value or type-only) and return its
 * specifier list and the slice to replace. Returns null if no such import
 * exists. Each specifier is split into `{ name, alias }` so callers can
 * preserve aliases when merging new symbols in.
 */
interface ExistingImport {
  match: string;
  /** Offset of `match` in the original src (UTF-16 code units). */
  matchStart: number;
  isTypeOnly: boolean;
  specs: { name: string; alias: string | null; typePrefix: boolean }[];
}

function findExistingRuntimeImport(src: string, typeOnly: boolean): ExistingImport | null {
  const prefix = typeOnly ? String.raw`import\s+type\s+\{` : String.raw`import\s+\{`;
  const re = new RegExp(`^\\s*${prefix}([^}]*)\\}\\s+from\\s+["']@mbfarias\\/botscript-runtime["'];?`, "m");
  const m = src.match(re);
  if (!m || m.index === undefined) return null;
  // Make sure the match isn't inside a comment or string literal — e.g. a
  // commented-out `// import { ok } from "@mbfarias/botscript-runtime";`
  // line would otherwise look like a real import to the regex. We re-scan a
  // blanked copy of `src` and require the `import` keyword to still appear
  // at the same offset; blanked regions become whitespace, so a match
  // hidden inside a comment/string will fail this check.
  const blanked = blankStringsAndComments(src);
  const probe = blanked.slice(m.index, m.index + m[0].length);
  const expectKeyword = typeOnly ? "import" : "import";
  if (!probe.trimStart().startsWith(expectKeyword)) return null;
  const specs = (m[1] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((raw) => {
      let typePrefix = false;
      let body = raw;
      if (/^type\s+/.test(body)) {
        typePrefix = true;
        body = body.replace(/^type\s+/, "");
      }
      const asIdx = body.search(/\s+as\s+/);
      if (asIdx >= 0) {
        const name = body.slice(0, asIdx).trim();
        const alias = body.slice(asIdx).replace(/^\s+as\s+/, "").trim();
        return { name, alias, typePrefix };
      }
      return { name: body, alias: null, typePrefix };
    });
  return { match: m[0], matchStart: m.index, isTypeOnly: typeOnly, specs };
}

function renderSpec(spec: { name: string; alias: string | null; typePrefix: boolean }): string {
  const head = spec.typePrefix ? `type ${spec.name}` : spec.name;
  return spec.alias ? `${head} as ${spec.alias}` : head;
}

export function passImports(src: string, version: VersionInfo): string {
  const usedValues = new Set<string>();
  const usedTypes = new Set<string>();

  // Always detect compiler-emitted helpers ($ prefix; safe to scan raw src).
  for (const sym of RUNTIME_SYMBOLS) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
    if (re.test(src)) usedValues.add(sym);
  }

  // From 0.6 onwards, also detect user-facing stdlib names so that primer
  // examples compile without manual import preambles. Scan a blanked copy
  // so that compiler-emitted string literals like `kind === "err"` don't
  // cause spurious imports of `err` or `ok`.
  if (atLeast(version.resolved, "0.6")) {
    const scanSrc = blankStringsAndComments(src);
    for (const sym of STDLIB_VALUE_SYMBOLS) {
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
      if (re.test(scanSrc)) usedValues.add(sym);
    }
    for (const sym of STDLIB_TYPE_SYMBOLS) {
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
      if (re.test(scanSrc)) usedTypes.add(sym);
    }
  }

  if (usedValues.size === 0 && usedTypes.size === 0) return src;

  // Drop any symbol the user already has bound at the top level. A spec
  // contributes to the skip set as its LOCAL binding name, not its export
  // name — `import { ok as myOk }` binds `myOk`, not `ok`, so a later use
  // of `ok(…)` must still be auto-imported. Unaliased specs bind their
  // export name directly.
  // From 0.6 on, ignore matches that fall inside comments / strings so a
  // commented-out runtime import doesn't suppress a real auto-import.
  // Older pins keep the legacy behaviour to honour the forward-compat rule
  // ("Never modify a shipped version's emitted TS").
  const commentAware = atLeast(version.resolved, "0.6");
  const existingValue = findExistingRuntimeImport(src, /*typeOnly=*/ false, { commentAware });
  const existingType = findExistingRuntimeImport(src, /*typeOnly=*/ true, { commentAware });
  const boundLocally = new Set<string>();
  for (const spec of [...(existingValue?.specs ?? []), ...(existingType?.specs ?? [])]) {
    boundLocally.add(spec.alias ?? spec.name);
  }
  for (const name of boundLocally) {
    usedValues.delete(name);
    usedTypes.delete(name);
  }

  if (usedValues.size === 0 && usedTypes.size === 0) return src;

  let out = src;

  // VALUE IMPORT. Merge into existing `import { ... } from "..."` if present,
  // otherwise emit a fresh line.
  if (usedValues.size > 0) {
    out = mergeOrPrepend(out, /*typeOnly=*/ false, usedValues, { commentAware });
  }
  // TYPE IMPORT. Same treatment for `import type { ... } from "..."`. We
  // never collapse types into a value import (or vice versa) \u2014 callers
  // using `verbatimModuleSyntax` need them separate.
  if (usedTypes.size > 0) {
    out = mergeOrPrepend(out, /*typeOnly=*/ true, usedTypes, { commentAware });
  }
  return out;
}

function mergeOrPrepend(src: string, typeOnly: boolean, toAdd: Set<string>): string {
  const existing = findExistingRuntimeImport(src, typeOnly);
  if (existing) {
    // Compare against the LOCAL binding (alias if present, else the export
    // name). `import { ok as myOk }` binds `myOk`, not `ok`, so `ok` is NOT
    // "already in this import" — we can still add an unaliased `ok` to it.
    const have = new Set(existing.specs.map((s) => s.alias ?? s.name));
    const additions = [...toAdd].filter((s) => !have.has(s));
    if (additions.length === 0) return src;
    const merged = [...existing.specs, ...additions.map((name) => ({ name, alias: null, typePrefix: false }))]
      .sort((a, b) => (a.alias ?? a.name).localeCompare(b.alias ?? b.name))
      .map(renderSpec)
      .join(", ");
    const keyword = typeOnly ? "import type" : "import";
    const replacement = `${keyword} { ${merged} } from "@mbfarias/botscript-runtime";`;
    // Position-based splice. Using `src.replace(existing.match, ...)` would
    // replace the FIRST textual occurrence of the matched line, which can
    // be a duplicate string earlier in the file (e.g. inside a comment
    // block that quotes the same import). Splicing at the known offset
    // guarantees we update the real import every time.
    return src.slice(0, existing.matchStart) + replacement +
      src.slice(existing.matchStart + existing.match.length);
  }
  const keyword = typeOnly ? "import type" : "import";
  const importLine = `${keyword} { ${[...toAdd].sort().join(", ")} } from "@mbfarias/botscript-runtime";`;
  return `${importLine}\n${src}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
