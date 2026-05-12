import { atLeast, type VersionInfo } from "./version.js";

/**
 * Final pass. Scans the rewritten output for runtime symbols the compiler
 * emits (the `$`-prefixed helpers) and, from `?bs 0.4` onwards, also for the
 * user-facing stdlib names documented in the primer (`ok`, `err`, `Result`,
 * `http`, etc.). When any are found and not already imported, a single import
 * from `@mbfarias/botscript-runtime` is prepended (or merged into the
 * existing one).
 *
 * Pre-0.4 files keep the old behaviour: only `$`-prefixed helpers are
 * auto-imported. User-facing names must be imported explicitly in those files.
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
 * User-facing stdlib symbols auto-imported from `?bs 0.4` onwards. This
 * covers every name that the primer documents and that the runtime exports.
 * Ordered so the merged import list sorts cleanly.
 */
const STDLIB_SYMBOLS = [
  // Result
  "Err",
  "Ok",
  "Result",
  "err",
  "isErr",
  "isOk",
  "mapErr",
  "mapResult",
  "ok",
  "unwrap",
  // Option
  "None",
  "Option",
  "Some",
  "isSome",
  "isNone",
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
 * Return a copy of `src` with the content of string literals, template
 * literals, and line/block comments replaced by spaces (same byte count,
 * newlines preserved). This lets the symbol scanner ignore names that appear
 * only inside string values — e.g. the compiler emits `kind === "err"` and
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
    // Template literals (backtick) — blank everything inside
    else if (src[i] === "`") {
      let j = i + 1;
      let depth = 0;
      while (j < src.length) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === "$" && src[j + 1] === "{") { depth++; j += 2; continue; }
        if (src[j] === "}" && depth > 0) { depth--; j++; continue; }
        if (src[j] === "`" && depth === 0) break;
        j++;
      }
      const len = j - i + 1;
      out += src.slice(i, i + len).replace(/[^\n]/g, " ");
      i += len;
    } else {
      out += src[i];
      i++;
    }
  }
  return out;
}

export function passImports(src: string, version: VersionInfo): string {
  const used = new Set<string>();

  // Always detect compiler-emitted helpers ($ prefix; safe to scan raw src).
  for (const sym of RUNTIME_SYMBOLS) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
    if (re.test(src)) used.add(sym);
  }

  // From 0.4 onwards, also detect user-facing stdlib names so that primer
  // examples compile without manual import preambles. Scan a blanked copy
  // so that compiler-emitted string literals like `kind === "err"` don't
  // cause spurious imports of `err` or `ok`.
  if (atLeast(version.resolved, "0.4")) {
    const scanSrc = blankStringsAndComments(src);
    for (const sym of STDLIB_SYMBOLS) {
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
      if (re.test(scanSrc)) used.add(sym);
    }
  }

  if (used.size === 0) return src;

  // Don't double-import. If user already has `from "@mbfarias/botscript-runtime"`, merge.
  const existingImport = src.match(
    /^\s*import\s+\{([^}]*)\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/m,
  );
  if (existingImport) {
    const already = new Set(
      (existingImport[1] ?? "")
        .split(",")
        .map((s) => s.trim().split(/\s+as\s+/)[0]?.trim() ?? "")
        .filter(Boolean),
    );
    const toAdd = [...used].filter((s) => !already.has(s));
    if (toAdd.length === 0) return src;
    const merged = [...already, ...toAdd].sort();
    const newImport = `import { ${merged.join(", ")} } from "@mbfarias/botscript-runtime";`;
    return src.replace(existingImport[0], newImport);
  }

  const importLine = `import { ${[...used].sort().join(", ")} } from "@mbfarias/botscript-runtime";`;
  return `${importLine}\n${src}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
