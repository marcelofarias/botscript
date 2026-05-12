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

// Capability frames are stored in an AsyncLocalStorage so each async chain
// carries its own stack. A naive module-level array would interleave under
// concurrent async `$enter` calls (e.g. via `Promise.all`): one task's pop
// would tear down another task's frame and `$require` would consult the
// wrong top. AsyncLocalStorage propagates the store across awaits and forks
// a fresh snapshot per call to `als.run`, so concurrent and nested frames
// stay isolated. Sync callers behave identically to the previous array-based
// implementation because `als.run` is a synchronous wrapper.
//
// Runtime requirement: this module imports `node:async_hooks`, which makes
// `@mbfarias/botscript-runtime` Node-only at module-resolution time.
//
// How that's exposed in package.json:
//   - `engines.node`: `>=18.0.0` (covers stable AsyncLocalStorage AND the
//     global Fetch API the http effects depend on).
//   - `exports["."]["browser"]` and `exports["./fs"]["browser"]` route any
//     browser-conditional bundler (Webpack/Vite/Rollup/esbuild/Metro) to
//     `./dist/browser-stub.js`, which throws a clear, descriptive error at
//     module-eval time instead of failing with a confusing `node:*`
//     resolution error deep in the build graph.
//   - `@types/node` is declared as an OPTIONAL peer-dep: TS consumers need
//     it for the published `.d.ts` to typecheck (the types here reference
//     `node:async_hooks`), but JS consumers don't, so the dependency is
//     signalled without being mandatory. Modern package managers won't
//     warn when an optional peer is missing.
//
// The `./fs` subpath was already Node-only via `node:fs`; this package
// never targeted browsers and we don't fake browser support here. Bun and
// Deno both implement `node:async_hooks` and work unmodified.
import { AsyncLocalStorage } from "node:async_hooks";

type Frame = ReadonlyArray<Capability>;
const als = new AsyncLocalStorage<Frame[]>();

export const $enter = <T>(caps: ReadonlyArray<Capability>, fn: () => T): T => {
  const parent = als.getStore() ?? [];
  const next: Frame[] = [...parent, Object.freeze([...caps])];
  return als.run(next, fn);
};

export const $require = (cap: Capability): void => {
  const stack = als.getStore();
  if (stack === undefined || stack.length === 0) {
    // No frame — direct top-level call. Conservative default: allow, since
    // top-level is module init. Tests opt-in via $enter([]) for pure assertions.
    return;
  }
  const top = stack[stack.length - 1]!;
  if (!top.includes(cap)) {
    throw new CapabilityViolation(cap, top);
  }
};

export const $current = (): ReadonlyArray<Capability> | undefined => {
  const stack = als.getStore();
  if (stack === undefined || stack.length === 0) return undefined;
  return [...stack[stack.length - 1]!];
};

/**
 * Test-only: no-op kept for source compatibility with the previous
 * array-based implementation.
 *
 * The old `$reset` cleared a module-level mutable stack. AsyncLocalStorage
 * has no equivalent — contexts are scoped to `als.run` callbacks and end
 * automatically when those return. There is no module-level state to clear,
 * and you cannot "reset" an active outer store from inside one of its child
 * scopes. Callers that need a clean frame should wrap the test body in
 * `$enter([], () => { ... })` (or an `als.run` they manage themselves).
 */
export const $reset = (): void => {
  // No-op. See JSDoc above.
};
