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
 *   - `Observed<T>` is a struct, not a phantom brand. Provenance must be
 *     accessible at runtime for comparison — a bare cast (like `Fetched<T>`)
 *     would lose the metadata.
 *   - `.value` is the explicit downgrade path. Accessing it is always safe;
 *     the question `sameSnapshot` answers is whether the computation is still
 *     current relative to a reference observation.
 *   - `snapshotHash` is the staleness key, not a TTL. "Stale" means the input
 *     snapshot changed, not that time has passed. Use `observedAt` (epoch ms)
 *     for TTL-style expiry only as a fallback when the snapshot is unavailable.
 *
 * Composition with Fetched/Trusted:
 *   `Observed<Fetched<T>>` — an externally-sourced value at a specific snapshot.
 *   `Observed<Trusted<T>>` — a validated value at a specific snapshot.
 *   Both are valid and compose naturally.
 */

/**
 * Provenance metadata attached to every `Observed<T>` value.
 *
 * `snapshotHash` is the primary staleness key: two observations are "same
 * snapshot" iff their hashes match. What counts as the snapshot is up to the
 * producer — it might be a model version hash, an input document hash, a
 * database row etag, or a cache key. The string must be deterministic given
 * the same inputs and change whenever the relevant inputs change.
 *
 * `source` is the identifier for the agent/service/tool that made the
 * observation. Opaque to the runtime; used only for audit/logging.
 *
 * `version` is the version of the producer at observation time (e.g. semver,
 * commit SHA, model tag). Paired with `source` to identify "which version of
 * this producer produced this observation."
 *
 * `observedAt` is the Unix timestamp (ms) of the observation. For TTL-style
 * expiry when a snapshotHash is unavailable or when wall-clock recency
 * matters regardless of snapshot identity.
 */
export interface Provenance {
  readonly source: string;
  readonly version: string;
  readonly snapshotHash: string;
  readonly observedAt: number;
}

/**
 * A value observed at a specific point in time with provenance metadata.
 *
 * `value` carries the observation result. `provenance` carries the metadata
 * needed to evaluate whether the observation is still current.
 *
 * `Observed<T>` is NOT assignable to `T` — the receiver must explicitly
 * access `.value` to use the underlying data. This forces the question
 * "am I using stale data?" to be visible at every use site.
 */
export interface Observed<T> {
  readonly value: T;
  readonly provenance: Provenance;
}

/**
 * Wrap a value with provenance metadata, producing an `Observed<T>`.
 *
 * Call at every observation boundary: the output of a model call, the result
 * of a cache lookup, or any value whose validity depends on a specific input
 * snapshot or source version.
 */
export const observe = <T>(value: T, provenance: Provenance): Observed<T> => ({
  value,
  provenance,
});

/**
 * Returns true iff two observations share the same snapshot hash.
 *
 * Use to check whether a downstream consumer's reference snapshot matches
 * the observation's snapshot before treating the observation as current:
 *
 *   if (!sameSnapshot(cached, current)) {
 *     return err("stale observation — recompute");
 *   }
 *
 * Two observations with equal `snapshotHash` are "from the same snapshot"
 * regardless of `source`, `version`, or `observedAt`. Producers must
 * guarantee that `snapshotHash` changes whenever the relevant inputs change.
 */
export const sameSnapshot = <T, U>(a: Observed<T>, b: Observed<U>): boolean =>
  a.provenance.snapshotHash === b.provenance.snapshotHash;

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
export const expired = <T>(obs: Observed<T>, nowMs: number, maxAgeMs: number): boolean =>
  nowMs - obs.provenance.observedAt > maxAgeMs;

/**
 * Refresh an observation: produce a new `Observed<T>` with updated provenance
 * while keeping the same value. Use when a downstream agent re-validates or
 * re-confirms a value without recomputing it.
 *
 *   const confirmed = freshen(obs, {
 *     source: "validator-agent",
 *     version: "1.2.0",
 *     snapshotHash: currentHash,
 *     observedAt: time.now(),
 *   });
 */
export const freshen = <T>(obs: Observed<T>, newProvenance: Provenance): Observed<T> => ({
  value: obs.value,
  provenance: newProvenance,
});

/**
 * Map the value inside an `Observed<T>` without changing its provenance.
 *
 * Use when transforming an observed value in a way that does not invalidate
 * the observation's provenance — e.g. deserializing a raw string into a typed
 * struct. The resulting observation has the same `snapshotHash` and
 * `observedAt` as the source.
 *
 * If the transform changes the snapshot identity (e.g. aggregating multiple
 * inputs), create a new `Observed<U>` with `observe()` and a new provenance
 * instead.
 */
export const mapObserved = <T, U>(obs: Observed<T>, fn: (value: T) => U): Observed<U> => ({
  value: fn(obs.value),
  provenance: obs.provenance,
});
