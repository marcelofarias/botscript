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
  ALI001: {
    code: "ALI001",
    title: "stdlib namespace aliased via a non-trivial expression — alias not tracked",
    body:
      "ALI001 is a **warning** (non-blocking) that fires when a module-level `const` binding " +
      "contains a stdlib namespace identifier anywhere in the RHS, but the form is " +
      "non-trivial — so static alias tracking is NOT guaranteed.\n\n" +
      "From `?bs 0.8`, the compiler tracks direct top-level bindings like `const t = time` " +
      "and `const t = (time)`, so `t.now()` is checked against `time`'s capability. But " +
      "non-trivial forms — operator expressions (`time + 1`), member accesses (`time.now`), " +
      "calls (`time()`), and conditionals where the stdlib ident appears in a non-leading " +
      "position (`flag ? time : null`) — are not tracked. If you use the binding as if it " +
      "were the namespace, the capability checks (CAP001/CAP002), body-level intent checks " +
      "(INT002/INT004), and UNS005 will not see the alias and the checks will be bypassed.\n\n" +
      "**What to do:** use a direct binding (`const t = time`) to alias a stdlib namespace, " +
      "or reference the canonical name directly instead of creating an alias.\n\n" +
      "ALI001 is gated on `?bs 0.8`. Files pinned to earlier versions are unaffected.",
    example: {
      fails: "?bs 0.8\nconst t = time.now\n",
      passes: "?bs 0.8\nconst t = time\n",
    },
  },
  ALI002: {
    code: "ALI002",
    title: "alias-of-alias chain — const x = t (where t is a stdlib alias) is not tracked",
    body:
      "ALI002 is a **warning** (non-blocking) that fires when a module-level `const` binding " +
      "names an existing tracked stdlib alias on the RHS: `const x = t` where `t` is itself " +
      "an alias for a stdlib namespace (e.g. `const t = time`).\n\n" +
      "Chain aliases are intentionally not tracked from `?bs 0.8`. Only direct bindings " +
      "(`const x = time`) are followed. As a result, `x.now()` will not be detected by " +
      "capability checks (CAP001/CAP002), body-level intent checks (INT002/INT004), or UNS005 — " +
      "the one-liner alias bypass is reintroduced.\n\n" +
      "**What to do:** bind directly to the stdlib namespace (`const x = time`) or reference " +
      "the canonical name directly wherever you intended to use `x`.\n\n" +
      "ALI002 is gated on `?bs 0.8`. Files pinned to earlier versions are unaffected.",
    example: {
      fails: "?bs 0.8\nconst t = time\nconst x = t\n",
      passes: "?bs 0.8\nconst t = time\nconst x = time\n",
    },
  },
  ALI003: {
    code: "ALI003",
    title: "stdlib namespace destructuring — extracted member references are not tracked",
    body:
      "ALI003 fires when a module-level `const` object-destructuring pattern extracts " +
      "members from a stdlib namespace: `const { now } = time`.\n\n" +
      "Extracted member references lose their namespace context at the call site. " +
      "`now()` is just an ordinary function call — the `time` tripwire never fires, so " +
      "capability checks (CAP001/CAP002), body-level intent checks (INT002/INT004), and " +
      "UNS005 all miss it. The bypass is invisible and silent.\n\n" +
      "**What to do:** use a direct namespace binding (`const t = time`) and call " +
      "`t.now()` instead, or reference the canonical namespace directly (`time.now()`).\n\n" +
      "**Severity by version:**\n" +
      "- `?bs 0.8` — **warning** (non-blocking): compilation succeeds.\n" +
      "- `?bs 0.9+` — **error** (blocking): compilation fails. There is no defensible use " +
      "case for destructuring a stdlib namespace; the pattern is always either a mistake " +
      "or a static-check bypass attempt.\n\n" +
      "ALI003 is gated on `?bs 0.8`. Files pinned to earlier versions are unaffected.",
    example: {
      fails: "?bs 0.9\nconst { now } = time\n",
      passes: "?bs 0.9\nconst t = time\n",
    },
  },
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
      "Module-level aliasing (`const t = time; t.now()`) is undetected pre-0.8 — the rule " +
      "is: the canonical names are tripwires. From ?bs 0.8 a direct top-level binding " +
      "`const t = time` is tracked: `t.now()` resolves to `time.now()` and the diagnostic names " +
      "both (`'t' is an alias for 'time'`). Non-trivial RHS forms (member access, calls, " +
      "ternaries) and block-scoped aliases inside fn bodies stay on the tripwire. Cross-module " +
      "propagation is not yet in scope; the runtime $require backs that case up.",
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
      "CAP003 is a **warning** (non-blocking) that fires when a `uses {}` declaration " +
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
        "fn callApi(url: string) uses { net } -> Result<string, string> {\n" +
        "  match http.get(url) {\n" +
        "    ok { value } -> ok(value)\n" +
        "    err { error } -> err(error)\n" +
        "  }\n" +
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
  UNS005: {
    code: "UNS005",
    title: "external call without declared result contract",
    body:
      "UNS005 fires when a stdlib capability call (`http.x`, `fs.x`, `time.x`, `random.x`, " +
      "`stdout.x`, `stderr.x`) has no declared result contract at the call site. The return " +
      "value may be structurally typed correctly — the compiler sees a `string` or `Result<T, E>` " +
      "— but be semantically incorrect in ways only the runtime context can detect.\n\n" +
      "UNS005 is **compiler-inferred**, not programmer-applied. Unlike UNS001–UNS004 which fire " +
      "on malformed `unsafe` blocks, UNS005 fires on ordinary-looking external calls. A reviewer " +
      "can tell at a glance whether the author made a deliberate choice (unsafe block) or the " +
      "compiler is flagging an omission.\n\n" +
      "**Suppression mechanisms (in order of preference):**\n\n" +
      "1. **match** — wrap the call as the direct match subject:\n" +
      "   ```\n   match http.get(url) {\n     ok { value } -> ...\n     err { error } -> ...\n   }\n   ```\n" +
      "   Both success and failure paths are explicit. " +
      "`match await http.get(url)` is also accepted (await is transparent).\n\n" +
      "2. **unsafe block** — `unsafe \"I know what X returns\" { ns.method(...) }` accepts the " +
      "uncertainty with a written explanation. The reason becomes the review record on the call.\n\n" +
      "3. **unsafe fn** — `unsafe \"reason\" fn name(...) -> T { ns.method(...) }` suppresses UNS005 " +
      "for the entire fn body. Use when the fn itself is the module's single safe adapter for the call.\n\n" +
      "4. **(Future) ensures annotation** — when `ensures: \"...\"` lands in a future version, " +
      "declaring it on the callee's header will suppress UNS005 for all call sites.\n\n" +
      "UNS005 is gated on `?bs 0.9`. Files pinned to earlier versions are unaffected.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn fetchUser(id: string) uses { net } -> string {\n" +
        "  const data = http.get(`/users/${id}`);\n" +
        "  data\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn fetchUser(id: string) uses { net } -> Result<string, string> {\n" +
        "  match http.get(`/users/${id}`) {\n" +
        "    ok { value } -> ok(value)\n" +
        "    err { error } -> err(`fetch failed: ${error}`)\n" +
        "  }\n" +
        "}\n",
    },
  },
  INT001: {
    code: "INT001",
    title: "intent declares 'pure' but function has capability, resource, or throws declarations",
    body:
      "An `intent: \"pure\"` clause is a machine-checkable claim that the function is " +
      "deterministic, side-effect-free, and accesses no external resources. A function " +
      "with a non-empty `uses { ... }`, `reads { ... }`, `writes { ... }`, or `throws { ... }` " +
      "clause contradicts that claim — the declaration says it can reach the network, file " +
      "system, or clock (or depends on / mutates external state, or throws exceptions) while " +
      "the intent says it cannot. Botscript treats this as an error rather than a warning " +
      "because the mismatch is always a mistake: either the intent is wrong, or the " +
      "conflicting header clause is wrong.\n\n" +
      "For `throws {}` specifically: throwing an exception is a side effect — it unwinds " +
      "the call stack and changes control flow in a way observable to the caller. A truly " +
      "pure function should use `Result<T, E>` instead of `throws {}` to signal error " +
      "conditions.\n\n" +
      "The word 'pure' is matched as a whole word inside the intent string — " +
      "`\"impure\"` does not match, but `\"pure\"`, `\"pure function\"`, and " +
      "`\"idempotent and pure\"` all do.\n\n" +
      "INT001 is gated on `?bs 0.7`. Files pinned to earlier versions may use " +
      "`intent:` declarations without triggering any check. From `?bs 0.8`, the same " +
      "rule applies to `reads { }` and `writes { }` clauses. From `?bs 0.9`, it also " +
      "applies to `throws { }` clauses.\n\n" +
      "Scope note: INT001 is a header-level consistency check — it verifies that the " +
      "declared header clauses do not contradict each other. Body-shape verification " +
      "(whether the function body actually matches its declared intent) is a separate " +
      "check (INT002) introduced in `?bs 0.7`.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn parseId(raw: string) intent: \"pure\" throws { ParseError } -> string {\n" +
        "  if (!raw.match(/^[a-z]+$/)) throw new ParseError(\"invalid\")\n" +
        "  return raw\n" +
        "}\n",
      passes:
        "// pure fns use Result for error signaling\n" +
        "?bs 0.9\n" +
        "fn parseId(raw: string) intent: \"pure\" -> Result<string, ParseError> {\n" +
        "  if (!raw.match(/^[a-z]+$/)) { const e = new ParseError(\"invalid\"); return err(e) }\n" +
        "  return ok(raw)\n" +
        "}\n",
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
  INT003: {
    code: "INT003",
    title: "intent declares 'idempotent' but function uses a non-idempotent capability",
    body:
      "An `intent: \"idempotent\"` clause is a retry contract: the caller may re-send the " +
      "request on failure and expect the same observable result. `random` and `time` capabilities " +
      "break that contract by definition — `random.next()` returns a different value on every call, " +
      "and `time.now()` advances. A function that declares either `uses { random }` or `uses { time }` " +
      "and `intent: \"idempotent\"` is making a claim the header already disproves.\n\n" +
      "This is a header-level check: it compares the `uses {}` clause against the intent string " +
      "without inspecting the body. Only `random` and `time` are structurally non-idempotent, so " +
      "they are the only capabilities INT003 flags. Other capabilities (e.g. `net`, `fs`) are not " +
      "flagged — a network read or file read can return the same result on retry. Note this is a " +
      "narrow header heuristic, not a proof of idempotence: INT003 does not vouch that a fn using " +
      "`net`/`fs`/`process`/`stdout`/`stderr` is actually idempotent (a write is not), only that it " +
      "makes no inherently non-idempotent capability claim.\n\n" +
      "INT003 is gated on `?bs 0.7`. Files on earlier pins are not checked. The body-level complement " +
      "is INT004, which fires when the `uses {}` clause is absent but the body still directly calls " +
      "`random.*` or `time.*`.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn expireAt(ttl: number) uses { time } intent: \"idempotent\" -> number = time.now() + ttl\n",
      passes:
        "// option A — remove the non-idempotent capability (make it truly idempotent)\n" +
        "?bs 0.7\n" +
        "fn expireAt(ttl: number, now: number) intent: \"idempotent\" -> number = now + ttl\n\n" +
        "// option B — remove the idempotent claim and keep the time capability\n" +
        "?bs 0.7\n" +
        "fn expireAt(ttl: number) uses { time } -> number = time.now() + ttl\n",
    },
  },
  INT004: {
    code: "INT004",
    title: "intent declares 'idempotent' but function body directly calls a non-idempotent capability",
    body:
      "INT004 is the body-level complement to INT003. INT003 catches the case where " +
      "`intent: \"idempotent\"` and `uses { random }` or `uses { time }` are both present in " +
      "the header (an obvious contradiction). INT004 catches the subtler case: the header looks " +
      "fine (no `random` or `time` in `uses {}`), but the function body directly references " +
      "`random.*` or `time.*` without declaring them.\n\n" +
      "This matters because INT003 is a header-level check — it compares clauses to each other " +
      "but does not look at the body. A function can declare `intent: \"idempotent\"` and an empty " +
      "`uses {}` clause while still calling `random.next()` directly in the body. INT004 closes " +
      "that gap. INT003 takes priority: if both header and body are inconsistent, only INT003 fires.\n\n" +
      "The check scans the fn body's own token range for direct `random.*` or `time.*` references, " +
      "excluding nested `fn` declarations. It does not do transitive call-graph inference.\n\n" +
      "INT004 is gated on `?bs 0.7` (same gate as INT003). Files on earlier pins are not checked.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn generateId(prefix: string) intent: \"idempotent\" -> string = prefix + random.next()\n",
      passes:
        "// option A — remove the non-idempotent call (make it truly idempotent)\n" +
        "?bs 0.7\n" +
        "fn generateId(prefix: string, suffix: string) intent: \"idempotent\" -> string = prefix + suffix\n\n" +
        "// option B — remove the idempotent claim and declare the capability\n" +
        "?bs 0.7\n" +
        "fn generateId(prefix: string) uses { random } -> string = prefix + random.next()\n",
    },
  },
  INT005: {
    code: "INT005",
    title: "intent declares 'idempotent' but function declares writes {}",
    body:
      "INT005 fires when a function header combines `intent: \"idempotent\"` with a non-empty " +
      "`writes { ... }` clause. A function that writes to a resource produces observable " +
      "side effects: calling it twice is not the same as calling it once, because the write " +
      "happens again. That contradicts the idempotency contract, which requires that repeated " +
      "calls with the same arguments produce the same observable result.\n\n" +
      "The check is structural and header-level: it fires whenever both clauses appear, " +
      "regardless of what the body actually does. This is intentional — the annotation surface " +
      "is the contract, and the contract is self-contradictory. (For upsert-style writes that " +
      "happen to be idempotent in practice, the correct posture is to not claim `idempotent` " +
      "and instead document the idempotency guarantee via a comment.)\n\n" +
      "INT005 is gated on `?bs 0.8` (the same gate that activates reads/writes enforcement). " +
      "Files pinned below 0.8 can declare both clauses without triggering the check. When " +
      "both INT005 and INT003/INT004 would fire, INT005 takes priority and only INT005 is emitted.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn recordAttempt(id: string) intent: \"idempotent\" writes { auditLog } -> void { }\n",
      passes:
        "// option A — remove the idempotent claim (the fn writes state, so it is not idempotent)\n" +
        "?bs 0.9\n" +
        "fn recordAttempt(id: string) writes { auditLog } -> void { }\n\n" +
        "// option B — remove writes if the fn does not actually mutate anything\n" +
        "?bs 0.9\n" +
        "fn recordAttempt(id: string) intent: \"idempotent\" -> void { }\n",
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
  RES002: {
    code: "RES002",
    title: "Result- or Option-returning fn called but return value discarded",
    body:
      "RES002 is a **warning** (non-blocking) that fires when a same-file function whose " +
      "declared return type contains `Result<>` or `Option<>` is called as a bare statement — " +
      "the return value is discarded without propagation (`?`), matching, or assignment.\n\n" +
      "**Why this is a problem:** in botscript, `Result<void, E>` is not `void`. The error path " +
      "is real and reaches the caller only if the caller propagates it. Discarding the result " +
      "permanently seals the error path — any failure is silently swallowed. LLMs writing " +
      "botscript frequently write `callFn(args)` as a statement when they 'don't care about " +
      "the return value', the same pattern they'd use in TypeScript for a `Promise<void>` " +
      "fire-and-forget. RES002 catches this before it becomes a runtime surprise.\n\n" +
      "**What to do:**\n" +
      "- Use `?` to propagate errors to the caller: `saveUser(user)?`\n" +
      "- Use `match` to handle each case explicitly\n" +
      "- Assign to a variable: `let result = saveUser(user)` and inspect later\n" +
      "- If the discard is truly intentional (best-effort logging, optional cache write), " +
      "wrap in `unsafe \"intentional discard\" { saveUser(user) }` to document the decision.\n\n" +
      "**Scope:** only fires for same-file fns (not cross-file or moduleEffects). " +
      "Calls inside `test { ... }` and `unsafe { ... }` blocks are excluded.\n\n" +
      "RES002 is gated on `?bs 0.9`. The complementary exhaustiveness checks are MAT001 " +
      "(non-exhaustive Result match) and MAT002 (non-exhaustive Option match).",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn saveUser(user: string) writes { userDb } -> Result<void, string> { ok(undefined) }\n" +
        "fn processUser(user: string) writes { userDb } -> void {\n" +
        "  saveUser(user)\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn saveUser(user: string) writes { userDb } -> Result<void, string> { ok(undefined) }\n" +
        "fn processUser(user: string) writes { userDb } -> Result<void, string> {\n" +
        "  saveUser(user)?\n" +
        "}\n",
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
  SYN002: {
    code: "SYN002",
    title: "native throw statement bypasses Result contract",
    body:
      "Botscript's error model is built around `Result<T, E>` and `throws {}` declarations. " +
      "Callers handle errors via `?` unwrap, `match` exhaustiveness (MAT001), and declared " +
      "throws surfaces (THR001/THR002).\n\n" +
      "A native `throw` statement bypasses this contract entirely: the exception propagates " +
      "outside the Result type system, so callers relying on `?` unwrap or `match` will not " +
      "observe the error — the exception travels up the call stack unchecked, invisible to " +
      "the capability and contract machinery.\n\n" +
      "This is especially dangerous in bot orchestration code where a thrown exception can " +
      "propagate through multiple layers without capture, bypassing error budgets and retry logic.\n\n" +
      "Fix: replace `throw new ErrorType(...)` with `return err(new ErrorType(...))` and " +
      "update the function's return type to `Result<T, ErrorType>`.\n\n" +
      "SYN002 fires at `?bs 0.7+` (when the error modeling system is active) as a " +
      "non-blocking warning.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn parse(s: string) -> string {\n" +
        "  if (!s) throw new ParseError(\"empty\")\n" +
        "  return s\n" +
        "}\n",
      passes:
        "// use Result for error signaling — callers can unwrap with ?\n" +
        "?bs 0.9\n" +
        "fn parse(s: string) -> Result<string, ParseError> {\n" +
        "  if (!s) { const e = new ParseError(\"empty\"); return err(e) }\n" +
        "  return ok(s)\n" +
        "}\n",
    },
  },
  SYN003: {
    code: "SYN003",
    title: "console.* call bypasses stdout/stderr capability model",
    body:
      "Botscript tracks output capability through `stdout` and `stderr` stdlib namespaces. " +
      "A fn that writes to the terminal must declare `uses { stdout }` or `uses { stderr }` " +
      "so callers (and the capability check pass, CAP001/CAP002) can see the output surface.\n\n" +
      "Direct `console.*` calls (console.log, console.error, console.warn, etc.) route output " +
      "outside the declared capability system — the compiler sees no call to a tracked stdlib " +
      "namespace, so CAP001 (under-declaration) cannot fire. However, CAP002 (over-declaration) " +
      "*can* still fire: if a developer declares `uses { stdout }` on a fn that uses `console.*` " +
      "instead of `stdout.write(...)`, CAP002 will flag the declared capability as never used. " +
      "Either way, callers have no way to know the fn writes to stdout or stderr just by reading " +
      "its header.\n\n" +
      "This is a reliability issue in bot orchestration code: a bot that silently logs to " +
      "console in a sandboxed or pipe environment may produce output the orchestrator never " +
      "expects and cannot suppress or redirect.\n\n" +
      "**Fix:** replace `console.log(...)` with `stdout.write(...)` wrapped in an " +
      "`unsafe \"...\" { ... }` block (required by UNS005 at `?bs 0.9+`) and add `uses { stdout }` " +
      "to the fn header; replace `console.error(...)` with `stderr.write(...)` (same pattern) and add " +
      "`uses { stderr }`.\n\n" +
      "SYN003 fires at `?bs 0.7+` as a non-blocking warning. The check is token-based and " +
      "fires on any `console.method(...)` call where `console` is not a property of another " +
      "expression — it does not track local `console` rebindings.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn greet(name: string) -> void {\n" +
        "  console.log(`Hello, ${name}`)\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn greet(name: string) uses { stdout } -> void {\n" +
        "  unsafe \"stdout.write returns void\" { stdout.write(`Hello, ${name}`) }\n" +
        "}\n",
    },
  },
  SYN004: {
    code: "SYN004",
    title: "eval() or Function() / new Function() bypass all static capability and syntax checks",
    body:
      "Botscript's safety model relies on static analysis: capability declarations, resource " +
      "labels, and syntax checks (SYN002/SYN003) all operate on visible, unchanging source text. " +
      "`eval(...)`, `Function(...)`, and `new Function(...)` shatter that foundation — they " +
      "execute arbitrary strings as code at runtime, and no static pass can see what those strings will do.\n\n" +
      "The risk in bot code is concrete:\n" +
      "- `eval('process.env.' + key)` hides env dependencies from callers (invisible to static analysis)\n" +
      "- `eval('http.get(...)')` bypasses CAP001 (capability claim not in the fn's header)\n" +
      "- `new Function('return process.exit(1)')()` hides arbitrary effects from all static checks (capability, Result contract, and every SYN diagnostic)\n\n" +
      "Every other SYN check is weakened by eval: a bot could route any unsafe pattern through " +
      "`eval` or the Function constructor to avoid static detection. The capability manifest hash " +
      "proves the *source* hasn't changed, not that runtime behavior is bounded.\n\n" +
      "**Fix:** refactor the eval-based pattern to use explicit code paths. If the use case " +
      "genuinely requires eval-level dynamism (e.g. a sandboxed user-script interpreter), " +
      "wrap the call in `unsafe \"<reason>\" { eval(src) }` to make the escape hatch visible " +
      "in the diff and in code review.\n\n" +
      "SYN004 fires at `?bs 0.7+` as a non-blocking warning. Detection is token-based: " +
      "`eval` not preceded by `.`/`?.` followed by `(`, `?.(`, or `<T>(`; bare `Function(...)` / " +
      "`Function?.(...)` / `new Function(...)` — including TypeScript instantiation forms " +
      "`eval<T>(...)`, `Function<T>(...)`, and `new Function<T>(...)` — not preceded by `.`/`?.`. " +
      "`.eval(...)` (method call on a local object) and `Function.*` member accesses are excluded.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn run(code: string) -> string {\n" +
        "  return eval(code)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn run(code: string) -> string {\n" +
        "  return unsafe \"evaluates user-provided script in sandbox\" { eval(code) }\n" +
        "}\n",
    },
  },
  SYN005: {
    code: "SYN005",
    title: "process.env access is an undeclared deployment environment dependency",
    body:
      "Botscript's safety model makes every dependency of a fn explicit in its header — " +
      "capabilities via `uses {}`, resource labels via `reads {}` / `writes {}`, errors via `throws {}`. " +
      "`process.env` is the one major dependency surface that has no corresponding declaration.\n\n" +
      "A fn that reads `process.env.DATABASE_URL` has a real runtime dependency on the deployment " +
      "environment. Callers cannot see this dependency from the fn's header. Tests cannot mock it " +
      "without mutating the global process object. A misconfigured deployment silently breaks the fn " +
      "at runtime with no compile-time signal.\n\n" +
      "This is distinct from the capability model (SYN003): there is no `env` capability " +
      "to declare. The correct fix is structural — move the config dependency out of the fn body " +
      "and into the call signature.\n\n" +
      "**Fix:** pass config and secrets as explicit fn parameters. The caller is the right place to " +
      "load from `process.env`; the fn should receive typed values, not raw strings from the " +
      "environment. If env access is genuinely required at the load site, wrap in " +
      "`unsafe \"reads deployment env\" { process.env.DATABASE_URL }` to make the escape hatch visible in the diff.\n\n" +
      "SYN005 fires at `?bs 0.7+` as a non-blocking warning. Detection is token-based: `process` " +
      "not preceded by `.` or `?.`, followed by `.`/`?.` then `env`. " +
      "`obj.process.env` (member access on a local) is excluded. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn connect() -> string {\n" +
        "  return process.env.DATABASE_URL\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn connect(dbUrl: string) -> string {\n" +
        "  return dbUrl\n" +
        "}\n",
    },
  },
  SYN006: {
    code: "SYN006",
    title: "process.exit() terminates the host process and bypasses all recovery logic",
    body:
      "`process.exit()`, `process?.exit(...)`, and `process.exit?.(...)` are the most severe silent-exit " +
      "patterns botscript does not already cover. " +
      "Unlike `throw` (SYN002), `console.*` (SYN003), or `process.env` (SYN005), these calls " +
      "don't just affect the current fn — they terminate the entire host process. " +
      "The call produces no return value, never runs any caller code after it, and permanently " +
      "seals off every recovery path: `?` propagation, `match`, `try/catch`, `throws {}` — none of them run.\n\n" +
      "The risk in bot code is concrete:\n" +
      "- `if (!cfg.valid) process.exit(1)` — callers have no way to recover; the process dies silently\n" +
      "- `try { doWork() } catch (e) { process.exit(1) }` — error handlers that kill instead of propagating; the bot runtime never sees it\n" +
      "- `if (!env) { console.error(...); process.exit(1) }` — config-load failures that are invisible to orchestrators\n\n" +
      "Code-generation models commonly produce these patterns for CLI-style guard clauses and error handlers. " +
      "None of them are caught by any other diagnostic.\n\n" +
      "**Fix:** return `err(...)` (e.g. `err('reason')`) and let the caller decide whether to exit. " +
      "The fn's contract is to signal failure, not to make the termination decision. " +
      "If `process.exit` is genuinely required at a bootstrap entry point (e.g. a top-level CLI script), " +
      "wrap in `unsafe \"exits on invalid config\" { process.exit(1) }` to make the escape hatch visible in the diff.\n\n" +
      "SYN006 fires at `?bs 0.7+` as a non-blocking warning. Detection: `process` not preceded by `.`/`?.`, " +
      "followed by `.`/`?.` then `exit`, then `(` or `?.(` (including optional-call form `process.exit?.()`). " +
      "`obj.process.exit(...)` (member access on a local) and `process.exit` without a call `(` are excluded. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn validate(cfg: Config) -> void {\n" +
        "  if (!cfg.valid) process.exit(1)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn validate(cfg: Config) -> Result<void, string> {\n" +
        "  if (!cfg.valid) return err('invalid config')\n" +
        "  return ok(undefined)\n" +
        "}\n",
    },
  },
  SYN007: {
    code: "SYN007",
    title: "fetch() call bypasses the net capability model",
    body:
      "Botscript's capability model is static: the compiler reads the fn header and infers what that fn " +
      "may do — network access, resource reads/writes, error types. The `fetch` global bypasses this " +
      "by making HTTP requests at runtime that CAP001 cannot see.\n\n" +
      "CAP001 checks for `http.*` member calls (the stdlib's declared network surface). `fetch` is a " +
      "browser/Node global — calling it does not require a `uses { net }` declaration, and the compiler " +
      "cannot enforce that callers know the fn has a network dependency.\n\n" +
      "**Fix:** replace `fetch(url)` with `http.get(url)` (or `http.post(url, { body })`) and add " +
      "`uses { net }` to the fn header. If the native fetch API is genuinely required (e.g. for " +
      "streaming, credentials, or non-standard headers), wrap in " +
      "`unsafe \"calls fetch directly\" { fetch(url) }` to make the escape hatch visible.\n\n" +
      "SYN007 fires at `?bs 0.7+` as a non-blocking warning. Detection is token-based: `fetch` not " +
      "preceded by `.`/`?.` (member call exclusion), followed by `(` or `?.(`. " +
      "Object method shorthands (`{ fetch(url) {} }`), TypeScript method signatures, fn/function " +
      "declarations named `fetch`, and bare `fetch` references are excluded. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn getUser(url: string) -> any {\n" +
        "  return fetch(url)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn getUser(url: string) uses { net } -> any {\n" +
        "  return http.get(url)\n" +
        "}\n",
    },
  },
  SYN008: {
    code: "SYN008",
    title: "WebSocket construction bypasses the net capability model",
    body:
      "Botscript's capability model is static: the compiler reads the fn header and infers what that fn " +
      "may do — network access, resource reads/writes, error types. The `WebSocket` global bypasses this " +
      "by opening a persistent bidirectional connection at runtime that CAP001 cannot see.\n\n" +
      "CAP001 checks for `http.*` member calls (the stdlib's declared network surface). `WebSocket` is a " +
      "global — constructing one does not require a `uses { net }` declaration, and the compiler cannot " +
      "enforce that callers know the fn has a network dependency.\n\n" +
      "This is the same bypass class as `fetch()` (bare global that CAP001 misses): real network effects " +
      "invisible to the declared capability surface.\n\n" +
      "**Fix:** wrap the construction in `unsafe \"wraps WebSocket for <reason>\" { new WebSocket(url) }` " +
      "to make the escape hatch visible in the diff and to callers reading the fn.\n\n" +
      "SYN008 fires at `?bs 0.7+` as a non-blocking warning. Detection is token-based: `WebSocket` not " +
      "preceded by `.`/`?.` (member call exclusion), followed by `(`, `?.(`, or — when preceded by " +
      "`new` — `<T>(` (TypeScript generic instantiation). Generic scanning is gated on `new` to avoid " +
      "false-positives on comparison expressions like `WebSocket < x > (y)`. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn subscribe(url: string) -> void {\n" +
        "  const ws = new WebSocket(url)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn subscribe(url: string) -> void {\n" +
        '  const ws = unsafe "wraps WebSocket for live updates" { new WebSocket(url) }\n' +
        "}\n",
    },
  },
  SYN010: {
    code: "SYN010",
    title: "setTimeout / setInterval / queueMicrotask defers side effects outside the fn's capability surface",
    body:
      "Botscript's capability model is static: the compiler reads the fn header and infers what that fn " +
      "may do — network access, resource reads/writes, error types. Timer and microtask globals break this " +
      "contract by scheduling work to run *after* the fn returns.\n\n" +
      "When a fn calls `setTimeout(() => http.get(url), 5000)`, it has a live network dependency — but " +
      "that dependency runs in a callback that fires in a future event-loop tick. The fn returns `void` " +
      "(or a timer ID) immediately. No `uses { net }` declaration in the header can cover it, because the " +
      "capability lives in the deferred callback, not in the fn's direct call graph.\n\n" +
      "The impact in bot code is concrete:\n" +
      "- `setTimeout(() => db.write(state), 0)` — a write that runs after the fn returns; callers cannot observe it\n" +
      "- `setInterval(() => pollApi(), 60_000)` — a recurring effect started by the fn; the caller has no teardown handle\n" +
      "- `queueMicrotask(() => emitEvent())` — a microtask-queued side effect, invisible to the static analysis\n\n" +
      "This is the same bypass class as `fetch()` and `WebSocket` globals: real effects that " +
      "sidestep the declared capability surface, but deferred rather than immediate.\n\n" +
      "**Fix:** make the timing explicit. If the fn needs to delay work, return a `Promise` the caller " +
      "awaits, or return a teardown function the caller can control. If a timer is genuinely required, " +
      "wrap in `unsafe \"schedules deferred effect\" { setTimeout(...) }` to make the escape hatch visible.\n\n" +
      "SYN010 fires at `?bs 0.7+` as a non-blocking warning. Detection is token-based: `setTimeout`, " +
      "`setInterval`, or `queueMicrotask` not preceded by `.`/`?.`, followed by `(` or `?.(`. " +
      "Member calls (`obj.setTimeout(...)`) are excluded. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn pollStatus(url: string) uses { net } -> void {\n" +
        "  setInterval(() => http.get(url), 5000)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn pollStatus(url: string) uses { net } -> () -> void {\n" +
        "  const id = unsafe \"schedules polling\" { setInterval(() => http.get(url), 5000) }\n" +
        "  return () => clearInterval(id)\n" +
        "}\n",
    },
  },
  SYN011: {
    code: "SYN011",
    title: "dynamic import() call bypasses the module capability model",
    body:
      "SYN011 fires when a fn body calls `import(specifier)` — the dynamic import form. " +
      "This is the same class of capability-surface bypass as timer globals (SYN010): a real runtime " +
      "effect that sidesteps the declared capability surface.\n\n" +
      "**Why it matters:** CAP001 checks for direct stdlib namespace calls (`http.get`, `fs.read`, " +
      "etc.) in a fn body. A dynamic `import()` call loads an entirely separate module at runtime. " +
      "That module can call `http.get`, write to the filesystem, spawn processes, or do anything else " +
      "— none of it visible to the static analysis. The fn's capability manifest hash proves the fn " +
      "body unchanged; it says nothing about what the dynamically loaded module does at runtime. " +
      "The capability surface of a fn that calls `import()` is unbounded and invisible to CAP001.\n\n" +
      "**Detection:** the check looks for an `import` token (kind=ident) not preceded by `.`/`?.` " +
      "(which would make it a property access), followed by `(` or `?.(` (confirming it is a call). " +
      "`import.meta.url` and other `import.meta` property accesses are excluded because they are " +
      "followed by `.`, not `(`. Object method shorthands named `import` and `fn import(...)` " +
      "botscript declarations are excluded. Static `import { ... } from` declarations at the top level " +
      "are outside fn bodies and are never seen by this scan.\n\n" +
      "**Fix:** if the module is known at compile time, use a static top-level " +
      "`import { ... } from '...'` declaration instead. If dynamic loading is genuinely required " +
      "(e.g. a plugin system, lazy code splitting), wrap in " +
      "`unsafe \"loads plugin dynamically\" { import(specifier) }` to make the escape hatch visible " +
      "in the diff and give reviewers the reason.\n\n" +
      "SYN011 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "async fn getAdapter(type: string) -> any {\n" +
        "  const m = await import(`./adapters/${type}`)\n" +
        "  return m.default\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "async fn getAdapter(type: string) -> any {\n" +
        "  const m = await unsafe \"adapter type is validated by the registry\" { import(`./adapters/${type}`) }\n" +
        "  return m.default\n" +
        "}\n",
    },
  },
  SYN012: {
    code: "SYN012",
    title: "new EventSource() / EventSource() call bypasses the net capability model",
    body:
      "SYN012 fires when a fn body constructs an `EventSource` via `new EventSource(url)`, " +
      "bare `EventSource(url)`, optional-call `EventSource?.(url)`, or TypeScript instantiation " +
      "form `new EventSource<T>(url)`. " +
      "This is the same bypass class as `new WebSocket(url)`: a persistent connection " +
      "that is real network I/O but invisible to the declared capability surface.\n\n" +
      "**Why it matters:** `EventSource` opens a persistent HTTP GET connection to the server " +
      "and streams server-sent events. CAP001 checks for `http.*` member calls, not the " +
      "`EventSource` global. A fn that constructs an EventSource has an undeclared `net` " +
      "dependency — the capability manifest hash proves the fn body unchanged; the actual " +
      "network effect is invisible to callers and to audit tooling.\n\n" +
      "**Detection:** the check looks for an `EventSource` ident token not preceded by `.`/`?.` " +
      "(which would make it a member call on a local), followed by `(` or `?.(` (with optional " +
      "`new` preceding for the constructor form). TypeScript generic instantiation " +
      "`new EventSource<T>(url)` is also detected — the generic scan is gated on `new` to " +
      "prevent `EventSource < x > (y)` comparison expressions from false-firing. " +
      "Object method shorthands and TypeScript method signatures named `EventSource` are " +
      "excluded via the trailing-`:` check (guarded against ternary consequents).\n\n" +
      "**Fix:** wrap the construction in an `unsafe` block with a justification:\n" +
      "`unsafe \"wraps EventSource for live feed\" { new EventSource(url) }`\n\n" +
      "SYN012 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn openFeed(url: string) -> any {\n" +
        "  return new EventSource(url)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn openFeed(url: string) -> any {\n" +
        '  return unsafe "wraps EventSource for streaming feed" { new EventSource(url) }\n' +
        "}\n",
    },
  },
  SYN013: {
    code: "SYN013",
    title: "Worker() / SharedWorker() construction (with or without new) spawns an unbounded execution context",
    body:
      "SYN013 fires when a fn body constructs a `Worker` or `SharedWorker` via `new Worker(scriptURL)`, " +
      "bare `Worker(scriptURL)`, optional call `Worker?.(scriptURL)`, `new SharedWorker(scriptURL)`, " +
      "bare `SharedWorker(scriptURL)`, optional call `SharedWorker?.(scriptURL)`, or TypeScript instantiation forms.\n\n" +
      "**Why it matters:** Worker construction is the most severe capability bypass in the SYN series. " +
      "Unlike the `fetch` global or `WebSocket` which have bounded effects, a Worker spawns an entirely new " +
      "JS execution context. The worker script can make network requests, access storage, spawn its own " +
      "workers, and perform any operation — none of which is visible in the spawning fn's " +
      "`uses {}`, `reads {}`, or `writes {}` declarations. CAP001 checks for stdlib namespace calls; " +
      "it cannot infer anything from a Worker constructor. The capability surface of the spawned " +
      "context is unbounded and invisible to callers and audit tooling.\n\n" +
      "**Detection:** the check looks for a `Worker` or `SharedWorker` ident token not preceded by `.`/`?.` " +
      "(which would make it a member call on a local), followed by `(` (with optional `new` preceding for " +
      "the constructor form or `?.` for optional calls). TypeScript generic instantiation `new Worker<T>(url)` is also detected — " +
      "the generic scan is gated on `new` to prevent comparison expressions from false-firing. " +
      "Object method shorthands and TypeScript method signatures named `Worker` or `SharedWorker` are " +
      "excluded via the trailing-`:` check (guarded against ternary consequents).\n\n" +
      "**Fix:** wrap the construction in an `unsafe` block with a justification that describes " +
      "what capabilities the worker script is expected to use:\n" +
      "`unsafe \"spawns computation worker with no external I/O\" { new Worker(scriptURL) }`\n\n" +
      "SYN013 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn startWorker(url: string) -> any {\n" +
        "  return new Worker(url)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn startWorker(url: string) -> any {\n" +
        '  return unsafe "spawns computation worker with no net access" { new Worker(url) }\n' +
        "}\n",
    },
  },
  SYN014: {
    code: "SYN014",
    title: "new BroadcastChannel() / BroadcastChannel() call bypasses the messaging capability model",
    body:
      "SYN014 fires when a fn body constructs a `BroadcastChannel` via `new BroadcastChannel(name)`, " +
      "`BroadcastChannel(name)`, or TypeScript instantiation form `new BroadcastChannel<T>(name)`. " +
      "This is the same class of capability-surface bypass as `new Worker()` (SYN013): a global " +
      "constructor that opens a cross-context communication channel invisible to the capability model.\n\n" +
      "**Why it matters:** `BroadcastChannel` creates a named message bus that any tab, window, " +
      "iframe, or worker on the same origin can subscribe to or post on. A fn that constructs one " +
      "can receive arbitrary messages from any same-origin context — without any `reads {}` or " +
      "`uses {}` declaration covering that messaging surface. Callers reading the fn header see " +
      "no indication that the fn participates in a cross-context pub/sub channel.\n\n" +
      "**Detection:** the check looks for a `BroadcastChannel` token (kind=ident) not preceded " +
      "by `.`/`?.` (property access exclusion), followed by `(` or `?.(` — or `<T>(` when " +
      "preceded by `new` (generic scan is gated on `new` to avoid `<`/`>` comparison false-positives). " +
      "Object/class method shorthands, TypeScript method signatures, and " +
      "`fn`/`function` declarations named `BroadcastChannel` are excluded. " +
      "The `:` check for method signatures is guarded against ternary consequents " +
      "(`cond ? new BroadcastChannel(a) : ...`).\n\n" +
      "**Fix:** wrap in `unsafe \"<reason>\" { new BroadcastChannel(name) }` to document " +
      "the escape hatch in the diff. The reason should describe the channel's purpose and why " +
      "cross-context messaging is acceptable here (e.g. 'wraps BroadcastChannel for live " +
      "preview sync across tabs').\n\n" +
      "SYN014 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn openChannel(name: string) -> BroadcastChannel {\n" +
        "  return new BroadcastChannel(name)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn openChannel(name: string) -> BroadcastChannel {\n" +
        "  return unsafe \"wraps BroadcastChannel for tab coordination\" { new BroadcastChannel(name) }\n" +
        "}\n",
    },
  },
  SYN016: {
    code: "SYN016",
    title: "indexedDB access bypasses the storage capability model",
    body:
      "SYN016 fires when a fn body accesses `indexedDB.*` — any member access (`.open`, " +
      "`.deleteDatabase`, `.databases`, `.cmp`, etc.) on the `indexedDB` global.\n\n" +
      "**Why it matters:** `reads {}` and `writes {}` labels in botscript cover declared resource identifiers " +
      "(e.g. `reads { db }`, `writes { cache }`). The `indexedDB` global is not part of the stdlib " +
      "namespace system. A fn that calls `indexedDB.open(name)` opens a persistent database at runtime " +
      "but declares nothing about it in its header. Callers cannot see the dependency, and no audit tool " +
      "can observe it from the fn signature. Unlike `localStorage`, `indexedDB` is asynchronous and has " +
      "no practical size limit — invisible access is higher-impact.\n\n" +
      "**Detection:** the check looks for an `indexedDB` ident token not preceded by `.`/`?.` " +
      "(which would make it a member of another object), followed by `.` or `?.` " +
      "(confirming this is an access on the global, not a bare reference or a declaration). " +
      "Fn/function declarations named `indexedDB` are excluded.\n\n" +
      "**Fix (preferred):** open the database at the call site and pass the `IDBDatabase` handle as " +
      "an explicit fn parameter. This makes the dependency visible in the signature and tests can inject a mock:\n\n" +
      "```\n" +
      "// SYN016\n" +
      "async fn loadSettings() -> Settings {\n" +
      "  const req = indexedDB.open('app-db', 1)\n" +
      "  return new Promise((resolve) => { req.onsuccess = (e) => resolve(e.target.result) })\n" +
      "}\n\n" +
      "// fix — database handle is now an explicit parameter\n" +
      "async fn loadSettings(db: IDBDatabase) -> Settings {\n" +
      "  return db.transaction('settings').objectStore('settings').get('all')\n" +
      "}\n" +
      "```\n\n" +
      "**Fix (escape hatch):** if direct access is genuinely required, wrap in an `unsafe` block:\n" +
      "`unsafe \"opens app-db for settings read\" { indexedDB.open('app-db', 1) }`\n\n" +
      "SYN016 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Accesses inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "async fn loadSettings() -> Settings {\n" +
        "  const req = indexedDB.open('app-db', 1)\n" +
        "  return new Promise((resolve) => { req.onsuccess = (e) => resolve(e.target.result) })\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "async fn loadSettings() -> Settings {\n" +
        "  const req = unsafe \"opens app-db for settings read\" { indexedDB.open('app-db', 1) }\n" +
        "  return new Promise((resolve) => { req.onsuccess = (e) => resolve(e.target.result) })\n" +
        "}\n",
    },
  },
  SYN017: {
    code: "SYN017",
    title: "new Notification() / Notification() call bypasses the capability model",
    body:
      "SYN017 fires when a fn body constructs a `Notification` via `new Notification(title)`, " +
      "bare `Notification(title)`, `Notification?.(title)`, or TypeScript instantiation " +
      "`new Notification<T>(title)`.\n\n" +
      "**Why it matters:** `Notification` dispatches a user-visible browser notification at " +
      "runtime — a UI side effect that is entirely invisible to botscript's capability model. " +
      "No `uses {}`, `reads {}`, or `writes {}` declaration covers notification dispatch. " +
      "Callers reading the fn header see no indication that the fn can create system-level " +
      "notifications; tests cannot intercept or suppress the effect without global mocking. " +
      "In agent / bot contexts this is especially hazardous: an autonomously-running bot that " +
      "calls `new Notification()` creates user-visible interruptions with no observable " +
      "capability surface for callers to audit or gate.\n\n" +
      "**Detection:** the check looks for an identifier token `Notification` not preceded by " +
      "`.`/`?.` (member-call exclusion), followed by `(` or `?.(` — or `<T>(` when preceded " +
      "by `new` (generic scan gated on `new` to avoid `<`/`>` comparison false-positives). " +
      "Object/class method shorthands, TypeScript method signatures (including optional-param " +
      "forms like `{ Notification(title?: string) }`), and `fn`/`function` declarations " +
      "named `Notification` are excluded. The `:` check is guarded against ternary " +
      "consequents (`cond ? new Notification(a) : ...`).\n\n" +
      "**Fix:** pass a notification-dispatch callback as an explicit fn parameter so callers " +
      "control whether a notification fires and tests can capture or suppress it. If direct " +
      "access is required, wrap in `unsafe \"sends notification for <reason>\" { new Notification(title, options) }`.\n\n" +
      "SYN017 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn warnUser(title: string) -> void {\n" +
        "  new Notification(title)\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn warnUser(title: string) -> void {\n" +
        "  unsafe \"shows alert notification for user-triggered warning\" { new Notification(title) }\n" +
        "}\n",
    },
  },
  SYN018: {
    code: "SYN018",
    title: "Math.random() call bypasses the random capability model",
    body:
      "SYN018 fires when a fn body calls `Math.random()`, `Math?.random()`, or `Math.random?.()` " +
      "— any call form on the `Math.random` global.\n\n" +
      "**Why it matters:** `Math.random` generates a random float at runtime but is entirely " +
      "invisible to botscript's capability model. `uses { random }` declarations cover " +
      "`random.*` stdlib namespace calls, not the `Math` global. A fn that calls `Math.random()` " +
      "has an undeclared randomness dependency: callers reading the fn header see no indication " +
      "of non-determinism, tests cannot deterministically mock or suppress the random source, " +
      "and the capability manifest does not record the dependency. In agent / bot contexts this " +
      "is especially hazardous: a fn declared pure or idempotent that secretly calls " +
      "`Math.random()` will produce different outputs across retries in a way callers cannot " +
      "observe or audit.\n\n" +
      "**Detection:** the check looks for a `Math` ident token not preceded by `.`/`?.` " +
      "(member-call exclusion), followed by `.` or `?.`, then `random`, then `(` or `?.(` " +
      "(call confirmation). Bare `Math.random` references (without a trailing `(`) are " +
      "excluded — only actual calls are flagged.\n\n" +
      "**Fix (preferred):** replace `Math.random()` with `random.next()` from the botscript " +
      "stdlib and add `uses { random }` to the fn header. This makes the non-determinism " +
      "visible in the signature and allows tests to inject a deterministic `random` mock:\n\n" +
      "```\n" +
      "// SYN018 — before\n" +
      "fn roll(sides: number) -> number {\n" +
      "  return Math.floor(Math.random() * sides) + 1\n" +
      "}\n\n" +
      "// fix — random capability declared; tests control the output\n" +
      "fn roll(sides: number) uses { random } -> number {\n" +
      "  return Math.floor(random.next() * sides) + 1\n" +
      "}\n" +
      "```\n\n" +
      "**Fix (escape hatch):** if `Math.random` is required (e.g. for compatibility with a " +
      "specific distribution), wrap in an `unsafe` block with a justification:\n" +
      "`unsafe \"uses Math.random for <reason>\" { Math.random() }`\n\n" +
      "SYN018 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn roll(sides: number) -> number {\n" +
        "  return Math.floor(Math.random() * sides) + 1\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn roll(sides: number) uses { random } -> number {\n" +
        "  return Math.floor(random.next() * sides) + 1\n" +
        "}\n",
    },
  },
  SYN019: {
    code: "SYN019",
    title: "crypto.getRandomValues() / crypto.randomUUID() call bypasses the random capability model",
    body:
      "SYN019 fires when a fn body calls `crypto.getRandomValues(buf)` or `crypto.randomUUID()` " +
      "(including optional-chain forms like `crypto?.getRandomValues(buf)` and optional-call forms like " +
      "`crypto.getRandomValues?.(buf)`).\n\n" +
      "**Why it matters:** `uses { random }` in botscript covers calls to the `random.*` stdlib namespace " +
      "(`random.next()` for a float in [0,1), `random.int(min, max)` for integers). It does NOT cover the `crypto` Web API global. " +
      "A fn that calls `crypto.getRandomValues()` or `crypto.randomUUID()` generates cryptographic " +
      "randomness at runtime without any entry in its `uses {}` clause — callers cannot see the dependency, " +
      "and tests cannot mock or control the output.\n\n" +
      "**Detection:** the check looks for a `crypto` ident token not preceded by `.`/`?.` " +
      "(which would make it a member of another object), followed by `.` or `?.`, followed by " +
      "`getRandomValues` or `randomUUID`, followed by `(` or `?.(` (confirming this is a call, not a " +
      "bare reference). Fn/function declarations named `crypto` and non-randomness members " +
      "(e.g. `crypto.subtle.digest(...)`) are excluded.\n\n" +
      "**Fix (preferred — general randomness):** use `random.next()` or `random.int(min, max)` from " +
      "the `random` stdlib namespace and declare `uses { random }` in the fn header. This makes the " +
      "randomness dependency visible to callers and lets tests inject a deterministic mock.\n\n" +
      "**Fix (escape hatch):** if direct crypto access is genuinely required (e.g. for specific " +
      "algorithm reasons), wrap in an `unsafe` block with a justification:\n" +
      "`unsafe \"uses crypto for FIPS-compliant key generation\" { crypto.getRandomValues(buf) }`\n\n" +
      "SYN019 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Calls inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn makeId() -> string {\n" +
        "  return crypto.randomUUID()\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "// if you only need a random number, use the random stdlib:\n" +
        "fn rollDice() uses { random } -> number {\n" +
        "  return random.int(1, 7)\n" +
        "}\n" +
        "// if cryptographic randomness is required, use unsafe:\n" +
        "fn makeId() -> string {\n" +
        "  return unsafe \"uses crypto.randomUUID for unique key\" { crypto.randomUUID() }\n" +
        "}\n",
    },
  },
  SYN022: {
    code: "SYN022",
    title: "process.* ambient state access bypasses the capability model",
    body:
      "SYN022 fires when a fn body accesses `process.argv`, `process.cwd`, `process.platform`, " +
      "`process.arch`, `process.pid`, `process.ppid`, `process.version`, `process.versions`, " +
      "`process.hrtime`, `process.uptime`, `process.memoryUsage`, `process.cpuUsage`, " +
      "or `process.resourceUsage` in `?bs 0.7+`. " +
      "(Note: `process.env` fires SYN005; `process.exit` fires SYN006.)\n\n" +
      "**Why it matters:** These properties and methods read ambient Node.js runtime or " +
      "deployment state at call time — the working directory, command-line arguments, OS platform, " +
      "process ID, Node.js version, memory usage, or a high-resolution clock. None of these are " +
      "covered by botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration " +
      "captures them. A fn that reads them has an undeclared environmental dependency — callers " +
      "cannot see it in the header, and tests cannot inject a controlled value.\n\n" +
      "`process.hrtime()` deserves special mention: it is the Node.js equivalent of " +
      "`performance.now()`. Both provide a " +
      "high-resolution monotonic clock that bypasses `uses { time }`.\n\n" +
      "**Detected forms:** any `process.<member>` or `process?.<member>` access where " +
      "`<member>` is one of the ambient-state set listed above. " +
      "Member calls on local bindings (`obj.process.*`) and `fn process(...)` / " +
      "`function process(...)` declarations are excluded.\n\n" +
      "**Fix (preferred — pass as a parameter):**\n\n" +
      "```\n" +
      "// SYN022 — before\n" +
      "fn buildPath() -> string {\n" +
      "  return process.cwd() + '/output'\n" +
      "}\n\n" +
      "// fix — cwd passed as a parameter; tests can control it\n" +
      "fn buildPath(cwd: string) -> string {\n" +
      "  return cwd + '/output'\n" +
      "}\n" +
      "```\n\n" +
      "**Fix (escape hatch):** if the ambient access is intentional:\n" +
      "`unsafe \"accesses process.argv for CLI entrypoint\" { process.argv }`\n\n" +
      "SYN022 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Accesses inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn getFlag() -> string {\n" +
        "  return process.argv[2]\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn getFlag(argv: string[]) -> string {\n" +
        "  return argv[2]\n" +
        "}\n",
    },
  },
  SYN023: {
    code: "SYN023",
    title: "navigator.* ambient browser capability access bypasses the capability model",
    body:
      "SYN023 fires when a fn body accesses a high-concern `navigator.*` member in `?bs 0.7+`. " +
      "The covered members are: `geolocation`, `clipboard`, `mediaDevices`, `serviceWorker`, " +
      "`permissions`, `onLine`, `userAgent`, `language`, `languages`, `platform`, " +
      "`hardwareConcurrency`, `deviceMemory`, `connection`, `wakeLock`, `sendBeacon`, " +
      "`credentials`, `storage`, `locks`, and `share`.\n\n" +
      "**Why it matters:** These members expose ambient browser capability state or perform " +
      "side-effecting operations — physical location, clipboard contents, media devices, " +
      "background service workers, network connectivity, browser identity, hardware specs, " +
      "display wake locks, fire-and-forget network POST requests (`sendBeacon`), user " +
      "credential management, persistent storage quotas, cross-tab lock synchronization, " +
      "and OS-level share dialogs. None of these are covered by botscript's capability model: " +
      "no `uses {}`, `reads {}`, or `writes {}` declaration captures a `navigator.*` access. " +
      "A fn that accesses these members has an undeclared browser-environment dependency — " +
      "callers cannot see it in the header, and tests cannot inject a controlled value " +
      "without monkey-patching the global `navigator` object. `navigator.sendBeacon` is " +
      "particularly important: it makes a real network POST request and bypasses the same " +
      "capability gap as `fetch`, but through a different global that SYN007 does not cover.\n\n" +
      "**Detected forms:** `navigator.<member>` or `navigator?.<member>` where `<member>` " +
      "is in the high-concern set above. Member calls on local bindings (`obj.navigator.*`) " +
      "and `fn navigator(...)` / `function navigator(...)` / `function* navigator(...)` " +
      "declarations are excluded. Members not in the listed set do not fire.\n\n" +
      "**Fix (preferred — pass as a parameter):**\n\n" +
      "```\n" +
      "// SYN023 — before\n" +
      "fn isConnected() -> boolean {\n" +
      "  return navigator.onLine\n" +
      "}\n\n" +
      "// fix — onLine passed as a parameter; tests can control it\n" +
      "fn isConnected(onLine: boolean) -> boolean {\n" +
      "  return onLine\n" +
      "}\n" +
      "```\n\n" +
      "**Fix (escape hatch):** if the ambient access is intentional:\n" +
      "`unsafe \"accesses navigator.geolocation for location services\" { navigator.geolocation }`\n\n" +
      "SYN023 fires at `?bs 0.7+` as a non-blocking warning. " +
      "Accesses inside `unsafe { }` blocks or `unsafe \"reason\" fn` bodies are suppressed.",
    example: {
      fails:
        "?bs 0.7\n" +
        "fn getBrowser() -> string {\n" +
        "  return navigator.userAgent\n" +
        "}\n",
      passes:
        "?bs 0.7\n" +
        "fn getBrowser(userAgent: string) -> string {\n" +
        "  return userAgent\n" +
        "}\n",
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
      "Over-declaration may be warned about from `?bs 0.9` (see DEP003) for non-leaf fns with " +
      "tracked same-file callees and no opaque external calls. DEP001 only fires on " +
      "under-declaration (a label that is reachable but not declared).",
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
  MAT001: {
    code: "MAT001",
    title: "non-exhaustive match on Result — missing ok or err arm",
    body:
      "From `?bs 0.9`, a `match` expression that explicitly handles the `ok` or `err` tag " +
      "must also handle the opposing tag (or include a wildcard `_` arm).\n\n" +
      "This fires when you match on a Result value but leave one path unhandled:\n\n" +
      "```\n" +
      "// MAT001: missing 'err' arm\n" +
      "match http.get(url) {\n" +
      "  ok { value } -> value.body\n" +
      "}\n\n" +
      "// MAT001: missing 'ok' arm\n" +
      "match result {\n" +
      "  err { e } -> err(e)\n" +
      "}\n" +
      "```\n\n" +
      "**Suppression mechanisms (in order of preference):**\n\n" +
      "1. **Add the missing arm** — handle both arms explicitly (add whichever is absent):\n" +
      "   ```\n   // missing err arm:\n   match http.get(url) {\n     ok { value } -> ok(value.body)\n     err { e } -> err(e.message)\n   }\n\n   // missing ok arm:\n   match result {\n     ok { v } -> v.body\n     err { e } -> err(e)\n   }\n   ```\n\n" +
      "2. **Wildcard arm** — use `_` when you want to coerce or ignore the missing case:\n" +
      "   ```\n   match http.get(url) {\n     ok { value } -> ok(value.body)\n     _ -> err(\"request failed\")\n   }\n   ```\n\n" +
      "The check is scoped to the `ok`/`err` tag vocabulary — it fires only when at least one " +
      "of those tags is explicitly named in an arm. User-defined tagged unions with different " +
      "tag names are not affected.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn fetchData(url: string) uses { net } -> string {\n" +
        "  match http.get(url) {\n" +
        "    ok { value } -> value.body\n" +
        "  }\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn fetchData(url: string) uses { net } -> Result<string, string> {\n" +
        "  match http.get(url) {\n" +
        "    ok { value } -> ok(value.body)\n" +
        "    err { e } -> err(e.message)\n" +
        "  }\n" +
        "}\n",
    },
  },
  MAT002: {
    code: "MAT002",
    title: "non-exhaustive match on Option — missing some or none arm",
    body:
      "From `?bs 0.9`, a `match` expression that explicitly handles the `some` or `none` tag " +
      "must also handle the opposing tag (or include a wildcard `_` arm).\n\n" +
      "This fires when you match on an Option value but leave one path unhandled:\n\n" +
      "```\n" +
      "// MAT002: missing 'none' arm\n" +
      "match lookupUser(id) {\n" +
      "  some { user } -> user.name\n" +
      "}\n\n" +
      "// MAT002: missing 'some' arm\n" +
      "match option {\n" +
      "  none -> \"default\"\n" +
      "}\n" +
      "```\n\n" +
      "**Suppression mechanisms (in order of preference):**\n\n" +
      "1. **Add the missing arm** — handle both arms explicitly:\n" +
      "   ```\n   match lookupUser(id) {\n     some { user } -> user.name\n     none -> \"unknown\"\n   }\n   ```\n\n" +
      "2. **Wildcard arm** — use `_` when you want to coerce or ignore the missing case:\n" +
      "   ```\n   match lookupUser(id) {\n     some { user } -> user.name\n     _ -> \"unknown\"\n   }\n   ```\n\n" +
      "The check is scoped to the `some`/`none` tag vocabulary — it fires only when at least one " +
      "of those tags is explicitly named in an arm. User-defined tagged unions with different " +
      "tag names are not affected.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn greet(name: Option<string>) -> string {\n" +
        "  match name {\n" +
        "    some { v } -> `Hello, ${v}`\n" +
        "  }\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "fn greet(name: Option<string>) -> string {\n" +
        "  match name {\n" +
        "    some { v } -> `Hello, ${v}`\n" +
        "    none -> \"Hello, stranger\"\n" +
        "  }\n" +
        "}\n",
    },
  },
  MAT003: {
    code: "MAT003",
    title: "non-exhaustive match on user-defined tagged union — missing variant arm",
    body:
      "From `?bs 0.9`, a `match` expression whose arm tags all belong to a known user-defined " +
      "tagged union must cover every variant of that union (or include a wildcard `_` arm).\n\n" +
      "This fires when you declare `type Shape = Circle { r: number } | Square { side: number } | Triangle { base: number }` " +
      "and then match on it without handling all variants:\n\n" +
      "```\n" +
      "// MAT003: 'Square' and 'Triangle' arms are missing\n" +
      "match s {\n" +
      "  Circle { r } -> r\n" +
      "}\n" +
      "```\n\n" +
      "**Suppression mechanisms (in order of preference):**\n\n" +
      "1. **Add all missing arms** — handle every variant explicitly:\n" +
      "   ```\n   match s {\n     Circle { r } -> r\n     Square { side } -> side\n     Triangle { base } -> base\n   }\n   ```\n\n" +
      "2. **Wildcard arm** — use `_` when some variants share a default response:\n" +
      "   ```\n   match s {\n     Circle { r } -> r\n     _ -> 0\n   }\n   ```\n\n" +
      "MAT003 only fires when the arm tags **uniquely identify a single known union** — if the " +
      "same tag name appears in multiple union declarations, the match is considered ambiguous " +
      "and the check is suppressed. Built-in tags (`ok`, `err`, `some`, `none`) are handled " +
      "by MAT001/MAT002 and are excluded from MAT003.",
    example: {
      fails:
        "?bs 0.9\n" +
        "type Status = Done { value: string } | Failed { code: number } | Loading\n" +
        "fn describe(s: Status) -> string {\n" +
        "  match s {\n" +
        "    Done { value } -> value\n" +
        "    Loading -> \"loading...\"\n" +
        "  }\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "type Status = Done { value: string } | Failed { code: number } | Loading\n" +
        "fn describe(s: Status) -> string {\n" +
        "  match s {\n" +
        "    Done { value } -> value\n" +
        "    Failed { code } -> `error ${code}`\n" +
        "    Loading -> \"loading...\"\n" +
        "  }\n" +
        "}\n",
    },
  },
  MAT004: {
    code: "MAT004",
    title: "unreachable wildcard arm — match already covers all variants of the tagged union",
    body:
      "From `?bs 0.9`, when a `match` expression on a user-defined tagged union already " +
      "covers **every** variant explicitly, a trailing wildcard `_ -> ...` arm is dead code — " +
      "it can never be reached.\n\n" +
      "This is not just a style issue: a redundant wildcard **silently absorbs new variants** " +
      "when the union gains a new tag. Without the wildcard, adding a new variant would " +
      "immediately trigger MAT003, alerting you that a match site needs updating. With the " +
      "wildcard, the new variant falls through silently at runtime — exactly the kind of " +
      "undetected behavioral drift botscript is designed to prevent.\n\n" +
      "```\n" +
      "// MAT004: wildcard is unreachable — Red/Green/Blue are all covered\n" +
      "type Color = Red { hex: string } | Green | Blue\n" +
      "match c {\n" +
      "  Red { hex } -> hex\n" +
      "  Green       -> \"green\"\n" +
      "  Blue        -> \"blue\"\n" +
      "  _ -> \"unreachable\"  // remove this\n" +
      "}\n" +
      "```\n\n" +
      "**Fix:** remove the wildcard arm. If you add a new variant to the union later, " +
      "MAT003 will tell you exactly which match sites need updating.",
    example: {
      fails:
        "?bs 0.9\n" +
        "type Color = Blue { b: number } | Green { g: number } | Red { r: number }\n" +
        "fn colorName(c: Color) -> string {\n" +
        "  match c {\n" +
        "    Red { r } -> \"red\"\n" +
        "    Green { g } -> \"green\"\n" +
        "    Blue { b } -> \"blue\"\n" +
        "    _ -> \"unreachable\"\n" +
        "  }\n" +
        "}\n",
      passes:
        "?bs 0.9\n" +
        "type Color = Blue { b: number } | Green { g: number } | Red { r: number }\n" +
        "fn colorName(c: Color) -> string {\n" +
        "  match c {\n" +
        "    Red { r } -> \"red\"\n" +
        "    Green { g } -> \"green\"\n" +
        "    Blue { b } -> \"blue\"\n" +
        "  }\n" +
        "}\n",
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
      "Over-declaration may be warned about from `?bs 0.9` (see DEP004) for non-leaf fns with " +
      "tracked same-file callees and no opaque external calls. DEP002 only fires on under-declaration.",
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
  DEP003: {
    code: "DEP003",
    title: "fn declares reads {} label not justified by any tracked callee (warning)",
    body:
      "From `?bs 0.9`, DEP003 fires as a **warning** (not an error) when fn A has same-file " +
      "callees but no callee (direct or transitive) declares `reads { x }` that A also declares. " +
      "The label is not justified by the call graph — a common sign of a refactor that removed " +
      "the callee that originally justified the annotation.\n\n" +
      "**Scope:** only fires for fns with at least one same-file (or moduleEffects) callee. " +
      "Leaf fns are excluded — they may be the actual access point, and the compiler cannot " +
      "scan the body for direct resource accesses (reads {} labels are user-defined strings, " +
      "not stdlib references).\n\n" +
      "DEP003 is also suppressed when the function body contains any opaque or untracked external " +
      "call (a call to a function not visible to the same-file call graph) — the unknown callee may " +
      "be the actual read site, so the warning is withheld to avoid false positives.\n\n" +
      "DEP003 is gated on `?bs 0.9`. The symmetrical under-declaration check is DEP001.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn helper(id: string) -> string = id\n" +
        "fn getUserName(id: string) reads { userDb } -> string = helper(id)\n",
      passes:
        "?bs 0.9\n" +
        "fn getUser(id: string) reads { userDb } -> string = id\n" +
        "fn getUserName(id: string) reads { userDb } -> string = getUser(id)\n",
    },
  },
  DEP004: {
    code: "DEP004",
    title: "fn declares writes {} label not justified by any tracked callee (warning)",
    body:
      "From `?bs 0.9`, DEP004 fires as a **warning** (not an error) when fn A has same-file " +
      "callees but no callee (direct or transitive) declares `writes { x }` that A also declares. " +
      "The label is not justified by the call graph and may be stale.\n\n" +
      "**Scope:** only fires for fns with at least one same-file (or moduleEffects) callee. " +
      "Leaf fns are excluded — the compiler cannot scan the body for direct resource modifications " +
      "(writes {} labels are user-defined strings).\n\n" +
      "DEP004 is also suppressed when the function body contains any opaque or untracked external " +
      "call (a call to a function not visible to the same-file call graph) — the unknown callee may " +
      "be the actual write site, so the warning is withheld to avoid false positives.\n\n" +
      "DEP004 is gated on `?bs 0.9`. The symmetrical under-declaration check is DEP002.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn helper(msg: string) -> void { }\n" +
        "fn logEvent(msg: string) writes { auditLog } -> void { helper(msg) }\n",
      passes:
        "?bs 0.9\n" +
        "fn writeAudit(msg: string) writes { auditLog } -> void { }\n" +
        "fn logEvent(msg: string) writes { auditLog } -> void { writeAudit(msg) }\n",
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
      "**Result suppression:** THR002 is suppressed when the constructed type appears as the " +
      "error parameter of the fn's return type. A fn returning `Result<T, ParseError>` (or " +
      "`Promise<Result<T, ParseError>>` for async fns) that calls `err(new ParseError(...))` " +
      "does not need `throws { ParseError }` — the error is signaled via the return value, " +
      "not thrown. THR002 only fires when the constructed type is absent from both the throws " +
      "declaration and the Result error type.\n\n" +
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
    title: "outer fn declares narrower throws than a callback parameter",
    body:
      "A function-typed parameter can carry a `throws { X }` annotation declaring which " +
      "exception types the callback may produce. The outer function that accepts that " +
      "callback must declare at least those exception types in its own `throws {}` clause.\n\n" +
      "Without this rule, a higher-order fn that accepts a throwing callback can advertise " +
      "a narrower throws surface than it can actually exercise. A caller reading the outer " +
      "fn's header sees no `throws {}` and concludes the call is infallible — but invoking " +
      "the callback may produce NetworkError, ParseError, or any other declared type.\n\n" +
      "THR003 is the `throws`-variant of EFF003/EFF004. It gates on `?bs 0.9`. The outer " +
      "fn does not need to throw directly — it just needs to declare the exception types so " +
      "callers have an accurate throws surface.\n\n" +
      "Suppression: add the missing exception type(s) to the outer fn's `throws {}` clause, " +
      "or remove the `throws {}` annotation from the callback parameter type if it is " +
      "intentionally not propagated (e.g., the callback's exceptions are caught internally).",
    example: {
      fails:
        "?bs 0.9\n" +
        "// THR003: process accepts a callback that declares throws { NetworkError },\n" +
        "// but process itself declares no throws\n" +
        "fn process(\n" +
        "  items: string[],\n" +
        "  handler: fn(string) throws { NetworkError } -> void\n" +
        ") -> void { handler(items[0]) }\n",
      passes:
        "?bs 0.9\n" +
        "// Fixed: outer fn declares the throws surface its callback may exercise\n" +
        "fn process(\n" +
        "  items: string[],\n" +
        "  handler: fn(string) throws { NetworkError } -> void\n" +
        ") throws { NetworkError } -> void { handler(items[0]) }\n",
    },
  },
  THR004: {
    code: "THR004",
    title: "fn declares throws {} label not justified by any callee or direct construction",
    body:
      "From `?bs 0.9`, `throws {}` annotations are enforced in both directions. " +
      "THR001 fires when a callee's error type is absent from the caller's declaration; " +
      "THR004 fires when a declared error type is not justified by any callee or direct " +
      "`err(X...)` construction in the fn body.\n\n" +
      "Leaf fns (no tracked callees) and fns with opaque external calls are excluded — " +
      "they may be the actual throw point. Fns that accept `() throws { X } ->` callback " +
      "parameters are also excluded via paramThrows seeding.\n\n" +
      "THR004 is gated on `?bs 0.9`. The under-declaration counterpart is THR001.",
    example: {
      fails:
        "?bs 0.9\n" +
        "fn helper(id: string) -> string = \"ok\"\n" +
        "fn load(id: string) throws { NetworkError } -> string = helper(id)\n",
      passes:
        "?bs 0.9\n" +
        "fn helper(id: string) -> string = \"ok\"\n" +
        "fn load(id: string) -> string = helper(id)\n",
    },
  },
  VER001: {
    code: "VER001",
    title: "reads {} / writes {} declared below the ?bs 0.9 enforcement floor",
    body:
      "From `?bs 0.9`, the compiler enforces that `reads {}` / `writes {}` annotations are " +
      "transitively consistent across same-file calls (DEP001/DEP002). Below that version, " +
      "the annotations are parsed and accepted silently — they are documentation, not verified claims.\n\n" +
      "VER001 fires as a **warning** (non-blocking) when a non-empty `reads {}` or `writes {}` " +
      "clause is declared on a fn in a file pinned below `?bs 0.9`. A reviewer reading the " +
      "header would reasonably assume the compiler has checked the transitivity claim — it has not.\n\n" +
      "The most common scenario: a team in mid-upgrade writes `reads { userDb }` annotations " +
      "while still on `?bs 0.8`, intending to enforce later. VER001 makes the lack of " +
      "enforcement visible so reviewers are not given false assurance.\n\n" +
      "**Empty clauses are not flagged.** `reads {}` (no labels) on an old-pin file is likely " +
      "an intentional forward-declaration placeholder and does not create false assurance.\n\n" +
      "The fix is to upgrade the `?bs` pin to `0.9` (which activates DEP001/DEP002 enforcement) " +
      "or to leave the annotation in place knowing it is documentation-only until the upgrade.",
    example: {
      fails:
        "?bs 0.8\n" +
        "fn loadUser(id: string) reads { userDb } -> string = id\n",
      passes:
        "?bs 0.9\n" +
        "fn loadUser(id: string) reads { userDb } -> string = id\n",
    },
  },
  VER002: {
    code: "VER002",
    title: "throws {} declared below the ?bs 0.9 enforcement floor",
    body:
      "From `?bs 0.9`, the compiler enforces that `throws {}` annotations are transitively " +
      "consistent across same-file calls (THR001). Below that version, the annotations are " +
      "parsed and accepted silently — they are documentation, not verified claims.\n\n" +
      "VER002 fires as a **warning** (non-blocking) when a non-empty `throws {}` clause is " +
      "declared on a fn in a file pinned below `?bs 0.9`. A reviewer reading the header would " +
      "reasonably assume the compiler has checked the transitivity claim — it has not.\n\n" +
      "The most common scenario: a team writes `throws { NetworkError }` annotations while " +
      "still on `?bs 0.8`, intending to enforce at upgrade time. When they finally pin to " +
      "`?bs 0.9`, they may discover the entire call graph needs new declarations — a large, " +
      "surprising diff. VER002 makes this risk visible before the upgrade.\n\n" +
      "**Empty clauses are not flagged.** `throws {}` (no types) on an old-pin file is likely " +
      "an intentional forward-declaration placeholder and does not create false assurance.\n\n" +
      "The fix is to upgrade the `?bs` pin to `0.9` (which activates THR001 enforcement) " +
      "or to leave the annotation knowing it is documentation-only until the upgrade.",
    example: {
      fails:
        "?bs 0.8\n" +
        "fn loadUser(id: string) throws { NetworkError } -> string = id\n",
      passes:
        "?bs 0.9\n" +
        "fn loadUser(id: string) throws { NetworkError } -> string = id\n",
    },
  },
  VER003: {
    code: "VER003",
    title: "intent: annotation declared below the ?bs 0.7 enforcement floor",
    body:
      "From `?bs 0.7`, the compiler enforces `intent:` annotations against the function's " +
      "declared capabilities and body (INT001–INT005). Below that version, the annotation is " +
      "parsed and accepted silently — it is documentation, not a verified claim.\n\n" +
      "VER003 fires as a **warning** (non-blocking) when a non-empty `intent: \"...\"` clause " +
      "is declared on a fn in a file pinned below `?bs 0.7`. A reviewer reading the header " +
      "would reasonably assume the compiler has verified the intent claim — it has not.\n\n" +
      "The most common scenario: a team writing intent annotations in advance while still on " +
      "`?bs 0.6`, intending to enforce later. VER003 makes the lack of enforcement visible " +
      "so reviewers are not given false assurance.\n\n" +
      "The fix is to upgrade the `?bs` pin to `0.7` (which activates INT001–INT005 enforcement) " +
      "or to leave the annotation knowing it is documentation-only until the upgrade.\n\n" +
      "VER003 is the `intent:` sibling of VER001 (`reads {}`/`writes {}`) and VER002 (`throws {}`).",
    example: {
      fails:
        "?bs 0.6\n" +
        "fn slug(s: string) intent: \"pure\" -> string = s.toLowerCase()\n",
      passes:
        "?bs 0.7\n" +
        "fn slug(s: string) intent: \"pure\" -> string = s.toLowerCase()\n",
    },
  },
};

export const KNOWN_CODES = Object.keys(EXPLANATIONS).sort();
