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
 */
export type ModuleEffects = Readonly<Record<string, FnEffectSurface>>;
