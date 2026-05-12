/**
 * Browser-stub entry. Re-exported under the `"browser"` conditional in
 * package.json so that Webpack / Vite / Rollup / esbuild / Metro / etc.
 * resolve THIS file when building for the browser, instead of pulling in
 * the real entry (which imports `node:async_hooks` and would explode).
 *
 * Why throw at import time: a silent stub would let app code call `$enter`
 * / `$require` / `http.get` and get cryptic runtime errors in production.
 * A loud throw at first import is much easier to debug than "fetch is
 * undefined" or "stack frame missing". If you actually want a browser-safe
 * subset of botscript-runtime, file an issue describing the use case and
 * we'll carve out a no-effects entry.
 */
const MESSAGE =
  "@mbfarias/botscript-runtime is Node-only. It imports `node:async_hooks` " +
  "(per-async-context capability frames) and `node:fs` (the `./fs` subpath), " +
  "neither of which has a browser equivalent. See the package's `engines.node` " +
  "field for the supported runtime range.";

throw new Error(MESSAGE);

// Re-export the surface so TS resolution doesn't fail for downstream code
// that does `import { ok } from "@mbfarias/botscript-runtime"`. The throw
// above runs at module-eval time before any consumer can read these.
export * from "./index.js";
