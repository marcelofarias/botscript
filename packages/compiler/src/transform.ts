import { passAssert } from "./passes/assert.js";
import { passBlocks } from "./passes/blocks.js";
import { passFn } from "./passes/fn.js";
import { passImports } from "./passes/imports.js";
import { passMatch } from "./passes/match.js";
import { passPrimer } from "./passes/primer.js";
import { passTest } from "./passes/test.js";
import { passUnwrap } from "./passes/unwrap.js";
import { LATEST_VERSION, passVersion, type VersionInfo } from "./passes/version.js";

export interface TransformOptions {
  /** Source filename for diagnostics. Optional. */
  filename?: string;
}

export interface TransformResult {
  code: string;
  /**
   * Names of botscript-specific syntactic forms detected in the source.
   * Useful for tooling that wants to know what's "interesting" about a file.
   */
  forms: ReadonlyArray<string>;
  /** Resolved language version this file was compiled against. */
  version: VersionInfo;
}

const PASS_PIPELINE = [
  { name: "primer", fn: passPrimer },
  { name: "test", fn: passTest },
  { name: "fn", fn: passFn },
  { name: "blocks", fn: passBlocks },
  { name: "match", fn: passMatch },
  { name: "unwrap", fn: passUnwrap },
  { name: "assert", fn: passAssert },
  { name: "imports", fn: passImports },
] as const;

export function transform(source: string, _opts: TransformOptions = {}): TransformResult {
  // Version directive runs first so the rest of the pipeline can branch on it.
  // For 0.1 there's nothing to branch on yet — but the contract is set: every
  // future change must be gated on `version.resolved`.
  const { src: versioned, version } = passVersion(source);
  let code = versioned;
  const forms: string[] = [];
  for (const pass of PASS_PIPELINE) {
    const next = pass.fn(code);
    if (next !== code) forms.push(pass.name);
    code = next;
  }
  return { code, forms, version };
}

export { LATEST_VERSION, SUPPORTED_VERSIONS } from "./passes/version.js";
