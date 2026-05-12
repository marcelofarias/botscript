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
 * User-facing stdlib value exports auto-imported from `?bs 0.4` onwards.
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
 * User-facing stdlib type exports auto-imported from `?bs 0.4` onwards.
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
 * literals, and line/block comments replaced by spaces (same byte count,
 * newlines preserved). The contents of template-literal `${...}`
 * interpolations are PRESERVED \u2014 those are real expressions that can
 * reference stdlib symbols (e.g. `` `x=${ok(1)}` ``) and need to be seen
 * by the scanner.
 *
 * The blanking lets the symbol scanner ignore names that appear only inside
 * string values \u2014 e.g. the compiler emits `kind === "err"` and
 * `kind === "ok"`, so without blanking, `err` and `ok` would be spuriously
 * detected and auto-imported even when the user never referenced them.
 */
function blankStringsAndComments(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    // Line comment
    if (src[i] === "/" && src[i + 1] === "/") {
      const end = src.indexOf("\n", i + 2);
      const len = end === -1 ? src.length - i : end - i;
      out += " ".repeat(len);
      i += len;
    }
    // Block comment
    else if (src[i] === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const len = end === -1 ? src.length - i : end - i + 2;
      // Preserve newlines so line numbers stay accurate.
      out += src.slice(i, i + len).replace(/[^\n]/g, " ");
      i += len;
    }
    // Double-quoted string literals
    else if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\") j++; // skip escape
        j++;
      }
      const len = j - i + 1; // include closing quote
      out += " ".repeat(len);
      i += len;
    }
    // Single-quoted string literals
    else if (src[i] === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== "'") {
        if (src[j] === "\\") j++;
        j++;
      }
      const len = j - i + 1;
      out += " ".repeat(len);
      i += len;
    }
    // Template literals (backtick) — blank the literal text segments, and
    // for each `${...}` interpolation recursively blank the strings/comments
    // *inside* the interpolation body before emitting it. Without this, a
    // string literal inside an interpolation (e.g. `${foo("err")}`) could
    // trip a stdlib symbol detector because the inner literal text would
    // be visible to the scanner.
    else if (src[i] === "`") {
      out += "`";
      let j = i + 1;
      while (j < src.length) {
        const ch = src[j]!;
        if (ch === "\\") {
          // Drop the escape sequence (two chars). The backslash is always
          // non-newline (we only enter this branch on `\\`). The following
          // character can be a real newline (line-continuation in a
          // template), in which case we preserve it so line counts stay
          // accurate — we never emit an extra synthetic newline.
          const next = src[j + 1] ?? "";
          out += " ";
          out += next === "\n" ? "\n" : " ";
          j += 2;
          continue;
        }
        if (ch === "$" && src[j + 1] === "{") {
          // Scan forward to the matching `}` (balancing nested braces).
          // Strings/templates/regex inside the interpolation can contain
          // `{` / `}` chars that we must NOT count as brace pairs; the
          // safe move is to recurse: blanking the slice first replaces
          // those literals with spaces, then a flat brace-counter on the
          // blanked output reliably finds the closing `}`. Newlines inside
          // the expression are preserved (blanking keeps them).
          out += "${";
          const exprStart = j + 2;
          const restBlanked = blankStringsAndComments(src.slice(exprStart));
          let depth = 1;
          let k = 0;
          while (k < restBlanked.length && depth > 0) {
            const rc = restBlanked[k]!;
            if (rc === "{") depth++;
            else if (rc === "}") depth--;
            if (depth > 0) k++;
          }
          // `k` now points at the matching `}` in the blanked slice; the
          // same offset applies to the original because blanking preserves
          // byte positions. Emit the blanked expression (so any inner
          // strings/comments stay blanked) followed by the closing `}`.
          out += restBlanked.slice(0, k);
          out += "}";
          j = exprStart + k + 1;
          continue;
        }
        if (ch === "`") break;
        out += ch === "\n" ? "\n" : " ";
        j++;
      }
      if (src[j] === "`") {
        out += "`";
        j++;
      }
      i = j;
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

/**
 * Match an existing runtime import (value or type-only) and return its
 * specifier list and the slice to replace. Returns null if no such import
 * exists. Each specifier is split into `{ name, alias }` so callers can
 * preserve aliases when merging new symbols in.
 */
interface ExistingImport {
  match: string;
  isTypeOnly: boolean;
  specs: { name: string; alias: string | null; typePrefix: boolean }[];
}

function findExistingRuntimeImport(src: string, typeOnly: boolean): ExistingImport | null {
  const prefix = typeOnly ? String.raw`import\s+type\s+\{` : String.raw`import\s+\{`;
  const re = new RegExp(`^\\s*${prefix}([^}]*)\\}\\s+from\\s+["']@mbfarias\\/botscript-runtime["'];?`, "m");
  const m = src.match(re);
  if (!m) return null;
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
  return { match: m[0], isTypeOnly: typeOnly, specs };
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

  // From 0.4 onwards, also detect user-facing stdlib names so that primer
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

  // Drop any symbol the user has ALREADY imported (in either bag, regardless
  // of value-vs-type strictness). Respect their existing line: even if a
  // type-only symbol lives in their value import, we don't second-guess
  // them — that's a stylistic choice for them to make. Auto-import only
  // fills genuine gaps.
  const existingValue = findExistingRuntimeImport(src, /*typeOnly=*/ false);
  const existingType = findExistingRuntimeImport(src, /*typeOnly=*/ true);
  for (const spec of [...(existingValue?.specs ?? []), ...(existingType?.specs ?? [])]) {
    usedValues.delete(spec.name);
    usedTypes.delete(spec.name);
  }

  if (usedValues.size === 0 && usedTypes.size === 0) return src;

  let out = src;

  // VALUE IMPORT. Merge into existing `import { ... } from "..."` if present,
  // otherwise emit a fresh line.
  if (usedValues.size > 0) {
    out = mergeOrPrepend(out, /*typeOnly=*/ false, usedValues);
  }
  // TYPE IMPORT. Same treatment for `import type { ... } from "..."`. We
  // never collapse types into a value import (or vice versa) \u2014 callers
  // using `verbatimModuleSyntax` need them separate.
  if (usedTypes.size > 0) {
    out = mergeOrPrepend(out, /*typeOnly=*/ true, usedTypes);
  }
  return out;
}

function mergeOrPrepend(src: string, typeOnly: boolean, toAdd: Set<string>): string {
  const existing = findExistingRuntimeImport(src, typeOnly);
  if (existing) {
    const have = new Set(existing.specs.map((s) => s.name));
    const additions = [...toAdd].filter((s) => !have.has(s));
    if (additions.length === 0) return src;
    const merged = [...existing.specs, ...additions.map((name) => ({ name, alias: null, typePrefix: false }))]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(renderSpec)
      .join(", ");
    const keyword = typeOnly ? "import type" : "import";
    const replacement = `${keyword} { ${merged} } from "@mbfarias/botscript-runtime";`;
    return src.replace(existing.match, replacement);
  }
  const keyword = typeOnly ? "import type" : "import";
  const importLine = `${keyword} { ${[...toAdd].sort().join(", ")} } from "@mbfarias/botscript-runtime";`;
  return `${importLine}\n${src}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
