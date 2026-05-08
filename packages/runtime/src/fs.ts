import * as nodeFs from "node:fs";
import * as nodePath from "node:path";

import { $require } from "./capabilities.js";
import { err, ok, type Result } from "./result.js";

/**
 * Filesystem wrappers. All return Result so callers never have to write
 * `try { ... } catch { ... }` for routine I/O. Atomic-write helpers
 * (writeText/writeJson) write to a `.tmp` sibling and rename, which is
 * what most apps want.
 *
 * This module imports `node:fs` and `node:path` and is therefore Node-only.
 * Browser apps must not import from `@mbfarias/botscript-runtime/fs`.
 */
export const fs = {
  exists: (path: string): boolean => {
    $require("fs");
    return nodeFs.existsSync(path);
  },

  readText: (path: string): Result<string, string> => {
    $require("fs");
    try {
      return ok(nodeFs.readFileSync(path, "utf8"));
    } catch (e) {
      return err(`fs.readText: ${e instanceof Error ? e.message : String(e)}`);
    }
  },

  writeText: (path: string, body: string): Result<void, string> => {
    $require("fs");
    try {
      nodeFs.mkdirSync(nodePath.dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      nodeFs.writeFileSync(tmp, body, "utf8");
      nodeFs.renameSync(tmp, path);
      return ok(undefined);
    } catch (e) {
      return err(`fs.writeText: ${e instanceof Error ? e.message : String(e)}`);
    }
  },

  readJson: <T = unknown>(path: string): Result<T, string> => {
    $require("fs");
    try {
      const text = nodeFs.readFileSync(path, "utf8");
      return ok(JSON.parse(text) as T);
    } catch (e) {
      return err(`fs.readJson: ${e instanceof Error ? e.message : String(e)}`);
    }
  },

  writeJson: (path: string, value: unknown, indent = 2): Result<void, string> => {
    $require("fs");
    try {
      const body = JSON.stringify(value, null, indent);
      nodeFs.mkdirSync(nodePath.dirname(path), { recursive: true });
      const tmp = `${path}.tmp`;
      nodeFs.writeFileSync(tmp, body, "utf8");
      nodeFs.renameSync(tmp, path);
      return ok(undefined);
    } catch (e) {
      return err(`fs.writeJson: ${e instanceof Error ? e.message : String(e)}`);
    }
  },
};
