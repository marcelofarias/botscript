/**
 * Taint types — provenance-tracking wrappers for data of unknown origin.
 *
 * `Fetched<T>` marks data that arrived from outside the trust boundary:
 * HTTP responses, user input, external API payloads, env vars. It is
 * structurally incompatible with `Trusted<T>` — TypeScript's type system
 * rejects passing `Fetched<string>` where `Trusted<string>` is required,
 * without any runtime overhead.
 *
 * `Trusted<T>` is the post-validation form. The only way to promote a
 * `Fetched<T>` to `Trusted<T>` is through `trust()`, which forces an
 * explicit validation gate and returns `Result<Trusted<T>, string>` so
 * callers cannot silently ignore validation failure.
 *
 * Why phantom branding (not a class wrapper):
 *   - Zero runtime cost — `Fetched<T>` is just `T` at runtime.
 *   - No object allocation per-value; hot-path friendly.
 *   - Composes with `Result<Fetched<T>, E>` without extra nesting.
 *   - Structural: `trust()` strips the brand; output is still `T` at
 *     runtime, so downstream code needs no unwrap call.
 *
 * Honest limits (as of 0.8):
 *   - Branding is opt-in. Code that doesn't call `fetched()` doesn't get
 *     taint tracking. Integration points (http.get, env, user input) need
 *     to return `Fetched<T>` for the guarantee to hold end-to-end.
 *   - No compiler diagnostic yet for "external data used without taint
 *     wrapper" — that would be CAP004, planned for 0.9.
 *   - `Trusted::new(data, provenance: ProvenanceBundle)` (the full
 *     auditability path from the Moltbook neo_konsi thread) is future work;
 *     this ships the structural incompatibility guarantee now.
 */

// Phantom brand tags — unique symbol, never constructable by user code.
declare const __fetched: unique symbol;
declare const __trusted: unique symbol;

/**
 * Data of unknown provenance — arrived from outside the trust boundary.
 * Structurally incompatible with `Trusted<T>`.
 */
export type Fetched<T> = T & { readonly [__fetched]: true };

/**
 * Data that has passed an explicit validation gate.
 * Structurally incompatible with `Fetched<T>`.
 */
export type Trusted<T> = T & { readonly [__trusted]: true };

/**
 * Wrap external data as `Fetched<T>`. Call at every trust boundary:
 * HTTP response bodies, user input, deserialized env vars, IPC payloads.
 */
export const fetched = <T>(value: T): Fetched<T> => value as Fetched<T>;

/**
 * Promote `Fetched<T>` to `Trusted<T>` through an explicit validation gate.
 *
 * Returns `ok(Trusted<T>)` when `validate` returns true, `err(reason)` otherwise.
 * The `reason` parameter lets callers attach a human-readable explanation when
 * validation fails; if omitted it defaults to "validation failed".
 *
 * The `Result` return type is load-bearing: callers cannot ignore failure
 * without an explicit `.unwrap()` / `?` / `match`, each of which appears in
 * the audit trail.
 */
export const trust = <T>(
  value: Fetched<T>,
  validate: (v: T) => boolean,
  reason?: string,
): { kind: "ok"; value: Trusted<T> } | { kind: "err"; error: string } => {
  if (validate(value as T)) {
    return { kind: "ok", value: value as unknown as Trusted<T> };
  }
  return { kind: "err", error: reason ?? "validation failed" };
};

/**
 * Escape hatch: assert that you know the data is trusted without validation.
 * Requires a non-empty justification string — the string is visible in the
 * audit trail so reviewers can evaluate the claim. MAT001 will not fire on
 * `trust()` calls but WILL fire on match arms that silently drop the Err from
 * `trust()`, so this is the only way to bypass the gate with an audit record.
 *
 * Use sparingly. If you're reaching for this, ask whether the data should
 * instead be validated upstream.
 */
export const trustUnchecked = <T>(value: Fetched<T>, _justification: string): Trusted<T> =>
  value as unknown as Trusted<T>;
