/**
 * Final pass. Scans the rewritten output for the `$`-prefixed helpers the
 * compiler itself emits and prepends a single import from
 * `@mbfarias/botscript-runtime` when any are used and not already imported.
 *
 * The compiler only auto-imports its own emissions. User-facing names (`ok`,
 * `err`, `some`, `none`, `http`, `time`, `random`, `stdout`, `stderr`) must
 * be imported explicitly — this is intentional. It keeps the magic narrow,
 * avoids shadowing surprises, and means agents reading a botscript file see
 * real imports for real symbols.
 */
const RUNTIME_SYMBOLS = [
  "$enter",
  "$require",
  "$test",
  "$assert",
  "$match",
  "$tagMatch",
  "$wildcard",
  "$literalMatch",
] as const;

export function passImports(src: string): string {
  const used = new Set<string>();
  for (const sym of RUNTIME_SYMBOLS) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
    if (re.test(src)) used.add(sym);
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
