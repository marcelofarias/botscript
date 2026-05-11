/**
 * Final pass. Scans the rewritten output for runtime symbols the compiler
 * emits or that the user references directly, and prepends a single import
 * from `@mbfarias/botscript-runtime` when any are used and not already
 * imported.
 *
 * Two groups are handled:
 *
 * 1. `$`-prefixed helpers emitted by the compiler itself (`$enter`, `$match`,
 *    etc.). These have always been auto-imported.
 *
 * 2. User-facing stdlib symbols: `http`, `time`, `random`, `stdout`, `stderr`,
 *    `Result`, `Option`, `ok`, `err`, `some`, `none`. These are now also
 *    auto-imported so that primer examples compile without a manual import
 *    preamble (fixes #25).
 */
const COMPILER_SYMBOLS = [
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
 * User-facing stdlib symbols exported from `@mbfarias/botscript-runtime`.
 * Detected as whole words in the compiled output and added to the auto-import.
 */
const STDLIB_SYMBOLS = [
  // Effect namespaces
  "http",
  "time",
  "random",
  "stdout",
  "stderr",
  // Result type + constructors
  "Result",
  "ok",
  "err",
  // Option type + constructors
  "Option",
  "some",
  "none",
] as const;

const RUNTIME_SYMBOLS = [...COMPILER_SYMBOLS, ...STDLIB_SYMBOLS] as const;

/**
 * Return a copy of `src` with the content of string literals, template
 * literals, and line/block comments replaced by spaces (same byte length).
 * This prevents the symbol scanner from matching `err` inside
 * `kind === "err"` or other string-valued content that the compiler emits.
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
    // String literals (single or double quoted, no escape handling needed for
    // our purposes — we just need to blank the content).
    else if (src[i] === '"' || src[i] === "'") {
      const q = src[i]!;
      let j = i + 1;
      while (j < src.length && src[j] !== q) {
        if (src[j] === "\\") j++; // skip escape
        j++;
      }
      const len = j - i + 1; // include closing quote
      out += " ".repeat(len);
      i += len;
    }
    // Template literals (backtick strings)
    else if (src[i] === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== "`") {
        if (src[j] === "\\") j++;
        j++;
      }
      const len = j - i + 1;
      out += src.slice(i, i + len).replace(/[^\n]/g, " ");
      i += len;
    }
    else {
      out += src[i]!;
      i++;
    }
  }
  return out;
}

import { atLeast, type VersionInfo } from "./version.js";

export function passImports(src: string, version: VersionInfo): string {
  // Compiler-emitted `$`-prefixed helpers: safe to scan the raw source since
  // they only appear as identifiers, never as string content.
  // Stdlib user-facing names: scan a strings-blanked copy to avoid false
  // positives from the unwrap lowering (`kind === "err"`) and tagged-union
  // checks (`kind === "some"` etc.).
  const blanked = blankStringsAndComments(src);
  const used = new Set<string>();
  for (const sym of COMPILER_SYMBOLS) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
    if (re.test(src)) used.add(sym);
  }
  // Stdlib auto-imports are new in 0.5. Older pins keep their frozen output.
  if (atLeast(version.resolved, "0.5")) {
    for (const sym of STDLIB_SYMBOLS) {
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
      if (re.test(blanked)) used.add(sym);
    }
  }
  if (used.size === 0) return src;

  // Don't double-import. If user already has `from "@mbfarias/botscript-runtime"`, append.
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
