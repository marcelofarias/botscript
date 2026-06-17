import { $require } from "./capabilities.js";
import { ok, err, type Result } from "./result.js";

/**
 * Coerce an unknown throwable into a real `Error`. If the value is already an
 * `Error` it's returned as-is so the original stack and properties survive.
 * Otherwise we wrap it: the message comes from `String(value)` (best-effort
 * human-readable) and the original value goes into `cause` so debuggers and
 * error reporters can still see the unboxed payload (typed as `unknown` per
 * ES2022 Error cause semantics).
 */
const toError = (e: unknown): Error => {
  if (e instanceof Error) return e;
  return new Error(String(e), { cause: e });
};


/**
 * Capability-checked wrappers around the few side effects botscript blesses
 * with built-in syntax. App code can extend this set by writing thin wrappers
 * that call `$require(...)` themselves.
 *
 * The `fs` wrappers live in a separate entry — `@mbfarias/botscript-runtime/fs`
 * — so the surface here is the non-filesystem subset of effects:
 *   import { http } from "@mbfarias/botscript-runtime";
 *   import { fs }   from "@mbfarias/botscript-runtime/fs";
 *
 * Runtime requirement: the `http` wrappers here rely on the global Fetch
 * API (`fetch`, `Response`). That's available in modern browsers, Bun,
 * Deno, and Node 18+; the package's `engines.node` pins the minimum Node
 * version. The capability machinery in `./capabilities.js` is pure JS
 * and runs anywhere; only the `./fs` subpath is strictly Node-only
 * (it imports `node:fs` / `node:path`).
 */

export const http = {
  /**
   * Perform a GET request. Returns `Promise<Result<Response, Error>>` so the
   * `?` unwrap operator can be used directly after `await`. Use parentheses
   * around `await http.get(url)` so `?` clearly applies to the resolved
   * `Result`, not to the `Promise` (matches the primer's `loadUser` idiom):
   *
   *   let res = (await http.get(url))?
   *
   * Network-level errors (connection refused, DNS failure, etc.) are caught
   * and lifted into `Err`. HTTP error status codes are NOT automatically
   * converted — the resolved `Response` is always wrapped in `Ok`. After
   * unwrapping with `?` you hold a plain `Response`; check `res.ok` or
   * `res.status` directly. Without unwrapping, narrow on the Result first
   * (`isOk(res)` or `if (res.kind === "ok")`) before reading `res.value`.
   */
  get: async (url: string, init?: RequestInit): Promise<Result<Response, Error>> => {
    $require("net");
    try {
      return ok(await fetch(url, init));
    } catch (e) {
      return err(toError(e));
    }
  },
  /**
   * Perform a POST request. Same `Result` semantics as `http.get`.
   *
   * The HTTP method is always `POST` — `init.method` (if supplied) is
   * spread in first and then overwritten, so callers cannot accidentally
   * (or intentionally) downgrade this to GET / upgrade to PUT through the
   * init bag. Use a different wrapper for other verbs.
   */
  post: async (url: string, init?: RequestInit): Promise<Result<Response, Error>> => {
    $require("net");
    try {
      return ok(await fetch(url, { ...init, method: "POST" }));
    } catch (e) {
      return err(toError(e));
    }
  },
};

/**
 * MonotonicTimestamp — an opaque, process-local, ordered counter value.
 * Provides ordering guarantees (A happened before B) without wallclock access.
 * Not serializable as real time; not comparable across processes or restarts.
 */
export type MonotonicTimestamp = number & { readonly __brand: "MonotonicTimestamp" };

// Process-local monotonic sequence counter. Starts at 0, increments by 1.
// Does not require a capability declaration — no external state, no wallclock.
let _clockSeq = 0;

export const clock = {
  /**
   * Returns the next MonotonicTimestamp for the current process execution.
   * Each call returns a value strictly greater than the previous call's value.
   * Suitable for ordering events in structured logs without declaring `uses { time }`.
   */
  sequence: (): MonotonicTimestamp => _clockSeq++ as MonotonicTimestamp,
};

// Mockable sources. `with mocks { time, random }` swaps these in tests; in
// app code they default to the real wallclock and Math.random.
let timeSource: () => number = () => Date.now();
let randomSource: () => number = () => Math.random();

export const time = {
  now: (): number => {
    $require("time");
    return timeSource();
  },
  iso: (): string => {
    $require("time");
    return new Date(timeSource()).toISOString();
  },
};

export const random = {
  next: (): number => {
    $require("random");
    return randomSource();
  },
  int: (min: number, max: number): number => {
    $require("random");
    return Math.floor(randomSource() * (max - min)) + min;
  },
};

// Internal — used by $withMocks. Don't import from app code.
export const __setTimeSource = (fn: () => number): void => {
  timeSource = fn;
};
export const __setRandomSource = (fn: () => number): void => {
  randomSource = fn;
};
export const __resetSources = (): void => {
  timeSource = () => Date.now();
  randomSource = () => Math.random();
};

export const stdout = {
  println: (s: string): void => {
    $require("stdout");
    console.log(s);
  },
  write: (s: string): void => {
    $require("stdout");
    process.stdout.write(s);
  },
};

export const stderr = {
  println: (s: string): void => {
    $require("stderr");
    console.error(s);
  },
};
