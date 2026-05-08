/**
 * Minimal exhaustive match. The compiler rewrites `match expr { Pat -> arm; ... }`
 * into a call to `$match(expr, arms)` where `arms` is an array of
 * `[predicate, handler]` tuples produced from the patterns.
 *
 * Patterns are deliberately simple. We support:
 *   - tag-only:        `Circle -> ...`         -> matches { kind: "Circle" } or string "Circle"
 *   - tag with bind:   `Circle { r } -> ...`   -> matches { kind: "Circle", r } and binds `r`
 *   - literal:         `"foo" -> ...`          -> equality
 *   - wildcard:        `_ -> ...`              -> always matches (must be last)
 *
 * Exhaustiveness is enforced at runtime by throwing when no arm matches and no
 * wildcard was provided. The compiler also emits a TypeScript `never` check
 * at the call site for static enforcement on tagged unions.
 */
export type MatchArm<T, R> = readonly [predicate: (v: T) => false | Record<string, unknown>, handler: (binds: Record<string, unknown>) => R];

export const $match = <T, R>(value: T, arms: ReadonlyArray<MatchArm<T, R>>): R => {
  for (const [pred, handler] of arms) {
    const match = pred(value);
    if (match !== false) return handler(match);
  }
  throw new Error(
    `match: no arm matched value ${JSON.stringify(value)}. ` +
      `Add a wildcard '_' arm or cover the missing case.`,
  );
};

export const $tagMatch =
  (tag: string, binds: ReadonlyArray<string> = []) =>
  (v: unknown): false | Record<string, unknown> => {
    if (typeof v === "string") return v === tag ? {} : false;
    if (v && typeof v === "object" && (v as { kind?: unknown }).kind === tag) {
      const out: Record<string, unknown> = {};
      for (const b of binds) out[b] = (v as Record<string, unknown>)[b];
      return out;
    }
    return false;
  };

export const $literalMatch =
  (lit: string | number | boolean | null) =>
  (v: unknown): false | Record<string, unknown> =>
    v === lit ? {} : false;

export const $wildcard =
  () =>
  (_v: unknown): false | Record<string, unknown> =>
    ({});
