/**
 * Capabilities — the set of side-effect categories a function declares it touches.
 *
 * In a real implementation this would be a static analysis. For now we use a
 * runtime tag: `fn ... uses { net, fs }` is rewritten by the compiler into a
 * function whose body is wrapped in `$enter([...])`. Calls to capability-
 * checked APIs (`http.get`, `fs.read`, `time.now`, `random.next`) consult the
 * current capability stack and throw `CapabilityViolation` if their category
 * was not declared by the calling function.
 *
 * `pure { ... }` enters with an empty stack frame; nothing capability-checked
 * may run inside.
 */
export type Capability =
  | "net"
  | "fs"
  | "time"
  | "random"
  | "process"
  | "stdout"
  | "stderr";

export class CapabilityViolation extends Error {
  constructor(
    public readonly required: Capability,
    public readonly granted: ReadonlyArray<Capability>,
  ) {
    super(
      `CapabilityViolation: this scope did not declare \`${required}\`.\n` +
        `  Granted: ${granted.length === 0 ? "(none — pure scope)" : granted.join(", ")}\n` +
        `  Idiom:   add \`${required}\` to the function's \`uses { ... }\` clause.\n` +
        `  Rewrite: fn name(...) uses { ${[...granted, required].join(", ")} } -> ...`,
    );
  }
}

// Capability frames live on a module-level stack. `$enter` pushes a frame
// before running its callback and pops it when the callback settles. For
// async callbacks the pop is deferred to the promise's settle handlers so
// the frame outlives all of the async body's awaits.
//
// Why not AsyncLocalStorage:
//   1. This package targets browsers as well as Node — every compiled
//      botscript program imports `$enter` from here, including browser
//      apps (see `examples/react-app`). A static `import` of
//      `node:async_hooks` would force every browser bundler to fail at
//      resolve time, breaking the entire browser story.
//   2. With a single-threaded JS runtime, the array sees the same
//      ordering as a per-context store for nested and sequential calls.
//      The only case it gets wrong is two concurrent async `$enter`
//      calls with DISJOINT capability sets (e.g. `Promise.all([
//      $enter(["net"], ...), $enter(["fs"], ...)])` where one async
//      body's first awaited effect runs AFTER the other has already
//      pushed its own frame). In practice botscript compiles each
//      `fn ... uses { ... }` into its own `$enter([...], async () =>
//      { ... })`, so this only matters if a caller fans out concurrent
//      effectful fns with non-overlapping caps. We accept that edge case
//      in exchange for keeping browser builds working.
//
// The `./fs` subpath is still Node-only via `node:fs`; that's a separate
// entry point. The main `.` entry stays browser-safe.

const stack: ReadonlyArray<Capability>[] = [];

export const $enter = <T>(caps: ReadonlyArray<Capability>, fn: () => T): T => {
  // Capability frames must outlive async bodies. If `fn` is async its body
  // suspends at the first `await` and the call returns a Promise immediately;
  // a naive synchronous `finally { stack.pop() }` would tear the frame down
  // before any awaited effect runs, so a downstream `$require` would see an
  // empty (or wrong) frame. Detect a thenable return value and defer the pop
  // until the promise settles. Sync callers stay byte-identical with the old
  // synchronous behaviour.
  stack.push(Object.freeze([...caps]));
  let popped = false;
  const pop = (): void => {
    if (popped) return;
    popped = true;
    stack.pop();
  };
  try {
    const result = fn();
    if (
      result !== null &&
      typeof result === "object" &&
      typeof (result as { then?: unknown }).then === "function"
    ) {
      return (result as unknown as Promise<unknown>).then(
        (v) => { pop(); return v; },
        (e) => { pop(); throw e; },
      ) as unknown as T;
    }
    pop();
    return result;
  } catch (e) {
    pop();
    throw e;
  }
};

export const $require = (cap: Capability): void => {
  const top = stack[stack.length - 1];
  if (top === undefined) {
    // No frame — direct top-level call. Conservative default: allow, since
    // top-level is module init. Tests opt-in via $enter([]) for pure assertions.
    return;
  }
  if (!top.includes(cap)) {
    throw new CapabilityViolation(cap, top);
  }
};

export const $current = (): ReadonlyArray<Capability> | undefined => {
  const top = stack[stack.length - 1];
  return top === undefined ? undefined : [...top];
};

/** Test-only: clear the capability stack. Don't call this in app code. */
export const $reset = (): void => {
  stack.length = 0;
};
