import { BotscriptError, type Diagnostic } from "./diagnostics.js";
import { getErrorCode } from "./error-codes.js";
import { formatSource, isCanonical } from "./format/format.js";
import { passAssert } from "./passes/assert.js";
import { passBlocks } from "./passes/blocks.js";
import { passCapCheck } from "./passes/cap-check.js";
import { passFn } from "./passes/fn.js";
import { passImports } from "./passes/imports.js";
import { passCapAssert } from "./passes/cap-assert.js";
import { passDepCheck } from "./passes/dep-check.js";
import { passEffCheck } from "./passes/eff-check.js";
import { passIntentCheck } from "./passes/intent-check.js";
import { passMatch } from "./passes/match.js";
import { passPrimer } from "./passes/primer.js";
import { passResultTry } from "./passes/result-try.js";
import { passTaggedUnion } from "./passes/tagged-union.js";
import { passTest } from "./passes/test.js";
import { passTestMocks } from "./passes/test-mocks.js";
import { passBareAs } from "./passes/bare-as.js";
import { passUnsafe } from "./passes/unsafe.js";
import { passUnwrap } from "./passes/unwrap.js";
import { atLeast, passVersion, type VersionInfo } from "./passes/version.js";

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
  /** Non-blocking diagnostics. Compilation succeeded; these are advisory. */
  warnings: ReadonlyArray<Diagnostic>;
}

/** A pass may return either a transformed string or a result with warnings. */
interface PassResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

interface PipelineEntry {
  name: string;
  fn: (src: string, version: VersionInfo) => string | PassResult;
  /** If set, only run when version.resolved >= minVersion. */
  minVersion?: string;
}

const PASS_PIPELINE: ReadonlyArray<PipelineEntry> = [
  { name: "primer", fn: passPrimer },
  // capCheck runs from 0.2; the pass itself branches on the resolved version
  // to apply the direct-only check (0.2) vs. transitive + over-decl (0.3+).
  // intentCheck runs before capCheck: intent is a header-level consistency
  // check that does not need body analysis. Firing it first means the error
  // message "intent says pure but has uses { net }" is seen before the
  // transitive capability walk, which produces noisier output.
  { name: "intentCheck", fn: passIntentCheck, minVersion: "0.7" },
  // effCheck: header-level check that the outer fn's capabilities cover the
  // effect annotations on its callback parameters (EFF002). Runs alongside
  // intentCheck — both are header consistency checks before the body walk.
  { name: "effCheck", fn: passEffCheck, minVersion: "0.7" },
  // depCheck: transitivity enforcement for reads {} / writes {} annotations (DEP001 / DEP002).
  // Header-level like intentCheck and effCheck — runs before the body walk.
  { name: "depCheck", fn: passDepCheck, minVersion: "0.9" },
  // capAssert: non-blocking warning (CAP003) when a `uses {}` claim appears on
  // an `unsafe fn` — the claim is programmer-asserted, not compiler-proven.
  // Runs before capCheck so capCheck still validates the claim's content.
  { name: "capAssert", fn: passCapAssert, minVersion: "0.9" },
  { name: "capCheck", fn: passCapCheck, minVersion: "0.2" },
  { name: "testMocks", fn: passTestMocks, minVersion: "0.2" },
  { name: "test", fn: passTest },
  { name: "taggedUnion", fn: passTaggedUnion, minVersion: "0.2" },
  // bareAs MUST run before unsafe: passUnsafe rewrites the source and erases
  // the original `unsafe` keyword, so the bare-as walk has to use the
  // pre-rewrite token stream to find unsafe-block body ranges. New enforced
  // check on syntax that was previously legal -> behind a 0.5 pin per
  // AGENTS.md rule 4.
  { name: "bareAs", fn: passBareAs, minVersion: "0.5" },
  { name: "unsafe", fn: passUnsafe, minVersion: "0.3" },
  { name: "resultTry", fn: passResultTry, minVersion: "0.3" },
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
    // Canonical-form gate (RFC #13). From `?bs 0.4` on, the compiler refuses
    // any input that isn't already in canonical form — `botscript fmt <file>
    // --write` (or the playground's "format" button) is the one-and-only fix.
    // Older pins (0.2 / 0.3) keep accepting whatever whitespace they were
    // accepting before; the gate is opt-in via the version pin.
    if (atLeast(version.resolved, "0.4")) assertCanonical(source);
    let code = versioned;
    const forms: string[] = [];
    const allWarnings: Diagnostic[] = [];
    for (const pass of PASS_PIPELINE) {
      if (pass.minVersion && !atLeast(version.resolved, pass.minVersion)) continue;
      const result = pass.fn(code, version);
      if (typeof result === "string") {
        if (result !== code) forms.push(pass.name);
        code = result;
      } else {
        if (result.code !== code) forms.push(pass.name);
        code = result.code;
        allWarnings.push(...result.warnings);
      }
    }
    return { code, forms, version, warnings: allWarnings };
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

function assertCanonical(source: string): void {
  // Cheap path first: walk tokens and bail on the first UTF-16 code unit
  // that differs from canonical. The full formatSource() is only paid when
  // we already know we need it (to find the first differing line for the
  // diagnostic).
  if (isCanonical(source)) return;
  const canonical = formatSource(source);
  // Find the first code unit (UTF-16) that differs so the diagnostic points
  // somewhere useful, not just (1, 1). The walk treats `\r\n`, lone `\r`, and
  // lone `\n` each as one line break so CR-only and CRLF inputs land on the
  // right line.
  let off = 0;
  const len = Math.min(source.length, canonical.length);
  while (off < len && source[off] === canonical[off]) off++;
  let line = 1;
  let col = 1;
  for (let k = 0; k < off; k++) {
    const ch = source[k];
    if (ch === "\r") {
      line++;
      col = 1;
      if (source[k + 1] === "\n") k++;
    } else if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  const entry = getErrorCode("FMT001")!;
  throw new BotscriptError([{
    code: entry.code,
    severity: "error",
    file: null,
    line,
    column: col,
    message: entry.title,
    rule: entry.rule,
    idiom: entry.idiom,
    rewrite: entry.rewrite,
  }]);
}

export { LATEST_VERSION, SUPPORTED_VERSIONS } from "./passes/version.js";
