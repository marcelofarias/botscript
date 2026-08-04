import { BotscriptError, type Diagnostic } from "./diagnostics.js";
import { getErrorCode } from "./error-codes.js";
import { formatSource, isCanonical } from "./format/format.js";
import { passAssert } from "./passes/assert.js";
import { passBlocks } from "./passes/blocks.js";
import { passCapCheck } from "./passes/cap-check.js";
import { passFn } from "./passes/fn.js";
import { passImports } from "./passes/imports.js";
import { passCapAssert } from "./passes/cap-assert.js";
import { passVerCheck } from "./passes/ver-check.js";
import { passSynCheck } from "./passes/syn-check.js";
import { passDepCheck } from "./passes/dep-check.js";
import { passThrCheck } from "./passes/thr-check.js";
import { passEffCheck } from "./passes/eff-check.js";
import { passIntentCheck } from "./passes/intent-check.js";
import { passAliCheck } from "./passes/ali-check.js";
import { passUnsCheck } from "./passes/uns-check.js";
import { passUnsDecay } from "./passes/uns-decay.js";
import { passUnsReason } from "./passes/uns-reason.js";
import { passUnsStale } from "./passes/uns-stale.js";
import { passTsSuppress } from "./passes/ts-suppress.js";
import { passMatch } from "./passes/match.js";
import { passMatCheck } from "./passes/mat-check.js";
import { passResCheck } from "./passes/res-check.js";
import { passPrimer } from "./passes/primer.js";
import { passResultTry } from "./passes/result-try.js";
import { passTaggedUnion } from "./passes/tagged-union.js";
import { passTest } from "./passes/test.js";
import { passTestMocks } from "./passes/test-mocks.js";
import { passBareAs } from "./passes/bare-as.js";
import { passUnsafe } from "./passes/unsafe.js";
import { passUnwrap } from "./passes/unwrap.js";
import { atLeast, passVersion, type VersionInfo } from "./passes/version.js";
import type { ModuleEffects } from "./module-effects.js";

export type { FnEffectSurface, ModuleEffects } from "./module-effects.js";

export interface TransformOptions {
  /** Source filename for diagnostics. Optional. */
  filename?: string;
  /**
   * Effect declarations for functions imported from other modules. When
   * provided, DEP001/DEP002/THR001 transitivity extends across file
   * boundaries: a caller that omits a read/write/throws label declared in
   * `moduleEffects` gets the same diagnostic it would for a same-file callee.
   */
  moduleEffects?: ModuleEffects;
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
  // aliCheck: non-blocking warnings (ALI001/ALI002/ALI003) for module-level
  // const bindings that reference a stdlib namespace but bypass alias tracking —
  // non-trivial RHS forms (ALI001), alias-of-alias chains (ALI002), and
  // namespace destructuring (ALI003).
  { name: "aliCheck", fn: passAliCheck, minVersion: "0.8" },
  // verCheck: non-blocking warning (VER001/VER002) when reads/writes/throws
  // annotations are declared below their enforcement floor (?bs 0.9). Runs
  // early so it can see the full, unmodified header. No-op at 0.9+ because
  // the enforcement passes (depCheck, thrCheck) already validate the claims.
  { name: "verCheck", fn: passVerCheck },
  // synCheck: non-blocking warning (SYN002) for native throw statements in fn
  // bodies (?bs 0.7+). Native throws bypass the Result contract — callers
  // using ? unwrap or match won't observe exceptions raised via throw.
  { name: "synCheck", fn: passSynCheck, minVersion: "0.7" },
  // effCheck: header-level check that the outer fn's capabilities cover the
  // effect annotations on its callback parameters (EFF002). Runs alongside
  // intentCheck — both are header consistency checks before the body walk.
  { name: "effCheck", fn: passEffCheck, minVersion: "0.7" },
  // depCheck: transitivity enforcement for reads {} / writes {} annotations (DEP001 / DEP002).
  // Header-level like intentCheck and effCheck — runs before the body walk.
  { name: "depCheck", fn: passDepCheck, minVersion: "0.9" },
  // thrCheck: transitivity enforcement for throws {} annotations (THR001).
  { name: "thrCheck", fn: passThrCheck, minVersion: "0.9" },
  // matCheck: exhaustiveness check on Result match (MAT001) — fires when a
  // match explicitly handles ok or err but omits the other without a wildcard.
  { name: "matCheck", fn: passMatCheck, minVersion: "0.9" },
  // resCheck: non-blocking warning (RES002/RES003) when a Result- or Option-
  // returning fn is called as a statement — the return value is discarded and
  // the error/absence path is permanently sealed from callers. RES002 fires for
  // same-file callees; RES003 fires for imported callees via moduleEffects.
  { name: "resCheck", fn: passResCheck, minVersion: "0.9" },
  // capAssert: non-blocking warning (CAP003) when a `uses {}` claim appears on
  // an `unsafe fn` — the claim is programmer-asserted, not compiler-proven.
  // Runs before capCheck so capCheck still validates the claim's content.
  { name: "capAssert", fn: passCapAssert, minVersion: "0.9" },
  // unsCheck: fires UNS005 on stdlib capability calls with no declared result
  // contract (no match, no unsafe block). Must run before passUnsafe, which
  // rewrites the source and erases unsafe keywords used as suppression markers.
  { name: "unsCheck", fn: passUnsCheck, minVersion: "0.9" },
  // unsStale: fires UNS007 on unsafe blocks whose body is a pure literal (no
  // ident tokens). Must run before passUnsafe (which erases unsafe keywords).
  { name: "unsStale", fn: passUnsStale, minVersion: "0.9" },
  // unsDecay: fires UNS008 on unsafe blocks whose body has identifiers but no
  // bypass pattern — the "decay-stale" population that UNS007 misses. Must run
  // before passUnsafe (which erases unsafe keywords).
  { name: "unsDecay", fn: passUnsDecay, minVersion: "0.9" },
  // unsReason: fires UNS009 on unsafe blocks or fn declarations whose reason
  // string is too weak to justify the escape hatch (empty, whitespace-only,
  // or known-weak deferral like "TODO" / "legacy"). Must run before passUnsafe.
  { name: "unsReason", fn: passUnsReason, minVersion: "0.9" },
  // tsSuppress: fires UNS006 on @ts-ignore / @ts-expect-error comments.
  // No version gate — these suppress TypeScript at any version.
  { name: "tsSuppress", fn: passTsSuppress, minVersion: "0.5" },
  { name: "capCheck", fn: passCapCheck, minVersion: "0.2" },
  // bareAs MUST run before unsafe (passUnsafe erases unsafe keywords needed
  // to build skip ranges) AND before testMocks (passTestMocks generates
  // `as const` in compiled output which is not a botscript bare-as cast).
  // Running on the original botscript source ensures only author-written
  // casts are flagged. New enforced check behind a 0.5 pin per AGENTS.md rule 4.
  { name: "bareAs", fn: passBareAs, minVersion: "0.5" },
  { name: "testMocks", fn: passTestMocks, minVersion: "0.2" },
  { name: "test", fn: passTest },
  { name: "taggedUnion", fn: passTaggedUnion, minVersion: "0.2" },
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

    // When moduleEffects is provided, substitute closures for dep/thr/cap passes
    // so they can consult the cross-file effect surface.
    const mods = opts.moduleEffects;
    const effectivePipeline: ReadonlyArray<PipelineEntry> = mods
      ? PASS_PIPELINE.map((e): PipelineEntry => {
          if (e.name === "depCheck")
            return { ...e, fn: (s: string, v: VersionInfo) => passDepCheck(s, v, mods) };
          if (e.name === "thrCheck")
            return { ...e, fn: (s: string, v: VersionInfo) => passThrCheck(s, v, mods) };
          if (e.name === "capCheck")
            return { ...e, fn: (s: string, v: VersionInfo) => passCapCheck(s, v, mods) };
          if (e.name === "intentCheck")
            return { ...e, fn: (s: string, v: VersionInfo) => passIntentCheck(s, v, mods) };
          if (e.name === "resCheck")
            return { ...e, fn: (s: string, v: VersionInfo) => passResCheck(s, v, mods) };
          return e;
        })
      : PASS_PIPELINE;

    for (const pass of effectivePipeline) {
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
