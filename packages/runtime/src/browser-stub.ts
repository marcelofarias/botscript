/**
 * Browser-stub entry. Wired in package.json via the `"browser"` condition
 * in `exports[".".]` and `exports["./fs"]`, so Webpack / Vite / Rollup /
 * esbuild / Metro resolve THIS file when building for the browser instead
 * of pulling in the real entries (which import `node:async_hooks` and
 * `node:fs` and would explode).
 *
 * This stub deliberately has NO `export * from "./index.js"`. A re-export
 * would force bundlers to statically resolve `./index.js` (and its
 * transitive `node:async_hooks` import) into the browser graph — the
 * exact failure mode the stub is meant to prevent. Bundlers that perform
 * dead-code elimination still walk the import graph before deciding what
 * to drop, so the `throw` below would never run early enough to save us.
 *
 * Failure mode under the `browser` condition (intentional, all loud):
 *  - For bare `import "@mbfarias/botscript-runtime"` the module loads and
 *    the `throw` fires at first eval.
 *  - For `import { http } from "@mbfarias/botscript-runtime"` (the common
 *    case) ESM linking fails first with a "does not provide an export
 *    named 'http'" error from the bundler / runtime, BEFORE this module's
 *    body runs. The error is still loud and happens at build/link time,
 *    which is the point.
 *
 * Trade-off: TypeScript consumers building under the `browser` condition
 * see a module with no named exports. Their build won't typecheck against
 * `ok`, `err`, `http`, `$enter`, etc. That's intentional: this package
 * doesn't work in the browser, and a TS / linker error at build time is a
 * louder, earlier signal than a `node:async_hooks` resolution failure
 * deep in a bundler graph. If you actually want a browser-safe subset of
 * botscript-runtime, file an issue and we'll carve out a no-effects
 * entrypoint.
 */
const MESSAGE =
  "@mbfarias/botscript-runtime is Node-only. It imports `node:async_hooks` " +
  "(per-async-context capability frames) and `node:fs` (the `./fs` subpath), " +
  "neither of which has a browser equivalent. See the package's `engines.node` " +
  "field for the supported runtime range.";

throw new Error(MESSAGE);
