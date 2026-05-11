/**
 * Final pass. Scans the rewritten output for runtime symbols the compiler
 * emits or that the language's stdlib surfaces, and prepends a single import
 * from `@mbfarias/botscript-runtime` when any are used and not already
 * imported.
 *
 * Two categories:
 *   VALUE_SYMBOLS  — runtime values ($enter, ok, http, …).  Imported as
 *                    regular named bindings.
 *   TYPE_SYMBOLS   — type aliases (Result, Option, …).  Imported with the
 *                    inline `type` modifier so the output is safe under
 *                    isolatedModules and verbatimModuleSyntax.
 *
 * Both categories are folded into a single import statement so there is at
 * most one `from "@mbfarias/botscript-runtime"` line in the output.
 */

/** Runtime values — functions / objects the emitted code may call or read. */
const VALUE_SYMBOLS = [
  // Compiler-emitted helpers
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
  // User-facing stdlib — effects
  "http",
  "time",
  "random",
  "stdout",
  "stderr",
  "fs",
  // User-facing stdlib — Result
  "ok",
  "err",
  "isOk",
  "isErr",
  "mapResult",
  "mapErr",
  "unwrap",
  // User-facing stdlib — Option
  "some",
  "none",
  "isSome",
  "isNone",
  "mapOption",
  "optionFromNullable",
  "unwrapOption",
  "unwrapOr",
] as const;

/**
 * Type-only exports — imported with the `type` keyword so they are erased at
 * compile time and satisfy isolatedModules / verbatimModuleSyntax requirements.
 */
const TYPE_SYMBOLS = [
  // Result family
  "Result",
  "Ok",
  "Err",
  // Option family
  "Option",
  "Some",
  "None",
  // Capability
  "Capability",
  "MockableCapability",
] as const;

type ValueSymbol = (typeof VALUE_SYMBOLS)[number];
type TypeSymbol = (typeof TYPE_SYMBOLS)[number];

export function passImports(src: string): string {
  const usedValues = new Set<ValueSymbol>();
  const usedTypes = new Set<TypeSymbol>();

  for (const sym of VALUE_SYMBOLS) {
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
    if (re.test(src)) usedValues.add(sym);
  }

  for (const sym of TYPE_SYMBOLS) {
    // Types appear as identifiers in annotations, generic args, etc.
    const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
    if (re.test(src)) usedTypes.add(sym);
  }

  if (usedValues.size === 0 && usedTypes.size === 0) return src;

  // Serialise both sets into specifier strings.
  // Values → "ok", types → "type Result"
  const toSpecifier = (sym: ValueSymbol | TypeSymbol, isType: boolean) =>
    isType ? `type ${sym}` : sym;

  // Check for an existing import from the runtime package (value or type import).
  const existingImportRe =
    /^\s*import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/m;
  const existingImport = src.match(existingImportRe);

  if (existingImport) {
    // Parse what's already there. Each specifier may look like:
    //   "ok", "$enter", "type Result", "Foo as Bar", "type Foo as Bar"
    const rawSpecifiers = (existingImport[1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Build a normalised set of what's already imported (without leading `type `).
    const already = new Set(
      rawSpecifiers.map((s) => s.replace(/^type\s+/, "").split(/\s+as\s+/)[0]?.trim() ?? ""),
    );

    const toAdd: string[] = [];
    for (const sym of usedValues) {
      if (!already.has(sym)) toAdd.push(toSpecifier(sym, false));
    }
    for (const sym of usedTypes) {
      if (!already.has(sym)) toAdd.push(toSpecifier(sym, true));
    }

    if (toAdd.length === 0) return src;

    // Merge and re-emit a single sorted import.
    const merged = [...rawSpecifiers, ...toAdd].sort(specifierSort);
    const newImport = `import { ${merged.join(", ")} } from "@mbfarias/botscript-runtime";`;
    return src.replace(existingImport[0], newImport);
  }

  // No existing import — build one from scratch.
  const specifiers: string[] = [
    ...[...usedValues].map((s) => toSpecifier(s, false)),
    ...[...usedTypes].map((s) => toSpecifier(s, true)),
  ].sort(specifierSort);

  const importLine = `import { ${specifiers.join(", ")} } from "@mbfarias/botscript-runtime";`;
  return `${importLine}\n${src}`;
}

/**
 * Sort import specifiers: plain names before `type …` names, then
 * alphabetically within each group.
 */
function specifierSort(a: string, b: string): number {
  const aIsType = a.startsWith("type ");
  const bIsType = b.startsWith("type ");
  if (aIsType !== bIsType) return aIsType ? 1 : -1;
  const aName = a.replace(/^type\s+/, "");
  const bName = b.replace(/^type\s+/, "");
  return aName.localeCompare(bName);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
