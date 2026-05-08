import { createRequire } from "node:module";

import { transform as botscriptTransform } from "@botscript/compiler";

const require = createRequire(import.meta.url);

/**
 * Babel plugin entry. Babel doesn't have a "preprocess source" hook the way
 * Vite does, so we expose ourselves as a *transform* function suitable for
 * `@babel/core`'s `parserOpts.parser` slot — i.e., users register us via
 * Babel's `parserOverride` rather than as a normal AST plugin.
 *
 * Usage:
 *   // babel.config.js
 *   import { parser } from "@botscript/babel-plugin";
 *   export default {
 *     parserOpts: { parser },
 *     // ...your other Babel config (TS preset, etc.)
 *   };
 *
 * The `parser` function receives a string, runs the botscript transforms on it
 * once, and then hands the resulting TypeScript to Babel's normal parser.
 */
// We deliberately keep types loose here: Babel's `ParseResult` and `File` shapes
// have shifted across versions, and the plugin is a thin adapter — we don't
// rely on any specific AST shape ourselves.
type ParseFn = (code: string, options?: unknown) => unknown;

export const parser: ParseFn = (code, options) => {
  const { code: transformed } = botscriptTransform(code);
  const babelParser = require("@babel/parser") as { parse: ParseFn };
  return babelParser.parse(transformed, options);
};

/**
 * Convenience: a "plugin" entry compatible with Babel's plugin spec, but it
 * just registers `parserOverride` on first run. Most users should pick one
 * style — using both is fine but redundant.
 */
export default function botscriptPlugin(): {
  name: string;
  manipulateOptions: (_opts: unknown, parserOpts: { parser?: ParseFn }) => void;
} {
  return {
    name: "botscript",
    manipulateOptions(_opts, parserOpts) {
      parserOpts.parser = parser;
    },
  };
}
