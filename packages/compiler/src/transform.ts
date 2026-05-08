import { BotscriptError } from "./diagnostics.js";
import { passAssert } from "./passes/assert.js";
import { passBlocks } from "./passes/blocks.js";
import { passCapCheck } from "./passes/cap-check.js";
import { passFn } from "./passes/fn.js";
import { passImports } from "./passes/imports.js";
import { passMatch } from "./passes/match.js";
import { passPrimer } from "./passes/primer.js";
import { passTaggedUnion } from "./passes/tagged-union.js";
import { passTest } from "./passes/test.js";
import { passTestMocks } from "./passes/test-mocks.js";
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

interface PipelineEntry {
  name: string;
  fn: (src: string) => string;
  /** If set, only run when version.resolved >= minVersion. */
  minVersion?: string;
}

const PASS_PIPELINE: ReadonlyArray<PipelineEntry> = [
  { name: "primer", fn: passPrimer },
  { name: "capCheck", fn: passCapCheck, minVersion: "0.2" },
  { name: "testMocks", fn: passTestMocks, minVersion: "0.2" },
  { name: "test", fn: passTest },
  { name: "taggedUnion", fn: passTaggedUnion, minVersion: "0.2" },
  { name: "fn", fn: passFn },
  { name: "blocks", fn: passBlocks },
  { name: "match", fn: passMatch },
  { name: "unwrap", fn: passUnwrap },
  { name: "assert", fn: passAssert },
  { name: "imports", fn: passImports },
];

export function transform(source: string, opts: TransformOptions = {}): TransformResult {
  try {
    // Version directive runs first so the rest of the pipeline can branch on it.
    const { src: versioned, version } = passVersion(source);
    let code = versioned;
    const forms: string[] = [];
    for (const pass of PASS_PIPELINE) {
      if (pass.minVersion && !atLeast(version.resolved, pass.minVersion)) continue;
      const next = pass.fn(code);
      if (next !== code) forms.push(pass.name);
      code = next;
    }
    return { code, forms, version };
  } catch (e) {
    // Attach the filename to every diagnostic the pipeline emitted so callers
    // and the CLI's JSON output point to the right file. Errors that aren't
    // BotscriptError flow through unchanged.
    if (opts.filename && e instanceof BotscriptError) {
      throw withFilename(e, opts.filename);
    }
    throw e;
  }
}

function withFilename(err: BotscriptError, filename: string): BotscriptError {
  const next = err.diagnostics.map((d) => ({ ...d, file: d.file ?? filename }));
  // Subclasses (e.g. CapabilityCheckError) preserve their type by mutating in
  // place via Object.assign — Error subclasses are awkward to clone faithfully.
  Object.assign(err, { diagnostics: Object.freeze(next) });
  err.message = next
    .map((d) => {
      const loc = `${d.file}:${d.line}:${d.column}`;
      return `botscript[${d.code}]: ${d.message} (${loc})${
        d.rule ? `\n  Rule:    ${d.rule}` : ""
      }${d.idiom ? `\n  Idiom:   ${d.idiom}` : ""}${
        d.rewrite ? `\n  Rewrite: ${d.rewrite}` : ""
      }`;
    })
    .join("\n\n");
  return err;
}

function atLeast(actual: string, min: string): boolean {
  const a = actual.split(".").map(Number);
  const m = min.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, m.length); i++) {
    const av = a[i] ?? 0;
    const mv = m[i] ?? 0;
    if (av > mv) return true;
    if (av < mv) return false;
  }
  return true;
}

export { LATEST_VERSION, SUPPORTED_VERSIONS } from "./passes/version.js";
