import { parseProgram } from "./parser/parse.js";
import type { Token } from "./parser/lex.js";

/**
 * Declared effect surface of a single exported function from another module.
 * Used by passDepCheck and passThrCheck to extend transitivity across files.
 */
export interface FnEffectSurface {
  reads?: readonly string[];
  writes?: readonly string[];
  throws?: readonly string[];
}

/**
 * Effect map for imported functions. Keys are bare function names as they
 * appear at the call site. Consumed by dep-check and thr-check passes to
 * extend DEP001/DEP002/THR001 transitivity beyond same-file calls.
 *
 * Known limitation: keys are declared function names, so aliased imports
 * (`import { fetchRow as fetchUser }`) are not yet resolved to their call-site
 * alias. Tracked separately; cross-file checks degrade gracefully (no false
 * positives) when an alias is in play.
 */
export type ModuleEffects = Readonly<Record<string, FnEffectSurface>>;

/**
 * Union two effect surfaces, deduplicating each capability list. Used when two
 * project files declare functions of the same name — their surfaces merge
 * rather than the later one silently clobbering the earlier.
 */
export function mergeEffectSurface(
  a: FnEffectSurface,
  b: FnEffectSurface,
): FnEffectSurface {
  const merged: FnEffectSurface = {};
  const reads = [...new Set([...(a.reads ?? []), ...(b.reads ?? [])])];
  const writes = [...new Set([...(a.writes ?? []), ...(b.writes ?? [])])];
  const throws = [...new Set([...(a.throws ?? []), ...(b.throws ?? [])])];
  if (reads.length) merged.reads = reads;
  if (writes.length) merged.writes = writes;
  if (throws.length) merged.throws = throws;
  return merged;
}

/**
 * Scan a token stream for exported function names.
 *
 * Handles two forms:
 *   - trailing lists:  export { name1, name2 }
 *   - inline exports:  export fn name(  /  export function name(
 *
 * Type-only exports (`export type { … }`, `export type Foo = …`) are ignored
 * because they cannot be called.
 *
 * Operates over the lexer token stream so string/template/comment content is
 * never misread as a real export statement.
 *
 * Returns the set of exported names, or null when the source contains no
 * export statements at all — the null sentinel means "include everything"
 * (plain script with no module boundary, backward-compatible with the
 * pre-export-filtering behavior).
 */
function scanExports(tokens: readonly Token[]): Set<string> | null {
  const names = new Set<string>();
  let hasExport = false;

  /** Advance past whitespace, newline, and comment tokens. */
  function skipWs(i: number): number {
    while (i < tokens.length) {
      const k = tokens[i]!.kind;
      if (
        k === "whitespace" ||
        k === "newline" ||
        k === "lineComment" ||
        k === "blockComment"
      ) {
        i++;
      } else {
        break;
      }
    }
    return i;
  }

  // Track brace/paren/bracket nesting so we only act on `export` at the
  // top level (depth 0). An `export` identifier inside a function body must
  // not be treated as a module export statement.
  let depth = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;

    if (t.kind === "open") {
      depth++;
      continue;
    }
    if (t.kind === "close") {
      if (depth > 0) depth--;
      continue;
    }

    // Only care about `export` appearing as a top-level ident (depth 0, not
    // inside strings, templates, comments, or other non-code tokens).
    if (depth !== 0) continue;
    if (t.kind !== "ident" || t.text !== "export") continue;

    const j = skipWs(i + 1);
    if (j >= tokens.length) continue;
    const next = tokens[j]!;

    // `export type …` — skip type-only forms; they are not callable and do
    // not flip a file into "module mode" for effect-surface purposes.
    if (next.kind === "ident" && next.text === "type") {
      continue;
    }

    // Any non-type export (fn, const, default, *, …) flips the file into
    // module mode. We set this unconditionally here and then extract callable
    // names only from the forms we understand (fn / { … }).
    hasExport = true;

    // `export [async] [unsafe "reason"] fn name(` or `export function name(`
    // Advance past optional modifiers (async, unsafe "reason") in any order
    // before checking for the fn/function keyword.
    {
      let k = j;
      let advanced = true;
      while (advanced) {
        advanced = false;
        const cur = tokens[k];
        if (!cur) break;
        if (cur.kind === "keyword" && cur.text === "async") {
          k = skipWs(k + 1);
          advanced = true;
        } else if (cur.kind === "keyword" && cur.text === "unsafe") {
          const m = skipWs(k + 1);
          if (m < tokens.length && tokens[m]!.kind === "string") {
            k = skipWs(m + 1);
            advanced = true;
          }
        }
      }
      const modToken = tokens[k];
      if (
        modToken &&
        ((modToken.kind === "keyword" && modToken.text === "fn") ||
          (modToken.kind === "ident" && modToken.text === "function"))
      ) {
        const nameIdx = skipWs(k + 1);
        if (nameIdx < tokens.length && tokens[nameIdx]!.kind === "ident") {
          names.add(tokens[nameIdx]!.text);
        }
        continue;
      }
    }

    // `export { name1, name2 as alias, ... }` — local re-exports only.
    // `export { foo } from "x"` is a re-export of a foreign binding; those
    // names are not locally declared, so skip them to avoid polluting the
    // local-export set and incorrectly treating same-named private helpers
    // as exported. Also bail on unmatched `{` (syntax error) rather than
    // scanning to EOF and collecting unrelated identifiers.
    if (next.kind === "open" && next.text === "{") {
      const closeIdx = next.matchedAt;
      if (closeIdx === undefined) continue; // malformed brace — bail
      const afterClose = skipWs(closeIdx + 1);
      if (
        afterClose < tokens.length &&
        tokens[afterClose]!.kind === "ident" &&
        tokens[afterClose]!.text === "from"
      ) {
        continue; // re-export from another module — not a local binding
      }
      let k = j + 1;
      while (k < closeIdx) {
        const tk = tokens[k]!;
        if (tk.kind === "ident") {
          const name = tk.text;
          // Look ahead for optional `as alias` — source name is the one before `as`
          let m = skipWs(k + 1);
          if (
            m < closeIdx &&
            tokens[m]!.kind === "ident" &&
            tokens[m]!.text === "as"
          ) {
            // Skip the alias ident; source name is `name`
            m = skipWs(m + 1);
            k = m + 1;
          } else {
            k++;
          }
          names.add(name);
          continue;
        }
        k++;
      }
    }
  }

  return hasExport ? names : null;
}

/**
 * Build a {@link ModuleEffects} map from a set of `.bs` source strings.
 *
 * Shared by the CLI and the Vite plugin so the parse/merge/keying behavior
 * (and bug fixes to it) cannot drift between integrations. File collection and
 * IO stay with each caller; this helper is pure over its inputs.
 *
 * - Uses a null-prototype map so function names like `__proto__` or `toString`
 *   cannot pollute the result or trigger accidental prototype-chain merges.
 * - Same-name declarations across files are merged via {@link mergeEffectSurface}.
 * - Malformed sources are skipped so cross-file checking degrades gracefully.
 * - When a source has export statements, only exported functions are included.
 *   Sources with no export statements contribute all their fns (script mode).
 *
 * Pass sources in a stable order (callers sort their file lists) so the merged
 * result is deterministic across platforms.
 *
 * Known limitation: keys are declared function names, so aliased imports
 * (`import { fetchRow as fetchUser }`) are not yet resolved to their call-site
 * alias. Cross-file checks degrade gracefully (no false positives) when an
 * alias is in play. Tracked for a follow-up.
 */
export function buildModuleEffects(sources: readonly string[]): ModuleEffects {
  const effects = Object.create(null) as Record<string, FnEffectSurface>;
  for (const src of sources) {
    let program;
    try {
      program = parseProgram(src, { allowGenerics: true });
    } catch {
      // Malformed source — skip; cross-file checking degrades gracefully.
      continue;
    }
    // null → no export statements → include all fns (script / no-module-boundary mode)
    const exported = scanExports(program.tokens);
    for (const stmt of program.fns) {
      const { decl } = stmt;
      if (exported !== null && !exported.has(decl.name)) continue;
      const surface: FnEffectSurface = {};
      if (decl.reads?.length) surface.reads = decl.reads;
      if (decl.writes?.length) surface.writes = decl.writes;
      if (decl.throws?.length) surface.throws = decl.throws;
      if (Object.keys(surface).length > 0) {
        effects[decl.name] = Object.hasOwn(effects, decl.name)
          ? mergeEffectSurface(effects[decl.name]!, surface)
          : surface;
      }
    }
  }
  return effects;
}
