import { transform } from "@botscript/compiler";
import type { Plugin } from "vite";

export interface BotscriptPluginOptions {
  /** File extensions to treat as botscript. Defaults to `[".bs"]`. */
  extensions?: string[];
}

/**
 * Vite plugin for botscript.
 *
 * Pipeline per `*.bs` file:
 *   raw .bs source  ──[botscript compiler]──>  TypeScript (with JSX possibly)
 *                   ──[esbuild loader=tsx]──>  JS that Vite/React handle
 *
 * We run esbuild ourselves rather than relying on Vite's automatic .ts loader,
 * because Vite/esbuild keys the loader on file extension, and our `.bs`
 * extension would otherwise be passed through as plain text.
 */
export default function botscript(options: BotscriptPluginOptions = {}): Plugin {
  const extensions = options.extensions ?? [".bs"];
  return {
    name: "botscript",
    enforce: "pre",
    async transform(code, id) {
      const cleanId = id.split("?")[0] ?? id;
      if (!extensions.some((ext) => cleanId.endsWith(ext))) return null;
      const { code: transformed } = transform(code, { filename: id });
      // Hand the result to esbuild as TSX so JSX inside .bs files works.
      // esbuild ships with Vite, so this import does not add an extra dep.
      const esbuild = await import("esbuild");
      const out = await esbuild.transform(transformed, {
        loader: "tsx",
        sourcefile: cleanId,
        target: "es2022",
        jsx: "automatic",
      });
      return { code: out.code, map: null };
    },
  };
}
