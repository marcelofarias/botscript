import { atLeast, type VersionInfo } from "./version.js";

/**
 * Final pass. Scans the rewritten output for runtime symbols the compiler
 * emits (the `$`-prefixed helpers) and, from `?bs 0.6` onwards, also for
 * the user-facing stdlib names documented in the primer (`ok`, `err`,
 * `Result`, `http`, etc.). When any are found and not already imported,
 * the missing names are prepended as up to TWO `from
 * "@mbfarias/botscript-runtime"` statements — a regular value import for
 * runtime values and a separate `import type { … }` line for type-only
 * exports (`Ok`, `Err`, `Result`, `Some`, `None`, `Option`). Pre-existing
 * runtime imports are merged into rather than duplicated.
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
    // Line comment. Comments are trivia: do NOT update lastCode / lastIdent,
    // so the regex-vs-divide decision keeps looking at the last real token
    // before the comment. Otherwise `x /* y */ / 2` (divide) would look like
    // `<no-token> / 2` (start of regex).
    if (ch === "/" && next === "/") {
      const end = src.indexOf("\n", i + 2);
      const len = end === -1 ? src.length - i : end - i;
      out.push(" ".repeat(len));
      i += len;
      continue;
    }
    // Block comment. Same trivia treatment as line comments.
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const len = end === -1 ? src.length - i : end - i + 2;
      // Preserve newlines so line numbers stay accurate.
      out.push(src.slice(i, i + len).replace(/[^\n]/g, " "));
      i += len;
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
      // A regex literal ends with an identifier-like primary value, so a
      // subsequent `/` is divide. Reset lastIdent as well so a trailing
      // keyword from BEFORE the regex (e.g. `return /x/ / 2`) doesn't
      // re-trigger the regex heuristic.
      lastCode = "x";
      lastIdent = "";
      continue;
    }
    // Double-quoted string. After the closing quote we have a primary
    // value ("a"), so a following `/` is divide. Clear lastIdent for the
    // same reason as regex literals above.
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
      lastIdent = "";
      continue;
    }
    // Single-quoted string. Same treatment as double-quoted.
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
      lastIdent = "";
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

function findExistingRuntimeImport(
  src: string,
  typeOnly: boolean,
  options: { commentAware: boolean } = { commentAware: false },
): ExistingImport | null {
  const prefix = typeOnly ? String.raw`import\s+type\s+\{` : String.raw`import\s+\{`;
  const re = new RegExp(`^\\s*${prefix}([^}]*)\\}\\s+from\\s+["']@mbfarias\\/botscript-runtime["'];?`, "m");
  const m = src.match(re);
  if (!m || m.index === undefined) return null;
  if (!options.commentAware) {
    // Pre-0.6 callers keep the legacy behaviour: no comment/string filtering.
    // (Skipping the blanked-probe path entirely preserves bug-for-bug compat
    // with already-shipped pins.)
  } else {
    // Make sure the match isn't inside a comment or string literal — e.g. a
    // commented-out `// import { ok } from "@mbfarias/botscript-runtime";`
    // line would otherwise look like a real import to the regex. We re-scan
    // a blanked copy of `src` and require the `import` keyword to still
    // appear at the same offset; blanked regions become whitespace, so a
    // match hidden inside a comment/string will fail this check.
    const blanked = blankStringsAndComments(src);
    const probe = blanked.slice(m.index, m.index + m[0].length);
    if (!probe.trimStart().startsWith("import")) return null;
  }
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
    // Names locally declared in the file shadow the stdlib export of the
    // same name (e.g. `fn ok(...) {}` becomes `function ok(...) {}` in the
    // emitted TS — importing `ok` would clash with the user's binding).
    // Skip any stdlib name that appears as the head of a top-level decl.
    const locallyDeclared = collectLocallyDeclared(scanSrc);
    for (const sym of STDLIB_VALUE_SYMBOLS) {
      if (locallyDeclared.has(sym)) continue;
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
      if (re.test(scanSrc)) usedValues.add(sym);
    }
    for (const sym of STDLIB_TYPE_SYMBOLS) {
      if (locallyDeclared.has(sym)) continue;
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
  // Skip-set behaviour: legacy versions used the export NAME (so
  // `import { ok as myOk }` would suppress an auto-import of `ok` even
  // though `ok` isn't actually in scope). 0.6+ switched to the LOCAL
  // binding (alias if any). Keeping the legacy behaviour for pre-0.6 pins
  // preserves byte-identical output for files pinned to 0.1–0.5.
  const useAliasAware = atLeast(version.resolved, "0.6");
  const boundLocally = new Set<string>();
  for (const spec of [...(existingValue?.specs ?? []), ...(existingType?.specs ?? [])]) {
    boundLocally.add(useAliasAware ? (spec.alias ?? spec.name) : spec.name);
  }
  for (const name of boundLocally) {
    usedValues.delete(name);
    usedTypes.delete(name);
  }

  if (usedValues.size === 0 && usedTypes.size === 0) return src;

  let out = src;

  // ORDER matters when both lines are fresh prepends. mergeOrPrepend's
  // "prepend" path puts the new line at the top of the file, so to end up
  // with the value import ABOVE the type import (the convention used in
  // the PR description and the rest of the codebase) we add the TYPE line
  // first — it ends up below the subsequently-prepended value line.
  // Existing-import merges aren't affected by ordering.

  // TYPE IMPORT. We never collapse types into a value import (or vice
  // versa) — callers using `verbatimModuleSyntax` need them separate.
  if (usedTypes.size > 0) {
    out = mergeOrPrepend(out, /*typeOnly=*/ true, usedTypes, { commentAware, aliasAware: useAliasAware });
  }
  // VALUE IMPORT. Merge into an existing `import { ... } from "..."` if
  // present, otherwise emit a fresh line on top.
  if (usedValues.size > 0) {
    out = mergeOrPrepend(out, /*typeOnly=*/ false, usedValues, { commentAware, aliasAware: useAliasAware });
  }
  // Post-pass: when we have both kinds of runtime imports at the very top
  // of the file, ensure the value line precedes the type line. The two
  // earlier steps can land in the wrong order when only one of them was a
  // fresh prepend (e.g. value already existed, type was newly added — the
  // type line gets prepended ABOVE the existing value line). Re-emit them
  // in canonical order.
  out = normalizeRuntimeImportOrder(out);
  return out;
}

/**
 * Move any leading runtime-import lines into canonical order:
 * value imports first, then type-only imports. Only touches contiguous
 * runtime-import lines starting at byte 0 of the file (the only place
 * fresh-prepended ones can land). Existing non-leading imports are left
 * alone.
 */
function normalizeRuntimeImportOrder(src: string): string {
  const lines = src.split("\n");
  const valueRe = /^import\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?$/;
  const typeRe = /^import\s+type\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?$/;
  let i = 0;
  const leading: { line: string; isType: boolean }[] = [];
  while (i < lines.length) {
    const l = lines[i]!;
    if (typeRe.test(l)) {
      leading.push({ line: l, isType: true });
      i++;
      continue;
    }
    if (valueRe.test(l)) {
      leading.push({ line: l, isType: false });
      i++;
      continue;
    }
    break;
  }
  if (leading.length < 2) return src;
  // Already in canonical order? Then no-op.
  let needsReorder = false;
  let sawType = false;
  for (const ent of leading) {
    if (ent.isType) sawType = true;
    else if (sawType) {
      needsReorder = true;
      break;
    }
  }
  if (!needsReorder) return src;
  const values = leading.filter((e) => !e.isType).map((e) => e.line);
  const types = leading.filter((e) => e.isType).map((e) => e.line);
  return [...values, ...types, ...lines.slice(i)].join("\n");
}

function mergeOrPrepend(
  src: string,
  typeOnly: boolean,
  toAdd: Set<string>,
  options: { commentAware: boolean; aliasAware: boolean } =
    { commentAware: false, aliasAware: false },
): string {
  const existing = findExistingRuntimeImport(src, typeOnly, options);
  if (existing) {
    // Compare against the LOCAL binding under 0.6+ semantics (alias if any).
    // Pre-0.6 keeps the legacy name-based comparison so the merged output
    // stays byte-identical with the shipped behaviour.
    const have = new Set(
      existing.specs.map((s) =>
        options.aliasAware ? (s.alias ?? s.name) : s.name,
      ),
    );
    const additions = [...toAdd].filter((s) => !have.has(s));
    if (additions.length === 0) return src;
    // In pre-0.6 (not aliasAware) mode, mimic the legacy rewrite: drop
    // any \`as\` alias on existing specs but PRESERVE the per-spec
    // \`type\` prefix — the legacy code split on \`as\` and kept whatever
    // was on the left, including any leading \`type \` keyword, so the
    // textual prefix survived a rewrite. The 0.6+ path uses the smarter
    // alias-preserving rendering.
    const normalisedExisting = options.aliasAware
      ? existing.specs
      : existing.specs.map((s) => ({ name: s.name, alias: null, typePrefix: s.typePrefix }));
    const merged = [...normalisedExisting, ...additions.map((name) => ({ name, alias: null, typePrefix: false }))]
      .sort((a, b) => {
        const ka = options.aliasAware ? (a.alias ?? a.name) : a.name;
        const kb = options.aliasAware ? (b.alias ?? b.name) : b.name;
        return ka.localeCompare(kb);
      })
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
  // Anchor: place new imports right AFTER the last existing runtime
  // import line (if any). This keeps any value/type pair clustered
  // together rather than scattering them across the file when the user's
  // runtime import wasn't at the very top (e.g. preceded by other
  // imports). When no runtime import exists yet we fall back to
  // prepending at the top of the file.
  // Match up to the trailing semicolon (if any). Crucially, do NOT consume
  // the line-terminating newline — we splice `\n + newLine` right after
  // \`lastEnd\`, so eating the newline here would inject a blank line
  // between the existing import and the new one (which would also break
  // \`normalizeRuntimeImportOrder\`'s leading-line scan).
  const runtimeImportRe =
    /^import(?:\s+type)?\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/gm;
  let lastEnd = -1;
  for (let m: RegExpExecArray | null; (m = runtimeImportRe.exec(src)) !== null; ) {
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd >= 0) {
    return src.slice(0, lastEnd) + "\n" + importLine + src.slice(lastEnd);
  }
  return `${importLine}\n${src}`;
}

/**
 * Scan for top-level declarations whose declared name collides with one
 * of the stdlib symbols. We don't bother building a full AST — the
 * compiled output is shaped TS, so a regex that looks for the canonical
 * decl heads (`function NAME`, `const NAME`, `let NAME`, `var NAME`,
 * `class NAME`, `interface NAME`, `type NAME`, `enum NAME`) anchored at
 * the start of a line is enough. Caller passes the BLANKED source so a
 * "declaration" pattern hiding inside a string literal doesn't fool us.
 * Returns the set of names we'd shadow if we auto-imported.
 */
function collectLocallyDeclared(blanked: string): Set<string> {
  const decls = new Set<string>();
  // Top-level declarations only. Anchor at start-of-line without any
  // leading whitespace so an INDENTED \`let ok = ...\` inside a function
  // body (a different scope from the module top level) doesn't suppress
  // auto-importing \`ok\` for code elsewhere in the file.
  const DECL_RE =
    /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = DECL_RE.exec(blanked)) !== null) {
    decls.add(m[1]!);
  }
  return decls;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
