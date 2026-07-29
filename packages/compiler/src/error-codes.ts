/**
 * Canonical registry of botscript diagnostics.
 *
 * Every error code the compiler emits has one entry here. Passes pull
 * `rule` / `idiom` / `rewrite` from this registry rather than inlining
 * strings, so `bs explain <CODE>` and the diagnostics agents see in their
 * tool output stay in sync.
 *
 * Keep entries terse. A bot reads these in a tool result; a human reads
 * them in a terminal. Either way, three lines is plenty.
 */

export interface ErrorCodeEntry {
  /** Stable code, e.g. "CAP001". */
  code: string;
  /** One-line title, suitable for `bs explain` header. */
  title: string;
  /** Full sentence: the language rule. */
  rule: string;
  /** The canonical pattern that solves this class of problem. */
  idiom: string;
  /** A literal rewrite a bot can apply. */
  rewrite: string;
  /** A short before/after example block, plain text. */
  example: string;
}

const E: Record<string, ErrorCodeEntry> = {
  ALI001: {
    code: "ALI001",
    title: "stdlib namespace aliased via a non-trivial expression — alias not tracked",
    rule:
      "a module-level `const <name> = <stdlib>` binding is only statically tracked when the RHS is a " +
      "direct namespace reference; operator expressions, member accesses, calls, and other non-trivial forms " +
      "are left on the canonical-name tripwire — capability checks (CAP001/CAP002), body-level intent checks (INT002/INT004), and UNS005 will not see the alias",
    idiom: "use a direct binding (`const t = time`) to alias a stdlib namespace; reference the canonical name directly in all other cases",
    rewrite:
      "// option A — use a direct binding:\nconst <name> = <stdlib>\n\n" +
      "// option B — remove the alias and use the canonical name directly:\n// (reference '<stdlib>' wherever you used '<name>')",
    example:
      "// before — non-trivial RHS; alias not tracked; ALI001 fires\n" +
      "const t = time.now\n\n" +
      "// after — direct binding; alias is tracked\n" +
      "const t = time\n",
  },
  ALI002: {
    code: "ALI002",
    title: "alias-of-alias chain — const x = t (where t is a stdlib alias) is not tracked",
    rule:
      "chain aliases are not transitively tracked: `const t = time` adds `t` to the alias map, " +
      "but `const x = t` does NOT add `x` — capability checks (CAP001/CAP002), body-level intent checks " +
      "(INT002/INT004), and UNS005 will not see `x` as a `time` reference",
    idiom: "use a direct binding (`const x = time`) to alias a stdlib namespace; avoid aliasing existing aliases",
    rewrite:
      "// option A — bind directly to the stdlib namespace:\nconst x = time\n\n" +
      "// option B — remove x and use the canonical name (or the tracked alias) directly",
    example:
      "// before — chain alias; x is not tracked; ALI002 fires\n" +
      "const t = time\nconst x = t\n\n" +
      "// after — direct binding; x is tracked\n" +
      "const x = time\n",
  },
  ALI003: {
    code: "ALI003",
    title: "stdlib namespace destructuring — extracted member references are not tracked",
    rule:
      "object-destructuring a stdlib namespace (`const { now } = time`) produces bare ident references " +
      "that no static check follows — capability checks (CAP001/CAP002), body-level intent checks " +
      "(INT002/INT004), and UNS005 will not see the extracted member as a `time` reference; " +
      "use a direct namespace binding or the canonical name directly; " +
      "warning at ?bs 0.8, error (blocking) at ?bs 0.9+ — no defensible use case exists",
    idiom: "use a direct binding (`const t = time`) and call `t.now()` rather than destructuring `time`",
    rewrite:
      "// option A — direct namespace binding:\nconst t = time\n// ... then call t.now() instead of now()\n\n" +
      "// option B — use the canonical namespace directly:\n// call time.now() instead of destructuring",
    example:
      "// before — destructuring; now() is not tracked; ALI003 fires\n" +
      "const { now } = time\n\n" +
      "// after — direct binding; t.now() is tracked\n" +
      "const t = time\n",
  },
  CAP001: {
    code: "CAP001",
    title: "function calls a stdlib namespace whose capability is not declared",
    rule:
      "every fn must declare in its `uses { ... }` clause every capability it (or its callees) consume",
    idiom:
      "declare every capability the function consumes; pure helpers stay pure",
    rewrite:
      "fn name(...) uses { …existing, missing } -> ...",
    example:
      "// before\n" +
      "fn now() -> number = pure { time.now() }\n\n" +
      "// after\n" +
      "fn now() uses { time } -> number = pure { time.now() }",
  },
  CAP002: {
    code: "CAP002",
    title: "function over-declares a capability it never reaches",
    rule:
      "a function may not declare a capability it does not transitively consume — declarations must match reality",
    idiom:
      "declarations are the upper bound the compiler infers; remove caps that nothing in the body uses",
    rewrite:
      "fn name(...) uses { …only the caps actually used } -> ...",
    example:
      "// before\n" +
      "fn slug(s: string) uses { net } -> string = pure { s.toLowerCase() }\n\n" +
      "// after\n" +
      "fn slug(s: string) -> string = pure { s.toLowerCase() }",
  },
  CAP003: {
    code: "CAP003",
    title: "capability declared inside unsafe fn — asserted, not proven",
    rule:
      "a `uses {}` declaration on an `unsafe fn` is programmer-asserted, not compiler-proven: " +
      "the capability inference pass still runs on the visible body, but an unsafe fn can contain " +
      "`as` casts that alias stdlib namespaces, bypassing name-based detection",
    idiom:
      "treat a CAP003-tagged capability claim as advisory rather than verified — " +
      "callers and audit tooling should note the asserted provenance; " +
      "if the function is the canonical safe adapter for a capability, document it in the unsafe reason",
    rewrite:
      "// no rewrite needed — this is a warning; suppress by removing uses {} if the body has no visible stdlib calls",
    example:
      "// CAP003 fires: unsafe fn with a uses {} claim\n" +
      "?bs 0.9\n" +
      "unsafe \"wraps external http client\" fn callApi(url: string) uses { net } -> string {\n" +
      "  http.get(url)  // warning: claim is asserted, not proven\n" +
      "}\n\n" +
      "// No CAP003: regular fn with the same claim is compiler-verified\n" +
      "?bs 0.9\n" +
      "fn callApi(url: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(url) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(`fetch failed: ${error}`)\n" +
      "  }\n" +
      "}",
  },
  UNS001: {
    code: "UNS001",
    title: "unsafe block missing justification string",
    rule:
      "an `unsafe` block must carry a non-empty string literal explaining why the escape hatch is acceptable here",
    idiom:
      "every cast/escape hatch in a diff carries a one-line reason — the next reviewer sees the why, not just the what",
    rewrite:
      'unsafe "<short reason>" { <body> }',
    example:
      "// before\n" +
      "unsafe { return value as User }\n\n" +
      "// after\n" +
      'unsafe "third-party lib types `Response` as any" { return value as User }',
  },
  UNS002: {
    code: "UNS002",
    title: "unsafe block or fn declaration with an empty justification",
    rule:
      "the justification on an `unsafe` block or `unsafe fn` declaration must be a non-empty string — the empty string is not a reason",
    idiom:
      "if you cannot articulate the reason in one sentence, the cast or declaration probably should not be made",
    rewrite:
      'unsafe "<short reason>" { <body> }  or  unsafe "<short reason>" fn <name>(...) -> T { ... }',
    example:
      "// before\n" +
      'unsafe "" { return value as User }\n\n' +
      "// after\n" +
      'unsafe "Response.json() returns any" { return value as User }',
  },
  UNS003: {
    code: "UNS003",
    title: "unsafe block has no body",
    rule:
      "an `unsafe` block must be followed by `{ ... }` — the form is `unsafe \"<reason>\" { <body> }`",
    idiom:
      "the body of an unsafe block scopes the escape hatch as narrowly as possible",
    rewrite:
      'unsafe "<short reason>" { <body> }',
    example:
      "// before\n" +
      'unsafe "fix me later"\n\n' +
      "// after\n" +
      'unsafe "Response.json() returns any" { return value as User }',
  },
  UNS004: {
    code: "UNS004",
    title: "bare `as` cast outside unsafe block or unsafe fn body",
    rule:
      "every `as` is a claim the compiler cannot verify; from `?bs 0.5` it must be justified by a written reason inside an `unsafe \"<reason>\" { ... }` block or an `unsafe \"<reason>\" fn` declaration body",
    idiom:
      "wrap the cast in `unsafe \"<reason>\" { ... }` or declare the containing function as `unsafe \"<reason>\" fn`; the reason becomes the review record on the cast",
    rewrite:
      'unsafe "<short reason>" { <expr> as <type> }  or  unsafe "<short reason>" fn <name>(...) -> T { ... }',
    example:
      "// before\n" +
      "?bs 0.5\n" +
      "const u = data as User;\n\n" +
      "// after\n" +
      "?bs 0.5\n" +
      'const u = unsafe "Response.json() returns any" { data as User };',
  },
  UNS005: {
    code: "UNS005",
    title: "external call without declared result contract",
    rule:
      "a stdlib capability call (http.x, fs.x, time.x, etc.) must have a declared result contract " +
      "at the call site — wrap in `match` to make success and failure paths explicit, use " +
      "`unsafe \"<reason>\" { ... }` to accept the uncertainty with a written explanation, or " +
      "declare the containing fn as `unsafe \"<reason>\" fn` when the entire body is the escape hatch",
    idiom:
      "prefer match over bare stdlib calls — " +
      "`match ns.method(...)` makes both success and failure paths explicit; " +
      "use `unsafe` only when you are certain about the shape and want to document why",
    rewrite:
      "match ns.method(...) {\n  ok { value } -> { /* use value */ }\n  err { error } -> { /* handle error */ }\n}",
    example:
      "// before — UNS005: no contract on what http.get returns\n" +
      "?bs 0.9\n" +
      "fn fetchUser(id: string) uses { net } -> string {\n" +
      "  const data = http.get(`/users/${id}`);\n" +
      "  data\n" +
      "}\n\n" +
      "// after — result contract via match\n" +
      "?bs 0.9\n" +
      "fn fetchUser(id: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(`/users/${id}`) {\n" +
      "    ok { value } -> ok(value)\n" +
      "    err { error } -> err(`fetch failed: ${error}`)\n" +
      "  }\n" +
      "}",
  },
  FMT001: {
    code: "FMT001",
    title: "source is not in canonical form",
    rule:
      "every botscript program has exactly one canonical surface form (RFC #13); from `?bs 0.4` on, the compiler rejects non-canonical input rather than silently accepting whitespace variants",
    idiom:
      "run `botscript fmt <file> --write` once; from then on the source is canonical and compiles cleanly",
    rewrite:
      "botscript fmt <file> --write",
    example:
      "// before — multi-space directive, alignment padding, trailing whitespace\n" +
      "?bs   0.4\n" +
      "fn add(a: number, b: number) -> number   =   a + b   \n\n" +
      "// after — canonical\n" +
      "?bs 0.4\n" +
      "fn add(a: number, b: number) -> number = a + b",
  },
  INT001: {
    code: "INT001",
    title: "intent declares 'pure' but function has capability, resource, or throws declarations",
    rule:
      "a function whose intent contains 'pure' must have no capability declarations (uses {}) — " +
      "from ?bs 0.8, it must also have no read/write resource dependencies (reads {} / writes {}) — " +
      "from ?bs 0.9, it must also have no non-empty throws {} declaration — " +
      "pure functions are deterministic, side-effect-free, and should use Result<T, E> for errors",
    idiom:
      "remove the conflicting header clauses (uses {}, reads {} / writes {} at ?bs 0.8+, throws {} at ?bs 0.9+) " +
      "from a pure function, or change the intent to reflect the actual behaviour",
    rewrite:
      "// option A — remove conflicting annotations:\n" +
      "fn name(args) intent: \"pure\" -> type = ...\n\n" +
      "// option B — remove the intent claim:\n" +
      "fn name(args) uses { caps } reads { ... } writes { ... } throws { ... } -> type = ...\n\n" +
      "// option C — replace throws with Result (preferred for pure fns):\n" +
      "fn name(args) intent: \"pure\" -> Result<type, ErrorType> = ...",
    example:
      "// before — intent says pure, but function can throw\n" +
      "?bs 0.9\n" +
      "fn parseId(raw: string) intent: \"pure\" throws { ParseError } -> string {\n" +
      "  if (!raw.match(/^[a-z]+$/)) throw new ParseError(\"invalid\")\n" +
      "  return raw\n" +
      "}\n\n" +
      "// after — use Result instead of throws\n" +
      "?bs 0.9\n" +
      "fn parseId(raw: string) intent: \"pure\" -> Result<string, ParseError> {\n" +
      "  if (!raw.match(/^[a-z]+$/)) { const e = new ParseError(\"invalid\"); return err(e) }\n" +
      "  return ok(raw)\n" +
      "}",
  },
  INT002: {
    code: "INT002",
    title: "intent declares 'pure' but function body uses a capability",
    rule:
      "a function declaring intent: \"pure\" must not directly reference any stdlib capability " +
      "in its body — the pure claim means deterministic and side-effect-free",
    idiom:
      "move the capability usage out of the pure fn, or change the intent to reflect the actual behaviour",
    rewrite:
      "// option A — remove the capability call from the body:\n" +
      "fn name(args) intent: \"pure\" -> type = pure { ... }\n\n" +
      "// option B — remove the pure intent claim:\n" +
      "fn name(args) uses { cap } -> type = ...",
    example:
      "// before — fn says pure but body calls http.get\n" +
      "?bs 0.7\n" +
      "fn fetchUser(id: string) intent: \"pure\" -> string {\n" +
      "  return http.get(\"/users/\" + id);\n" +
      "}\n\n" +
      "// after — remove pure claim and declare the capability\n" +
      "?bs 0.7\n" +
      "fn fetchUser(id: string) uses { net } -> string {\n" +
      "  return http.get(\"/users/\" + id);\n" +
      "}",
  },
  INT003: {
    code: "INT003",
    title: "intent declares 'idempotent' but function uses a non-idempotent capability",
    rule:
      "a function whose intent contains 'idempotent' must not declare `random` or `time` in its `uses {}` — " +
      "random and time capabilities produce different values on each call, making the function non-idempotent; " +
      "only `random` and `time` are flagged as inherently non-idempotent — other capabilities are not structurally flagged by this check",
    idiom:
      "idempotent = safe to retry; `random` and `time` are inherently non-idempotent — remove them from `uses {}` or change the intent",
    rewrite:
      "// option A — remove the non-idempotent capability (keep any other caps):\n" +
      "fn name(args) uses { …other-caps } intent: \"idempotent\" -> type = ...\n\n" +
      "// option B — remove the idempotent intent claim (preserve all caps, including\n" +
      "// the non-idempotent one alongside any others):\n" +
      "fn name(args) uses { …other-caps, time } -> type = ...   // or `uses { …other-caps, random }`",
    example:
      "// before — fn claims idempotent but uses time (non-idempotent); INT003 fires\n" +
      "?bs 0.7\n" +
      "fn expireAt(ttl: number) uses { time } intent: \"idempotent\" -> number = time.now() + ttl\n\n" +
      "// after — remove the idempotent claim (fn has time-dependent output)\n" +
      "?bs 0.7\n" +
      "fn expireAt(ttl: number) uses { time } -> number = time.now() + ttl",
  },
  INT004: {
    code: "INT004",
    title: "intent declares 'idempotent' but function body directly calls a non-idempotent capability",
    rule:
      "a function declaring intent: \"idempotent\" must not directly reference `random` or `time` in its body — " +
      "these stdlib namespaces produce different values on each invocation, making any function that uses them non-idempotent",
    idiom:
      "move the non-idempotent call out of the idempotent fn, or change the intent to reflect the actual behaviour",
    rewrite:
      "// option A — remove the non-idempotent call from the body:\n" +
      "fn name(args) intent: \"idempotent\" -> type = ...\n\n" +
      "// option B — declare the capability and remove the idempotent intent claim\n" +
      "// (preserve any other existing capabilities alongside the non-idempotent one):\n" +
      "fn name(args) uses { …other-caps, random } -> type = ...   // or `uses { …other-caps, time }`",
    example:
      "// before — fn claims idempotent but body calls random.next; INT004 fires\n" +
      "?bs 0.7\n" +
      "fn generateId(prefix: string) intent: \"idempotent\" -> string = prefix + random.next()\n\n" +
      "// after — remove the idempotent claim and declare the capability\n" +
      "?bs 0.7\n" +
      "fn generateId(prefix: string) uses { random } -> string = prefix + random.next()",
  },
  INT005: {
    code: "INT005",
    title: "intent declares 'idempotent' but function declares writes {}",
    rule:
      "a function declaring intent: \"idempotent\" must not declare `writes { ... }` — " +
      "a fn that mutates a resource produces different observable side effects on each call, " +
      "making it structurally non-idempotent regardless of input",
    idiom:
      "remove the writes declaration if the fn does not actually mutate the resource, " +
      "or change the intent to reflect the actual behaviour",
    rewrite:
      "// option A — remove the writes declaration if the fn does not mutate:\n" +
      "fn name(args) intent: \"idempotent\" -> type = ...\n\n" +
      "// option B — remove the idempotent intent claim (keep writes):\n" +
      "fn name(args) writes { label } -> type = ...",
    example:
      "// before — fn claims idempotent but declares writes { auditLog }; INT005 fires\n" +
      "?bs 0.9\n" +
      "fn recordAttempt(id: string) intent: \"idempotent\" writes { auditLog } -> void { }\n\n" +
      "// after — remove the idempotent claim (the fn mutates state, so it is not idempotent)\n" +
      "?bs 0.9\n" +
      "fn recordAttempt(id: string) writes { auditLog } -> void { }",
  },
  EFF002: {
    code: "EFF002",
    title: "outer fn declares narrower effects than a callback parameter",
    rule:
      "if a function-typed parameter declares `uses { caps }`, the containing fn must declare at least those capabilities — " +
      "accepting an effectful callback without declaring its effects hides the blast radius from callers",
    idiom:
      "a fn's effect surface is the union of its direct effects and the effects its callback parameters may exercise",
    rewrite:
      "fn name(action: () uses { cap } -> T) uses { …existing, cap } -> ...",
    example:
      "// before — accepts effectful callback but outer fn declares no capabilities\n" +
      "?bs 0.7\n" +
      "fn withRetry(action: () uses { net } -> string) -> string = action()\n\n" +
      "// after — outer fn declares the capability its callback may exercise\n" +
      "?bs 0.7\n" +
      "fn withRetry(action: () uses { net } -> string) uses { net } -> string = action()",
  },
  EFF003: {
    code: "EFF003",
    title: "outer fn declares narrower reads than a callback parameter",
    rule:
      "if a function-typed parameter declares `reads { labels }`, the containing fn must declare at least those read labels — " +
      "accepting a resource-reading callback without propagating its reads hides the dependency surface from callers",
    idiom:
      "a fn's read-dependency surface is the union of its own reads and the reads its callback parameters may exercise",
    rewrite:
      "fn name(cb: () reads { label } -> T) reads { …existing, label } -> ...",
    example:
      "// before — accepts reads-annotated callback but outer fn declares no reads\n" +
      "?bs 0.9\n" +
      "fn withCache(loader: () reads { cache } -> string) -> string = loader()\n\n" +
      "// after — outer fn propagates the reads surface of its callback\n" +
      "?bs 0.9\n" +
      "fn withCache(loader: () reads { cache } -> string) reads { cache } -> string = loader()",
  },
  EFF004: {
    code: "EFF004",
    title: "outer fn declares narrower writes than a callback parameter",
    rule:
      "if a function-typed parameter declares `writes { labels }`, the containing fn must declare at least those write labels — " +
      "accepting a resource-writing callback without propagating its writes hides the dependency surface from callers",
    idiom:
      "a fn's write-dependency surface is the union of its own writes and the writes its callback parameters may exercise",
    rewrite:
      "fn name(cb: () writes { label } -> T) writes { …existing, label } -> ...",
    example:
      "// before — accepts writes-annotated callback but outer fn declares no writes\n" +
      "?bs 0.9\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) -> void { recorder() }\n\n" +
      "// after — outer fn propagates the writes surface of its callback\n" +
      "?bs 0.9\n" +
      "fn withMetrics(recorder: () writes { metrics } -> void) writes { metrics } -> void { recorder() }",
  },
  RES001: {
    code: "RES001",
    title: "Result.try block has no body",
    rule:
      "the form is `Result.try { <body> }` (or `Result.tryAsync { <body> }`) — the braces are required",
    idiom:
      "use Result.try to lift a throwing JS-boundary call into a Result without writing a try/catch by hand",
    rewrite:
      "Result.try { <body that may throw> }",
    example:
      "// before\n" +
      "let parsed = JSON.parse(input)\n\n" +
      "// after\n" +
      "let parsed = Result.try { JSON.parse(input) }?",
  },
  RES002: {
    code: "RES002",
    title: "Result- or Option-returning fn called but return value discarded",
    rule:
      "a same-file fn whose return type contains Result<> or Option<> must not be called " +
      "as a bare statement — the return value must be propagated (?), matched, or assigned; " +
      "discarding it permanently seals the error/absence path from callers",
    idiom:
      "use '?' to propagate errors to the caller, 'match' to handle each case, or " +
      "'let x = f()' to assign and inspect later; " +
      "if the discard is intentional (best-effort logging, optional cache write), " +
      "wrap the call in `unsafe \"intentional discard\" { f() }` to document it explicitly",
    rewrite:
      "let result = f(...)  // or f(...)?  // or match f(...) { ok { v } -> ... err { e } -> ... }",
    example:
      "// before — error path silently swallowed\n" +
      "?bs 0.9\n" +
      "fn saveUser(user: User) writes { userDb } -> Result<void, DbError> { ... }\n" +
      "fn processUser(user: User) writes { userDb } -> void {\n" +
      "  saveUser(user)   // RES002\n" +
      "}\n\n" +
      "// after\n" +
      "fn processUser(user: User) writes { userDb } -> Result<void, DbError> {\n" +
      "  saveUser(user)?  // propagate\n" +
      "}",
  },
  SYN001: {
    code: "SYN001",
    title: "duplicate or invalid fn header clause",
    rule:
      "each fn header clause (reads {}, writes {}, throws {}, intent:) may appear at most once; " +
      "labels inside reads/writes/throws must be plain identifiers, not quoted strings",
    idiom:
      "declare each resource dependency, throws declaration, or intent claim exactly once; " +
      "merge duplicate lists rather than repeating the clause",
    rewrite:
      "fn name(...) reads { cache, db } writes { metrics } -> ...",
    example:
      "// duplicate reads — SYN001\n" +
      "fn load(id: string) reads { cache } reads { db } -> string = id\n\n" +
      "// fix: merge into one clause\n" +
      "fn load(id: string) reads { cache, db } -> string = id",
  },
  SYN002: {
    code: "SYN002",
    title: "native throw statement bypasses Result contract",
    rule:
      "native `throw` statements in fn bodies bypass botscript's Result-based error contract — " +
      "callers using `?` unwrap, `match`, or `throws {}` propagation will not observe exceptions raised via `throw`",
    idiom:
      "replace `throw new ErrorType(...)` with `return err(new ErrorType(...))` " +
      "and update the return type to `Result<T, ErrorType>`",
    rewrite:
      "// before — native throw bypasses Result contract\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n\n" +
      "// after — explicit Result contract\n" +
      "fn parse(s: string) -> Result<string, ParseError> {\n" +
      "  if (!s) { const e = new ParseError(\"empty\"); return err(e) }\n" +
      "  return ok(s)\n" +
      "}",
    example:
      "// SYN002: native throw bypasses botscript error contract\n" +
      "fn parse(s: string) -> string {\n" +
      "  if (!s) throw new ParseError(\"empty\")\n" +
      "  return s\n" +
      "}\n\n" +
      "// fix: use Result for error signaling\n" +
      "fn parse(s: string) -> Result<string, ParseError> {\n" +
      "  if (!s) { const e = new ParseError(\"empty\"); return err(e) }\n" +
      "  return ok(s)\n" +
      "}",
  },
  SYN003: {
    code: "SYN003",
    title: "console.* call bypasses stdout/stderr capability model",
    rule:
      "direct `console.*` calls (console.log, console.error, etc.) in fn bodies bypass " +
      "botscript's capability model — the compiler cannot see or enforce `stdout`/`stderr` " +
      "declarations for output routed through `console`; callers cannot know the fn writes to stdout or stderr",
    idiom:
      "replace console.log with stdout.write(...) and declare `uses { stdout }` on the fn; " +
      "replace console.error with stderr.write(...) and declare `uses { stderr }`",
    rewrite:
      "// before — console bypasses capability tracking\n" +
      "fn log(msg: string) -> void {\n" +
      "  console.log(msg)  // SYN003\n" +
      "}\n\n" +
      "// after — explicit stdout capability\n" +
      "fn log(msg: string) uses { stdout } -> void {\n" +
      "  unsafe \"stdout.write returns void\" { stdout.write(msg) }\n" +
      "}",
    example:
      "// SYN003: console.log bypasses capability model\n" +
      "fn greet(name: string) -> void {\n" +
      "  console.log(`Hello, ${name}`)\n" +
      "}\n\n" +
      "// fix: declare the output capability\n" +
      "fn greet(name: string) uses { stdout } -> void {\n" +
      "  unsafe \"stdout.write returns void\" { stdout.write(`Hello, ${name}`) }\n" +
      "}",
  },
  SYN004: {
    code: "SYN004",
    title: "eval() or Function() / new Function() calls bypass all static capability and syntax checks",
    rule:
      "`eval(...)`, `Function(...)`, and `new Function(...)` execute strings as code at runtime — " +
      "no static analysis can see what they do; every capability check (CAP001/CAP002), " +
      "resource declaration (reads/writes), and safety check (SYN002/SYN003) can be bypassed " +
      "by routing the unsafe pattern through eval or the Function constructor",
    idiom:
      "refactor eval-based patterns to use explicit code paths or config parameters; " +
      "if eval is unavoidable (e.g. a sandboxed interpreter or intentional scripting surface), " +
      "wrap in `unsafe \"<reason>\" { eval(...) }` to make the escape hatch visible in the diff",
    rewrite:
      "// before — eval hides config key access from static analysis\n" +
      "fn getConfig(key: string) -> string {\n" +
      "  return eval('process.env.' + key)  // SYN004\n" +
      "}\n\n" +
      "// after — explicit parameter, no eval\n" +
      "fn getConfig(value: string) -> string {\n" +
      "  return value\n" +
      "}",
    example:
      "// SYN004: eval bypasses all static checks\n" +
      "fn run(code: string) -> string {\n" +
      "  return eval(code)\n" +
      "}\n\n" +
      "// fix: suppress with unsafe if eval is genuinely needed\n" +
      "fn run(code: string) -> string {\n" +
      '  return unsafe "evaluates user-provided script in sandbox" { eval(code) }\n' +
      "}",
  },
  SYN005: {
    code: "SYN005",
    title: "process.env access is an undeclared deployment environment dependency",
    rule:
      "`process.env` access in a fn body is invisible to callers — no capability or resource " +
      "declaration covers the deployment environment; the fn silently depends on env-var values " +
      "that callers cannot see, audit, or mock in tests",
    idiom:
      "pass config and secrets as explicit fn parameters so the dependency is visible in the " +
      "call signature; for module-level config loading, wrap in `unsafe \"reads deployment env\" { process.env.KEY }` " +
      "and narrow the scope to the load site",
    rewrite:
      "// before — implicit env dep\n" +
      "fn connect() uses { net } -> Result<Response, string> {\n" +
      "  const url = process.env.DATABASE_URL  // SYN005\n" +
      "  return http.get(url)\n" +
      "}\n\n" +
      "// after — explicit parameter\n" +
      "fn connect(url: string) uses { net } -> Result<Response, string> {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN005: process.env access hides a deployment dependency\n" +
      "fn getSecret() -> string {\n" +
      "  return process.env.API_KEY\n" +
      "}\n\n" +
      "// fix: pass the value explicitly\n" +
      "fn getSecret(apiKey: string) -> string {\n" +
      "  return apiKey\n" +
      "}",
  },
  SYN006: {
    code: "SYN006",
    title: "process.exit() terminates the host process and bypasses all recovery logic",
    rule:
      "`process.exit()`, `process?.exit()`, and `process.exit?.()` all terminate the entire host process — " +
      "not just the fn, not just the bot. " +
      "They produce no return value, never run caller code after the call, and completely bypass " +
      "botscript's Result-based error contract: callers relying on `?`, `match`, or `throws {}` " +
      "propagation will never see this termination. There is no capability declaration, no `throws {}`, " +
      "nothing in the fn header to signal the kill.",
    idiom:
      "return `err(...)` (e.g. `err('reason')`) and propagate with `?` so the caller can decide whether " +
      "to exit; if process.exit is genuinely required at a bootstrap entry point, wrap in " +
      "`unsafe \"exits on invalid config\" { process.exit(1) }`",
    rewrite:
      "// before — silent process kill; callers have no recovery path\n" +
      "fn loadConfig(configPath: string) -> Config {\n" +
      "  if (!configPath) process.exit(1)  // SYN006\n" +
      "  return readConfig(configPath)\n" +
      "}\n\n" +
      "// after — explicit error propagation\n" +
      "fn loadConfig(configPath: string) -> Result<Config, string> {\n" +
      "  if (!configPath) return err('configPath not set')\n" +
      "  return ok(readConfig(configPath))\n" +
      "}",
    example:
      "// SYN006: process.exit kills the host process; callers cannot recover\n" +
      "fn validate(cfg: Config) -> void {\n" +
      "  if (!cfg.valid) process.exit(1)\n" +
      "}\n\n" +
      "// fix: return an error and let the caller decide\n" +
      "fn validate(cfg: Config) -> Result<void, string> {\n" +
      "  if (!cfg.valid) return err('invalid config')\n" +
      "  return ok(undefined)\n" +
      "}",
  },
  SYN007: {
    code: "SYN007",
    title: "fetch() call bypasses the net capability model",
    rule:
      "`fetch(url)` and `fetch?.(url)` make HTTP requests at runtime but are invisible to " +
      "botscript's capability model: CAP001 checks for `http.*` member calls, not the `fetch` " +
      "global. A fn that calls `fetch` has an undeclared network dependency — CAP001 cannot " +
      "infer or require `uses { net }` from `fetch` calls, so callers and audit tooling cannot " +
      "rely on CAP001 to detect a missing declaration.",
    idiom:
      "replace `fetch(url)` with `http.get(url)` (or `http.post(url, { body })`) and add " +
      "`uses { net }` to the fn header; if the native fetch API is required, wrap in " +
      '`unsafe "calls fetch directly" { fetch(url) }`',
    rewrite:
      "// before — fetch is invisible to the capability model\n" +
      "fn getUser(id: string) -> Promise<User> {\n" +
      "  return fetch(`/api/users/${id}`).then(r => r.json())  // SYN007\n" +
      "}\n\n" +
      "// after — declared network dependency\n" +
      "fn getUser(id: string) uses { net } -> Promise<User> {\n" +
      "  return http.get(`/api/users/${id}`)\n" +
      "}",
    example:
      "// SYN007: fetch bypasses the net capability model\n" +
      "fn getUser(id: string) -> Promise<User> {\n" +
      "  return fetch(`/api/users/${id}`).then(r => r.json())  // SYN007\n" +
      "}\n\n" +
      "// fix: declare the dependency\n" +
      "fn getUser(id: string) uses { net } -> Promise<User> {\n" +
      "  return http.get(`/api/users/${id}`)\n" +
      "}",
  },
  SYN008: {
    code: "SYN008",
    title: "new WebSocket() / WebSocket() call bypasses the net capability model",
    rule:
      "`new WebSocket(url)`, `WebSocket(url)`, and TypeScript instantiation forms like " +
      "`new WebSocket<T>(url)` open persistent bidirectional connections at runtime but are " +
      "invisible to botscript's capability model: CAP001 checks for `http.*` member calls, " +
      "not the `WebSocket` global. A fn that constructs a WebSocket has an undeclared network " +
      "dependency — no `uses {}` declaration covers it, and no audit tool can observe it from the fn header.",
    idiom:
      "wrap the `WebSocket` constructor in `unsafe \"<reason>\" { new WebSocket(url) }` " +
      "to make the escape hatch visible in the diff",
    rewrite:
      "// before — WebSocket is invisible to the capability model\n" +
      "fn openFeed(url: string) -> WebSocket {\n" +
      "  return new WebSocket(url)  // SYN008\n" +
      "}\n\n" +
      "// after — escape hatch justified in the diff\n" +
      "fn openFeed(url: string) -> WebSocket {\n" +
      '  return unsafe "wraps WebSocket for streaming feed" { new WebSocket(url) }\n' +
      "}",
    example:
      "// SYN008: WebSocket bypasses the net capability model\n" +
      "fn subscribe(url: string) -> void {\n" +
      "  const ws = new WebSocket(url)  // SYN008\n" +
      "  ws.onmessage = (e) => handle(e.data)\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a justification\n" +
      "fn subscribe(url: string) -> void {\n" +
      '  const ws = unsafe "wraps WebSocket for live updates" { new WebSocket(url) }\n' +
      "  ws.onmessage = (e) => handle(e.data)\n" +
      "}",
  },
  SYN010: {
    code: "SYN010",
    title: "setTimeout / setInterval / queueMicrotask defers side effects outside the fn's capability surface",
    rule:
      "`setTimeout(fn, ms)`, `setInterval(fn, ms)`, and `queueMicrotask(fn)` schedule callbacks that run " +
      "after the current fn returns — any effects inside those callbacks are invisible to the caller: " +
      "no capability declaration, no `writes {}` label, no `throws {}` entry can reflect them. " +
      "Callers see a fn that returns normally; the real work happens later, in a different call frame, " +
      "with no signal in the fn header.",
    idiom:
      "pass the delay and callback to the caller as a return value so the timing is visible (e.g. return a Promise " +
      "the caller awaits); if a timer is genuinely required here, wrap in " +
      "`unsafe \"schedules deferred effect\" { setTimeout(...) }`",
    rewrite:
      "// before — deferred effect invisible to callers\n" +
      "fn scheduleRetry(fn: () -> void, ms: number) -> void {\n" +
      "  setTimeout(fn, ms)  // SYN010\n" +
      "}\n\n" +
      "// after — caller controls the timing\n" +
      "async fn scheduleRetry(fn: () -> void, ms: number) -> Promise<void> {\n" +
      "  await new Promise(resolve => unsafe \"schedules deferred effect\" { setTimeout(resolve, ms) })\n" +
      "  fn()\n" +
      "}",
    example:
      "// SYN010: deferred callback hides a network effect from callers\n" +
      "fn pollStatus(url: string) uses { net } -> void {\n" +
      "  setInterval(() => http.get(url), 5000)  // SYN010\n" +
      "}\n\n" +
      "// fix: return a teardown fn so the polling is visible at the call site\n" +
      "fn pollStatus(url: string) uses { net } -> () -> void {\n" +
      "  const id = setInterval(() => http.get(url), 5000)\n" +
      "  return () => clearInterval(id)\n" +
      "}",
  },
  SYN011: {
    code: "SYN011",
    title: "dynamic import() call bypasses the module capability model",
    rule:
      "`import(specifier)` at runtime loads a module whose capabilities are not statically declared: " +
      "CAP001 checks for stdlib namespace calls, not dynamic module loads. " +
      "A fn that calls `import()` has an unbounded, undeclared capability surface proportional to " +
      "everything the dynamically loaded module might do — the capability manifest hash proves the " +
      "fn body unchanged; it says nothing about what the loaded module does at runtime.",
    idiom:
      "if the module is known at compile time, use a static `import { ... } from` declaration at the top level instead; " +
      "if dynamic loading is genuinely required (e.g. a plugin system), wrap in " +
      "`unsafe \"loads plugin dynamically\" { import(specifier) }`",
    rewrite:
      "// before — unbounded capability surface from dynamic load\n" +
      "async fn loadPlugin(name: string) -> Plugin {\n" +
      "  const mod = await import(`./plugins/${name}`)  // SYN011\n" +
      "  return mod.default\n" +
      "}\n\n" +
      "// after — explicit escape hatch\n" +
      "async fn loadPlugin(name: string) -> Plugin {\n" +
      "  const mod = await unsafe \"loads plugin by name from trusted plugin dir\" { import(`./plugins/${name}`) }\n" +
      "  return mod.default\n" +
      "}",
    example:
      "// SYN011: dynamic import hides an unbounded capability surface\n" +
      "async fn getAdapter(type: string) -> any {\n" +
      "  const m = await import(`./adapters/${type}`)  // SYN011\n" +
      "  return m.default\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a reason, or use a static import at the top level\n" +
      "async fn getAdapter(type: string) -> any {\n" +
      "  const m = await unsafe \"adapter type validated by registry\" { import(`./adapters/${type}`) }\n" +
      "  return m.default\n" +
      "}",
  },
  SYN012: {
    code: "SYN012",
    title: "new EventSource() / EventSource() call bypasses the net capability model",
    rule:
      "`new EventSource(url)`, `EventSource(url)`, `EventSource?.(url)`, and TypeScript instantiation forms like " +
      "`new EventSource<T>(url)` open persistent server-sent-events connections at runtime but are " +
      "invisible to botscript's capability model: CAP001 checks for `http.*` member calls, " +
      "not the `EventSource` global. A fn that constructs an EventSource has an undeclared network " +
      "dependency — no `uses {}` declaration covers it, and no audit tool can observe it from the fn header.",
    idiom:
      "wrap the `EventSource` constructor in `unsafe \"wraps EventSource directly\" { new EventSource(url) }` " +
      "to make the escape hatch visible in the diff",
    rewrite:
      "// before — EventSource is invisible to the capability model\n" +
      "fn openFeed(url: string) -> EventSource {\n" +
      "  return new EventSource(url)  // SYN012\n" +
      "}\n\n" +
      "// after — escape hatch justified in the diff\n" +
      "fn openFeed(url: string) -> EventSource {\n" +
      '  return unsafe "wraps EventSource for streaming feed" { new EventSource(url) }\n' +
      "}",
    example:
      "// SYN012: EventSource bypasses the net capability model\n" +
      "fn openFeed(url: string) -> any {\n" +
      "  return new EventSource(url)  // SYN012\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a justification\n" +
      "fn openFeed(url: string) -> any {\n" +
      '  return unsafe "wraps EventSource for streaming feed" { new EventSource(url) }\n' +
      "}",
  },
  SYN013: {
    code: "SYN013",
    title: "Worker() / SharedWorker() construction (with or without new) spawns an unbounded execution context",
    rule:
      "`new Worker(scriptURL)`, bare `Worker(scriptURL)`, `Worker?.(scriptURL)`, `new SharedWorker(scriptURL)`, " +
      "bare `SharedWorker(scriptURL)`, `SharedWorker?.(scriptURL)`, and TypeScript instantiation forms like " +
      "`new Worker<T>(scriptURL)` spawn a new JS execution context that is invisible to botscript's " +
      "capability model: the worker script runs with its own global scope, can make network requests, " +
      "access storage, and perform any operation — none of which is visible in the spawning fn's " +
      "`uses {}`, `reads {}`, or `writes {}` declarations. CAP001 cannot infer any capability " +
      "from worker construction; the capability surface of the spawned context is unbounded.",
    idiom:
      "wrap the constructor in `unsafe \"<reason>\" { new Worker(scriptURL) }` to make the escape " +
      "hatch visible in the diff; document what capabilities the worker script is expected to use in the reason string",
    rewrite:
      "// before — Worker is invisible to the capability model\n" +
      "fn startWorker(url: string) -> Worker {\n" +
      "  return new Worker(url)  // SYN013\n" +
      "}\n\n" +
      "// after — escape hatch justified in the diff\n" +
      "fn startWorker(url: string) -> Worker {\n" +
      '  return unsafe "spawns computation worker with no external I/O" { new Worker(url) }\n' +
      "}",
    example:
      "// SYN013: Worker spawns unbounded execution context\n" +
      "fn compute(url: string) -> Worker {\n" +
      "  return new Worker(url)  // SYN013\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a justification\n" +
      "fn compute(url: string) -> Worker {\n" +
      '  return unsafe "spawns computation worker with no net access" { new Worker(url) }\n' +
      "}",
  },
  SYN014: {
    code: "SYN014",
    title: "new BroadcastChannel() / BroadcastChannel() call bypasses the messaging capability model",
    rule:
      "`new BroadcastChannel(name)` and `BroadcastChannel(name)` open a cross-context message channel " +
      "at runtime — any tab, window, or worker on the same origin can post to or receive from this channel. " +
      "This is invisible to botscript's capability model: CAP001 checks for stdlib namespace calls, not " +
      "the `BroadcastChannel` global. A fn that constructs a BroadcastChannel has an undeclared cross-context " +
      "messaging dependency — no `uses {}` declaration covers it, and no audit tool can observe it from the fn header.",
    idiom:
      "wrap the `BroadcastChannel` constructor in `unsafe \"<reason>\" { new BroadcastChannel(name) }` " +
      "to make the escape hatch visible in the diff",
    rewrite:
      "// before — BroadcastChannel is invisible to the capability model\n" +
      "fn openChannel(name: string) -> BroadcastChannel {\n" +
      "  return new BroadcastChannel(name)  // SYN014\n" +
      "}\n\n" +
      "// after — escape hatch justified in the diff\n" +
      "fn openChannel(name: string) -> BroadcastChannel {\n" +
      "  return unsafe \"wraps BroadcastChannel for tab coordination\" { new BroadcastChannel(name) }\n" +
      "}",
    example:
      "// SYN014: BroadcastChannel bypasses the messaging capability model\n" +
      "fn subscribe(channel: string) -> BroadcastChannel {\n" +
      "  const bc = new BroadcastChannel(channel)  // SYN014\n" +
      "  bc.onmessage = (e) => handle(e.data)\n" +
      "  return bc\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a justification\n" +
      "fn subscribe(channel: string) -> BroadcastChannel {\n" +
      "  const bc = unsafe \"wraps BroadcastChannel for live updates\" { new BroadcastChannel(channel) }\n" +
      "  bc.onmessage = (e) => handle(e.data)\n" +
      "  return bc\n" +
      "}",
  },
  SYN016: {
    code: "SYN016",
    title: "indexedDB access bypasses the storage capability model",
    rule:
      "`indexedDB.*` accesses are same-origin persistent database operations invisible to botscript's " +
      "capability model: `reads {}` / `writes {}` labels cover declared resource identifiers, not the " +
      "Web Storage API globals. A fn that accesses `indexedDB` has undeclared persistent state dependencies " +
      "— no `reads {}` / `writes {}` declaration in the fn header covers the access, and callers cannot " +
      "observe or audit the dependency from the fn's declared surface. Unlike `localStorage`, `indexedDB` " +
      "is asynchronous and has no practical size limit, making invisible access higher-impact.",
    idiom:
      "pass an `IDBDatabase` or an explicit storage abstraction as a fn parameter so callers control " +
      "what database is accessed, the dependency is visible in the fn signature, and tests can inject a mock; " +
      "if direct access is genuinely required, wrap in " +
      "`unsafe \"reads/writes indexedDB for <reason>\" { indexedDB.open(name) }`",
    rewrite:
      "// before — indexedDB access invisible to the capability model\n" +
      "async fn getUser(id: string) -> User | null {\n" +
      "  const req = indexedDB.open('users-db', 1)  // SYN016\n" +
      "  const db = await new Promise<IDBDatabase>((res) => { req.onsuccess = (e) => res(e.target.result) })\n" +
      "  return db.transaction('users').objectStore('users').get(id)\n" +
      "}\n\n" +
      "// after — database handle passed as parameter; dependency visible in the signature\n" +
      "async fn getUser(db: IDBDatabase, id: string) -> User | null {\n" +
      "  return db.transaction('users').objectStore('users').get(id)\n" +
      "}",
    example:
      "// SYN016: indexedDB access invisible to capability model\n" +
      "async fn loadSettings() -> Settings {\n" +
      "  const req = indexedDB.open('app-db', 1)  // SYN016\n" +
      "  return new Promise((resolve) => { req.onsuccess = (e) => resolve(e.target.result) })\n" +
      "}\n\n" +
      "// fix: pass db as a parameter or wrap in unsafe with a reason\n" +
      "async fn loadSettings() -> Settings {\n" +
      "  const req = unsafe \"opens app-db for settings read\" { indexedDB.open('app-db', 1) }\n" +
      "  return new Promise((resolve) => { req.onsuccess = (e) => resolve(e.target.result) })\n" +
      "}",
  },
  SYN017: {
    code: "SYN017",
    title: "new Notification() / Notification() call bypasses the capability model",
    rule:
      "`new Notification(title)`, bare `Notification(title)`, optional-call `Notification?.(title)`, " +
      "and TypeScript generic form `new Notification<T>(title)` calls create user-visible browser " +
      "notifications at runtime — a side effect entirely invisible to botscript's capability model. " +
      "No `uses {}`, `reads {}`, or `writes {}` declaration covers notification dispatch: callers " +
      "cannot observe, audit, or suppress the UI effect from the fn's declared surface.",
    idiom:
      "accept a notification-dispatch callback as an explicit fn parameter so callers control " +
      "whether a notification is shown and tests can capture or suppress it; " +
      "if direct `Notification` access is required, wrap in " +
      "`unsafe \"sends browser notification for <reason>\" { new Notification(title, options) }`",
    rewrite:
      "// before — notification dispatch invisible to the capability model\n" +
      "fn alertUser(msg: string) -> void {\n" +
      "  new Notification(msg)  // SYN017\n" +
      "}\n\n" +
      "// after — dispatch function passed as parameter; callers control UI side effect\n" +
      "fn alertUser(notify: (msg: string) => void, msg: string) -> void {\n" +
      "  notify(msg)\n" +
      "}",
    example:
      "// SYN017: Notification dispatch bypasses the capability model\n" +
      "fn warnUser(title: string, body: string) -> void {\n" +
      "  new Notification(title, { body })  // SYN017\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a reason\n" +
      "fn warnUser(title: string, body: string) -> void {\n" +
      "  unsafe \"shows alert notification for user-triggered warning\" { new Notification(title, { body }) }\n" +
      "}",
  },
  SYN018: {
    code: "SYN018",
    title: "Math.random() call bypasses the random capability model",
    rule:
      "`Math.random()` generates a random float at runtime but is invisible to botscript's " +
      "capability model: `uses { random }` declarations cover `random.*` stdlib namespace calls, " +
      "not the `Math.random` global. A fn that calls `Math.random()` has an undeclared " +
      "randomness dependency — no `uses {}` declaration covers it, callers cannot see it, " +
      "and tests cannot deterministically mock or suppress it the way they can the `random` stdlib.",
    idiom:
      "replace `Math.random()` with `random.next()` and add `uses { random }` to the fn header; " +
      "if the raw `Math.random` API is required, wrap in `unsafe \"uses Math.random for <reason>\" { Math.random() }`",
    rewrite:
      "// before — Math.random() invisible to the capability model\n" +
      "fn jitter(base: number) uses { } -> number {\n" +
      "  return base + Math.random() * 10  // SYN018\n" +
      "}\n\n" +
      "// after — random capability declared; tests can control the output\n" +
      "fn jitter(base: number) uses { random } -> number {\n" +
      "  return base + random.next() * 10\n" +
      "}",
    example:
      "// SYN018: Math.random() bypasses the random capability model\n" +
      "fn roll(sides: number) -> number {\n" +
      "  return Math.floor(Math.random() * sides) + 1  // SYN018\n" +
      "}\n\n" +
      "// fix: use random.next() and declare uses { random }\n" +
      "fn roll(sides: number) uses { random } -> number {\n" +
      "  return Math.floor(random.next() * sides) + 1\n" +
      "}",
  },
  SYN019: {
    code: "SYN019",
    title: "crypto.getRandomValues() / crypto.randomUUID() call bypasses the random capability model",
    rule:
      "`crypto.getRandomValues()` and `crypto.randomUUID()` generate cryptographic randomness at runtime " +
      "but are invisible to botscript's capability model: `uses { random }` covers `random.*` stdlib calls, " +
      "not the `crypto` global. A fn that calls these methods has an undeclared randomness dependency — " +
      "tests cannot control the output and callers cannot observe the dependency from the fn header.",
    idiom:
      "use `random.next()` (float [0,1)) or `random.int(min, max)` from the `random` stdlib with `uses { random }` " +
      "so the randomness dependency is visible in the fn header and tests can inject a mock; " +
      "if cryptographic randomness or UUIDs are genuinely required, wrap in " +
      "`unsafe \"uses crypto for <reason>\" { crypto.getRandomValues(buf) }`",
    rewrite:
      "// before — crypto call invisible to the capability model\n" +
      "fn rollToken() -> number {\n" +
      "  const buf = new Uint8Array(4)\n" +
      "  crypto.getRandomValues(buf)  // SYN019\n" +
      "  return buf[0]\n" +
      "}\n\n" +
      "// after — randomness declared in uses {}; tests can control output\n" +
      "fn rollToken() uses { random } -> number {\n" +
      "  return random.int(0, 256)  // [0, 256) == [0, 255] inclusive\n" +
      "}",
    example:
      "// SYN019: crypto call bypasses the random capability model\n" +
      "fn rollDice() -> number {\n" +
      "  const buf = new Uint8Array(1)\n" +
      "  crypto.getRandomValues(buf)  // SYN019\n" +
      "  return (buf[0] % 6) + 1\n" +
      "}\n\n" +
      "// fix: use random stdlib\n" +
      "fn rollDice() uses { random } -> number {\n" +
      "  return random.int(1, 7)\n" +
      "}",
  },
  SYN020: {
    code: "SYN020",
    title: "localStorage / sessionStorage access bypasses the capability model",
    rule:
      "`localStorage` and `sessionStorage` are ambient Web Storage API globals that persist and share state " +
      "across the page session or page loads — completely invisible to botscript's `reads {}` / `writes {}` " +
      "resource model. A fn that accesses them has undeclared persistent or session-scoped state dependencies: " +
      "callers cannot see the dependency from the fn's declared surface, and tests cannot mock or isolate " +
      "the storage without global manipulation",
    idiom:
      "pass a storage handle or key-value abstraction as a parameter so callers can see the dependency and " +
      "tests can inject an in-memory substitute; " +
      "or wrap in `unsafe \"reads/writes localStorage for <reason>\" { ... }` when passing a handle is not practical",
    rewrite:
      "// option A — pass the value as a parameter:\n" +
      "fn getTheme(storage: { getItem(k: string): string | null }) -> string | null {\n" +
      "  return storage.getItem('theme')\n" +
      "}\n\n" +
      "// option B — unsafe block with a justification:\n" +
      "fn getTheme() -> string | null {\n" +
      "  return unsafe \"reads localStorage for user theme preference\" { localStorage.getItem('theme') }\n" +
      "}",
    example:
      "// before — SYN020 fires\n" +
      "?bs 0.7\n" +
      "fn getTheme() -> string | null {\n" +
      "  return localStorage.getItem('theme')  // SYN020\n" +
      "}\n\n" +
      "// after — pass a handle so callers see the dependency\n" +
      "?bs 0.7\n" +
      "fn getTheme(storage: { getItem(k: string): string | null }) -> string | null {\n" +
      "  return storage.getItem('theme')\n" +
      "}",
  },
  SYN022: {
    code: "SYN022",
    title: "process.* ambient state access bypasses the capability model",
    rule:
      "`process.argv`, `process.cwd`, `process.platform`, `process.arch`, `process.pid`, " +
      "`process.ppid`, `process.version`, `process.versions`, `process.hrtime`, " +
      "`process.uptime`, `process.memoryUsage`, `process.cpuUsage`, and " +
      "`process.resourceUsage` read ambient Node.js runtime or deployment state at runtime but are " +
      "invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` " +
      "declaration covers them. A fn that reads these values has an undeclared dependency — " +
      "callers cannot see it, and tests cannot control the observed value. " +
      "Note: `process.env` is covered by SYN005; `process.exit` is covered by SYN006.",
    idiom:
      "pass the value as an explicit parameter so callers and tests can control it (preferred); " +
      "if the ambient access is intentional, wrap in " +
      "`unsafe \"accesses process.<member> for <reason>\" { process.<member> }`",
    rewrite:
      "// before — ambient process state invisible to the capability model\n" +
      "fn buildPath() -> string {\n" +
      "  return process.cwd() + '/output'  // SYN022\n" +
      "}\n\n" +
      "// after — working directory passed as a parameter; tests can control it\n" +
      "fn buildPath(cwd: string) -> string {\n" +
      "  return cwd + '/output'\n" +
      "}",
    example:
      "// SYN022: process.argv bypasses the capability model\n" +
      "fn getFlag() -> string {\n" +
      "  return process.argv[2]  // SYN022\n" +
      "}\n\n" +
      "// fix: accept argv as a parameter\n" +
      "fn getFlag(argv: string[]) -> string {\n" +
      "  return argv[2]\n" +
      "}",
  },
  SYN023: {
    code: "SYN023",
    title: "navigator.* ambient browser capability access bypasses the capability model",
    rule:
      "`navigator.geolocation`, `navigator.clipboard`, `navigator.mediaDevices`, " +
      "`navigator.serviceWorker`, `navigator.permissions`, `navigator.onLine`, " +
      "`navigator.userAgent`, `navigator.language`, `navigator.languages`, " +
      "`navigator.platform`, `navigator.hardwareConcurrency`, `navigator.deviceMemory`, " +
      "`navigator.connection`, and `navigator.wakeLock` read ambient browser capability " +
      "state at runtime but are invisible to botscript's capability model: no `uses {}`, " +
      "`reads {}`, or `writes {}` declaration covers them. A fn that reads these values " +
      "has an undeclared browser-environment dependency — callers cannot see it in the " +
      "header, and tests cannot inject a controlled value.",
    idiom:
      "pass the required value as an explicit parameter so callers and tests can control it (preferred); " +
      "if the ambient access is intentional, wrap in " +
      "`unsafe \"accesses navigator.<member> for <reason>\" { navigator.<member> }`",
    rewrite:
      "// before — ambient navigator state invisible to the capability model\n" +
      "fn isConnected() -> boolean {\n" +
      "  return navigator.onLine  // SYN023\n" +
      "}\n\n" +
      "// after — online status passed as a parameter; tests can control it\n" +
      "fn isConnected(onLine: boolean) -> boolean {\n" +
      "  return onLine\n" +
      "}",
    example:
      "// SYN023: navigator.userAgent bypasses the capability model\n" +
      "fn getBrowser() -> string {\n" +
      "  return navigator.userAgent  // SYN023\n" +
      "}\n\n" +
      "// fix: accept userAgent as a parameter\n" +
      "fn getBrowser(userAgent: string) -> string {\n" +
      "  return userAgent\n" +
      "}",
  },
  DEP001: {
    code: "DEP001",
    title: "fn transitively reads a resource category not declared in its header",
    rule:
      "if fn A calls fn B (directly or transitively) and B declares `reads { x }`, " +
      "then A must also declare `reads { x }` — the reads surface must be complete at every call layer",
    idiom:
      "a fn's reads declaration is the union of its own declared reads plus the reads of everything it calls; " +
      "add the missing label to the caller's `reads { }` clause",
    rewrite:
      "fn name(...) reads { …existing, missing } -> ...",
    example:
      "// before — loadUser calls getFromCache which reads { cache }, but loadUser doesn't declare it\n" +
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) -> string = getFromCache(id)  // DEP001\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "fn getFromCache(id: string) reads { cache } -> string = id\n" +
      "fn loadUser(id: string) reads { cache } -> string = getFromCache(id)",
  },
  DEP002: {
    code: "DEP002",
    title: "fn transitively writes a resource category not declared in its header",
    rule:
      "if fn A calls fn B (directly or transitively) and B declares `writes { x }`, " +
      "then A must also declare `writes { x }` — the writes surface must be complete at every call layer",
    idiom:
      "a fn's writes declaration is the union of its own declared writes plus the writes of everything it calls; " +
      "add the missing label to the caller's `writes { }` clause",
    rewrite:
      "fn name(...) writes { …existing, missing } -> ...",
    example:
      "// before — recordEvent calls updateMetrics which writes { metrics }, but recordEvent doesn't declare it\n" +
      "?bs 0.9\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) -> void { updateMetrics(id); }  // DEP002\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "fn updateMetrics(id: string) writes { metrics } -> void { }\n" +
      "fn recordEvent(id: string) writes { metrics } -> void { updateMetrics(id); }",
  },
  THR004: {
    code: "THR004",
    title: "fn declares throws {} label not justified by any callee or direct construction",
    rule: "a declared throws {} label should reflect an error type the fn or its callees can actually throw; if no same-file callee (transitively) throws X and the fn body does not construct err(X...), the label may be stale",
    idiom: "remove the stale label from the throws {} clause; leaf fns and fns that directly construct err(X) can safely declare X even if no callee propagates it",
    rewrite: "fn name(...) throws { …remaining } -> ...  // remove label not propagated by any callee or body",
    example:
      "// before — load calls helper() but neither throws NetworkError\n" +
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = \"ok\"\n" +
      "fn load(id: string) throws { NetworkError } -> string = helper(id)  // THR004\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = \"ok\"\n" +
      "fn load(id: string) -> string = helper(id)",
  },
  DEP003: {
    code: "DEP003",
    title: "fn declares reads {} label not justified by any tracked callee (warning)",
    rule:
      "a declared reads {} label must be justified by at least one tracked callee declaring the same label; " +
      "DEP003 fires when the pass can resolve all same-file callees and none of them (nor any moduleEffects entry) " +
      "transitively declares reads { x }; the pass does not scan fn bodies for direct resource access — " +
      "it is a call-graph heuristic, not a body scanner; suppressed when the fn has any opaque/untracked external call",
    idiom:
      "remove the stale label from the reads {} clause when no tracked callee propagates it; " +
      "if the label is live through a cross-module call, the opaque-call suppression prevents a false positive; " +
      "leaf fns and fns with opaque external calls are excluded — the warning only fires when the pass can fully resolve the call graph",
    rewrite:
      "fn name(...) reads { …remaining } -> ...  // remove label not propagated by any callee",
    example:
      "// before — getUser calls helper() but helper() does not read userDb\n" +
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = \"Alice\"\n" +
      "fn getUser(id: string) reads { userDb } -> string { helper(id) }  // DEP003\n\n" +
      "// after — remove stale label\n" +
      "?bs 0.9\n" +
      "fn helper(id: string) -> string = \"Alice\"\n" +
      "fn getUser(id: string) -> string { helper(id) }",
  },
  DEP004: {
    code: "DEP004",
    title: "fn declares writes {} label not justified by any tracked callee (warning)",
    rule:
      "a declared writes {} label must be justified by at least one tracked callee declaring the same label; " +
      "DEP004 fires when the pass can resolve all same-file callees and none of them (nor any moduleEffects entry) " +
      "transitively declares writes { x }; the pass does not scan fn bodies for direct resource access — " +
      "it is a call-graph heuristic, not a body scanner; suppressed when the fn has any opaque/untracked external call",
    idiom:
      "remove the stale label from the writes {} clause when no tracked callee propagates it; " +
      "if the label is live through a cross-module call, the opaque-call suppression prevents a false positive; " +
      "leaf fns and fns with opaque external calls are excluded — the warning only fires when the pass can fully resolve the call graph",
    rewrite:
      "fn name(...) writes { …remaining } -> ...  // remove label not propagated by any callee",
    example:
      "// before — logEvent calls save() but save() does not write auditLog\n" +
      "?bs 0.9\n" +
      "fn save(msg: string) -> void { }\n" +
      "fn logEvent(msg: string) writes { auditLog } -> void { save(msg) }  // DEP004\n\n" +
      "// after — remove stale label\n" +
      "?bs 0.9\n" +
      "fn save(msg: string) -> void { }\n" +
      "fn logEvent(msg: string) -> void { save(msg) }",
  },
  THR003: {
    code: "THR003",
    title: "outer fn declares narrower throws than a callback parameter",
    rule:
      "if a function-typed parameter declares `throws { X }`, the containing fn must declare at least those " +
      "exception types — calling the callback can surface X, so the outer fn's throws surface must cover it",
    idiom:
      "a fn's throws surface is the union of its own declared throws and the throws its callback parameters may exercise",
    rewrite:
      "fn name(handler: () throws { X } -> T) throws { …existing, X } -> ...",
    example:
      "// before — accepts a throwing callback but outer fn declares no throws\n" +
      "?bs 0.9\n" +
      "fn process(\n" +
      "  items: string[],\n" +
      "  handler: fn(string) throws { NetworkError } -> void\n" +
      ") -> void {   // THR003: missing throws { NetworkError }\n" +
      "  handler(items[0])\n" +
      "}\n\n" +
      "// after — outer fn declares the throws its callback may exercise\n" +
      "?bs 0.9\n" +
      "fn process(\n" +
      "  items: string[],\n" +
      "  handler: fn(string) throws { NetworkError } -> void\n" +
      ") throws { NetworkError } -> void {\n" +
      "  handler(items[0])\n" +
      "}",
  },
  MAT001: {
    code: "MAT001",
    title: "non-exhaustive match on Result — missing ok or err arm",
    rule:
      "a match expression that explicitly handles the `ok` or `err` tag must also handle the other; " +
      "add the missing arm or a wildcard `_` to make the match exhaustive",
    idiom:
      "prefer explicit `ok` and `err` arms over a wildcard when the error type carries useful context — " +
      "a wildcard silently discards the payload",
    rewrite:
      "add the missing 'ok { v } -> ...' or 'err { e } -> ...' arm, or a '_ -> ...' wildcard",
    example:
      "// before — match on Result is missing the err arm\n" +
      "?bs 0.9\n" +
      "fn fetchUser(id: string) uses { net } -> string {\n" +
      "  match http.get(`/users/${id}`) {\n" +
      "    ok { value } -> value.body  // MAT001: missing err arm\n" +
      "  }\n" +
      "}\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "fn fetchUser(id: string) uses { net } -> Result<string, string> {\n" +
      "  match http.get(`/users/${id}`) {\n" +
      "    ok { value } -> ok(value.body)\n" +
      "    err { e } -> err(e.message)\n" +
      "  }\n" +
      "}",
  },
  MAT002: {
    code: "MAT002",
    title: "non-exhaustive match on Option — missing some or none arm",
    rule:
      "a match expression that explicitly handles the `some` or `none` tag must also handle the other; " +
      "add the missing arm or a wildcard `_` to make the match exhaustive",
    idiom:
      "prefer explicit `some { v }` and `none` arms over a wildcard — a wildcard silently discards the payload " +
      "and hides the fact that the absent case was considered",
    rewrite:
      "add the missing 'some { v } -> ...' or 'none -> ...' arm, or a '_ -> ...' wildcard",
    example:
      "// before — match on Option is missing the none arm\n" +
      "?bs 0.9\n" +
      "fn greet(name: Option<string>) -> string {\n" +
      "  match name {\n" +
      "    some { v } -> `Hello, ${v}`  // MAT002: missing none arm\n" +
      "  }\n" +
      "}\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "fn greet(name: Option<string>) -> string {\n" +
      "  match name {\n" +
      "    some { v } -> `Hello, ${v}`\n" +
      "    none -> \"Hello, stranger\"\n" +
      "  }\n" +
      "}",
  },
  MAT003: {
    code: "MAT003",
    title: "non-exhaustive match on user-defined tagged union — missing variant arm",
    rule:
      "a match expression whose arm tags (all CapCase, no wildcard) unambiguously identify " +
      "a single known user-defined tagged union must cover all of that union's variants; " +
      "add the missing arm(s) or a wildcard `_` to make the match exhaustive",
    idiom:
      "prefer explicit arms for every variant over a wildcard — explicit arms ensure future " +
      "variants added to the union are caught at compile time rather than silently falling through",
    rewrite:
      "add the missing variant arm(s) or a '_ -> ...' wildcard",
    example:
      "// before — match on Status is missing the Failed arm\n" +
      "?bs 0.9\n" +
      "type Status = Loading | Done { value: string } | Failed { code: number }\n\n" +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Loading   -> \"loading...\"\n" +
      "    Done { value } -> value  // MAT003: Failed arm missing\n" +
      "  }\n" +
      "}\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "type Status = Loading | Done { value: string } | Failed { code: number }\n\n" +
      "fn describe(s: Status) -> string {\n" +
      "  match s {\n" +
      "    Loading        -> \"loading...\"\n" +
      "    Done { value } -> value\n" +
      "    Failed { code } -> `error ${code}`\n" +
      "  }\n" +
      "}",
  },
  MAT004: {
    code: "MAT004",
    title: "unreachable wildcard arm — match already covers all variants of the tagged union",
    rule:
      "a match expression that explicitly covers all variants of a known user-defined tagged " +
      "union and also has a wildcard `_ -> ...` arm is over-specified; the wildcard is dead code " +
      "and silently absorbs any new variants added to the union instead of letting MAT003 catch them",
    idiom:
      "remove the wildcard arm from exhaustive tagged-union matches so that adding a new union " +
      "variant immediately triggers a MAT003 error rather than silently falling through the wildcard",
    rewrite:
      "remove the '_ -> ...' wildcard arm",
    example:
      "// before — Color match is exhaustive but has a redundant trailing wildcard\n" +
      "?bs 0.9\n" +
      "type Color = Red { hex: string } | Green | Blue\n\n" +
      "fn colorName(c: Color) -> string {\n" +
      "  match c {\n" +
      "    Red { hex } -> hex\n" +
      "    Green       -> \"green\"\n" +
      "    Blue        -> \"blue\"\n" +
      "    _ -> \"unreachable\"  // MAT004: wildcard is dead code\n" +
      "  }\n" +
      "}\n\n" +
      "// after — remove the wildcard; MAT003 will catch new variants\n" +
      "?bs 0.9\n" +
      "type Color = Red { hex: string } | Green | Blue\n\n" +
      "fn colorName(c: Color) -> string {\n" +
      "  match c {\n" +
      "    Red { hex } -> hex\n" +
      "    Green       -> \"green\"\n" +
      "    Blue        -> \"blue\"\n" +
      "  }\n" +
      "}",
  },
  THR001: {
    code: "THR001",
    title: "fn transitively throws an exception type not declared in its header",
    rule:
      "if fn A calls fn B (directly or transitively) and B declares `throws { X }`, " +
      "then A must also declare `throws { X }` — the throws surface must be complete at every call layer",
    idiom:
      "a fn's throws declaration is the union of its own declared throws plus the throws of everything it calls; " +
      "add the missing exception type to the caller's `throws { }` clause",
    rewrite:
      "fn name(...) throws { …existing, MissingError } -> ...",
    example:
      "// before — loadUser calls fetchRemote which throws { HttpError }, but loadUser doesn't declare it\n" +
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) -> string = fetchRemote(id)  // THR001\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "fn fetchRemote(id: string) throws { HttpError } -> string = id\n" +
      "fn loadUser(id: string) throws { HttpError } -> string = fetchRemote(id)",
  },
  THR002: {
    code: "THR002",
    title: "fn body constructs an error type not present in its throws declaration",
    rule:
      "if a fn body contains `err(TypeName(...))`, `err(new TypeName(...))`, or bare `err(TypeName)` " +
      "where TypeName (CapCase ident) is not in the fn's own `throws { }` set, the fn is producing an " +
      "error callers cannot match — they will never see a TypeName arm",
    idiom:
      "add the constructed error type to the fn's `throws { }` clause so callers can exhaustively match it; " +
      "indirect patterns like `err(e)` (where e's type is inferred) are out of scope — only direct " +
      "constructor calls and bare CapCase references are checked",
    rewrite:
      "fn name(...) throws { …existing, UndeclaredError } -> ...",
    example:
      "// before — parseConfig constructs NetworkError but declares throws { ParseError }\n" +
      "?bs 0.9\n" +
      "fn parseConfig(s: string) throws { ParseError } -> Result<string, string> {\n" +
      "  if (bad) err(NetworkError(\"timed out\"))  // THR002: NetworkError not declared\n" +
      "  else ok(s)\n" +
      "}\n\n" +
      "// after\n" +
      "?bs 0.9\n" +
      "fn parseConfig(s: string) throws { ParseError, NetworkError } -> Result<string, string> {\n" +
      "  if (bad) err(NetworkError(\"timed out\"))\n" +
      "  else ok(s)\n" +
      "}",
  },
  VER001: {
    code: "VER001",
    title: "reads {} / writes {} declared below the ?bs 0.9 enforcement floor — annotation is unenforced",
    rule:
      "DEP001/DEP002 (reads/writes transitivity) are enforced from `?bs 0.9`; a non-empty `reads {}` or " +
      "`writes {}` clause on a file pinned below 0.9 is accepted but not verified — it is documentation only",
    idiom:
      "annotate now if you intend to enforce later, but know that reviewers reading the header " +
      "cannot assume the compiler has checked it; upgrade the pin to `?bs 0.9` to activate enforcement",
    rewrite:
      "upgrade pin to `?bs 0.9` to activate DEP001/DEP002 enforcement",
    example:
      "// before — reads {} at ?bs 0.8 is documentation only (VER001 warning)\n" +
      "?bs 0.8\n" +
      "fn loadUser(id: string) reads { userDb } -> string = id\n\n" +
      "// after — enforcement active\n" +
      "?bs 0.9\n" +
      "fn loadUser(id: string) reads { userDb } -> string = id",
  },
  VER002: {
    code: "VER002",
    title: "throws {} declared below the ?bs 0.9 enforcement floor — annotation is unenforced",
    rule:
      "THR001 (throws transitivity) is enforced from `?bs 0.9`; a non-empty " +
      "`throws {}` clause on a file pinned below 0.9 is accepted but not verified — it is documentation only",
    idiom:
      "annotate now if you intend to enforce later, but know that reviewers reading the header " +
      "cannot assume the compiler has checked it; upgrade the pin to `?bs 0.9` to activate enforcement",
    rewrite:
      "upgrade pin to `?bs 0.9` to activate THR001 enforcement",
    example:
      "// before — throws {} at ?bs 0.8 is documentation only (VER002 warning)\n" +
      "?bs 0.8\n" +
      "fn loadUser(id: string) throws { NetworkError } -> string = id\n\n" +
      "// after — enforcement active\n" +
      "?bs 0.9\n" +
      "fn loadUser(id: string) throws { NetworkError } -> string = id",
  },
  VER003: {
    code: "VER003",
    title: "intent: annotation declared below the ?bs 0.7 enforcement floor — annotation is unenforced",
    rule:
      "INT001–INT005 (intent consistency checks) are enforced from `?bs 0.7`; a non-empty " +
      "`intent: \"...\"` clause on a file pinned below 0.7 is accepted but not verified — it is documentation only",
    idiom:
      "annotate now if you intend to enforce later, but know that reviewers reading the header " +
      "cannot assume the compiler has checked it; upgrade the pin to `?bs 0.7` to activate enforcement",
    rewrite:
      "upgrade pin to `?bs 0.7` to activate INT001–INT005 enforcement",
    example:
      "// before — intent: at ?bs 0.6 is documentation only (VER003 warning)\n" +
      "?bs 0.6\n" +
      "fn now() intent: \"pure\" -> number = pure { time.now() }\n\n" +
      "// after — enforcement active\n" +
      "?bs 0.7\n" +
      "fn now() intent: \"pure\" -> number = pure { time.now() }  // INT002 would fire here",
  },
};

export function getErrorCode(code: string): ErrorCodeEntry | undefined {
  return E[code];
}

export function listErrorCodes(): ErrorCodeEntry[] {
  return Object.values(E).sort((a, b) => a.code.localeCompare(b.code));
}

/** Format an entry as the multi-line text shown by `bs explain`. */
export function formatExplain(entry: ErrorCodeEntry): string {
  return [
    `botscript[${entry.code}]: ${entry.title}`,
    "",
    `  Rule:    ${entry.rule}`,
    `  Idiom:   ${entry.idiom}`,
    `  Rewrite: ${entry.rewrite}`,
    "",
    "Example:",
    indent(entry.example, 2),
  ].join("\n");
}

function indent(s: string, n: number): string {
  const pad = " ".repeat(n);
  return s
    .split("\n")
    .map((l) => (l.length === 0 ? l : pad + l))
    .join("\n");
}
