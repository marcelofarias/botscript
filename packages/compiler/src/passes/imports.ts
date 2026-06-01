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

/** Stdlib namespace names (member-access objects, not standalone call targets). */
const STDLIB_NAMESPACE_NAMES = new Set(["http", "random", "stderr", "stdout", "time"]);

/**
 * Stdlib value helpers that appear as bare `ident(` call sites in function bodies
 * (Result, Option, and error builtins — not stdlib namespace objects).
 * Canonical source — import this set to avoid drift with STDLIB_VALUE_SYMBOLS.
 */
export const STDLIB_VALUE_CALL_NAMES: ReadonlySet<string> = new Set(
  STDLIB_VALUE_SYMBOLS.filter(s => !STDLIB_NAMESPACE_NAMES.has(s)),
);

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
/**
 * Return true if `s` at `idx` is an ECMAScript LineTerminator code unit:
 * LF (U+000A), CR (U+000D), LS (U+2028), or PS (U+2029).
 */
function isLineTerminatorAt(s: string, idx: number): boolean {
  const c = s.charCodeAt(idx);
  return c === 0x0a || c === 0x0d || c === 0x2028 || c === 0x2029;
}

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
    // Identifier / number / `)` / `]` / `}` otherwise means `/` is divide.
    // Including `}` is a pragmatic call. It correctly handles
    // `({a:1}) / 2` (object literal followed by divide) but mis-classifies
    // valid TS shapes like `if (x) {} /a/.test(y)` (a regex literal right
    // after a block-statement `}`), reading the `/` there as divide. The
    // worst-case downstream effect for that input is a false-positive
    // stdlib import for whichever identifier sits inside the regex body —
    // a noise import in an already-suspect file, never a typecheck break.
    return !/[A-Za-z0-9_$)\]}]/.test(last);
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
        // Clamp: if the backslash is the last code unit in the file, only
        // emit one blank to preserve the same-byte-count invariant. Letting
        // \`i += 2\` walk past end-of-input would silently extend `out` by
        // an extra space and desync later offset-based checks.
        if (i + 1 >= src.length) {
          out.push(" ");
          i += 1;
          continue;
        }
        out.push(" ");
        // Preserve any LineTerminator (LF, CR, LS, PS) so line counts and
        // line-anchored regexes stay aligned with the original source.
        out.push(isLineTerminatorAt(src, i + 1) ? src[i + 1]! : " ");
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
        // After the closing backtick the template literal is a primary
        // value (just like a string or number), so a following `/` is
        // divide — use the identifier-like sentinel so canStartRegex
        // returns false. Clear lastIdent for the same reason.
        lastCode = "x";
        lastIdent = "";
        i++;
        continue;
      }
      out.push(isLineTerminatorAt(src, i) ? ch : " ");
      i++;
      continue;
    }

    // ctx.kind === "code"
    // Line comment. Comments are trivia: do NOT update lastCode / lastIdent,
    // so the regex-vs-divide decision keeps looking at the last real token
    // before the comment. Otherwise `x /* y */ / 2` (divide) would look like
    // `<no-token> / 2` (start of regex).
    if (ch === "/" && next === "/") {
      // Find the next ECMAScript LineTerminator: \u000A (LF), \u000D (CR),
      // \u2028 (LS), \u2029 (PS). `indexOf("\\n")` only handles LF, so CR-only
      // files would blank all the way to EOF and hide later code from the
      // scanner. Walk forward looking for any of the four.
      let end = i + 2;
      while (end < src.length) {
        const c = src.charCodeAt(end);
        if (c === 0x0a || c === 0x0d || c === 0x2028 || c === 0x2029) break;
        end++;
      }
      const len = end >= src.length ? src.length - i : end - i;
      out.push(" ".repeat(len));
      i += len;
      continue;
    }
    // Block comment. Same trivia treatment as line comments.
    if (ch === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const len = end === -1 ? src.length - i : end - i + 2;
      // Preserve newlines so line numbers stay accurate.
      // Preserve every LineTerminator (LF / CR / LS / PS) so line-anchored
      // scans further down the pipeline see the same line count.
      out.push(
        src.slice(i, i + len).replace(/[\s\S]/g, (c) => {
          const code = c.charCodeAt(0);
          return code === 0x0a || code === 0x0d || code === 0x2028 || code === 0x2029 ? c : " ";
        }),
      );
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
          // Skip the escape, but never walk past end-of-input. A trailing
          // \`\\\` would otherwise advance \`j\` to src.length + 1 and
          // make \`padEnd(j - i)\` emit one extra character, breaking the
          // same-byte-count invariant.
          j = Math.min(src.length, j + 2);
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
        else if (isLineTerminatorAt(src, j)) break; // unterminated regex — bail on any LineTerminator (LF/CR/LS/PS)
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
      const closeAt = j < src.length ? j : -1; // index of closing quote, or -1 if unterminated
      const end = closeAt >= 0 ? closeAt + 1 : src.length;
      // Preserve the quote characters themselves so downstream regexes
      // that scan for `from "..."` (e.g. the IMPORT_LINE_RE in this pass)
      // can still find a string-literal shape. Body becomes spaces; line
      // terminators inside the body (line-continuation `\\\n`) survive.
      for (let k = i; k < end; k++) {
        if (k === i || k === closeAt) out.push(src[k]!);
        else out.push(isLineTerminatorAt(src, k) ? src[k]! : " ");
      }
      i = end;
      lastCode = "x";
      lastIdent = "";
      continue;
    }
    // Single-quoted string. Same treatment as double-quoted; the opening
    // and closing quote characters are preserved so the blanked output
    // still looks like a string literal to downstream regexes.
    if (ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== "'") {
        if (src[j] === "\\") j++;
        j++;
      }
      const closeAt = j < src.length ? j : -1;
      const end = closeAt >= 0 ? closeAt + 1 : src.length;
      for (let k = i; k < end; k++) {
        if (k === i || k === closeAt) out.push(src[k]!);
        else out.push(isLineTerminatorAt(src, k) ? src[k]! : " ");
      }
      i = end;
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
  // Global flag: under commentAware mode we may need to skip past a match
  // that turns out to be inside a comment or string. Pre-0.6 still picks
  // the first match (legacy behaviour) since the loop below stops on the
  // first hit when the guard is off.
  const re = new RegExp(`^\\s*${prefix}([^}]*)\\}\\s+from\\s+["']@mbfarias\\/botscript-runtime["'];?`, "gm");
  const blanked = options.commentAware ? blankStringsAndComments(src) : null;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(src)) !== null) {
    if (blanked === null) break;
    const probe = blanked.slice(m.index, m.index + m[0].length);
    if (probe.trimStart().startsWith("import")) break;
    // First match was hidden inside a comment/string; keep scanning so a
    // real runtime import LATER in the file can still be picked up.
  }
  if (!m || m.index === undefined) return null;
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
    const { values: declValue, types: declType } = collectLocallyDeclared(scanSrc);
    for (const sym of STDLIB_VALUE_SYMBOLS) {
      // Only a VALUE-namespace declaration of this name shadows the
      // stdlib value (e.g. `function ok` or `const ok = ...`). A pure
      // type decl like `type ok = ...` doesn't create a runtime
      // binding, so don't suppress here.
      if (declValue.has(sym)) continue;
      const re = new RegExp(`(?<![A-Za-z0-9_$.])${escapeRegex(sym)}(?![A-Za-z0-9_$])`);
      if (re.test(scanSrc)) usedValues.add(sym);
    }
    for (const sym of STDLIB_TYPE_SYMBOLS) {
      // Both value- and type-namespace decls shadow a type use because
      // `class Foo` / `enum Foo` bind a type too. Conservatively skip if
      // EITHER namespace declares the name.
      if (declValue.has(sym) || declType.has(sym)) continue;
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
  const useAliasAware = atLeast(version.resolved, "0.6");
  const existingValue = findExistingRuntimeImport(src, /*typeOnly=*/ false, { commentAware });
  // Pre-0.6 didn't recognise `import type { ... }` lines at all (the
  // legacy regex only matched `import { ... }`). Honour that for
  // shipped pins so a user-written `import type` line doesn't shift the
  // emitted output.
  const existingType = useAliasAware
    ? findExistingRuntimeImport(src, /*typeOnly=*/ true, { commentAware })
    : null;
  // Skip-set behaviour: legacy versions used the export NAME (so
  // `import { ok as myOk }` would suppress an auto-import of `ok` even
  // though `ok` isn't actually in scope). 0.6+ switched to the LOCAL
  // binding (alias if any). Keeping the legacy behaviour for pre-0.6 pins
  // preserves byte-identical output for files pinned to 0.1–0.5.
  // Track value vs type bindings separately. TS has disjoint value and
  // type namespaces — a type-only import (\`import type { X }\`) doesn't
  // create a runtime binding for \`X\`, so it must NOT suppress an
  // auto-imported value \`X\` (and vice versa). Pre-0.6 keeps the single
  // \`boundLocally\` Set for byte-identical legacy behaviour.
  const boundValue = new Set<string>();
  const boundType = new Set<string>();
  const boundLocally = new Set<string>(); // pre-0.6 only
  // Existing-runtime value import: a plain `import { X }` binds X in
  // BOTH namespaces in TS (you can use the same name as a value or a
  // type — TS picks the right meaning per use site). Only a per-spec
  // \`type\` prefix narrows it to type-only.
  for (const spec of existingValue?.specs ?? []) {
    const key = useAliasAware ? (spec.alias ?? spec.name) : spec.name;
    boundLocally.add(key);
    boundType.add(key);
    if (!spec.typePrefix) boundValue.add(key);
  }
  // Existing-runtime `import type { ... }`: type-only bindings.
  for (const spec of existingType?.specs ?? []) {
    const key = useAliasAware ? (spec.alias ?? spec.name) : spec.name;
    boundLocally.add(key);
    boundType.add(key);
  }
  // 0.6+: also harvest names bound by imports from OTHER modules. If the
  // user wrote \`import { ok } from "./util"\`, our auto-import of \`ok\`
  // from \`@mbfarias/botscript-runtime\` would clash with their existing
  // binding. Pre-0.6 keeps the legacy narrower scan (which never tried to
  // detect non-runtime imports either).
  if (useAliasAware) {
    const scanned = blankStringsAndComments(src);
    // Two-step scan: first match the entire `import ... from "..."` line
    // (any shape), then peel off the bindings from the head. Handles:
    //   - `import { a, b as c } from "..."`            (named bindings)
    //   - `import Default from "..."`                  (default only)
    //   - `import Default, { a } from "..."`           (default + named)
    //   - `import * as ns from "..."`                  (namespace)
    //   - `import type { ... } from "..."`             (type-only)
    //   NOTE: `import "..."` (side-effect only, no `from` clause) has no
    //   bindings and is intentionally NOT matched by IMPORT_LINE_RE — the
    //   regex requires `from "..."`. This is correct: there's nothing to
    //   add to the bound-names set for a bare side-effect import.
    // Also includes ALSO our own \`@mbfarias/botscript-runtime\` so a file
    // with multiple runtime imports of the same kind picks up bindings
    // from every one of them, not just the first that the regex-match
    // path saw.
    // Match the entire import statement and capture (1) whether it's an
    // \`import type\` line (so the whole line binds in the type namespace)
    // and (2) the head before \`from\`. We then peel off the head’s
    // bindings and record them in the appropriate namespace (value vs
    // type), respecting per-spec \`type\` modifiers in named-binding
    // lists.
    const IMPORT_LINE_RE =
      /^import(\s+type)?\s+([^;]*?)\s+from\s+["']([^"']+)["']/gm;
    // A non-type binding lives in BOTH namespaces (same rule as the
    // existing-runtime branch above): TS picks the meaning per use
    // site. \`import type { X }\` or \`{ type X }\` is type-only.
    const addBinding = (name: string, isTypeOnly: boolean): void => {
      boundLocally.add(name);
      boundType.add(name);
      if (!isTypeOnly) boundValue.add(name);
    };
    // Run the regex on the RAW source so module-specifier paths survive
    // (the blanker keeps the quote characters but blanks the body, which
    // would erase the path before we could read it). To still reject
    // commented-out imports, verify each match's offset against the
    // blanked source — if the `import` keyword is still visible there,
    // the match is real code.
    for (let m: RegExpExecArray | null; (m = IMPORT_LINE_RE.exec(src)) !== null; ) {
      const probe = scanned.slice(m.index, m.index + m[0].length);
      if (!probe.trimStart().startsWith("import")) continue;
      const wholeTypeOnly = m[1] !== undefined;
      const head = m[2]!.trim();
      // Strip an optional `Default,` prefix if a comma-separated named
      // bindings list follows; record the default name first.
      let rest = head;
      const defaultMatch = rest.match(/^([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*(.*)$/s);
      if (defaultMatch && (defaultMatch[2]!.startsWith("{") || defaultMatch[2]!.startsWith("*"))) {
        addBinding(defaultMatch[1]!, wholeTypeOnly);
        rest = defaultMatch[2]!.trim();
      }
      // Namespace: `* as ns`
      const nsMatch = rest.match(/^\*\s+as\s+([A-Za-z_$][A-Za-z0-9_$]*)$/);
      if (nsMatch) {
        addBinding(nsMatch[1]!, wholeTypeOnly);
        continue;
      }
      // Named bindings: `{ a, b as c, type d }`
      const namedMatch = rest.match(/^\{([^}]*)\}$/);
      if (namedMatch) {
        for (const raw of namedMatch[1]!.split(",")) {
          let piece = raw.trim();
          if (!piece) continue;
          let specTypeOnly = wholeTypeOnly;
          if (/^type\s+/.test(piece)) {
            specTypeOnly = true;
            piece = piece.replace(/^type\s+/, "");
          }
          const asIdx = piece.search(/\s+as\s+/);
          const local = asIdx >= 0
            ? piece.slice(asIdx).replace(/^\s+as\s+/, "").trim()
            : piece;
          const id = local.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/)?.[1];
          if (id) addBinding(id, specTypeOnly);
        }
        continue;
      }
      // Bare default-only: `import Default from "..."`
      const bareDefault = rest.match(/^([A-Za-z_$][A-Za-z0-9_$]*)$/);
      if (bareDefault) {
        addBinding(bareDefault[1]!, wholeTypeOnly);
      }
    }
  }
  if (useAliasAware) {
    // 0.6+: respect TS's value/type namespace separation. A value binding
    // suppresses value auto-imports; a type-only binding suppresses
    // type-only auto-imports. The two don't cross.
    for (const name of boundValue) usedValues.delete(name);
    for (const name of boundType) usedTypes.delete(name);
  } else {
    // Pre-0.6: legacy behaviour suppressed both bags from any binding.
    // Kept for byte-identical 0.1–0.5 output.
    for (const name of boundLocally) {
      usedValues.delete(name);
      usedTypes.delete(name);
    }
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
  // in canonical order. Gated at 0.6+ because the normalizer's reorder
  // would touch user-written import order under pre-0.6 pins, violating
  // the forward-compat byte-identical guarantee.
  if (useAliasAware) {
    out = normalizeRuntimeImportOrder(out);
  }
  return out;
}

/**
 * Walk the whole file and find any contiguous run of runtime imports
 * (anywhere in the file, not just at byte 0). Within each run, re-emit
 * value imports first, then type imports. Surrounding lines are left in
 * place so a leading file-level comment, a `"use strict"` pragma, or
 * other imports keep their original positions. This is the post-pass
 * that fixes type-then-value orderings produced by the prepend-then-merge
 * sequence in `passImports`.
 */
function normalizeRuntimeImportOrder(src: string): string {
  const lines = src.split("\n");
  // Blank strings and comments once so we can distinguish real import lines
  // from the same text appearing inside a block comment or string literal
  // (e.g. a doc-comment example that shows a runtime import). The blanker
  // preserves newlines, so blankedLines[i] corresponds to lines[i].
  const blankedLines = blankStringsAndComments(src).split("\n");
  // Tolerate trailing content on the same line — inline comments,
  // optional whitespace, etc. — by dropping the `$` end-of-line anchor.
  // The regex still has to match the start of an import line (via `^`)
  // and the canonical \`from "@mbfarias/botscript-runtime";?\` shape, so
  // we don't accidentally classify some unrelated line.
  const valueRe = /^import\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/;
  const typeRe = /^import\s+type\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/;
  // (Note: \`split("\\n")\` is fine here because the upstream pipeline
  // emits LF-only output; CR/LS/PS only matter for the blanker scanning
  // input source.)
  const classify = (line: string, blankedLine: string): "value" | "type" | null => {
    // Guard: if the blanked counterpart doesn't start with `import`, this
    // line is inside a comment or string literal — do not reorder it.
    if (!blankedLine.trimStart().startsWith("import")) return null;
    if (typeRe.test(line)) return "type";
    if (valueRe.test(line)) return "value";
    return null;
  };

  let touched = false;
  let i = 0;
  while (i < lines.length) {
    const here = classify(lines[i]!, blankedLines[i]!);
    if (here === null) {
      i++;
      continue;
    }
    // Walk forward as long as we're on runtime-import lines.
    let j = i;
    while (j < lines.length && classify(lines[j]!, blankedLines[j]!) !== null) j++;
    // [i, j) is a run of runtime imports. Reorder if needed.
    const run = lines.slice(i, j);
    const blankedRun = blankedLines.slice(i, j);
    let needsReorder = false;
    let sawType = false;
    for (let k = 0; k < run.length; k++) {
      const kind = classify(run[k]!, blankedRun[k]!);
      if (kind === "type") sawType = true;
      else if (kind === "value" && sawType) { needsReorder = true; break; }
    }
    if (needsReorder) {
      const values = run.filter((l, k) => classify(l, blankedRun[k]!) === "value");
      const types = run.filter((l, k) => classify(l, blankedRun[k]!) === "type");
      lines.splice(i, run.length, ...values, ...types);
      touched = true;
    }
    i = j;
  }
  return touched ? lines.join("\n") : src;
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
        // 0.6+: sort by local binding (alias if any, else export name).
        // Pre-0.6: sort by the FULL rendered spec text, matching the
        //          legacy implementation which sorted raw `from`-list
        //          entries as plain strings (so `type Result` sorted
        //          alongside `Result`, `ok` etc. in code-unit order).
        // Use plain `<`/`>` for code-unit comparison rather than
        // `localeCompare` — the compiler must emit deterministic output
        // independent of host locale or collation rules.
        const ka = options.aliasAware
          ? (a.alias ?? a.name)
          : renderSpec(a);
        const kb = options.aliasAware
          ? (b.alias ?? b.name)
          : renderSpec(b);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
      })
      .map(renderSpec)
      .join(", ");
    const keyword = typeOnly ? "import type" : "import";
    const replacement = `${keyword} { ${merged} } from "@mbfarias/botscript-runtime";`;
    // 0.6+: position-based splice at the known offset (correct).
    // Pre-0.6: keep the legacy \`String.replace\` behaviour (which targets
    // the FIRST textual occurrence) so files pinned to 0.1–0.5 emit
    // byte-identical TS, even in the degenerate case where the same
    // import text appears earlier in the file (e.g. quoted in a comment).
    if (options.aliasAware) {
      return src.slice(0, existing.matchStart) + replacement +
        src.slice(existing.matchStart + existing.match.length);
    }
    return src.replace(existing.match, replacement);
  }
  const keyword = typeOnly ? "import type" : "import";
  const importLine = `${keyword} { ${[...toAdd].sort().join(", ")} } from "@mbfarias/botscript-runtime";`;
  // Pre-0.6 keeps the legacy "prepend at the very top of the file"
  // behaviour: that's what shipped, and our forward-compat rule says
  // emitted TS for 0.1–0.5 must stay byte-identical. The 0.6+ path
  // uses the smarter "anchor after the last existing runtime import"
  // logic so value/type pairs stay clustered with any pre-existing
  // runtime import.
  if (!options.aliasAware) {
    return `${importLine}\n${src}`;
  }

  // 0.6+: anchor after the last existing runtime import line (if any).
  // Match up to the trailing semicolon (if any). Crucially, do NOT consume
  // the line-terminating newline — we splice `\n + newLine` right after
  // \`lastEnd\`, so eating the newline here would inject a blank line
  // between the existing import and the new one (which would also break
  // \`normalizeRuntimeImportOrder\`'s leading-line scan).
  const runtimeImportRe =
    /^import(?:\s+type)?\s+\{[^}]*\}\s+from\s+["']@mbfarias\/botscript-runtime["'];?/gm;
  // Under 0.6+ comment-aware mode, ignore matches that fall inside a
  // comment or string literal. We probe the blanked source at each match
  // offset — if the `import` keyword is still visible there, the match
  // is real code. Pre-0.6 keeps the legacy behaviour where any text
  // match counts (mirrors the older `String.replace`-based prepend).
  const blanked = options.commentAware ? blankStringsAndComments(src) : null;
  let lastEnd = -1;
  for (let m: RegExpExecArray | null; (m = runtimeImportRe.exec(src)) !== null; ) {
    if (blanked) {
      const probe = blanked.slice(m.index, m.index + m[0].length);
      if (!probe.trimStart().startsWith("import")) continue;
    }
    // Advance to end-of-line so trailing same-line content — e.g. an
    // inline `// comment` after the semicolon, or non-canonical extra
    // whitespace — stays on the existing import's line, not on the new
    // one we're about to splice in.
    let eol = m.index + m[0].length;
    // Stop at any LineTerminator (LF, CR, LS, PS) — not just LF — so the
    // splice point stays on the existing import's line for CR-only and
    // CRLF inputs too.
    while (eol < src.length && !isLineTerminatorAt(src, eol)) eol++;
    lastEnd = eol;
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
function collectLocallyDeclared(blanked: string): { values: Set<string>; types: Set<string> } {
  const values = new Set<string>();
  const types = new Set<string>();
  // Top-level declarations only. Anchor at start-of-line without any
  // leading whitespace so an INDENTED \`let ok = ...\` inside a function
  // body (a different scope from the module top level) doesn't suppress
  // auto-importing \`ok\` for code elsewhere in the file. The trade-off
  // is the rare case of an indented module-level decl (e.g. inside an
  // IIFE wrapper or a top-level block) being missed; for that file the
  // auto-import would shadow the local name. We prefer the false-positive
  // import (which TS will then flag) over the false-negative (which would
  // silently break the file).
  // Capture group 1 names the declaration KEYWORD so we can route the
  // binding into the value or type bag. \`function\`/\`const\`/\`let\`/
  // \`var\` bind values only; \`interface\`/\`type\` bind types only;
  // \`class\`/\`enum\` bind BOTH.
  //
  // The pattern tolerates:
  //   - an optional leading `declare` (ambient declarations like
  //     `declare function ok(...)` or `declare const ok = ...`)
  //   - an optional `*` after `function` (generator declarations)
  const DECL_RE =
    /^(?:export\s+)?(?:declare\s+)?(?:default\s+)?(?:async\s+)?(function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = DECL_RE.exec(blanked)) !== null) {
    const keyword = m[1]!;
    const name = m[2]!;
    if (keyword === "interface" || keyword === "type") {
      types.add(name);
    } else if (keyword === "class" || keyword === "enum") {
      values.add(name);
      types.add(name);
    } else {
      values.add(name);
    }
  }
  // Top-level destructuring: \`const { ok, http: myHttp } = obj\` binds
  // \`ok\` and \`myHttp\` locally and would shadow the stdlib auto-import
  // of \`ok\`. Destructuring is value-only (TS doesn't have type-level
  // destructuring at module top level in any meaningful way).
  const DESTRUCT_RE = /^(?:export\s+)?(?:const|let|var)\s*\{([^}]*)\}/gm;
  while ((m = DESTRUCT_RE.exec(blanked)) !== null) {
    for (const raw of m[1]!.split(",")) {
      const piece = raw.trim();
      if (!piece) continue;
      const colonIdx = piece.indexOf(":");
      const local = colonIdx >= 0 ? piece.slice(colonIdx + 1) : piece;
      const trimmed = local.split("=")[0]!.trim();
      const id = trimmed.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/)?.[1];
      if (id) values.add(id);
    }
  }
  return { values, types };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
