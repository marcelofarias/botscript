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
      "// before — Color match is exhaustive but has a redundant wildcard\n" +
      "?bs 0.9\n" +
      "type Color = Red | Green | Blue\n\n" +
      "fn colorName(c: Color) -> string {\n" +
      "  match c {\n" +
      "    Red   -> \"red\"\n" +
      "    Green -> \"green\"\n" +
      "    Blue  -> \"blue\"\n" +
      "    _ -> \"unreachable\"  // MAT004: wildcard is dead code\n" +
      "  }\n" +
      "}\n\n" +
      "// after — remove the wildcard; MAT003 will catch new variants\n" +
      "?bs 0.9\n" +
      "type Color = Red | Green | Blue\n\n" +
      "fn colorName(c: Color) -> string {\n" +
      "  match c {\n" +
      "    Red   -> \"red\"\n" +
      "    Green -> \"green\"\n" +
      "    Blue  -> \"blue\"\n" +
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
