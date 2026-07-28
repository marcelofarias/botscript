/**
 * Observed<T> — provenance-tracking wrapper for values observed at a point in time.
 *
 * Where `Fetched<T>` marks *who* provided data (trust boundary), `Observed<T>`
 * marks *when and where* a value was observed (temporal and source boundary).
 * The two track different failure modes:
 *   - Fetched/Trusted: "has this external data been validated?"
 *   - Observed: "is this observation still valid given what has changed?"
 *
 * Motivation (from Moltbook neo_konsi_s2bw thread on confidence-across-service-
 * boundaries): a confidence score or computed value becomes stale when the
 * input snapshot it was derived from changes. Passing it as a bare value
 * erases that information — the receiver cannot distinguish "fresh 0.91" from
 * "stale 0.91 computed from yesterday's model weights." The fix is to cross
 * boundaries as `Observed<T>` so the receiver can call `sameSnapshot` before
 * treating the value as current.
 *
 * Design:
 *   - `Observed<T, Scheme>` is a struct, not a phantom brand. Provenance must
 *     be accessible at runtime for comparison.
 *   - `.value` is the explicit downgrade path. Accessing it is always safe;
 *     the question `sameSnapshot` answers is whether the computation is still
 *     current relative to a reference observation.
 *   - `snapshotHash` is the staleness key, not a TTL. "Stale" means the input
 *     snapshot changed, not that time has passed. Use `observedAt` (epoch ms)
 *     for TTL-style expiry only as a fallback when the snapshot is unavailable.
 *   - `scheme` identifies the canonicalization domain of the hash (e.g.
 *     "sha256-v1", "etag-v1", "model-weights-sha"). Two hashes computed under
 *     different schemes are not comparable — `sameSnapshot` enforces this at
 *     both the type level (same Scheme generic) and runtime (hard throw on
 *     scheme mismatch, guarding against generic erasure).
 *
 * Composition with Fetched/Trusted:
 *   `Observed<Fetched<T>>` — an externally-sourced value at a specific snapshot.
 *   `Observed<Trusted<T>>` — a validated value at a specific snapshot.
 *   Both are valid and compose naturally.
 */

/**
 * Provenance metadata attached to every `Observed<T, Scheme>` value.
 *
 * `scheme` names the canonicalization domain used to compute `snapshotHash`.
 * Two provenances are only comparable when their schemes match — attempting
 * to call `sameSnapshot` on observations with different Scheme types is a
 * compile error; passing mismatched schemes through `unknown` is a runtime
 * throw.
 *
 * `snapshotHash` is the primary staleness key within a scheme: two observations
 * are "same snapshot" iff their schemes match AND their hashes match. The hash
 * must be deterministic given the same inputs and change whenever the relevant
 * inputs change. What counts as the snapshot is up to the producer — it might
 * be a model version hash, an input document hash, a database row etag, or a
 * cache key.
 *
 * `source` identifies the agent/service/tool that made the observation.
 * `version` is the producer version at observation time (semver, commit SHA,
 * model tag). Together they identify "which version of this producer produced
 * this observation."
 *
 * `observedAt` is Unix timestamp (ms). Used for TTL-style expiry when a
 * snapshotHash is unavailable or when wall-clock recency matters regardless
 * of snapshot identity.
 */
export interface Provenance<Scheme extends string = string> {
  readonly scheme: Scheme;
  readonly source: string;
  readonly version: string;
  readonly snapshotHash: string;
  readonly observedAt: number;
}

/**
 * A value observed at a specific point in time with provenance metadata.
 *
 * The `Scheme` parameter tracks the canonicalization domain of the snapshot
 * hash. `sameSnapshot` requires both observations to share the same `Scheme`,
 * preventing silent false-positive equality across incompatible hash schemes.
 *
 * `Observed<T>` (Scheme defaults to `string`) is the escape hatch for callers
 * that don't yet carry a typed scheme — they lose compile-time scheme checking
 * but still get the runtime throw in `sameSnapshot`.
 *
 * `Observed<T>` is NOT assignable to `T` — the receiver must explicitly
 * access `.value` to use the underlying data. This forces the question
 * "am I using stale data?" to be visible at every use site.
 */
export interface Observed<T, Scheme extends string = string> {
  readonly value: T;
  readonly provenance: Provenance<Scheme>;
}

/**
 * Wrap a value with provenance metadata, producing an `Observed<T, Scheme>`.
 *
 * Call at every observation boundary: the output of a model call, the result
 * of a cache lookup, or any value whose validity depends on a specific input
 * snapshot or source version.
 */
export const observe = <T, Scheme extends string = string>(
  value: T,
  provenance: Provenance<Scheme>,
): Observed<T, Scheme> => ({
  value,
  provenance,
});

/**
 * Returns true iff two observations share the same snapshot hash within the
 * same canonicalization scheme.
 *
 * Requires both observations to share the same `Scheme` type parameter —
 * passing observations with different Scheme types is a compile error.
 *
 * Runtime hard failure: if the scheme strings differ at runtime (e.g. due to
 * generic erasure with `as unknown as Observed<T>`), `sameSnapshot` throws
 * rather than returning a misleading false positive or false negative.
 *
 *   if (!sameSnapshot(cached, current)) {
 *     return err("stale observation — recompute");
 *   }
 *
 * Producers must guarantee that `snapshotHash` changes whenever the relevant
 * inputs change. Scheme mismatches always throw — there is no "compatible"
 * cross-scheme comparison.
 */
export const sameSnapshot = <T, U, Scheme extends string>(
  a: Observed<T, Scheme>,
  b: Observed<U, Scheme>,
): boolean => {
  if (a.provenance.scheme !== b.provenance.scheme) {
    throw new Error(
      `sameSnapshot: incompatible schemes — '${a.provenance.scheme}' vs '${b.provenance.scheme}'. ` +
        `Cross-scheme hash comparison is never valid.`,
    );
  }
  return a.provenance.snapshotHash === b.provenance.snapshotHash;
};

/**
 * Returns true iff the observation is older than `maxAgeMs` milliseconds.
 *
 * TTL-style expiry: use when the relevant staleness criterion is wall-clock
 * age rather than snapshot identity. Requires a current timestamp from an
 * external source (pass `time.now()` from the botscript stdlib — do not call
 * `Date.now()` directly, which bypasses the `time` capability declaration).
 *
 *   if (expired(obs, time.now(), 60_000)) {
 *     return err("observation expired");
 *   }
 */
export const expired = <T, Scheme extends string = string>(
  obs: Observed<T, Scheme>,
  nowMs: number,
  maxAgeMs: number,
): boolean => nowMs - obs.provenance.observedAt > maxAgeMs;

/**
 * Refresh an observation: produce a new `Observed<T, NewScheme>` with updated
 * provenance while keeping the same value. Use when a downstream agent re-
 * validates or re-confirms a value without recomputing it.
 *
 * The new provenance may carry a different Scheme — freshening is the explicit
 * re-provenance operation, so a scheme change is intentional and permitted.
 *
 *   const confirmed = freshen(obs, {
 *     scheme: "sha256-v1",
 *     source: "validator-agent",
 *     version: "1.2.0",
 *     snapshotHash: currentHash,
 *     observedAt: time.now(),
 *   });
 */
export const freshen = <T, OldScheme extends string, NewScheme extends string = OldScheme>(
  obs: Observed<T, OldScheme>,
  newProvenance: Provenance<NewScheme>,
): Observed<T, NewScheme> => ({
  value: obs.value,
  provenance: newProvenance,
});

/**
 * Map the value inside an `Observed<T, Scheme>` without changing its provenance.
 *
 * Use when transforming an observed value in a way that does not invalidate
 * the observation's provenance — e.g. deserializing a raw string into a typed
 * struct. The resulting observation has the same `scheme`, `snapshotHash`, and
 * `observedAt` as the source.
 *
 * If the transform changes the snapshot identity (e.g. aggregating multiple
 * inputs), create a new `Observed<U, Scheme>` with `observe()` and a fresh
 * provenance instead.
 */
export const mapObserved = <T, U, Scheme extends string = string>(
  obs: Observed<T, Scheme>,
  fn: (value: T) => U,
): Observed<U, Scheme> => ({
  value: fn(obs.value),
  provenance: obs.provenance,
});
