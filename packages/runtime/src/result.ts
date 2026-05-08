export type Ok<T> = { readonly kind: "ok"; readonly value: T };
export type Err<E> = { readonly kind: "err"; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ kind: "ok", value });
export const err = <E>(error: E): Err<E> => ({ kind: "err", error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.kind === "ok";
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => r.kind === "err";

export const mapResult = <T, E, U>(r: Result<T, E>, f: (t: T) => U): Result<U, E> =>
  isOk(r) ? ok(f(r.value)) : r;

export const mapErr = <T, E, F>(r: Result<T, E>, f: (e: E) => F): Result<T, F> =>
  isErr(r) ? err(f(r.error)) : r;

export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (isOk(r)) return r.value;
  throw new Error(`unwrap on Err: ${String((r as Err<E>).error)}`);
};

/**
 * Used by the `?` postfix operator's desugaring. Returns a sentinel that the
 * compiler-emitted code recognizes; not exported as a public API on purpose.
 */
export const __unwrap_or_short_circuit = <T, E>(
  r: Result<T, E>,
): { __short: true; err: Err<E> } | { __short: false; value: T } =>
  isOk(r)
    ? { __short: false, value: r.value }
    : { __short: true, err: r };

/**
 * Implementation of the `Result.try { ... }` block. Runs `body`; if it throws,
 * the thrown value is stringified into `Err`. The compiler emits a call to
 * this helper so user code never has to import `ok` / `err` to use the form.
 */
export const $resultTry = <T>(body: () => T): Result<T, string> => {
  try {
    return ok(body());
  } catch (e) {
    return err(stringifyThrown(e));
  }
};

/** Async variant — awaits the body and lifts a thrown/rejected value into Err. */
export const $resultTryAsync = async <T>(body: () => Promise<T> | T): Promise<Result<T, string>> => {
  try {
    return ok(await body());
  } catch (e) {
    return err(stringifyThrown(e));
  }
};

const stringifyThrown = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
};
