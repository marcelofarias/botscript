import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, join, resolve as resolvePath } from "node:path";

import { parseProgram, transform } from "@mbfarias/botscript-compiler";
import type { FnEffectSurface, ModuleEffects } from "@mbfarias/botscript-compiler";
import type { Plugin } from "vite";

export interface BotscriptPluginOptions {
  /** File extensions to treat as botscript. Defaults to `[".bs"]`. */
  extensions?: string[];
  /**
   * If true (default), an import of `./foo.js` is silently rewritten to
   * `./foo.bs` when the `.bs` file exists on disk. This lets `.bs` files use
   * the same `.js` extension convention TypeScript ESM emit expects, without
   * a per-project resolver shim.
   */
  resolveJsToBs?: boolean;
}

async function collectBsFiles(root: string, extensions: string[]): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(root, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      out.push(...(await collectBsFiles(p, extensions)));
    } else if (e.isFile() && extensions.some((ext) => e.name.endsWith(ext))) {
      out.push(p);
    }
  }
  return out;
}

async function buildModuleEffects(files: string[]): Promise<ModuleEffects> {
  const effects: Record<string, FnEffectSurface> = {};
  for (const f of files) {
    let src: string;
    try {
      src = await readFile(f, "utf8");
    } catch {
      continue;
    }
    try {
      const program = parseProgram(src, { allowGenerics: true });
      for (const stmt of program.fns) {
        const { decl } = stmt;
        const surface: FnEffectSurface = {};
        if (decl.reads?.length) surface.reads = decl.reads;
        if (decl.writes?.length) surface.writes = decl.writes;
        if (decl.throws?.length) surface.throws = decl.throws;
        if (Object.keys(surface).length > 0) {
          effects[decl.name] = surface;
        }
      }
    } catch {
      // Malformed file — skip; cross-file checking degrades gracefully
    }
  }
  return effects;
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
  const resolveJsToBs = options.resolveJsToBs ?? true;
  let moduleEffects: ModuleEffects | undefined;
  let root: string | undefined;
  return {
    name: "botscript",
    enforce: "pre",
    configResolved(config) {
      root = config.root;
    },
    async buildStart() {
      if (!root) return;
      const files = await collectBsFiles(root, extensions);
      moduleEffects = files.length > 1 ? await buildModuleEffects(files) : undefined;
    },
    async watchChange(id) {
      if (!root) return;
      if (!extensions.some((ext) => id.endsWith(ext))) return;
      // Rebuild the effect map when any .bs file changes.
      const files = await collectBsFiles(root, extensions);
      moduleEffects = files.length > 1 ? await buildModuleEffects(files) : undefined;
    },
    config(userConfig) {
      // Auto-add `.bs` to resolve.extensions so users don't have to. We put it
      // first so extensionless imports prefer `.bs` over `.ts/.js` siblings,
      // matching the convention that .bs files are the source of truth.
      const existing = userConfig.resolve?.extensions ?? [
        ".mjs",
        ".js",
        ".mts",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
      ];
      const merged = extensions
        .filter((e) => !existing.includes(e))
        .concat(existing);
      return {
        resolve: { extensions: merged },
      };
    },
    resolveId(source, importer) {
      // Map `./foo.js` → `./foo.bs` when the `.bs` sibling exists. Lets `.bs`
      // files use TS ESM's `.js` import-extension convention without a custom
      // resolver per app.
      if (!resolveJsToBs) return null;
      if (!importer) return null;
      if (!source.startsWith("./") && !source.startsWith("../")) return null;
      if (!source.endsWith(".js") && !source.endsWith(".jsx")) return null;
      const importerDir = dirname(importer.split("?")[0] ?? importer);
      const trimmed = source.replace(/\.jsx?$/, "");
      for (const ext of extensions) {
        const candidate = resolvePath(importerDir, trimmed + ext);
        if (existsSync(candidate)) return candidate;
      }
      return null;
    },
    async transform(code, id) {
      const cleanId = id.split("?")[0] ?? id;
      if (!extensions.some((ext) => cleanId.endsWith(ext))) return null;
      const { code: transformed } = transform(code, { filename: id, moduleEffects });
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
