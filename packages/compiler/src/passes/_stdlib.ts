/**
 * Shared stdlib namespace → capability mapping.
 * Canonical source — import from here to avoid drift.
 * Extracted from cap-check.ts to break the circular dependency between
 * cap-check.ts and _alias.ts.
 */
export const STDLIB_TO_CAP: Readonly<Record<string, string>> = {
  http: "net",
  time: "time",
  random: "random",
  fs: "fs",
  stdout: "stdout",
  stderr: "stderr",
  // clock is a free namespace — no capability declaration required.
  // clock.sequence() returns a MonotonicTimestamp: a process-local monotonic counter
  // that provides ordering guarantees without wallclock access. CAP001 skips namespaces
  // mapped to "" (falsy), so `uses { clock }` is never required.
  clock: "",
};

/**
 * Stdlib namespaces that require no capability declaration but are stateful
 * (non-deterministic per call). Intent-check uses this set to block
 * `intent: "pure"` (INT002) and `intent: "idempotent"` (INT004) claims even
 * though cap-check never fires for these namespaces.
 */
export const STATEFUL_FREE_NAMESPACES: ReadonlySet<string> = new Set(["clock"]);
