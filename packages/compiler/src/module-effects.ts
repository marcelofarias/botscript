import { parseProgram } from "./parser/parse.js";

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
 *
 * Pass sources in a stable order (callers sort their file lists) so the merged
 * result is deterministic across platforms.
 *
 * Known limitation: every top-level `fn` is included, not just exported ones.
 * botscript exports via trailing `export { … }` statements that the shallow
 * parser does not yet surface, so visibility can't be honored here today. In
 * practice this only matters if two files declare a same-name *private* helper
 * with differing effects; tracked for a follow-up alongside alias-aware keying.
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
    for (const stmt of program.fns) {
      const { decl } = stmt;
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
