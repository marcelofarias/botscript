/**
 * Long-form explanations for every stable diagnostic code. The `explain` tool
 * looks up the code here and returns the expanded version. The short form
 * (rule + idiom + rewrite) ships with every diagnostic; this is the deeper
 * "why does this rule exist" doc.
 *
 * Adding a new code: also add a row to AGENTS.md's diagnostic codes table.
 */

export interface Explanation {
  code: string;
  title: string;
  /** A multi-paragraph explanation of why the rule exists. */
  body: string;
  /** A worked-example pair: a snippet that fails, and a snippet that passes. */
  example: { fails: string; passes: string };
}

export const EXPLANATIONS: Readonly<Record<string, Explanation>> = {
  BS001: {
    code: "BS001",
    title: "Malformed `?bs` directive",
    body:
      "The first directive in a botscript file declares the language version it targets. " +
      "It must look like `?bs <major>.<minor>` or `?bs <major>.<minor>.<patch>`. " +
      "Anything else (a typo, a word, a partial version) makes the directive ambiguous, " +
      "and an ambiguous version is the only thing in this language that compounds — every " +
      "downstream pass branches on it.",
    example: {
      fails: "?bs nope\nfn x() -> number = pure { 1 }\n",
      passes: "?bs 0.2\nfn x() -> number = pure { 1 }\n",
    },
  },
  BS002: {
    code: "BS002",
    title: "Unsupported `?bs` version",
    body:
      "The version you pinned is syntactically valid but this compiler does not ship " +
      "support for it. Either upgrade @mbfarias/botscript-compiler, or pin to a version " +
      "this compiler knows about (see SUPPORTED_VERSIONS in the compiler).",
    example: {
      fails: "?bs 99.0\n",
      passes: "?bs 0.2\n",
    },
  },
  CAP001: {
    code: "CAP001",
    title: "Capability not declared",
    body:
      "A function reached for a capability-checked stdlib namespace (http, time, random, " +
      "fs, stdout, stderr) without naming the matching capability in its `uses { … }` " +
      "clause. Under ?bs 0.2 this is a direct-only check; under ?bs 0.3 the compiler also " +
      "propagates capabilities transitively across calls to other fns in the same file, " +
      "and the diagnostic names the path: `loadOne -> doFetch -> http.get`.\n\n" +
      "Aliasing (`const t = time; t.now()`) is still not detected, by design — the rule is " +
      "'the canonical names are tripwires.' Cross-module propagation is not yet in scope; " +
      "the runtime $require backs that case up.",
    example: {
      fails: "?bs 0.3\nfn now() -> number = pure { time.now() }\n",
      passes: "?bs 0.3\nfn now() uses { time } -> number { return time.now(); }\n",
    },
  },
  CAP002: {
    code: "CAP002",
    title: "Capability over-declared",
    body:
      "A function declared a capability in its `uses { … }` clause but its body never " +
      "reaches it — neither directly (no `time.now()`, `http.get()`, etc.) nor transitively " +
      "via a callee in the same file. The declaration is the upper bound the compiler " +
      "infers against; declarations must match reality.\n\n" +
      "Why bother flagging this: a declaration that doesn't match the body is a lie a future " +
      "reader (human or model) will trust. Either remove the unused capability, or if you're " +
      "truly preparing to use it, add the call now. (CAP002 is a 0.3+ check — files pinned " +
      "to 0.2 keep the original direct-only behavior.)",
    example: {
      fails: "?bs 0.3\nfn slug(s: string) uses { net } -> string = pure { s.toLowerCase() }\n",
      passes: "?bs 0.3\nfn slug(s: string) -> string = pure { s.toLowerCase() }\n",
    },
  },
  CAP003: {
    code: "CAP003",
    title: "Capability declared inside unsafe fn — asserted, not proven",
    body:
      "CAP003 is a **warning** (non-blocking) that fires when a `uses { }` declaration " +
      "appears on an `unsafe fn`. Compilation still succeeds.\n\n" +
      "The capability inference pass (CAP001/CAP002) still runs on the visible stdlib calls " +
      "inside the body — but an `unsafe fn` can contain `as` casts that alias stdlib " +
      "namespaces, bypassing the name-based detection the compiler relies on. The capability " +
      "claim is therefore *programmer-asserted*, not *compiler-proven*.\n\n" +
      "**Why it matters:** callers that import a capability claim have no way to know — " +
      "from the type system alone — whether the claim was verified or hand-written. A CAP003 " +
      "tag makes that distinction visible. Audit tooling and higher-strictness modes can refuse " +
      "to import CAP003-tagged capabilities without explicit acknowledgment.\n\n" +
      "**What to do:** if the function is the canonical safe adapter for a capability and the " +
      "claim is correct, the warning is informational — no action required. If you want to " +
      "suppress it, remove the `uses {}` clause (if the body has no visible stdlib calls) or " +
      "refactor to a regular fn where the compiler can verify the claim.\n\n" +
      "CAP003 is gated on `?bs 0.9`. Files pinned to earlier versions are unaffected.",
    example: {
      fails:
        "?bs 0.9\n" +
        "unsafe \"wraps external http client\" fn callApi(url: string) uses { net } -> string {\n" +
        "  http.get(url)\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn callApi(url: string) uses { net } -> string {\n" +
        "  http.get(url)\n" +
        "}\n",
    },
  },
  UNS001: {
    code: "UNS001",
    title: "unsafe block missing justification string",
    body:
      "An `unsafe` block must carry a non-empty string literal explaining why the escape " +
      "hatch is acceptable here. The form is `unsafe \"<reason>\" { <body> }`. The " +
      "justification ends up as a leading comment in the compiled output, so the diff " +
      "reviewer (human or model) sees the *why* alongside the cast — not just the cast.\n\n" +
      "If you cannot articulate the reason in one sentence, the cast probably should not " +
      "be made. (UNS001 is a 0.3+ check — files pinned to 0.2 do not parse `unsafe` as a " +
      "keyword and treat it as an ordinary identifier.)",
    example: {
      fails: "?bs 0.3\nconst u = unsafe { value as User };\n",
      passes: "?bs 0.3\nconst u = unsafe \"third-party returns any\" { value as User };\n",
    },
  },
  UNS002: {
    code: "UNS002",
    title: "unsafe block or unsafe fn declaration has an empty justification",
    body:
      "The justification on an `unsafe` block must be a non-empty string. The empty string " +
      "is not a reason. Same intent as UNS001: the cast and its reason live together in the " +
      "diff so the next reviewer can judge whether the escape hatch is still warranted. " +
      "From `?bs 0.5`, the same rule applies to a declaration-level `unsafe \"<reason>\" fn " +
      "<name>(...)` — an empty reason there is UNS002 too.",
    example: {
      fails: "?bs 0.3\nconst u = unsafe \"\" { value as User };\n",
      passes: "?bs 0.3\nconst u = unsafe \"Response.json() returns any\" { value as User };\n",
    },
  },
  UNS003: {
    code: "UNS003",
    title: "unsafe block has no body",
    body:
      "The form is `unsafe \"<reason>\" { <body> }` — the braces are required. A justification " +
      "without a body has no scope; the escape hatch must enclose exactly the expression that " +
      "needs the cast.",
    example: {
      fails: "?bs 0.3\nconst u = unsafe \"fix later\";\n",
      passes: "?bs 0.3\nconst u = unsafe \"fix later\" { value as User };\n",
    },
  },
  UNS004: {
    code: "UNS004",
    title: "bare `as` cast outside unsafe block or unsafe fn",
    body:
      "Every `as` cast is a claim about types the compiler cannot verify. From `?bs 0.5` on, " +
      "a bare `as` outside an `unsafe \"<reason>\" { ... }` block (or the body of an " +
      "`unsafe \"<reason>\" fn`) is a parse error. The rule is the manifesto promise made " +
      "concrete: the cast and a written justification live together in the diff, so the next " +
      "reviewer (human or model) sees the *why* alongside the *what* — not just an unexplained " +
      "`as User` whose intent has aged out.\n\n" +
      "**Two escape hatches:**\n" +
      "1. Per-cast: `unsafe \"<reason>\" { expr as Type }` — wraps one cast with a reason.\n" +
      "2. Per-function: `unsafe \"<reason>\" fn name(…)` — marks the fn as the trust boundary. " +
      "All `as` casts inside the body are allowed without repeating the reason at each site. " +
      "Use this when the function is the one safe coercion point in a module (e.g. an adapter " +
      "that validates raw API responses). The reason is emitted as a comment before the " +
      "compiled function so reviewers see it in the diff.\n\n" +
      "What gets flagged: TypeScript type assertions in expression position — `x as User`, " +
      "`x as any`, `x as const`, chained casts like `(x as unknown) as User`. What does NOT " +
      "get flagged: the import-namespace form `import * as ns from \"...\"` (the `as` here is " +
      "the namespace keyword, not a cast), named-binding renames `import { foo as bar }`, " +
      "`export * as ns from \"...\"`, and re-export renames `export { foo as bar } from \"...\"`.\n\n" +
      "UNS004 is gated on the version pin per AGENTS.md rule 4: files pinned to `?bs 0.4` or " +
      "earlier compile byte-identically forever. Opt into the check by bumping the file to " +
      "`?bs 0.5`.",
    example: {
      fails: "?bs 0.5\nconst u = data as User;\n",
      passes:
        "?bs 0.5\n" +
        "const u = unsafe \"third-party Response.json() returns any\" { data as User };\n",
    },
  },
  INT001: {
    code: "INT001",
    title: "intent declares 'pure' but function has capability or read/write declarations",
    body:
      "An `intent: \"pure\"` clause is a machine-checkable claim that the function is " +
      "deterministic, side-effect-free, and accesses no external resources. A function " +
      "with a non-empty `uses { ... }`, `reads { ... }`, or `writes { ... }` clause " +
      "contradicts that claim — the declaration says it can reach the network, file " +
      "system, or clock (or depends on / mutates external state) while the intent says " +
      "it cannot. Botscript treats this as an error rather than a warning because the " +
      "mismatch is always a mistake: either the intent is wrong, or the conflicting " +
      "header clause is wrong.\n\n" +
      "The word 'pure' is matched as a whole word inside the intent string — " +
      "`\"impure\"` does not match, but `\"pure\"`, `\"pure function\"`, and " +
      "`\"idempotent and pure\"` all do.\n\n" +
      "INT001 is gated on `?bs 0.7`. Files pinned to earlier versions may use " +
      "`intent:` declarations without triggering any check. From `?bs 0.8`, the same " +
      "rule applies to `reads { }` and `writes { }` clauses.\n\n" +
      "Scope note: INT001 is a header-level consistency check — it verifies that the " +
      "declared header clauses do not contradict each other. Body-shape verification " +
      "(whether the function body actually matches its declared intent) is a separate " +
      "check (INT002) introduced in `?bs 0.7`.",
    example: {
      fails:
        "?bs 0.8\n" +
        "fn lookup(id: string) reads { cache } intent: \"pure\" -> Option<string> = none\n",
      passes:
        "// option A — remove the conflicting header clause (uses/reads/writes)\n" +
        "?bs 0.8\n" +
        "fn lookup(id: string) intent: \"pure\" -> Option<string> = pure { none }\n",
    },
  },
  INT002: {
    code: "INT002",
    title: "intent declares 'pure' but function body uses a capability",
    body:
      "INT002 is the body-level complement to INT001. INT001 catches the case where " +
      "`intent: \"pure\"` and a non-empty `uses { ... }` clause are both declared in the " +
      "header (an obvious contradiction). INT002 catches the more subtle case: the header " +
      "looks fine (empty or absent `uses {}`), but the function body directly references a " +
      "stdlib capability namespace like `http`, `time`, `random`, `fs`, `stdout`, or `stderr`.\n\n" +
      "This matters because INT001 is a header-level consistency check — it compares clauses " +
      "to each other, but does not look at the body. A function that declares " +
      "`intent: \"pure\"` and no capabilities can still lie: the body can call `http.get()` " +
      "and INT001 will say nothing. INT002 closes that gap.\n\n" +
      "The check scans the fn body's own token range for direct stdlib references " +
      "(`<namespace>.<member>`), excluding nested `fn` declarations. It does not do " +
      "transitive call-graph inference — that is cap-check's domain (CAP001). INT002 fires " +
      "on direct body references only, and fires before cap-check, so the message focuses on " +
      "the pure-intent violation rather than the missing declaration.\n\n" +
      "INT002 is gated on `?bs 0.7` (same gate as INT001). Files on earlier pins are not " +
      "checked.",
    example: {
      fails:
        "?bs 0.7\n" +
        "// drainSecrets claims pure but directly calls http.get\n" +
        "fn drainSecrets(id: string) intent: \"pure\" -> string = http.get(\"/s/\" + id)\n",
      passes:
        "// option A — remove the capability call (make it truly pure)\n" +
        "?bs 0.7\n" +
        "fn formatId(id: string) intent: \"pure\" -> string = pure { \"user-\" + id }\n\n" +
        "// option B — remove the pure claim and declare the capability\n" +
        "?bs 0.7\n" +
        "fn drainSecrets(id: string) uses { net } -> string = http.get(\"/s/\" + id)\n",
    },
  },
  FMT001: {
    code: "FMT001",
    title: "source is not in canonical form",
    body:
      "Botscript collapses a defined set of non-semantic surface variations to a single " +
      "canonical form (RFC #13). The current rules cover indentation (tabs become 2 " +
      "spaces), trailing whitespace, blank-line runs, line endings, mid-line whitespace, " +
      "spacing around `,` `:` `->` `=>` `??` `=` and binary operators (`+`, `-`, `*`, " +
      "`/`, `%`, `==`, `===`, `!=`, `!==`, `<=`, `>=`, `&&`, `||`, `&`, `|`, `^`, `<<`, " +
      "`**`, plus the compound-assignment family), import-statement order within a " +
      "contiguous run, tagged-union member order, and brace-block-vs-expression-body for " +
      "single-`return` `fn` bodies. From `?bs 0.4` on, the compiler rejects non-canonical " +
      "input rather than silently accepting it.\n\n" +
      "The point is to kill diff noise. A bot writing botscript will produce five " +
      "stylistically-different versions of the same logic across five PRs — none wrong, " +
      "all dominated by formatting drift in the diff. Sources that differ ONLY by the " +
      "variations above canonicalize to byte-identical text, so review can focus on the " +
      "semantic change. Sources that are merely equivalent in deeper ways (different " +
      "identifier names, different control-flow shapes, different operator choices) are " +
      "NOT collapsed — RFC #13's full vision (\"two semantically equivalent programs " +
      "lower to byte-identical TypeScript\") is still in flight; this rule covers the " +
      "surface-level slice that landed in `?bs 0.4`.\n\n" +
      "The fix is mechanical: `botscript fmt <file> --write`. The formatter is " +
      "idempotent. It preserves observable behavior in all common cases, with one " +
      "documented carve-out: reordering ESM imports within a contiguous run CAN " +
      "change observable top-level evaluation order if any imported module has " +
      "top-level side effects. The repo trades that strict ordering for a canonical " +
      "surface form, mirroring `prettier-plugin-organize-imports` / ESLint " +
      "`import/order`. To pin a specific evaluation order, separate the imports with " +
      "a blank line (the run breaks) or add a comment in the region (reordering " +
      "disables). Side-effect imports (`import \"foo\";`) bail their run " +
      "unconditionally. The diagnostic points at the first UTF-16 code unit that " +
      "diverges from canonical, so you can also fix small drifts by hand.\n\n" +
      "FMT001 is gated on the version pin: files pinned to `?bs 0.3` or earlier keep " +
      "accepting whitespace variants. Opt into the check by bumping the file to `?bs " +
      "0.4` (and run `botscript fmt <file> --write` once to clear the existing drift).",
    example: {
      fails: "?bs 0.4\nfn add(a: number, b: number) -> number   =   a + b\n",
      passes: "?bs 0.4\nfn add(a: number, b: number) -> number = a + b\n",
    },
  },
  EFF002: {
    code: "EFF002",
    title: "outer fn declares narrower effects than a callback parameter",
    body:
      "A function-typed parameter can carry a `uses { caps }` annotation declaring what " +
      "side-effect capabilities the callback may exercise. The outer function that accepts " +
      "that callback must declare at least those capabilities in its own `uses {}` clause.\n\n" +
      "Without this rule, a combinator that accepts an effectful callback can claim a " +
      "narrower effect surface than it can actually exercise. An orchestrator reading the " +
      "outer fn's header sees `uses {}` and concludes the call is side-effect-free — but " +
      "the callback can call `http.get`, write to the filesystem, or produce any other " +
      "side effect the caller never saw declared. This is the \"callback effect leakage\" " +
      "vector: the header is technically sound (no direct stdlib call) but the blast " +
      "radius is hidden.\n\n" +
      "EFF002 is a header-level check: it runs at parse time from the function signatures " +
      "alone, with no body analysis. If fn A accepts `action: () uses { net } -> T`, A " +
      "must declare `uses { net }` (or a superset). The rule is additive — it does not " +
      "force the outer fn to *use* the capability, only to *declare* it. An outer fn that " +
      "already declares `uses { net, time }` satisfies EFF002 for any callback that " +
      "declares `uses { net }` or `uses { time }` or both.\n\n" +
      "The call-site check (EFF001 — passing an effectful closure to a parameter slot " +
      "that declares fewer effects) requires closure-level type inference and is out of " +
      "scope for the current compiler. EFF002 alone closes the header-lying vector and " +
      "is the 80% case.",
    example: {
      fails:
        "?bs 0.7\n" +
        "// EFF002: withRetry accepts a callback that declares { net },\n" +
        "// but withRetry itself declares uses {}\n" +
        "fn withRetry(action: () uses { net } -> string) -> string = action()\n",
      passes:
        "?bs 0.7\n" +
        "// Fixed: outer fn declares the capability its callback may exercise\n" +
        "fn withRetry(action: () uses { net } -> string) uses { net } -> string = action()\n",
    },
  },
  EFF003: {
    code: "EFF003",
    title: "outer fn declares narrower reads than a callback parameter",
    body:
      "A function-typed parameter can carry a `reads { labels }` annotation declaring which " +
      "resource categories the callback reads from. The outer function that accepts that " +
      "callback must declare at least those labels in its own `reads {}` clause.\n\n" +
      "Without this rule, a higher-order fn that accepts a resource-reading callback can " +
      "advertise a narrower read surface than it can actually access. An orchestrator reading " +
      "the outer fn's header sees no `reads {}` and concludes the call touches no resources — " +
      "but the callback may read from the cache, database, or any other declared resource.\n\n" +
      "EFF003 is the `reads`-variant of EFF002. It gates on `?bs 0.9` alongside " +
      "DEP001/DEP002 (same-file reads/writes transitivity). The outer fn does not need to " +
      "use the resource directly — it just needs to declare it so callers have an accurate " +
      "read-dependency surface.",
    example: {
      fails:
        "?bs 0.9\n" +
        "// EFF003: withCache accepts a callback that declares reads { cache },\n" +
        "// but withCache itself declares reads {}\n" +
        "fn withCache(loader: () reads { cache } -> string) -> string = loader()\n",
      passes:
        "?bs 0.9\n" +
        "// Fixed: outer fn declares the read-dependency its callback may exercise\n" +
        "fn withCache(loader: () reads { cache } -> string) reads { cache } -> string = loader()\n",
    },
  },
  EFF004: {
    code: "EFF004",
    title: "outer fn declares narrower writes than a callback parameter",
    body:
      "A function-typed parameter can carry a `writes { labels }` annotation declaring which " +
      "resource categories the callback writes to. The outer function that accepts that " +
      "callback must declare at least those labels in its own `writes {}` clause.\n\n" +
      "Without this rule, a higher-order fn that accepts a resource-writing callback can " +
      "advertise a narrower write surface than it can actually mutate. An orchestrator reading " +
      "the outer fn's header sees no `writes {}` and concludes the call mutates no resources — " +
      "but the callback may write to metrics, the database, an audit log, or any other declared " +
      "resource.\n\n" +
      "EFF004 is the `writes`-variant of EFF002. It gates on `?bs 0.9` alongside " +
      "DEP001/DEP002 (same-file reads/writes transitivity). The outer fn does not need to " +
      "write directly — it just needs to declare the labels so callers have an accurate " +
      "write-dependency surface.",
    example: {
      fails:
        "?bs 0.9\n" +
        "// EFF004: withMetrics accepts a callback that declares writes { metrics },\n" +
        "// but withMetrics itself declares writes {}\n" +
        "fn withMetrics(recorder: () writes { metrics } -> void) -> void { recorder() }\n",
      passes:
        "?bs 0.9\n" +
        "// Fixed: outer fn declares the write-dependency its callback may exercise\n" +
        "fn withMetrics(recorder: () writes { metrics } -> void) writes { metrics } -> void { recorder() }\n",
    },
  },
  RES001: {
    code: "RES001",
    title: "Result.try block has no body",
    body:
      "The form is `Result.try { <body> }` (or `Result.tryAsync { <body> }`). The block " +
      "lifts a throwing JS-boundary call into `Result<T, string>` so the result composes " +
      "with the `?` unwrap operator instead of leaking try/catch into your fn body.",
    example: {
      fails: "?bs 0.3\nconst r = Result.try;\n",
      passes: "?bs 0.3\nconst r = Result.try { JSON.parse(input) };\n",
    },
  },
  SYN001: {
    code: "SYN001",
    title: "duplicate or invalid fn header clause",
    body:
      "Each fn header clause — `reads {}`, `writes {}`, `intent:` — may appear at most " +
      "once per function declaration. A second occurrence is a syntax error: the compiler " +
      "cannot know which declaration wins, and silently picking one hides bugs (e.g. " +
      "`reads { cache } reads { db }` would silently discard `db`, making DEP001 blind " +
      "to the database dependency).\n\n" +
      "The same rule applies to resource labels inside `reads {}` or `writes {}`: labels " +
      "must be plain identifiers (e.g. `cache`, `db`, `metrics`). Quoted strings like " +
      "`reads { \"cache\" }` are not valid — the parser would silently produce an empty " +
      "list because the string token is not an identifier, and the dependency would be " +
      "invisible to DEP001.\n\n" +
      "Fix: merge duplicate clauses into a single declaration, and use unquoted identifiers " +
      "as resource labels.",
    example: {
      fails:
        "?bs 0.8\n" +
        "fn load(id: string) reads { cache } reads { db } -> string = id\n",
      passes:
        "?bs 0.8\n" +
        "fn load(id: string) reads { cache, db } -> string = id\n",
    },
  },
  DEP001: {
    code: "DEP001",
    title: "fn transitively reads a resource category not declared in its header",
    body:
      "From `?bs 0.9`, `reads { }` annotations are transitively enforced. If fn A calls " +
      "fn B (in the same file) and B declares `reads { x }`, then A must also declare " +
      "`reads { x }`. The rule extends to any depth: if B calls C which declares " +
      "`reads { y }`, then both B and A must declare `reads { y }`.\n\n" +
      "The purpose is completeness: reading A's header should tell you every resource " +
      "category A (or anything it calls) touches, without tracing through the call graph.\n\n" +
      "Over-declaration is always allowed — declaring more than the minimum is conservative " +
      "and harmless. DEP001 only fires on under-declaration (a label that is reachable but " +
      "not declared).",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn getFromCache(id: string) reads { cache } -> string = id\n" +
        "fn loadUser(id: string) -> string = getFromCache(id)\n",
      passes:
        "?bs 0.9\n" +
        "fn getFromCache(id: string) reads { cache } -> string = id\n" +
        "fn loadUser(id: string) reads { cache } -> string = getFromCache(id)\n",
    },
  },
  DEP002: {
    code: "DEP002",
    title: "fn transitively writes a resource category not declared in its header",
    body:
      "From `?bs 0.9`, `writes { }` annotations are transitively enforced. If fn A calls " +
      "fn B (in the same file) and B declares `writes { x }`, then A must also declare " +
      "`writes { x }`. The rule extends to any depth.\n\n" +
      "The purpose is completeness: reading A's header should tell you every resource " +
      "category A (or anything it calls) writes to, without tracing through the call graph.\n\n" +
      "Over-declaration is always allowed. DEP002 only fires on under-declaration.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
        "fn recordEvent(id: string) -> void { updateMetrics(id); }\n",
      passes:
        "?bs 0.9\n" +
        "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
        "fn recordEvent(id: string) writes { metrics } -> void { updateMetrics(id); }\n",
    },
  },
  THR001: {
    code: "THR001",
    title: "fn transitively throws an exception type not declared in its header",
    body:
      "THR001 fires from `?bs 0.9` when fn A calls fn B (directly or transitively, same file) " +
      "and B declares `throws { X }` that A's own `throws { }` clause does not include.\n\n" +
      "The throws declaration is the caller's contract: reading A's header should tell you every " +
      "exception type A (or anything it calls) may produce. Without the transitivity rule, callers " +
      "of A see an incomplete failure surface — they match on A's declared throws and miss the " +
      "types that bubble up from deeper in the call graph.\n\n" +
      "Over-declaration is intentionally allowed: a fn may declare `throws { X, Y }` even if it " +
      "only calls fns that throw `{ X }`. Conservative declarations are safe; under-declarations " +
      "are not.\n\n" +
      "THR001 is gated on `?bs 0.9`. Files pinned to earlier versions are unaffected.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
        "fn loadUser(id: string) -> string = fetchRemote(id)\n",
      passes:
        "?bs 0.9\n" +
        "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
        "fn loadUser(id: string) throws { HttpError } -> string = fetchRemote(id)\n",
    },
  },
  THR002: {
    code: "THR002",
    title: "fn body constructs an error type absent from its throws declaration",
    body:
      "THR002 fires from `?bs 0.9` when a fn body contains `err(TypeName(...))`, " +
      "`err(new TypeName(...))`, or bare `err(TypeName)` where TypeName (a CapCase " +
      "identifier) is not present in the fn's own `throws { }` clause.\n\n" +
      "This is the producer-side complement to THR001. THR001 ensures callers propagate the " +
      "throws surface; THR002 ensures the fn actually declares what it produces. Without it, " +
      "a fn can silently return an error type its callers cannot match — exhaustive match arms " +
      "for the undeclared type will be permanently dead code.\n\n" +
      "**Scope:** token-based detection only. Direct construction patterns are caught:\n" +
      "- `err(HttpError(msg))` → detects `HttpError`\n" +
      "- `err(new ParseError(...))` → detects `ParseError`\n" +
      "- `err(BuildError)` → detects `BuildError` (bare ref, not a call)\n\n" +
      "Indirect patterns (`err(e)` where `e` carries a type) require inference and are " +
      "intentionally out of scope.\n\n" +
      "THR002 is gated on `?bs 0.9`. Files pinned to earlier versions are unaffected.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn parseConfig(s: string) throws { ParseError } -> Result<string, string> {\n" +
        "  if (bad) err(NetworkError(\"timed out\"))\n" +
        "  else ok(s)\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn parseConfig(s: string) throws { ParseError, NetworkError } -> Result<string, string> {\n" +
        "  if (bad) err(NetworkError(\"timed out\"))\n" +
        "  else ok(s)\n" +
        "}\n",
    },
  },
  THR003: {
    code: "THR003",
    title: "fn under-declares throws implied by callback parameter throws annotations",
    body:
      "THR003 fires from `?bs 0.9` when a function-typed parameter carries `throws { X }` " +
      "but the containing fn does not declare `throws { X }` in its own header.\n\n" +
      "This is the direct analogue of EFF003 (reads on callback) and EFF004 (writes on callback), " +
      "applied to the throws surface. When a fn calls its callback parameter, it can exercise the " +
      "callback's declared throws — so the outer fn's own `throws {}` must be a superset of all " +
      "callback parameters' throws annotations.\n\n" +
      "**Why it matters:** a reviewer reading the outer fn's header sees no throws declaration and " +
      "has no warning that calling it may produce the error type. Callers that match exhaustively on " +
      "the outer fn's return type will have no arm for the undeclared exception — it becomes dead " +
      "code or a silent gap.\n\n" +
      "**Fix:** add the callback parameter's throws labels to the containing fn's own `throws { }` clause.\n\n" +
      "Over-declaration is allowed — if the containing fn declares more throws types than it can " +
      "actually exercise, that is harmless (same policy as THR001/THR002).\n\n" +
      "THR003 is gated on `?bs 0.9`. Files pinned to earlier versions are unaffected.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn process(\n" +
        "  items: string[],\n" +
        "  handler: fn(string) throws { NetworkError } -> void\n" +
        ") -> void {\n" +
        "  handler(items[0])\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn process(\n" +
        "  items: string[],\n" +
        "  handler: fn(string) throws { NetworkError } -> void\n" +
        ") throws { NetworkError } -> void {\n" +
        "  handler(items[0])\n" +
        "}\n",
    },
  },
};

export const KNOWN_CODES = Object.keys(EXPLANATIONS).sort();
