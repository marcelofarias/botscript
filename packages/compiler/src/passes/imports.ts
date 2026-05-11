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

export function passImports(src: string, version: VersionInfo): string {
  const used = new Set<string>();

  // Always detect compiler-emitted helpers.
  for (const sym of RUNTIME_SYMBOLS) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
    if (re.test(src)) used.add(sym);
  }

  // From 0.4 onwards, also detect user-facing stdlib names so that primer
  // examples compile without manual import preambles.
  if (atLeast(version.resolved, "0.4")) {
    for (const sym of STDLIB_SYMBOLS) {
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
      if (re.test(src)) used.add(sym);
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
