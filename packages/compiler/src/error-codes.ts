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
  UNS006: {
    code: "UNS006",
    title: "@ts-ignore / @ts-expect-error bypasses TypeScript type checking",
    rule:
      "TypeScript suppression comments (`@ts-ignore`, `@ts-expect-error`) silence type errors " +
      "on the next line without requiring a written reason or explicit escape-hatch annotation. " +
      "A model that cannot satisfy the type system will reach for them rather than fixing the " +
      "underlying problem, defeating botscript's safety net silently",
    idiom:
      "fix the underlying type error so no suppression is needed; if the type mismatch is " +
      "unavoidable (e.g. third-party SDK returns `any`), wrap the offending statement in " +
      "`unsafe \"<reason>\" { ... }` to make the escape hatch explicit and auditable",
    rewrite:
      "// before — silent suppression\n" +
      "// @ts-ignore\n" +
      "const user = data;\n\n" +
      "// after — explicit escape hatch with written justification\n" +
      "const user = unsafe \"third-party SDK returns any; type verified at runtime\" { data as User };",
    example:
      "// before — UNS006: @ts-ignore silences the type error silently\n" +
      "?bs 0.9\n" +
      "fn getUser(data: unknown) -> User {\n" +
      "  // @ts-ignore\n" +
      "  return data;\n" +
      "}\n\n" +
      "// after — explicit unsafe wrapper with justification\n" +
      "?bs 0.9\n" +
      "fn getUser(data: unknown) -> User {\n" +
      '  unsafe "vendor response shape is User; validated at the ingress boundary" { data as User }\n' +
      "}",
  },
  UNS007: {
    code: "UNS007",
    title: "unsafe block body is a pure literal — escape hatch wraps nothing",
    rule:
      "an `unsafe \"<reason>\" { body }` expression block whose body contains only literal " +
      "tokens (numbers, strings, booleans, null, undefined) and no identifier tokens at all " +
      "has never justified anything: there is no `as` type cast and no stdlib capability call " +
      "for the reason string to cover. Remove the wrapper",
    idiom:
      "a pure-literal body in an unsafe block is always a bug — either the author added the " +
      "wrapper by mistake or the body was refactored into a literal and the wrapper was not " +
      "removed. UNS007 catches this \"born-stale\" population; UNS008 catches the \"decay-stale\" " +
      "population where idents remain but no bypass pattern does",
    rewrite:
      "// remove the unsafe wrapper entirely\n" +
      "// before\n" +
      'unsafe "reason" { 42 }\n' +
      "// after\n" +
      "42",
    example:
      "// before — UNS007: pure literal body; unsafe block justifies nothing\n" +
      "?bs 0.9\n" +
      'const x = unsafe "magic number" { 42 };\n\n' +
      "// after — remove the unnecessary wrapper\n" +
      "?bs 0.9\n" +
      "const x = 42;",
  },
  UNS008: {
    code: "UNS008",
    title: "decay-stale unsafe block — body has no cast, capability call, or bypass pattern",
    rule:
      "an `unsafe \"<reason>\" { ... }` block must be necessary: its body must contain " +
      "a pattern that the botscript checker suite would flag — an `as` type cast (UNS004), " +
      "a stdlib capability call (UNS005), a `throw` statement (SYN002), a `console.*` call (SYN003), " +
      "or any other bypass that requires the escape hatch. " +
      "A block whose body has identifiers but none of the flagged patterns is decay-stale: " +
      "it accumulates justification for a problem that no longer exists in the code",
    idiom:
      "an unsafe block decays when the code around it improves — the stdlib call gets wrapped " +
      "in `match`, the cast moves upstream, the throw becomes a Result return. " +
      "The body keeps its variable references but loses the actual bypass; " +
      "UNS008 catches this population that UNS007 (pure literals) misses",
    rewrite:
      "// remove the unsafe wrapper; the body no longer triggers any botscript diagnostic\n" +
      "// before\n" +
      'unsafe "reason" { variable }\n' +
      "// after\n" +
      "variable",
    example:
      "// before — UNS008: body has idents but no cast or capability call\n" +
      "?bs 0.9\n" +
      'const value = unsafe "data is string" { payload };\n\n' +
      "// after — remove the now-unnecessary unsafe wrapper\n" +
      "?bs 0.9\n" +
      "const value = payload;",
  },
  UNS009: {
    code: "UNS009",
    title: "unsafe reason string is too weak to justify the escape hatch",
    rule:
      "the `unsafe \"<reason>\"` justification string must be informative: it must describe " +
      "why the escape hatch is needed, what it bypasses, and ideally who owns the risk. " +
      "Empty strings, whitespace-only strings, and known-weak single-word deferrals " +
      "(\"TODO\", \"legacy\", \"temp\", \"temporary\", \"workaround\", \"fixme\", \"hack\", \"ignore\", \"wip\") " +
      "do not meet this bar — they record that someone pressed through the gate, not why",
    idiom:
      "write a reason that names the bypass and its owner: " +
      "\"third-party SDK returns `any`; upstream issue #42\" > \"TODO\". " +
      "The reason string is the audit trail — a reviewer who reads it six months later " +
      "should be able to decide whether the bypass is still warranted",
    rewrite:
      "// replace the weak reason with a specific justification\n" +
      "// before\n" +
      "unsafe \"TODO\" { http.get(url) }\n" +
      "// after\n" +
      "unsafe \"http.get returns untyped Response; match below handles ok/err\" { http.get(url) }",
    example:
      "// before — UNS009: reason string is too weak\n" +
      "?bs 0.9\n" +
      "const resp = unsafe \"TODO\" { http.get(url) };\n\n" +
      "// after — specific justification\n" +
      "?bs 0.9\n" +
      "const resp = unsafe \"http.get returns untyped Response; caller match-handles\" { http.get(url) };",
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
  INT006: {
    code: "INT006",
    title: "intent declares 'total' but function declares throws {}",
    rule:
      "a function declaring intent: \"total\" must not declare `throws { ... }` — " +
      "a total function handles all inputs and never propagates exceptions to callers; " +
      "declaring throws {} contradicts that guarantee",
    idiom:
      "use Result<T, E> for fallible total functions — the error is part of the return type, " +
      "not an exception channel; callers can then exhaustively match without worrying about uncaught throws",
    rewrite:
      "// option A — remove throws {} and convert to Result (preferred for total fns):\n" +
      "fn name(args) intent: \"total\" -> Result<T, ErrorType> { ... }\n\n" +
      "// option B — remove the total intent claim (keep throws {}):\n" +
      "fn name(args) throws { ErrorType } -> T { ... }",
    example:
      "// before — fn claims total but declares throws { ParseError }; INT006 fires\n" +
      "?bs 0.9\n" +
      "fn parseHex(s: string) intent: \"total\" throws { ParseError } -> number {\n" +
      "  // ...\n" +
      "}\n\n" +
      "// after — remove throws, return Result so callers can exhaustively match\n" +
      "?bs 0.9\n" +
      "fn parseHex(s: string) intent: \"total\" -> Result<number, ParseError> {\n" +
      "  // ...\n" +
      "}",
  },
  INT007: {
    code: "INT007",
    title: "intent declares 'total' but function body calls a same-file callee that throws",
    rule:
      "a function declaring intent: \"total\" must not call same-file functions that declare " +
      "`throws { ... }` without catching those exceptions — a total function handles all error " +
      "paths and never propagates exceptions to callers; calling a throwing callee without a " +
      "try/catch re-opens the exception channel the total claim is supposed to close",
    idiom:
      "wrap the call in a try/catch and convert the caught exception to a Result variant, " +
      "or replace the call with a non-throwing alternative that returns Result<T, E>; " +
      "the total claim means every error path is encoded in the return type, not the exception channel",
    rewrite:
      "// option A — catch the exception and convert to Result (preferred for total fns):\n" +
      "fn name(args) intent: \"total\" -> Result<T, CalledError> {\n" +
      "  try {\n" +
      "    const v = callee()\n" +
      "    return ok(v)\n" +
      "  } catch (e) {\n" +
      "    return err(new CalledError(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — use a non-throwing variant of the callee:\n" +
      "fn name(args) intent: \"total\" -> Result<T, E> {\n" +
      "  return calleeResult()  // returns Result<T, CalledError> instead of throwing\n" +
      "}\n\n" +
      "// option C — remove the total intent claim:\n" +
      "fn name(args) throws { CalledError } -> T {\n" +
      "  return callee()\n" +
      "}",
    example:
      "// before — fn claims total but calls validate() which throws { ValidationError }; INT007 fires\n" +
      "?bs 0.9\n" +
      "fn validateAndParse(s: string) intent: \"total\" -> Result<number, ParseError> {\n" +
      "  validate(s)  // throws { ValidationError } — INT007\n" +
      "  return parseNum(s)\n" +
      "}\n\n" +
      "// after — catch the exception, encode in Result\n" +
      "?bs 0.9\n" +
      "fn validateAndParse(s: string) intent: \"total\" -> Result<number, ParseError | ValidationError> {\n" +
      "  try {\n" +
      "    validate(s)\n" +
      "    return parseNum(s)\n" +
      "  } catch (e) {\n" +
      "    return err(new ValidationError(String(e)))\n" +
      "  }\n" +
      "}",
  },
  INT008: {
    code: "INT008",
    title: "intent declares 'infallible' but return type exposes a failure path",
    rule:
      "a function declaring intent: \"infallible\" must not return Result<T, E> or Option<T> — " +
      "those types carry a failure arm (err / none) that callers must handle, contradicting the " +
      "infallible guarantee; an infallible fn always produces a plain success value",
    idiom:
      "use a plain return type (e.g. string, number, T) instead of Result<> or Option<>; " +
      "if the fn can genuinely fail, use intent: \"total\" with a Result<T, E> return instead — " +
      "total handles all inputs and returns success-or-failure in the type, which is weaker than infallible",
    rewrite:
      "// option A — unwrap to a plain type (fn truly never fails):\n" +
      "fn name(args) intent: \"infallible\" -> T { ... }\n\n" +
      "// option B — downgrade to total (fn may fail but always returns):\n" +
      "fn name(args) intent: \"total\" -> Result<T, E> { ... }",
    example:
      "// before — fn claims infallible but return type is Result<string, ParseError>; INT008 fires\n" +
      "?bs 0.9\n" +
      "fn defaultName(raw: string) intent: \"infallible\" -> Result<string, ParseError> {\n" +
      "  return ok(raw.trim() || \"unnamed\")  // INT008\n" +
      "}\n\n" +
      "// after option A — plain return type matches the infallible claim\n" +
      "?bs 0.9\n" +
      "fn defaultName(raw: string) intent: \"infallible\" -> string {\n" +
      "  return raw.trim() || \"unnamed\"\n" +
      "}\n\n" +
      "// after option B — downgrade to total if failure path is real\n" +
      "?bs 0.9\n" +
      "fn defaultName(raw: string) intent: \"total\" -> Result<string, ParseError> {\n" +
      "  return ok(raw.trim() || \"unnamed\")\n" +
      "}",
  },
  INT009: {
    code: "INT009",
    title: "intent declares 'infallible' but function declares throws {}",
    rule:
      "a function declaring intent: \"infallible\" must not declare `throws { ... }` — " +
      "throwing an exception is a failure that escapes the fn's boundary, contradicting the " +
      "infallible guarantee; an infallible fn never propagates an exception to its caller",
    idiom:
      "remove the throws {} clause and encode failure in the return type using Result<T, E>, " +
      "then downgrade the intent claim to \"total\" (always returns, may return err); " +
      "if the fn truly never fails, remove throws {} and keep intent: \"infallible\"",
    rewrite:
      "// option A — remove throws {} and return Result (downgrade to total):\n" +
      "fn name(args) intent: \"total\" -> Result<type, ErrType> { ... }\n\n" +
      "// option B — remove throws {} if the fn truly never propagates exceptions:\n" +
      "fn name(args) intent: \"infallible\" -> type { ... }",
    example:
      "// before — fn claims infallible but declares throws { ParseError }; INT009 fires\n" +
      "?bs 0.9\n" +
      "fn parse(s: string) intent: \"infallible\" throws { ParseError } -> number {\n" +
      "  return Number(s)  // INT009\n" +
      "}\n\n" +
      "// after option A — downgrade to total + Result\n" +
      "?bs 0.9\n" +
      "fn parse(s: string) intent: \"total\" -> Result<number, ParseError> {\n" +
      "  const n = Number(s)\n" +
      "  return isNaN(n) ? err(new ParseError(s)) : ok(n)\n" +
      "}\n\n" +
      "// after option B — remove throws {} if the fn won't throw\n" +
      "?bs 0.9\n" +
      "fn parse(s: string) intent: \"infallible\" -> number {\n" +
      "  return Number(s) || 0\n" +
      "}",
  },
  INT010: {
    code: "INT010",
    title: "intent declares 'infallible' but function body calls a same-file callee that throws",
    rule:
      "a function declaring intent: \"infallible\" must not call same-file functions that declare " +
      "`throws { ... }` without catching those exceptions — a throwing callee can propagate an " +
      "exception through the infallible fn's body, reopening a failure channel that the infallible " +
      "claim is supposed to close",
    idiom:
      "wrap the throwing call in a try/catch and either suppress the exception (returning a default " +
      "value) or encode it in a Result and downgrade the intent claim to \"total\"; " +
      "alternatively, replace the call with a non-throwing variant",
    rewrite:
      "// option A — suppress the exception with a safe default (keeps infallible):\n" +
      "fn name(args) intent: \"infallible\" -> T {\n" +
      "  try {\n" +
      "    return callee()\n" +
      "  } catch {\n" +
      "    return defaultValue\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — encode in Result and downgrade to total:\n" +
      "fn name(args) intent: \"total\" -> Result<T, CalledError> {\n" +
      "  try {\n" +
      "    return ok(callee())\n" +
      "  } catch (e) {\n" +
      "    return err(new CalledError(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option C — use a non-throwing variant of the callee:\n" +
      "fn name(args) intent: \"infallible\" -> T {\n" +
      "  return calleeSafe()  // returns T instead of throwing\n" +
      "}",
    example:
      "// before — fn claims infallible but calls validate() which throws { ValidationError }; INT010 fires\n" +
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      "fn process(s: string) intent: \"infallible\" -> string {\n" +
      "  return validate(s)  // INT010 — validate may throw\n" +
      "}\n\n" +
      "// after option A — catch and suppress, keep infallible guarantee\n" +
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> string = s\n" +
      "fn process(s: string) intent: \"infallible\" -> string {\n" +
      "  try {\n" +
      "    return validate(s)\n" +
      "  } catch {\n" +
      "    return \"\"\n" +
      "  }\n" +
      "}",
  },
  INT011: {
    code: "INT011",
    title: "intent declares 'pure' but function is async",
    rule:
      "a function declaring intent: \"pure\" must not be async — an async function always " +
      "returns a Promise (two calls with identical arguments return distinct, non-equal objects) " +
      "and suspends execution by yielding to the event loop, producing timing side effects; " +
      "both properties contradict the pure guarantee of determinism and referential transparency",
    idiom:
      "remove the `async` keyword and any `await` expressions from the body, or downgrade " +
      "the intent claim; if the function wraps a synchronous computation in a Promise purely " +
      "as a calling convention, use `Promise.resolve(value)` from a sync body instead of `async`",
    rewrite:
      "// option A — make the function synchronous (preferred for pure fns):\n" +
      "fn name(args) intent: \"pure\" -> T {\n" +
      "  return compute(args)  // sync, no await\n" +
      "}\n\n" +
      "// option B — remove the pure claim and keep async:\n" +
      "async fn name(args) -> Promise<T> {\n" +
      "  return await compute(args)\n" +
      "}\n\n" +
      "// option C — if you must return a Promise from a sync computation:\n" +
      "fn name(args) intent: \"pure\" -> Promise<T> {\n" +
      "  return Promise.resolve(compute(args))  // sync body, no timing side effects\n" +
      "}",
    example:
      "// before — fn claims pure but is declared async; INT011 fires\n" +
      "?bs 0.9\n" +
      "async fn slugify(s: string) intent: \"pure\" -> Promise<string> {\n" +
      "  return s.toLowerCase().replace(/ /g, \"-\")\n" +
      "}\n\n" +
      "// after option A — synchronous, genuinely pure\n" +
      "?bs 0.9\n" +
      "fn slugify(s: string) intent: \"pure\" -> string {\n" +
      "  return s.toLowerCase().replace(/ /g, \"-\")\n" +
      "}",
  },
  INT012: {
    code: "INT012",
    title: "intent declares 'pure' but body calls a same-file fn that declares uses {}",
    rule:
      "a function declaring intent: \"pure\" must not call other functions that carry capability " +
      "declarations (`uses { ... }`) — those callees consume external resources, so the caller " +
      "inherits their side effects even without declaring them directly; the pure claim requires " +
      "that the entire transitive call closure is free of external resource use",
    idiom:
      "either remove the call to the capability-bearing callee and replace it with a pure " +
      "computation, pass the callee's return value in as a parameter (dependency injection), " +
      "or remove the pure intent claim from this function",
    rewrite:
      "// option A — inject the computed value as a parameter (preferred):\n" +
      "fn name(args, precomputedValue: T) intent: \"pure\" -> R {\n" +
      "  return compute(args, precomputedValue)  // no longer calls callee with uses {}\n" +
      "}\n\n" +
      "// option B — remove the pure intent claim:\n" +
      "fn name(args) uses { cap } -> R {\n" +
      "  const v = callee(args)  // callee declares uses { cap }\n" +
      "  return compute(v)\n" +
      "}\n\n" +
      "// option C — remove the call and compute inline without capabilities:\n" +
      "fn name(args) intent: \"pure\" -> R {\n" +
      "  return compute(args)  // pure body, no callee with uses {}\n" +
      "}",
    example:
      "// before — fn claims pure but calls getTimestamp() which uses { time }; INT012 fires\n" +
      "?bs 0.9\n" +
      "fn getTimestamp() uses { time } -> number = time.now()\n\n" +
      "fn buildKey(id: string) intent: \"pure\" -> string {\n" +
      "  const ts = getTimestamp()  // INT012: callee declares uses { time }\n" +
      "  return id + \":\" + ts\n" +
      "}\n\n" +
      "// after option A — inject the timestamp as a parameter\n" +
      "?bs 0.9\n" +
      "fn buildKey(id: string, ts: number) intent: \"pure\" -> string {\n" +
      "  return id + \":\" + ts  // pure: no callee with uses {}\n" +
      "}",
  },
  INT013: {
    code: "INT013",
    title: "intent declares 'idempotent' but body calls a same-file fn that declares uses { random } or uses { time }",
    rule:
      "a function declaring intent: \"idempotent\" must not call other functions that carry " +
      "`random` or `time` capability declarations — those callees produce different values on " +
      "each call, so the outer fn inherits non-idempotent behaviour by transitivity even when " +
      "it declares no non-idempotent capabilities itself",
    idiom:
      "call the non-idempotent callee before the idempotent fn and pass its return value in as " +
      "a parameter (dependency injection), or remove the idempotent intent claim",
    rewrite:
      "// option A — inject the computed value as a parameter (preferred):\n" +
      "fn name(args, precomputed: T) intent: \"idempotent\" -> R {\n" +
      "  return compute(args, precomputed)  // no longer calls non-idempotent callee\n" +
      "}\n\n" +
      "// option B — remove the idempotent intent claim:\n" +
      "fn name(args) uses { random } -> R {\n" +
      "  const v = callee(args)  // callee declares uses { random }\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims idempotent but calls timestamp() which uses { time }; INT013 fires\n" +
      "?bs 0.9\n" +
      "fn timestamp() uses { time } -> number = time.now()\n\n" +
      "fn tag(id: string) intent: \"idempotent\" -> string {\n" +
      "  return id + \"-\" + timestamp()  // INT013: callee declares uses { time }\n" +
      "}\n\n" +
      "// after option A — inject the timestamp as a parameter\n" +
      "?bs 0.9\n" +
      "fn tag(id: string, ts: number) intent: \"idempotent\" -> string {\n" +
      "  return id + \"-\" + ts  // idempotent: same inputs → same output\n" +
      "}",
  },
  INT015: {
    code: "INT015",
    title: "intent declares 'idempotent' but body calls a same-file fn that declares writes { }",
    rule:
      "a function declaring intent: \"idempotent\" must not call other functions that carry " +
      "`writes { ... }` declarations — a callee that mutates a resource makes the caller " +
      "non-idempotent by transitivity (repeated calls produce different side effects) even " +
      "when the caller itself declares no writes {} and INT005 does not fire",
    idiom:
      "refactor so the write happens outside the idempotent boundary, or remove the idempotent " +
      "intent claim and declare writes {} on the outer fn to surface the effect to callers",
    rewrite:
      "// option A — move the write outside the idempotent fn boundary:\n" +
      "fn persist(data: Data) writes { db } -> void = db.save(data)\n\n" +
      "fn computeAndStore(input: Input) writes { db } -> void {\n" +
      "  const result = transform(input)  // idempotent: no writes, no callee writes\n" +
      "  persist(result)                  // write happens outside the idempotent scope\n" +
      "}\n\n" +
      "// option B — remove the idempotent intent claim and declare writes on outer fn:\n" +
      "fn name(args) writes { db } -> R {\n" +
      "  return callee(args)  // callee declares writes { db }\n" +
      "}",
    example:
      "// before — fn claims idempotent but calls persist() which writes { db }; INT015 fires\n" +
      "?bs 0.9\n" +
      "fn persist(data: string) writes { db } -> void = db.save(data)\n\n" +
      "fn process(raw: string) intent: \"idempotent\" -> void {\n" +
      "  persist(raw)  // INT015: callee declares writes { db }\n" +
      "}\n\n" +
      "// after option A — move write out of idempotent boundary\n" +
      "?bs 0.9\n" +
      "fn transform(raw: string) intent: \"idempotent\" -> string = raw.trim()\n\n" +
      "fn process(raw: string) writes { db } -> void {\n" +
      "  persist(transform(raw))  // transform is idempotent; persist is outside\n" +
      "}",
  },
  INT016: {
    code: "INT016",
    title: "intent declares 'pure' but body calls a same-file fn that declares reads { } or writes { }",
    rule:
      "a function declaring intent: \"pure\" must not call other functions that carry " +
      "`reads { ... }` or `writes { ... }` declarations — a callee that reads external " +
      "state makes the caller's output depend on that state (non-deterministic); a callee " +
      "that writes external state introduces a side effect; both contradict the pure " +
      "guarantee of referential transparency and determinism, even when the caller itself " +
      "declares no reads {} or writes {} and INT001 does not fire",
    idiom:
      "inject the external value as a parameter so the pure fn receives it as a pure input, " +
      "or remove the pure intent claim and declare the appropriate reads {} / writes {} on " +
      "the outer fn to surface the effect to callers",
    rewrite:
      "// option A — inject the external value as a parameter (preferred):\n" +
      "fn load(id: string) reads { db } -> Record = db.find(id)\n\n" +
      "fn process(record: Record) intent: \"pure\" -> Summary {\n" +
      "  return summarize(record)  // pure: record is a parameter, not a live read\n" +
      "}\n\n" +
      "// call site: process(load(id))  — load() is separate, effect is explicit\n\n" +
      "// option B — remove the pure claim and surface the reads:\n" +
      "fn process(id: string) reads { db } -> Summary {\n" +
      "  const record = load(id)  // callee declares reads { db }\n" +
      "  return summarize(record)\n" +
      "}",
    example:
      "// before — fn claims pure but calls load() which reads { db }; INT016 fires\n" +
      "?bs 0.9\n" +
      "fn load(id: string) reads { db } -> Record = db.find(id)\n\n" +
      "fn process(id: string) intent: \"pure\" -> Summary {\n" +
      "  const record = load(id)  // INT016: callee declares reads { db }\n" +
      "  return summarize(record)\n" +
      "}\n\n" +
      "// after option A — inject value as parameter, keep pure intent\n" +
      "?bs 0.9\n" +
      "fn load(id: string) reads { db } -> Record = db.find(id)\n\n" +
      "fn process(record: Record) intent: \"pure\" -> Summary = summarize(record)\n\n" +
      "// call site:\n" +
      "const summary = process(load(id))  // load at boundary; process remains pure",
  },
  INT017: {
    code: "INT017",
    title: "intent declares 'pure' but body calls a same-file fn declared async",
    rule:
      "a function declaring intent: \"pure\" must not call other functions that are declared " +
      "`async` — an async callee yields to the event loop on every invocation (a timing side " +
      "effect) and always returns a distinct Promise object, so two calls with identical arguments " +
      "produce non-equal return values; both properties contradict the pure guarantee of " +
      "determinism and referential transparency, even when the caller itself is synchronous " +
      "and INT011 does not fire",
    idiom:
      "make the callee synchronous so the caller can remain pure, or extract the async call " +
      "to the call site and inject the resolved value as a parameter, or remove the pure intent " +
      "claim from the outer fn",
    rewrite:
      "// option A — make the callee synchronous (preferred when possible):\n" +
      "fn helper(...) -> T = compute(...)  // no async, no Promise\n\n" +
      "fn outer(...) intent: \"pure\" -> T = helper(...)\n\n" +
      "// option B — inject the resolved value as a parameter:\n" +
      "async fn fetchHelper(...) -> Promise<T> = await fetch(...)\n\n" +
      "fn outer(precomputed: T) intent: \"pure\" -> R {\n" +
      "  // use precomputed instead of calling fetchHelper\n" +
      "}\n\n" +
      "// call site: outer(await fetchHelper(...))\n\n" +
      "// option C — remove the pure claim and keep the async callee:\n" +
      "fn outer(...) -> R {\n" +
      "  const v = fetchHelper(...)\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims pure but calls async helper(); INT017 fires\n" +
      "?bs 0.9\n" +
      "async fn helper(x: number) -> Promise<number> = x * 2\n\n" +
      "fn double(x: number) intent: \"pure\" -> Promise<number> {\n" +
      "  return helper(x)  // INT017: callee is async\n" +
      "}\n\n" +
      "// after option A — make helper synchronous, keep pure intent\n" +
      "?bs 0.9\n" +
      "fn helper(x: number) -> number = x * 2\n\n" +
      "fn double(x: number) intent: \"pure\" -> number = helper(x)",
  },
  INT014: {
    code: "INT014",
    title: "intent string contains a redundant claim that is already implied by a stronger claim",
    rule:
      "the botscript intent system has a subsumption hierarchy: 'pure' implies 'idempotent' " +
      "(pure bans all uses, which is strictly stronger than idempotent's ban on random and time), " +
      "and 'infallible' implies 'total' (infallible is total plus a no-Result-return constraint). " +
      "declaring both a stronger and a weaker claim in the same intent string is redundant — the " +
      "weaker claim adds no enforcement beyond what the stronger one already provides",
    idiom: "remove the weaker claim from the intent string and keep only the strongest claim",
    rewrite:
      "// before — redundant: 'pure' already implies 'idempotent'\n" +
      "fn name(...) intent: \"pure idempotent\" -> T = ...\n\n" +
      "// after — keep only the stronger claim\n" +
      "fn name(...) intent: \"pure\" -> T = ...\n\n" +
      "// before — redundant: 'infallible' already implies 'total'\n" +
      "fn parse(...) intent: \"infallible total\" -> T = ...\n\n" +
      "// after — keep only the stronger claim\n" +
      "fn parse(...) intent: \"infallible\" -> T = ...",
    example:
      "// before — both 'pure' and 'idempotent' declared; INT014 fires on 'idempotent'\n" +
      "?bs 0.9\n" +
      "fn add(a: number, b: number) intent: \"pure idempotent\" -> number = a + b\n\n" +
      "// after — 'pure' alone is sufficient (subsumes idempotent)\n" +
      "?bs 0.9\n" +
      "fn add(a: number, b: number) intent: \"pure\" -> number = a + b",
  },
  INT018: {
    code: "INT018",
    title: "intent declares 'pure' but body calls a same-file fn that declares throws {}",
    rule:
      "a function declaring intent: \"pure\" must not call other functions that propagate exceptions — " +
      "throwing an exception is a side effect (it alters control flow outside the fn boundary), and a " +
      "pure fn may never produce side effects; even when the outer fn itself does not declare throws {}, " +
      "calling a same-file callee that does reopens the exception channel by transitivity, violating the " +
      "pure guarantee; this check fires only when INT001 and INT002 do not (no direct header or body conflict)",
    idiom:
      "wrap the throwing callee in a try/catch that converts the exception to a Result<T, E> return value, " +
      "then return the Result from the pure fn; or use a non-throwing variant of the callee; " +
      "or remove the pure intent claim if the fn's purpose requires exception propagation",
    rewrite:
      "// option A — catch the exception and return Result (preferred for pure fns):\n" +
      "fn outer(...) intent: \"pure\" -> Result<T, EType> {\n" +
      "  try {\n" +
      "    return ok(callee(...))\n" +
      "  } catch (e) {\n" +
      "    return err(new EType(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — use a non-throwing variant (if one exists):\n" +
      "fn outer(...) intent: \"pure\" -> Result<T, EType> = calleeSafe(...)\n\n" +
      "// option C — remove the pure claim if exception propagation is intentional:\n" +
      "fn outer(...) throws { EType } -> T = callee(...)",
    example:
      "// before — fn claims pure but calls validate() which declares throws { ValidationError }; INT018 fires\n" +
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { ... }\n\n" +
      "fn process(s: string) intent: \"pure\" -> string {\n" +
      "  validate(s)  // INT018: callee declares throws { ValidationError }\n" +
      "  return s.trim()\n" +
      "}\n\n" +
      "// after option A — catch and return Result\n" +
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { ... }\n\n" +
      "fn process(s: string) intent: \"pure\" -> Result<string, ValidationError> {\n" +
      "  try {\n" +
      "    validate(s)\n" +
      "    return ok(s.trim())\n" +
      "  } catch (e) {\n" +
      "    return err(new ValidationError(e))\n" +
      "  }\n" +
      "}",
  },
  INT019: {
    code: "INT019",
    title: "intent declares 'idempotent' but body calls a same-file fn that is declared async",
    rule:
      "a function declaring intent: \"idempotent\" must not call other functions that are declared async — " +
      "an async callee schedules microtasks on every invocation (a timing side effect) and always returns a " +
      "distinct Promise object, so two calls with the same arguments produce different Promise instances " +
      "and different event-loop schedules; repeating the outer call cannot guarantee the same observable " +
      "outcome as a single call, violating the idempotent contract; " +
      "this check fires only when INT003, INT004, INT005, INT013, and INT015 do not",
    idiom:
      "make the async callee synchronous if possible, or inject its resolved value as a parameter; " +
      "if the async call is essential, remove the idempotent intent claim and explicitly model the " +
      "retry/dedup logic at the call site instead of relying on the intent annotation",
    rewrite:
      "// option A — make the callee synchronous (preferred):\n" +
      "fn callee(...) -> T = compute(...)\n\n" +
      "fn outer(...) intent: \"idempotent\" -> R = callee(...)\n\n" +
      "// option B — inject the resolved value as a parameter:\n" +
      "fn outer(precomputed: T) intent: \"idempotent\" -> R {\n" +
      "  // use precomputed instead of calling the async callee\n" +
      "}\n\n" +
      "// call site: outer(await asyncCallee(...))\n\n" +
      "// option C — remove the idempotent claim:\n" +
      "fn outer(...) -> R {\n" +
      "  const v = asyncCallee(...)\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims idempotent but calls fetchConfig() which is async; INT019 fires\n" +
      "?bs 0.9\n" +
      "async fn fetchConfig(key: string) uses { net } -> Promise<string> { ... }\n\n" +
      "fn getConfigValue(key: string) intent: \"idempotent\" -> Promise<string> {\n" +
      "  return fetchConfig(key)  // INT019: async callee introduces timing side effects\n" +
      "}\n\n" +
      "// after option A — make callee synchronous (use a sync cache lookup instead)\n" +
      "?bs 0.9\n" +
      "fn readCache(key: string) reads { config } -> string { ... }\n\n" +
      "fn getConfigValue(key: string) intent: \"idempotent\" reads { config } -> string {\n" +
      "  return readCache(key)\n" +
      "}",
  },
  INT020: {
    code: "INT020",
    title: "intent declares 'total' but body calls a same-file fn that is declared async",
    rule:
      "a synchronous function declaring intent: \"total\" must not call other functions that are declared async — " +
      "an async callee always returns a Promise that can reject; if the sync total fn forwards that Promise to its " +
      "caller without catching, any rejection becomes an unhandled Promise rejection that escapes the fn boundary, " +
      "directly contradicting the total guarantee that no exception propagates to callers; " +
      "this check fires only when the total fn itself is synchronous and INT006/INT007 do not",
    idiom:
      "a total fn's exception boundary is only as strong as its callees' exception surfaces; " +
      "an async callee carries a hidden rejection path that a sync caller cannot observe or catch at the JS level; " +
      "prefer synchronous callees, or wrap the async call with a Promise catch and convert to Result",
    rewrite:
      "// option A — use a synchronous callee (preferred):\n" +
      "fn callee(...) -> T = compute(...)\n\n" +
      "fn outer(...) intent: \"total\" -> T = callee(...)\n\n" +
      "// option B — remove the total intent claim and propagate the async boundary:\n" +
      "async fn outer(...) -> Promise<T> = asyncCallee(...)",
    example:
      "// before — fn claims total but calls processAsync() which is async; INT020 fires\n" +
      "?bs 0.9\n" +
      "async fn processAsync(s: string) uses { net } -> Promise<string> { ... }\n\n" +
      "fn handle(s: string) intent: \"total\" -> Promise<string> {\n" +
      "  return processAsync(s)  // INT020: async callee can reject, escaping the total guarantee\n" +
      "}\n\n" +
      "// after option A — use a synchronous callee\n" +
      "?bs 0.9\n" +
      "fn process(s: string) -> string { ... }\n\n" +
      "fn handle(s: string) intent: \"total\" -> string = process(s)",
  },
  INT021: {
    code: "INT021",
    title: "intent declares 'infallible' but body calls a same-file fn that is declared async",
    rule:
      "a synchronous function declaring intent: \"infallible\" must not call other functions that are declared async — " +
      "an async callee always returns a Promise that can reject; if the sync infallible fn forwards that Promise to its " +
      "caller without catching, any rejection becomes an unhandled Promise rejection that escapes the fn boundary, " +
      "directly contradicting the infallible guarantee that the fn never fails; " +
      "this check fires only when the infallible fn itself is synchronous and INT008/INT009/INT010 do not",
    idiom:
      "an infallible fn's no-failure guarantee is only as strong as its callees' exception surfaces; " +
      "an async callee carries a hidden rejection path that a sync caller cannot observe or catch at the JS level; " +
      "prefer synchronous callees for infallible fns",
    rewrite:
      "// option A — use a synchronous callee (preferred):\n" +
      "fn callee(...) -> T = compute(...)\n\n" +
      "fn outer(...) intent: \"infallible\" -> T = callee(...)\n\n" +
      "// option B — downgrade intent claim:\n" +
      "fn outer(...) intent: \"total\" -> Promise<T> = asyncCallee(...)",
    example:
      "// before — fn claims infallible but calls computeAsync() which is async; INT021 fires\n" +
      "?bs 0.9\n" +
      "async fn computeAsync(n: number) -> Promise<number> = Promise.resolve(n * 2)\n\n" +
      "fn double(n: number) intent: \"infallible\" -> Promise<number> {\n" +
      "  return computeAsync(n)  // INT021: async callee can reject, violating the infallible guarantee\n" +
      "}\n\n" +
      "// after option A — use a synchronous callee\n" +
      "?bs 0.9\n" +
      "fn computeSync(n: number) -> number = n * 2\n\n" +
      "fn double(n: number) intent: \"infallible\" -> number = computeSync(n)",
  },
  INT022: {
    code: "INT022",
    title: "intent declares 'idempotent' but the function declares throws {}",
    rule:
      "a function declaring intent: \"idempotent\" must not declare throws {} — " +
      "an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same " +
      "observable outcome; declaring throws {} means the function can propagate exceptions, and whether it " +
      "throws or returns depends on external state that may vary across calls; if the Nth retry throws " +
      "while the first call succeeded, the observable outcome differs — the idempotent contract is broken; " +
      "encode failure in the return type as Result<T, E> (the fn always returns a value, making retry " +
      "outcomes structurally identical), or remove the idempotent intent claim",
    idiom:
      "idempotent fns must have a deterministic, exception-free return path; encode all failure cases " +
      "in Result<T, E> so that every call — including retries — returns the same shape of value; " +
      "the retry-safe boundary is the fn itself: it must always return, never throw",
    rewrite:
      "// option A — encode failure as Result (preferred for idempotent fns):\n" +
      "fn name(...) intent: \"idempotent\" -> Result<T, EType> {\n" +
      "  try {\n" +
      "    return ok(compute(...))\n" +
      "  } catch (e) {\n" +
      "    return err(new EType(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — remove the idempotent claim (keep throws {}):\n" +
      "fn name(...) throws { EType } -> T { ... }",
    example:
      "// before — fn claims idempotent but declares throws { NetworkError }; INT022 fires\n" +
      "?bs 0.9\n" +
      "fn fetchUser(id: string) intent: \"idempotent\" throws { NetworkError } -> User {\n" +
      "  return http.get(`/users/${id}`)  // INT022: throws {} contradicts idempotent guarantee\n" +
      "}\n\n" +
      "// after option A — encode failure as Result\n" +
      "?bs 0.9\n" +
      "fn fetchUser(id: string) intent: \"idempotent\" -> Result<User, NetworkError> {\n" +
      "  try {\n" +
      "    return ok(http.get(`/users/${id}`))\n" +
      "  } catch (e) {\n" +
      "    return err(new NetworkError(e))\n" +
      "  }\n" +
      "}",
  },
  INT023: {
    code: "INT023",
    title: "intent declares 'idempotent' but body calls a same-file fn that declares throws {}",
    rule:
      "a function declaring intent: \"idempotent\" must not call other functions that can propagate exceptions — " +
      "an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same " +
      "observable outcome; a callee that declares throws {} can fail on some calls and succeed on others " +
      "depending on external state (network availability, resource contention, transient errors); " +
      "if the callee throws on the Nth retry, the outer fn's observable outcome differs from the first call, " +
      "violating the idempotent contract by transitivity; " +
      "this check fires only when INT022 does not (no throws {} on the outer fn's own header)",
    idiom:
      "wrap the throwing callee in a try/catch that converts the exception to a Result<T, E> return value; " +
      "this makes the outer fn's return type structurally identical across retries — err() on failure, ok() on " +
      "success — preserving the idempotent contract; or use a non-throwing variant of the callee",
    rewrite:
      "// option A — catch the exception and return Result (preferred for idempotent fns):\n" +
      "fn outer(...) intent: \"idempotent\" -> Result<T, EType> {\n" +
      "  try {\n" +
      "    return ok(callee(...))\n" +
      "  } catch (e) {\n" +
      "    return err(new EType(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — use a non-throwing variant (if one exists):\n" +
      "fn outer(...) intent: \"idempotent\" -> Result<T, EType> = calleeSafe(...)\n\n" +
      "// option C — remove the idempotent claim if exception propagation is intentional:\n" +
      "fn outer(...) throws { EType } -> T = callee(...)",
    example:
      "// before — fn claims idempotent but calls validate() which declares throws { ValidationError }; INT023 fires\n" +
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { ... }\n\n" +
      "fn process(s: string) intent: \"idempotent\" -> string {\n" +
      "  validate(s)  // INT023: callee declares throws { ValidationError }\n" +
      "  return s.trim()\n" +
      "}\n\n" +
      "// after option A — catch and return Result\n" +
      "?bs 0.9\n" +
      "fn validate(s: string) throws { ValidationError } -> void { ... }\n\n" +
      "fn process(s: string) intent: \"idempotent\" -> Result<string, ValidationError> {\n" +
      "  try {\n" +
      "    validate(s)\n" +
      "    return ok(s.trim())\n" +
      "  } catch (e) {\n" +
      "    return err(new ValidationError(e))\n" +
      "  }\n" +
      "}",
  },
  INT024: {
    code: "INT024",
    title: "intent declares 'pure' but body calls an imported fn that declares throws {}",
    rule:
      "a function declaring intent: \"pure\" must not call imported functions that can propagate exceptions — " +
      "throwing an exception is a side effect that escapes the fn boundary; a pure fn may never produce side " +
      "effects, so calling an imported callee that declares throws {} makes the outer fn non-pure by " +
      "transitivity even when the outer fn itself does not declare throws {} and INT001/INT018 do not fire; " +
      "this check extends INT018 to cross-file callees visible via moduleEffects; " +
      "this check fires only when INT001 and INT002 do not",
    idiom:
      "wrap the throwing import in a try/catch that converts the exception to a Result<T, E> return value; " +
      "Result encodes failure in the return type instead of the exception channel, preserving the pure " +
      "contract; or use a non-throwing variant of the imported callee",
    rewrite:
      "// option A — catch the exception and return Result (preferred):\n" +
      "fn name(...) intent: \"pure\" -> Result<T, EType> {\n" +
      "  try {\n" +
      "    return ok(importedFn(...))\n" +
      "  } catch (e) {\n" +
      "    return err(new EType(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — remove the pure claim:\n" +
      "fn name(...) throws { EType } -> T {\n" +
      "  return importedFn(...)\n" +
      "}",
    example:
      "// before — fn claims pure but calls imported parse() which declares throws { ParseError }; INT024 fires\n" +
      "?bs 0.9\n" +
      "import { parse } from \"./parser\"  // parse declares throws { ParseError }\n\n" +
      "fn normalize(s: string) intent: \"pure\" -> string {\n" +
      "  return parse(s).value  // INT024: imported callee declares throws { ParseError }\n" +
      "}\n\n" +
      "// after option A — catch and return Result\n" +
      "?bs 0.9\n" +
      "fn normalize(s: string) intent: \"pure\" -> Result<string, ParseError> {\n" +
      "  try {\n" +
      "    return ok(parse(s).value)\n" +
      "  } catch (e) {\n" +
      "    return err(new ParseError(e))\n" +
      "  }\n" +
      "}",
  },
  INT025: {
    code: "INT025",
    title: "intent declares 'total' but body calls an imported fn that declares throws {}",
    rule:
      "a function declaring intent: \"total\" must not call imported functions that can propagate exceptions — " +
      "a total function handles all inputs and never propagates exceptions to callers; calling an imported " +
      "callee that declares throws {} re-opens the exception channel by transitivity, even when the outer fn " +
      "itself does not declare throws {} and INT006/INT007 do not fire; " +
      "this check extends INT007 to cross-file callees visible via moduleEffects",
    idiom:
      "wrap the throwing import in a try/catch and return Result<T, E>; this makes the outer fn total — " +
      "it always returns a value; or use a non-throwing variant of the imported callee",
    rewrite:
      "// option A — catch the exception and return Result (preferred):\n" +
      "fn name(...) intent: \"total\" -> Result<T, EType> {\n" +
      "  try {\n" +
      "    return ok(importedFn(...))\n" +
      "  } catch (e) {\n" +
      "    return err(new EType(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — remove the total claim:\n" +
      "fn name(...) throws { EType } -> T {\n" +
      "  return importedFn(...)\n" +
      "}",
    example:
      "// before — fn claims total but calls imported validate() which declares throws { ValidationError }; INT025 fires\n" +
      "?bs 0.9\n" +
      "import { validate } from \"./validation\"  // validate declares throws { ValidationError }\n\n" +
      "fn safeCheck(s: string) intent: \"total\" -> boolean {\n" +
      "  return validate(s)  // INT025: imported callee declares throws { ValidationError }\n" +
      "}\n\n" +
      "// after option A — catch and return Result\n" +
      "?bs 0.9\n" +
      "fn safeCheck(s: string) intent: \"total\" -> Result<boolean, ValidationError> {\n" +
      "  try {\n" +
      "    return ok(validate(s))\n" +
      "  } catch (e) {\n" +
      "    return err(new ValidationError(e))\n" +
      "  }\n" +
      "}",
  },
  INT026: {
    code: "INT026",
    title: "intent declares 'infallible' but body calls an imported fn that declares throws {}",
    rule:
      "a function declaring intent: \"infallible\" must not call imported functions that can propagate exceptions — " +
      "an infallible fn always succeeds: it never throws and never returns an error value; calling an imported " +
      "callee that declares throws {} violates the no-failure guarantee by transitivity, even when the outer fn " +
      "itself does not declare throws {} and INT009/INT010 do not fire; " +
      "this check extends INT010 to cross-file callees visible via moduleEffects; " +
      "infallible ⊂ total — this check applies in addition to INT025",
    idiom:
      "wrap the throwing import in a try/catch and return Result<T, E> — then downgrade to intent: \"total\" " +
      "since the fn now encodes failure; or provide a non-throwing variant of the imported callee that " +
      "guarantees success so the infallible claim can be preserved",
    rewrite:
      "// option A — catch exception and return Result, downgrade to total:\n" +
      "fn name(...) intent: \"total\" -> Result<T, EType> {\n" +
      "  try {\n" +
      "    return ok(importedFn(...))\n" +
      "  } catch (e) {\n" +
      "    return err(new EType(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — use a non-throwing variant (preserve infallible):\n" +
      "fn name(...) intent: \"infallible\" -> T = importedFnSafe(...)\n\n" +
      "// option C — remove the infallible claim:\n" +
      "fn name(...) throws { EType } -> T = importedFn(...)",
    example:
      "// before — fn claims infallible but calls imported load() which declares throws { IOError }; INT026 fires\n" +
      "?bs 0.9\n" +
      "import { load } from \"./store\"  // load declares throws { IOError }\n\n" +
      "fn getConfig() intent: \"infallible\" -> Config {\n" +
      "  return load(\"config\")  // INT026: imported callee declares throws { IOError }\n" +
      "}\n\n" +
      "// after option A — catch and downgrade to total\n" +
      "?bs 0.9\n" +
      "fn getConfig() intent: \"total\" -> Result<Config, IOError> {\n" +
      "  try {\n" +
      "    return ok(load(\"config\"))\n" +
      "  } catch (e) {\n" +
      "    return err(new IOError(e))\n" +
      "  }\n" +
      "}",
  },
  INT027: {
    code: "INT027",
    title: "intent declares 'idempotent' but body calls an imported fn that declares throws {}",
    rule:
      "a function declaring intent: \"idempotent\" must not call imported functions that can propagate exceptions — " +
      "an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same " +
      "observable outcome; an imported callee that declares throws {} can fail on some calls and succeed on " +
      "others depending on external state (network availability, resource contention, transient errors); " +
      "if the imported callee throws on the Nth retry, the outer fn's observable outcome differs from the " +
      "first call, violating the idempotent contract by transitivity; " +
      "this check extends INT023 to cross-file callees visible via moduleEffects; " +
      "this check fires only when INT022 does not (no throws {} on the outer fn's own header)",
    idiom:
      "wrap the throwing import in a try/catch that converts the exception to a Result<T, E> return value; " +
      "Result makes every call return the same shape — err() on failure, ok() on success — preserving " +
      "the idempotent contract across retries; or use a non-throwing variant of the imported callee",
    rewrite:
      "// option A — catch the exception and return Result (preferred for idempotent fns):\n" +
      "fn outer(...) intent: \"idempotent\" -> Result<T, EType> {\n" +
      "  try {\n" +
      "    return ok(importedFn(...))\n" +
      "  } catch (e) {\n" +
      "    return err(new EType(e))\n" +
      "  }\n" +
      "}\n\n" +
      "// option B — use a non-throwing variant (if one exists):\n" +
      "fn outer(...) intent: \"idempotent\" -> Result<T, EType> = importedFnSafe(...)\n\n" +
      "// option C — remove the idempotent claim if exception propagation is intentional:\n" +
      "fn outer(...) throws { EType } -> T = importedFn(...)",
    example:
      "// before — fn claims idempotent but calls imported fetch() which declares throws { NetworkError }; INT027 fires\n" +
      "?bs 0.9\n" +
      "import { fetchUser } from \"./api\"  // fetchUser declares throws { NetworkError }\n\n" +
      "fn loadUser(id: string) intent: \"idempotent\" -> User {\n" +
      "  return fetchUser(id)  // INT027: imported callee declares throws { NetworkError }\n" +
      "}\n\n" +
      "// after option A — catch and return Result\n" +
      "?bs 0.9\n" +
      "fn loadUser(id: string) intent: \"idempotent\" -> Result<User, NetworkError> {\n" +
      "  try {\n" +
      "    return ok(fetchUser(id))\n" +
      "  } catch (e) {\n" +
      "    return err(new NetworkError(e))\n" +
      "  }\n" +
      "}",
  },
  INT028: {
    code: "INT028",
    title: "intent declares 'pure' but body calls an imported fn that declares uses {}",
    rule:
      "a function declaring intent: \"pure\" must not call imported functions that declare capability requirements — " +
      "capabilities (network I/O, filesystem, time, random, …) are side effects; " +
      "a callee that declares uses { cap } exercises that capability on every call, " +
      "making the caller non-pure by transitivity even when the caller declares no capability itself; " +
      "this check extends INT012 to cross-file callees visible via moduleEffects; " +
      "this check fires only when INT001 and INT002 do not",
    idiom:
      "inject the callee's return value as a parameter to break the capability dependency, " +
      "or lift the capability declaration to the outer fn and remove the pure intent claim",
    rewrite:
      "// option A — inject the computed value as a parameter (preferred):\n" +
      "fn outer(precomputed: T) intent: \"pure\" -> R {\n" +
      "  // use precomputed instead of calling the imported fn\n" +
      "}\n\n" +
      "// option B — remove the pure intent claim and declare the capability:\n" +
      "fn outer(...) uses { cap } -> R {\n" +
      "  const v = importedFn(...)\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims pure but calls imported fetchEnv() which declares uses { env }; INT028 fires\n" +
      "?bs 0.9\n" +
      "import { fetchEnv } from \"./env\"  // fetchEnv declares uses { env }\n\n" +
      "fn buildUrl(path: string) intent: \"pure\" -> string {\n" +
      "  return fetchEnv(\"BASE_URL\") + path  // INT028: imported callee declares uses { env }\n" +
      "}\n\n" +
      "// after option A — inject the base URL as a parameter\n" +
      "?bs 0.9\n" +
      "fn buildUrl(baseUrl: string, path: string) intent: \"pure\" -> string {\n" +
      "  return baseUrl + path\n" +
      "}",
  },
  INT029: {
    code: "INT029",
    title: "intent declares 'pure' but body calls an imported fn that declares reads {} or writes {}",
    rule:
      "a function declaring intent: \"pure\" must not call imported functions that declare reads {} or writes {} — " +
      "a callee that reads external state makes the caller's output depend on ambient state (non-deterministic); " +
      "a callee that writes external state introduces a side effect; " +
      "both contradict the pure guarantee of determinism and referential transparency by transitivity; " +
      "this check extends INT016 to cross-file callees visible via moduleEffects; " +
      "this check fires only when INT001 and INT002 do not",
    idiom:
      "inject the externally-read value as a parameter so the fn is pure over its inputs, " +
      "or remove the pure intent claim and surface the reads/writes on the outer fn",
    rewrite:
      "// option A — inject the external value as a parameter (preferred):\n" +
      "fn outer(preloaded: T) intent: \"pure\" -> R {\n" +
      "  // use preloaded instead of calling the imported fn\n" +
      "}\n\n" +
      "// option B — remove the pure intent claim and surface the effect:\n" +
      "fn outer(...) reads { resource } -> R {\n" +
      "  const v = importedFn(...)\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims pure but calls imported readConfig() which declares reads { config }; INT029 fires\n" +
      "?bs 0.9\n" +
      "import { readConfig } from \"./config\"  // readConfig declares reads { config }\n\n" +
      "fn getTimeout(key: string) intent: \"pure\" -> number {\n" +
      "  return readConfig(key).timeout  // INT029: imported callee declares reads { config }\n" +
      "}\n\n" +
      "// after option A — inject the config value as a parameter\n" +
      "?bs 0.9\n" +
      "fn getTimeout(timeoutMs: number) intent: \"pure\" -> number {\n" +
      "  return timeoutMs\n" +
      "}",
  },
  INT030: {
    code: "INT030",
    title: "intent declares 'idempotent' but body calls an imported fn that declares writes {}",
    rule:
      "a function declaring intent: \"idempotent\" must not call imported functions that declare writes {} — " +
      "an idempotent fn is safe to retry: multiple calls with the same arguments must produce the same " +
      "observable outcome; a callee that declares writes {} mutates a resource on every call, " +
      "making each retry produce additional mutations — the Nth call produces N writes, " +
      "not the same outcome as the first call; this violates the idempotent contract by transitivity; " +
      "this check extends INT015 to cross-file callees visible via moduleEffects",
    idiom:
      "move the write outside the idempotent boundary (the caller should write, the idempotent fn should compute), " +
      "or check-then-write with a guard so repeated calls skip already-applied writes",
    rewrite:
      "// option A — split compute and write, keep compute idempotent:\n" +
      "fn compute(...) intent: \"idempotent\" -> T {\n" +
      "  return ...  // no writes inside\n" +
      "}\n" +
      "// caller: const v = compute(...); importedWriteFn(v)\n\n" +
      "// option B — remove the idempotent claim and declare writes on the outer fn:\n" +
      "fn outer(...) writes { resource } -> R {\n" +
      "  return importedFn(...)\n" +
      "}",
    example:
      "// before — fn claims idempotent but calls imported persist() which declares writes { db }; INT030 fires\n" +
      "?bs 0.9\n" +
      "import { persist } from \"./store\"  // persist declares writes { db }\n\n" +
      "fn saveResult(id: string, value: number) intent: \"idempotent\" -> void {\n" +
      "  persist(id, value)  // INT030: imported callee declares writes { db }\n" +
      "}\n\n" +
      "// after option B — remove idempotent and declare writes\n" +
      "?bs 0.9\n" +
      "fn saveResult(id: string, value: number) writes { db } -> void {\n" +
      "  persist(id, value)\n" +
      "}",
  },
  INT031: {
    code: "INT031",
    title: "intent declares 'idempotent' but body calls an imported fn that declares uses { random } or uses { time }",
    rule:
      "a function declaring intent: \"idempotent\" must not call imported functions that declare uses { random } or uses { time } — " +
      "an idempotent fn is safe to retry: same inputs → same observable result; " +
      "random and time produce a different value on every call, so a callee that declares either " +
      "makes the caller non-idempotent by transitivity — the second retry of a supposedly idempotent fn " +
      "would observe a different random seed or timestamp; " +
      "this check extends INT013 to cross-file callees visible via moduleEffects; " +
      "this check fires only when INT003 and INT004 do not (no direct header or body conflict)",
    idiom:
      "inject the non-idempotent callee's return value as a parameter so the outer fn receives it as a stable input; " +
      "the caller that passes the value is responsible for the non-idempotency, not the idempotent fn",
    rewrite:
      "// option A — inject the pre-computed value as a parameter (preferred):\n" +
      "fn outer(..., precomputed: T) intent: \"idempotent\" -> R {\n" +
      "  // use precomputed instead of calling the imported fn\n" +
      "}\n\n" +
      "// option B — remove the idempotent claim and declare the capability:\n" +
      "fn outer(...) uses { random } -> R {\n" +
      "  const v = importedFn(...)\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims idempotent but calls imported timestamp() which declares uses { time }; INT031 fires\n" +
      "?bs 0.9\n" +
      "import { timestamp } from \"./clock\"  // timestamp declares uses { time }\n\n" +
      "fn buildKey(prefix: string) intent: \"idempotent\" -> string {\n" +
      "  return prefix + \"-\" + timestamp()  // INT031: imported callee declares uses { time }\n" +
      "}\n\n" +
      "// after option A — inject the timestamp as a parameter\n" +
      "?bs 0.9\n" +
      "fn buildKey(prefix: string, ts: number) intent: \"idempotent\" -> string {\n" +
      "  return prefix + \"-\" + ts\n" +
      "}",
  },
  INT032: {
    code: "INT032",
    title: "intent declares 'pure' but body calls an imported async fn",
    rule:
      "a function declaring intent: \"pure\" must not call imported functions that are declared async — " +
      "an async callee yields to the event loop (a timing side effect) and returns a distinct Promise on every call; " +
      "a pure fn calling an imported async fn is non-pure by transitivity even when the caller itself is synchronous; " +
      "this check extends INT017 to cross-file callees visible via moduleEffects",
    idiom:
      "inject the async callee's resolved value as a parameter so the outer fn receives it as a stable sync input; " +
      "the call site that awaits the async fn is responsible for the timing effect, not the pure fn",
    rewrite:
      "// option A — inject the resolved value as a parameter (preferred):\n" +
      "fn outer(precomputed: T) intent: \"pure\" -> R {\n" +
      "  // use precomputed instead of calling the imported async fn\n" +
      "}\n" +
      "// call site: outer(await importedAsync(...))\n\n" +
      "// option B — remove the pure claim:\n" +
      "fn outer(...) -> Promise<R> {\n" +
      "  const v = importedAsync(...)\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims pure but calls imported async fetch(); INT032 fires\n" +
      "?bs 0.9\n" +
      "import { fetchConfig } from \"./config\"  // fetchConfig is declared async\n\n" +
      "fn buildUrl(base: string) intent: \"pure\" -> string {\n" +
      "  return base + \"/\" + fetchConfig()  // INT032: imported async callee violates pure\n" +
      "}\n\n" +
      "// after option A — inject the resolved value as a parameter\n" +
      "?bs 0.9\n" +
      "fn buildUrl(base: string, config: string) intent: \"pure\" -> string {\n" +
      "  return base + \"/\" + config\n" +
      "}",
  },
  INT033: {
    code: "INT033",
    title: "intent declares 'idempotent' but body calls an imported async fn",
    rule:
      "a function declaring intent: \"idempotent\" must not call imported functions that are declared async — " +
      "an async callee returns a different Promise object on every call; " +
      "a synchronous idempotent fn cannot await that Promise, so it forwards an unresolved Promise to its caller; " +
      "on retry the caller gets a fresh Promise rather than the same value, violating the idempotent contract; " +
      "this check extends INT019 to cross-file callees visible via moduleEffects",
    idiom:
      "inject the async callee's resolved value as a parameter so the outer fn can remain idempotent; " +
      "alternatively, make the outer fn async and await the callee, then verify idempotency holds end-to-end",
    rewrite:
      "// option A — inject the resolved value as a parameter (preferred):\n" +
      "fn outer(..., resolvedValue: T) intent: \"idempotent\" -> R {\n" +
      "  // use resolvedValue instead of calling the imported async fn\n" +
      "}\n\n" +
      "// option B — remove the idempotent claim:\n" +
      "fn outer(...) -> Promise<R> {\n" +
      "  const v = importedAsync(...)\n" +
      "  return compute(v)\n" +
      "}",
    example:
      "// before — fn claims idempotent but calls imported async loadCache(); INT033 fires\n" +
      "?bs 0.9\n" +
      "import { loadCache } from \"./cache\"  // loadCache is declared async\n\n" +
      "fn buildKey(prefix: string) intent: \"idempotent\" -> string {\n" +
      "  return prefix + \"-\" + loadCache()  // INT033: imported async callee violates idempotent\n" +
      "}\n\n" +
      "// after option A — inject the resolved cache value\n" +
      "?bs 0.9\n" +
      "fn buildKey(prefix: string, cacheValue: string) intent: \"idempotent\" -> string {\n" +
      "  return prefix + \"-\" + cacheValue\n" +
      "}",
  },
  INT034: {
    code: "INT034",
    title: "intent declares 'total' but body calls an imported async fn",
    rule:
      "a function declaring intent: \"total\" must not call imported functions that are declared async — " +
      "an async callee returns a Promise that can reject; " +
      "a synchronous total fn forwarding that Promise cannot catch the rejection, " +
      "so the rejection escapes the fn boundary as an uncaught exception, contradicting the total guarantee; " +
      "this check extends INT020 to cross-file callees visible via moduleEffects",
    idiom:
      "use a synchronous variant of the imported fn so the total guarantee can be verified by the compiler; " +
      "if none exists, inject the resolved value as a parameter and let the call site handle the async lifecycle",
    rewrite:
      "// option A — use a synchronous callee (preferred):\n" +
      "fn outer(...) intent: \"total\" -> T = importedSync(...)\n\n" +
      "// option B — inject the resolved value as a parameter:\n" +
      "fn outer(..., precomputed: T) intent: \"total\" -> R {\n" +
      "  // use precomputed instead of calling the imported async fn\n" +
      "}\n\n" +
      "// option C — remove the total intent claim:\n" +
      "fn outer(...) -> Promise<T> = importedAsync(...)",
    example:
      "// before — fn claims total but calls imported async validate(); INT034 fires\n" +
      "?bs 0.9\n" +
      "import { validate } from \"./validator\"  // validate is declared async\n\n" +
      "fn checkInput(input: string) intent: \"total\" -> boolean {\n" +
      "  return validate(input)  // INT034: imported async callee violates total\n" +
      "}\n\n" +
      "// after option A — use a synchronous validator instead\n" +
      "?bs 0.9\n" +
      "fn checkInput(input: string) intent: \"total\" -> boolean = validateSync(input)",
  },
  INT035: {
    code: "INT035",
    title: "intent declares 'infallible' but body calls an imported async fn",
    rule:
      "a function declaring intent: \"infallible\" must not call imported functions that are declared async — " +
      "an async callee returns a Promise that can reject; " +
      "a synchronous infallible fn forwarding that Promise cannot catch the rejection, " +
      "so the rejection escapes as an uncaught exception, violating the infallible guarantee that the fn never fails; " +
      "this check extends INT021 to cross-file callees visible via moduleEffects",
    idiom:
      "use a synchronous variant of the imported fn so the infallible guarantee can hold; " +
      "if the callee must be async, downgrade to intent: \"total\" and make the outer fn async as well",
    rewrite:
      "// option A — use a synchronous callee (preferred):\n" +
      "fn outer(...) intent: \"infallible\" -> T = importedSync(...)\n\n" +
      "// option B — downgrade intent claim:\n" +
      "fn outer(...) intent: \"total\" -> Promise<T> = importedAsync(...)\n\n" +
      "// option C — inject the resolved value as a parameter:\n" +
      "fn outer(..., precomputed: T) intent: \"infallible\" -> R {\n" +
      "  // use precomputed instead of calling the imported async fn\n" +
      "}",
    example:
      "// before — fn claims infallible but calls imported async getDefault(); INT035 fires\n" +
      "?bs 0.9\n" +
      "import { getDefault } from \"./defaults\"  // getDefault is declared async\n\n" +
      "fn format(value: string) intent: \"infallible\" -> string {\n" +
      "  return value + getDefault()  // INT035: imported async callee violates infallible\n" +
      "}\n\n" +
      "// after option A — use a synchronous default instead\n" +
      "?bs 0.9\n" +
      "fn format(value: string) intent: \"infallible\" -> string = value + DEFAULT_SUFFIX",
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
  RES003: {
    code: "RES003",
    title: "imported Result- or Option-returning fn called but return value discarded",
    rule:
      "an imported fn whose declared return type contains Result<> or Option<> must not be called " +
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
      "// db.bs (other file)\n" +
      "?bs 0.9\n" +
      "export fn saveUser(user: User) writes { userDb } -> Result<void, DbError> { ... }\n\n" +
      "// app.bs (this file)\n" +
      "?bs 0.9\n" +
      "import { saveUser } from \"./db.bs\"\n" +
      "fn processUser(user: User) writes { userDb } -> void {\n" +
      "  saveUser(user)   // RES003: imported callee returns Result — discard hides the error path\n" +
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
  SYN009: {
    code: "SYN009",
    title: "XMLHttpRequest construction bypasses the net capability model — use http.get() / http.post() instead",
    rule:
      "`new XMLHttpRequest()`, `XMLHttpRequest()`, `new XMLHttpRequest` (no-parens), and TypeScript instantiation forms like " +
      "`new XMLHttpRequest<T>()` open HTTP connections at runtime but are invisible to " +
      "botscript's capability model: CAP001 checks for `http.*` member calls, not the " +
      "`XMLHttpRequest` global. A fn that constructs an XHR has an undeclared network " +
      "dependency — no `uses { net }` will reflect it in the fn header, " +
      "no audit tool can see it, and callers cannot reason about the blast radius.",
    idiom:
      "replace `new XMLHttpRequest()` with `http.get(url)` or `http.post(url, { body })` and add " +
      "`uses { net }` to the fn header; if the raw XHR API is genuinely required " +
      "(e.g. a thin adapter), wrap in `unsafe \"wraps XHR directly\" { new XMLHttpRequest() }`",
    rewrite:
      "// before — XHR is invisible to the capability model\n" +
      "async fn loadData(url: string) -> Promise<Result<string, string>> {\n" +
      "  return new Promise((resolve) => {\n" +
      "    const xhr = new XMLHttpRequest()  // SYN009\n" +
      "    xhr.open('GET', url)\n" +
      "    xhr.onload = () => resolve(ok(xhr.responseText))\n" +
      "    xhr.onerror = () => resolve(err('request failed'))\n" +
      "    xhr.send()\n" +
      "  })\n" +
      "}\n\n" +
      "// after — http.get declares the net dependency\n" +
      "async fn loadData(url: string) uses { net } -> Promise<Result<string, string>> {\n" +
      "  match await http.get(url) {\n" +
      "    ok { res } -> ok(await res.text())\n" +
      "    err { e } -> err(e.message)\n" +
      "  }\n" +
      "}",
    example:
      "// SYN009: XMLHttpRequest bypasses the net capability model\n" +
      "fn getData(url: string) -> void {\n" +
      "  const xhr = new XMLHttpRequest()  // SYN009\n" +
      "  xhr.open('GET', url)\n" +
      "  xhr.send()\n" +
      "}\n\n" +
      "// fix: use http.get and declare the capability\n" +
      "async fn getData(url: string) uses { net } -> Promise<Result<string, string>> {\n" +
      "  match await http.get(url) {\n" +
      "    ok { res } -> ok(await res.text())\n" +
      "    err { e } -> err(e.message)\n" +
      "  }\n" +
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
  SYN015: {
    code: "SYN015",
    title: "localStorage / sessionStorage access bypasses the storage capability model",
    rule:
      "`localStorage.*` and `sessionStorage.*` accesses are synchronous Web Storage API operations " +
      "invisible to botscript's capability model: `reads {}` / `writes {}` labels cover declared " +
      "resource identifiers, not the Web Storage API globals. A fn that accesses `localStorage` or " +
      "`sessionStorage` has undeclared persistent state dependencies — no `reads {}` / `writes {}` " +
      "declaration in the fn header covers the access, and callers cannot observe or audit the " +
      "dependency from the fn's declared surface. `localStorage` persists across browser sessions; " +
      "`sessionStorage` scopes to the current tab — both are synchronous and invisible to CAP001.",
    idiom:
      "pass a storage abstraction or explicit key-value callbacks as fn parameters so callers " +
      "control what storage is accessed, the dependency is visible in the signature, and tests can " +
      "inject a mock (e.g. `new Map()` or an in-memory object); " +
      "if direct access is genuinely required, wrap in " +
      "`unsafe \"reads/writes localStorage for <reason>\" { localStorage.getItem(key) }`",
    rewrite:
      "// before — localStorage access invisible to the capability model\n" +
      "fn getTheme() -> string {\n" +
      "  return localStorage.getItem('theme') ?? 'light'  // SYN015\n" +
      "}\n\n" +
      "// after — storage abstraction passed as parameter; dependency visible in signature\n" +
      "fn getTheme(store: { getItem: (key: string) => string | null }) -> string {\n" +
      "  return store.getItem('theme') ?? 'light'\n" +
      "}",
    example:
      "// SYN015: localStorage access invisible to capability model\n" +
      "fn savePrefs(prefs: Prefs) -> void {\n" +
      "  localStorage.setItem('prefs', JSON.stringify(prefs))  // SYN015\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a reason, or pass a storage abstraction\n" +
      "fn savePrefs(prefs: Prefs) -> void {\n" +
      "  unsafe \"persists user prefs to localStorage\" { localStorage.setItem('prefs', JSON.stringify(prefs)) }\n" +
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
    title: "Date.now() / new Date() / new Date (no parens) / Date() / Date?.() construction bypasses the time capability model",
    rule:
      "`Date.now()`, `new Date()`, and `Date()` inject the current time at runtime but are " +
      "invisible to botscript's capability model: `uses { time }` declarations cover `time.*` " +
      "stdlib namespace calls, not the `Date` global. A fn that calls these forms has an " +
      "undeclared time dependency — no `uses {}` declaration covers it, callers cannot see it, " +
      "and tests cannot control the time value the fn observes.",
    idiom:
      "pass the current time as an explicit parameter so callers and tests can control it; " +
      "or use `time.now()` from the `time` stdlib namespace with `uses { time }` so the " +
      "time dependency is declared in the fn header (note: `time.now()` returns epoch ms, not a Date object); " +
      "if the raw `Date` API is genuinely required, wrap in " +
      "`unsafe \"uses current time for <reason>\" { Date.now() }`",
    rewrite:
      "// before — time dependency invisible to the capability model\n" +
      "fn isExpired(expiresAtMs: number) -> boolean {\n" +
      "  return Date.now() > expiresAtMs  // SYN020\n" +
      "}\n\n" +
      "// after — time passed as a parameter; tests can control it\n" +
      "fn isExpired(expiresAtMs: number, nowMs: number) -> boolean {\n" +
      "  return nowMs > expiresAtMs\n" +
      "}",
    example:
      "// SYN020: Date.now() bypasses the time capability model\n" +
      "fn isExpired(expiresAt: number) -> boolean {\n" +
      "  return Date.now() > expiresAt  // SYN020\n" +
      "}\n\n" +
      "// fix: pass nowMs as a parameter\n" +
      "fn isExpired(expiresAt: number, nowMs: number) -> boolean {\n" +
      "  return nowMs > expiresAt\n" +
      "}",
  },
  SYN021: {
    code: "SYN021",
    title: "performance.now() / performance.timeOrigin access bypasses the time capability model",
    rule:
      "`performance.now()` and `performance.timeOrigin` inject ambient timing information at " +
      "runtime but are invisible to botscript's capability model: `uses { time }` declarations " +
      "cover `time.*` stdlib namespace calls, not the `performance` global. A fn that reads " +
      "these values has an undeclared time dependency — no `uses {}` declaration covers it, " +
      "callers cannot see it, and tests cannot control the clock value the fn observes.",
    idiom:
      "pass the current time as an explicit parameter so callers and tests can control it (preferred); " +
      "if only epoch time (not monotonic time) is needed, use `time.now()` from the `time` stdlib " +
      "with `uses { time }` so the dependency is declared in the fn header — " +
      "note: `time.now()` is wall-clock epoch time, not a monotonic clock; " +
      "if direct `performance` access is required, wrap in " +
      "`unsafe \"uses performance.now for <reason>\" { performance.now() }`",
    rewrite:
      "// before — time dependency invisible to the capability model\n" +
      "fn elapsed(startMs: number) -> number {\n" +
      "  return performance.now() - startMs  // SYN021\n" +
      "}\n\n" +
      "// after — time passed as a parameter; tests can control it\n" +
      "fn elapsed(startMs: number, nowMs: number) -> number {\n" +
      "  return nowMs - startMs\n" +
      "}",
    example:
      "// SYN021: performance.now() bypasses the time capability model\n" +
      "fn elapsed(startMs: number) -> number {\n" +
      "  return performance.now() - startMs  // SYN021\n" +
      "}\n\n" +
      "// fix: pass nowMs as a parameter\n" +
      "fn elapsed(startMs: number, nowMs: number) -> number {\n" +
      "  return nowMs - startMs\n" +
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
      "`navigator.connection`, `navigator.wakeLock`, and `navigator.sendBeacon` read or exercise " +
      "ambient browser capabilities at runtime but are invisible to botscript's capability model: " +
      "no `uses {}`, `reads {}`, or `writes {}` declaration covers them. A fn that accesses these " +
      "has an undeclared browser-environment dependency — callers cannot see it in the header, " +
      "and tests cannot inject a controlled value. `sendBeacon` is especially high-impact: it makes " +
      "a fire-and-forget network request with no declared `uses { net }` surface.",
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
  SYN024: {
    code: "SYN024",
    title: "document.cookie access bypasses the storage capability model",
    rule:
      "`document.cookie` is a persistent read/write storage mechanism invisible to botscript's " +
      "capability model: `reads {}` / `writes {}` labels cover declared resource identifiers, not the " +
      "`document` global. Unlike `localStorage` (SYN015), cookies are also transmitted with every " +
      "matching HTTP request — so `document.cookie` access has implicit network-side effects as well. " +
      "A fn that reads or writes `document.cookie` has undeclared storage and indirect network " +
      "dependencies that callers cannot see and tests cannot intercept without global mocking.",
    idiom:
      "pass cookies as an explicit parameter so callers and tests can control the value; " +
      "or accept a cookie-jar abstraction so the dependency is visible at the call site; " +
      "if direct `document.cookie` access is genuinely required (e.g. a thin cookie adapter), " +
      "wrap in `unsafe \"accesses document.cookie for <reason>\" { document.cookie }`",
    rewrite:
      "// before — cookie access invisible to the capability model\n" +
      "fn getSession() -> string {\n" +
      "  return document.cookie  // SYN024\n" +
      "}\n\n" +
      "// after — cookie value passed as a parameter; tests can control it\n" +
      "fn getSession(cookieHeader: string) -> string {\n" +
      "  return cookieHeader\n" +
      "}",
    example:
      "// SYN024: document.cookie bypasses the storage capability model\n" +
      "fn isLoggedIn() -> boolean {\n" +
      "  return document.cookie.includes('session=')  // SYN024\n" +
      "}\n\n" +
      "// fix: pass the cookie header as a parameter\n" +
      "fn isLoggedIn(cookieHeader: string) -> boolean {\n" +
      "  return cookieHeader.includes('session=')\n" +
      "}",
  },
  SYN025: {
    code: "SYN025",
    title: "requestAnimationFrame schedules a callback outside the fn's capability surface",
    rule:
      "`requestAnimationFrame(cb)` schedules `cb` to run before the next browser repaint — after the current fn has returned. " +
      "Any effects inside `cb` are invisible to callers: no capability declaration, no `writes {}` label, no `throws {}` entry reflects them. " +
      "The fn appears to return nothing; the real work happens asynchronously in a future animation frame.",
    idiom:
      "pass the work as a return value the caller can schedule, or wrap in " +
      "`unsafe \"schedules animation frame callback\" { requestAnimationFrame(cb) }` when direct use is required",
    rewrite:
      "// before — animation frame callback hides side effects from callers\n" +
      "fn scheduleRender(frame: number) uses { net } -> void {\n" +
      "  requestAnimationFrame(() => http.get(\"/render/\" + frame))  // SYN025\n" +
      "}\n\n" +
      "// after — extract the side-effectful work; let the caller schedule it\n" +
      "fn render(frame: number) uses { net } -> void {\n" +
      "  http.get(\"/render/\" + frame)\n" +
      "}",
    example:
      "// SYN025: animation frame callback hides a network effect from callers\n" +
      "fn scheduleRender(frame: number) uses { net } -> void {\n" +
      "  requestAnimationFrame(() => http.get(\"/render/\" + frame))  // SYN025\n" +
      "}\n\n" +
      "// fix: extract the work into a separate fn\n" +
      "fn render(frame: number) uses { net } -> void {\n" +
      "  http.get(\"/render/\" + frame)\n" +
      "}",
  },
  SYN026: {
    code: "SYN026",
    title: "requestIdleCallback schedules a callback outside the fn's capability surface",
    rule:
      "`requestIdleCallback(cb)` schedules `cb` to run during a browser idle period — after the current fn has returned. " +
      "Any effects inside `cb` are invisible to callers: no capability declaration, no `writes {}` label, no `throws {}` entry reflects them. " +
      "The fn appears to return nothing; the real work happens asynchronously when the browser is idle.",
    idiom:
      "extract the deferred work into a separately declared fn the caller passes to `requestIdleCallback`, or wrap in " +
      "`unsafe \"schedules idle callback\" { requestIdleCallback(cb) }` when direct use is required",
    rewrite:
      "// before — idle callback hides side effects from callers\n" +
      "fn deferCleanup() uses { fs } -> void {\n" +
      "  requestIdleCallback(() => fs.delete(\"/tmp/cache\"))  // SYN026\n" +
      "}\n\n" +
      "// after — return the work; caller decides when to schedule it\n" +
      "fn cleanup() uses { fs } -> void {\n" +
      "  fs.delete(\"/tmp/cache\")\n" +
      "}",
    example:
      "// SYN026: idle callback hides a filesystem effect from callers\n" +
      "fn deferCleanup() uses { fs } -> void {\n" +
      "  requestIdleCallback(() => fs.delete(\"/tmp/cache\"))  // SYN026\n" +
      "}\n\n" +
      "// fix: extract the work into a separate fn\n" +
      "fn cleanup() uses { fs } -> void {\n" +
      "  fs.delete(\"/tmp/cache\")\n" +
      "}",
  },
  SYN027: {
    code: "SYN027",
    title: "Observer constructor (MutationObserver / IntersectionObserver / ResizeObserver / PerformanceObserver) schedules a callback outside the fn's capability surface",
    rule:
      "`new MutationObserver(cb)`, `new IntersectionObserver(cb)`, `new ResizeObserver(cb)`, and `new PerformanceObserver(cb)` " +
      "register `cb` to fire when the browser observes a condition — after the current fn has returned, at an indeterminate future time. " +
      "Any effects inside `cb` are invisible to callers: no capability declaration, no `writes {}` label, no `throws {}` entry reflects them. " +
      "The fn appears to return an observer handle; all the real work executes later in the callback, " +
      "with an undeclared capability surface that callers cannot audit from the fn header.",
    idiom:
      "extract the callback body into a separately declared fn and pass it as a parameter so callers see the capability surface; " +
      "if the observer construction is genuinely required at this level, wrap in " +
      "`unsafe \"observes <target> for <reason>\" { new MutationObserver(cb) }`",
    rewrite:
      "// before — observer callback hides effects from callers\n" +
      "fn watchNode(node: Element) uses { net } -> MutationObserver {\n" +
      "  const obs = new MutationObserver(() => http.get('/log'))  // SYN027\n" +
      "  obs.observe(node, { childList: true })\n" +
      "  return obs\n" +
      "}\n\n" +
      "// after — callback passed in; callers control the effect surface\n" +
      "fn watchNode(node: Element, onChange: () -> void) -> MutationObserver {\n" +
      "  const obs = unsafe \"observes node mutations for caller-provided callback\" { new MutationObserver(onChange) }\n" +
      "  obs.observe(node, { childList: true })\n" +
      "  return obs\n" +
      "}",
    example:
      "// SYN027: observer callback hides a network effect from callers\n" +
      "fn trackViewport(el: Element) uses { net } -> IntersectionObserver {\n" +
      "  return new IntersectionObserver(() => http.get('/viewed'))  // SYN027\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a reason\n" +
      "fn trackViewport(el: Element) uses { net } -> IntersectionObserver {\n" +
      "  return unsafe \"observes intersection for analytics\" { new IntersectionObserver(() => http.get('/viewed')) }\n" +
      "}",
  },
  SYN028: {
    code: "SYN028",
    title: "new Proxy() wraps an object and launders its capability surface from static analysis",
    rule:
      "`new Proxy(target, handler)` creates a virtualized object that intercepts all property access, " +
      "method calls, and mutations on `target` via `handler` traps. " +
      "If `target` is a capability-bearing object (e.g. an `http` or `fs` namespace), " +
      "the Proxy becomes an opaque wrapper: callers see an innocent object, " +
      "but every operation routes through the underlying capability without a matching `uses {}` declaration. " +
      "If `handler` closes over capabilities, the trap body can perform arbitrary effects " +
      "with no declaration visible in the fn header. " +
      "In both cases the compiler cannot see through the Proxy — " +
      "the capability surface appears narrower than it actually is.",
    idiom:
      "avoid using Proxy to wrap capability-bearing objects; " +
      "if Proxy is genuinely needed (e.g. mock injection, transparent logging), " +
      "wrap in `unsafe \"proxies <target> for <reason>\" { new Proxy(target, handler) }` " +
      "so the escape hatch is visible in the diff and auditable by reviewers",
    rewrite:
      "// before — Proxy wraps http capability, hiding it from callers\n" +
      "fn makeClient(http: HttpCap) -> object {\n" +
      "  return new Proxy({}, {\n" +
      "    get: (_, key) => http.get(`/api/${key}`)  // SYN028\n" +
      "  })\n" +
      "}\n\n" +
      "// after — wrap in unsafe with a reason; callers can audit the escape\n" +
      "fn makeClient(http: HttpCap) uses { net } -> object {\n" +
      "  return unsafe \"proxies http capability for transparent API client\" {\n" +
      "    new Proxy({}, { get: (_, key) => http.get(`/api/${key}`) })\n" +
      "  }\n" +
      "}",
    example:
      "// SYN028: Proxy hides capability surface from callers\n" +
      "fn wrapFs(fs: FsCap) -> object {\n" +
      "  return new Proxy(fs, {})  // SYN028 — fs capability laundered through Proxy\n" +
      "}\n\n" +
      "// fix: declare intent with unsafe\n" +
      "fn wrapFs(fs: FsCap) -> object {\n" +
      "  return unsafe \"proxies fs capability for transparent delegation\" { new Proxy(fs, {}) }\n" +
      "}",
  },
  SYN029: {
    code: "SYN029",
    title: "document.write() / document.writeln() injects raw HTML and bypasses the DOM capability model",
    rule:
      "`document.write(html)` and `document.writeln(html)` inject a raw HTML string directly into the document " +
      "parse stream. After the initial page load, calling either method clears the entire document before writing. " +
      "Both are invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration " +
      "covers document mutation via these globals. " +
      "The injected string may contain `<script>` tags, inline event handlers, or other executable content " +
      "that the static analysis cannot see. " +
      "Callers cannot observe, audit, or suppress the DOM side effect from the fn's declared surface.",
    idiom:
      "replace `document.write(html)` with explicit DOM construction (`document.createElement`, `innerHTML` on a " +
      "scoped element, or a templating system) so the DOM mutation is visible and auditable; " +
      "if `document.write` is genuinely required (e.g. polyfill injection, legacy embed), " +
      "wrap in `unsafe \"writes to document for <reason>\" { document.write(html) }`",
    rewrite:
      "// before — document.write injects HTML invisibly\n" +
      "fn renderBanner(html: string) -> void {\n" +
      "  document.write(`<div class='banner'>${html}</div>`)  // SYN029\n" +
      "}\n\n" +
      "// after — explicit DOM construction; effect is visible and scoped\n" +
      "fn renderBanner(html: string) -> void {\n" +
      "  const div = document.createElement('div')\n" +
      "  div.className = 'banner'\n" +
      "  div.innerHTML = html\n" +
      "  document.body.appendChild(div)\n" +
      "}",
    example:
      "// SYN029: document.write injects raw HTML bypassing capability model\n" +
      "fn injectScript(src: string) -> void {\n" +
      "  document.write(`<script src='${src}'><\\/script>`)  // SYN029\n" +
      "}\n\n" +
      "// fix: wrap in unsafe with a reason\n" +
      "fn injectScript(src: string) -> void {\n" +
      "  unsafe \"injects legacy script tag for polyfill\" { document.write(`<script src='${src}'><\\/script>`) }\n" +
      "}",
  },
  SYN030: {
    code: "SYN030",
    title: "FinalizationRegistry registers a GC-triggered callback with hidden effects",
    rule:
      "`new FinalizationRegistry(callback)` registers a cleanup callback that fires when the registered " +
      "target is garbage-collected. GC timing is non-deterministic and implementation-specific — the callback " +
      "can fire at any point after the target becomes unreachable, in any micro-task checkpoint, with no " +
      "guaranteed ordering relative to other code. Any capability use inside the callback (network calls, " +
      "storage writes, stdout output) is invisible to botscript's static analysis: it cannot appear in the " +
      "fn's `uses {}`, `reads {}`, or `writes {}` clause. Unlike timers, there is no cancel path — once " +
      "registered, the callback fires whenever the GC decides. This is the most unpredictable scheduler " +
      "in the platform and belongs behind an explicit unsafe acknowledgment.",
    idiom:
      "wrap `new FinalizationRegistry(cb)` in `unsafe \"registers GC callback for <reason>\" { ... }` " +
      "to make the GC-callback registration visible and acknowledged in the fn's source; " +
      "move any capability-bearing code out of the callback into an explicitly scheduled path " +
      "(e.g. `queueMicrotask`, `setTimeout`) that callers can reason about",
    rewrite:
      "// before — GC callback hides capability use from fn header\n" +
      "fn withCleanup(target: object, key: string) -> void {\n" +
      "  const registry = new FinalizationRegistry((k) => {  // SYN030\n" +
      "    http.delete(`/cache/${k}`)\n" +
      "  })\n" +
      "  registry.register(target, key)\n" +
      "}\n\n" +
      "// after — GC callback explicitly acknowledged\n" +
      "fn withCleanup(target: object, key: string) -> void {\n" +
      "  const registry = unsafe \"registers GC callback for cache eviction\" {\n" +
      "    new FinalizationRegistry((k) => { http.delete(`/cache/${k}`) })\n" +
      "  }\n" +
      "  registry.register(target, key)\n" +
      "}",
    example:
      "// SYN030: FinalizationRegistry fires a GC callback with invisible effects\n" +
      "fn trackObject(obj: object, id: string) -> void {\n" +
      "  const registry = new FinalizationRegistry((heldId) => {\n" +
      "    storage.delete(heldId)  // invisible to fn header — GC timing is undefined\n" +
      "  })\n" +
      "  registry.register(obj, id)\n" +
      "}\n\n" +
      "// fix: wrap in unsafe\n" +
      "fn trackObject(obj: object, id: string) -> void {\n" +
      "  const registry = unsafe \"registers GC callback for object lifecycle tracking\" {\n" +
      "    new FinalizationRegistry((heldId) => { storage.delete(heldId) })\n" +
      "  }\n" +
      "  registry.register(obj, id)\n" +
      "}",
  },
  SYN031: {
    code: "SYN031",
    title: "MessageChannel creates a paired async message channel with hidden delivery effects",
    rule:
      "`new MessageChannel()` creates two paired `MessagePort` objects (`port1`, `port2`). " +
      "Messages sent via `port.postMessage(data)` are delivered asynchronously to the other " +
      "port's `.onmessage` handler — after the current fn has returned, in a separate task. " +
      "Any effects inside the `.onmessage` handler (network calls, storage writes, stdout) " +
      "are invisible to botscript's static analysis: they cannot appear in the fn's `uses {}`, " +
      "`reads {}`, or `writes {}` clause. Unlike `BroadcastChannel` (same-origin broadcast), " +
      "a `MessageChannel` enables direct point-to-point async communication between any two " +
      "contexts (windows, workers, iframes) — the capability surface of the receiving end is " +
      "entirely invisible to the fn that creates the channel.",
    idiom:
      "wrap `new MessageChannel()` in `unsafe \"creates message channel for <reason>\" { ... }` " +
      "to make the async channel creation visible and acknowledged in the fn's source; " +
      "prefer explicit capability-declared interfaces over async message passing when callers " +
      "need to reason about effects at compile time",
    rewrite:
      "// before — MessageChannel hides async delivery effects from fn header\n" +
      "fn bridge(worker: Worker) -> void {\n" +
      "  const { port1, port2 } = new MessageChannel()  // SYN031\n" +
      "  port1.onmessage = (e) => { http.post('/log', e.data) }  // invisible to fn header\n" +
      "  worker.postMessage('init', [port2])\n" +
      "}\n\n" +
      "// after — channel creation explicitly acknowledged\n" +
      "fn bridge(worker: Worker) -> void {\n" +
      "  const { port1, port2 } = unsafe \"creates message channel for worker bridge\" {\n" +
      "    new MessageChannel()\n" +
      "  }\n" +
      "  port1.onmessage = (e) => { http.post('/log', e.data) }\n" +
      "  worker.postMessage('init', [port2])\n" +
      "}",
    example:
      "// SYN031: MessageChannel creates a channel whose async message delivery is invisible\n" +
      "fn setupChannel() -> MessagePort {\n" +
      "  const channel = new MessageChannel()\n" +
      "  channel.port1.onmessage = (e) => { storage.set('last', e.data) }  // invisible\n" +
      "  return channel.port2\n" +
      "}\n\n" +
      "// fix: wrap in unsafe\n" +
      "fn setupChannel() -> MessagePort {\n" +
      "  const channel = unsafe \"creates message channel for port2 consumer\" {\n" +
      "    new MessageChannel()\n" +
      "  }\n" +
      "  channel.port1.onmessage = (e) => { storage.set('last', e.data) }\n" +
      "  return channel.port2\n" +
      "}",
  },
  SYN032: {
    code: "SYN032",
    title: "new RTCPeerConnection() opens a peer-to-peer network channel invisible to the capability model",
    rule:
      "`new RTCPeerConnection(config)` initiates a WebRTC peer-to-peer session. Once the ICE " +
      "handshake completes, the connection can exchange arbitrary data via `RTCDataChannel` or " +
      "stream media — directly over UDP, bypassing all HTTP-layer visibility. CAP001 checks for " +
      "`http.*` member calls; `RTCPeerConnection` is invisible to it. A fn that constructs an " +
      "`RTCPeerConnection` has an undeclared network dependency capable of exfiltrating data " +
      "via peer-to-peer UDP with no HTTP trace, making monitoring and auditing ineffective. " +
      "ICE candidates are gathered asynchronously and connection events fire after the fn returns — " +
      "all handler effects are invisible to the fn's `uses {}`, `reads {}`, or `writes {}` clause.",
    idiom:
      "wrap `new RTCPeerConnection(config)` in `unsafe \"opens WebRTC peer connection for <reason>\" { ... }` " +
      "to make the peer-to-peer channel construction visible and acknowledged in the fn's source; " +
      "prefer capability-declared http.* calls when only client-server communication is needed — " +
      "RTCPeerConnection is appropriate only for genuine peer-to-peer media or data transfer",
    rewrite:
      "// before — RTCPeerConnection opens a network channel invisible to CAP001\n" +
      "fn initPeer(config: RTCConfiguration) -> void {\n" +
      "  const pc = new RTCPeerConnection(config)  // SYN032\n" +
      "  const dc = pc.createDataChannel('data')\n" +
      "  dc.onmessage = (e) => { storage.set('last', e.data) }  // invisible to fn header\n" +
      "}\n\n" +
      "// after — peer connection explicitly acknowledged\n" +
      "fn initPeer(config: RTCConfiguration) -> void {\n" +
      "  const pc = unsafe \"opens WebRTC peer connection for p2p data channel\" {\n" +
      "    new RTCPeerConnection(config)\n" +
      "  }\n" +
      "  const dc = pc.createDataChannel('data')\n" +
      "  dc.onmessage = (e) => { storage.set('last', e.data) }\n" +
      "}",
    example:
      "// SYN032: RTCPeerConnection bypasses the capability model with peer-to-peer UDP\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  const pc = new RTCPeerConnection(config)\n" +
      "  pc.onicecandidate = (e) => { http.post('/signal', e.candidate) }  // invisible\n" +
      "  return pc\n" +
      "}\n\n" +
      "// fix: wrap in unsafe\n" +
      "fn connectPeer(config: RTCConfiguration) -> RTCPeerConnection {\n" +
      "  const pc = unsafe \"opens WebRTC peer connection for media relay\" {\n" +
      "    new RTCPeerConnection(config)\n" +
      "  }\n" +
      "  pc.onicecandidate = (e) => { http.post('/signal', e.candidate) }\n" +
      "  return pc\n" +
      "}",
  },
  SYN033: {
    code: "SYN033",
    title: "import.meta.env access hides a deployment dependency",
    rule:
      "`import.meta.env.*` reads build-time environment variables injected by Vite, Vitest, " +
      "esbuild, and similar bundlers. Unlike `process.env` (SYN005), which fires in Node.js " +
      "contexts, `import.meta.env` is the standard pattern for environment access in modern " +
      "browser-targeted and isomorphic bots. Both have the same problem: the fn silently " +
      "depends on a deployment value that callers cannot see, audit, or override in tests. " +
      "Any test that calls the fn must also have the right build-time environment, making " +
      "the dependency invisible and the fn harder to isolate.",
    idiom:
      "pass config values as explicit fn parameters so callers control what is injected; " +
      "read `import.meta.env.X` at the module's entry point, bind to a constant, and pass " +
      "it down — or wrap in `unsafe \"reads build-time env\" { import.meta.env.API_KEY }` " +
      "if direct access at the call site is required",
    rewrite:
      "// before — import.meta.env hides a deployment dependency\n" +
      "fn getApiUrl() -> string {\n" +
      "  return import.meta.env.VITE_API_URL  // SYN033\n" +
      "}\n\n" +
      "// after — caller controls the value; tests can inject\n" +
      "fn getApiUrl(baseUrl: string) -> string {\n" +
      "  return baseUrl\n" +
      "}",
    example:
      "// SYN033: import.meta.env hides a deployment dependency\n" +
      "fn buildHeaders(token: string) -> Record<string, string> {\n" +
      "  const env = import.meta.env.MODE  // SYN033\n" +
      "  return { Authorization: token, 'X-Env': env }\n" +
      "}\n\n" +
      "// fix: accept env as an explicit parameter\n" +
      "fn buildHeaders(token: string, env: string) -> Record<string, string> {\n" +
      "  return { Authorization: token, 'X-Env': env }\n" +
      "}",
  },
  SYN034: {
    code: "SYN034",
    title: "location.* access reads ambient URL or triggers navigation — both invisible to callers",
    rule:
      "the global `location` object exposes two classes of hidden effect. " +
      "Property reads (`location.href`, `.pathname`, `.search`, `.hash`, `.hostname`, " +
      "`.host`, `.port`, `.protocol`, `.origin`) create an ambient URL dependency: the " +
      "same fn returns different values depending on which deployment origin it runs in, " +
      "making it impossible to unit-test without browser environment mocking. " +
      "Navigation methods (`location.assign(url)`, `.replace(url)`, `.reload()`) are " +
      "navigation side effects: they redirect or reload the page — a visible, persistent " +
      "effect that outlives the fn call and cannot be declared in any fn header. " +
      "Neither category is captured by CAP001 (which tracks stdlib namespaces) or any " +
      "`uses {} / reads {} / writes {}` declaration.",
    idiom:
      "for URL reads: accept the required value as a parameter so callers can control it " +
      "and tests can inject a fixed string; " +
      "for navigation calls: accept a `navigate: (url: string) => void` callback as a " +
      "parameter so callers decide what happens — or wrap in " +
      "`unsafe \"reads location.pathname for routing\" { location.pathname }` if direct access is required",
    rewrite:
      "// before — location read hides a URL dependency\n" +
      "fn getSection() -> string {\n" +
      "  return location.pathname.split('/')[1]  // SYN034\n" +
      "}\n\n" +
      "// after — caller passes the pathname; fn is testable without a browser\n" +
      "fn getSection(pathname: string) -> string {\n" +
      "  return pathname.split('/')[1]\n" +
      "}",
    example:
      "// SYN034: location.pathname hides a URL dependency\n" +
      "fn isAdminRoute() -> boolean {\n" +
      "  return location.pathname.startsWith('/admin')  // SYN034\n" +
      "}\n\n" +
      "// fix: accept pathname as a parameter\n" +
      "fn isAdminRoute(pathname: string) -> boolean {\n" +
      "  return pathname.startsWith('/admin')\n" +
      "}",
  },
  SYN035: {
    code: "SYN035",
    title: "history.* access mutates browser history or reads ambient navigation state — both invisible to callers",
    rule:
      "the global `history` object exposes two classes of hidden effect. " +
      "Mutation methods (`history.pushState(state, title, url)`, `.replaceState(state, title, url)`, " +
      "`.back()`, `.forward()`, `.go(delta)`) alter the browser history stack and/or the address bar — " +
      "visible, persistent side effects that outlive the fn call and cannot be declared in any fn header. " +
      "Ambient reads (`history.length`, `.state`, `.scrollRestoration`) return values that differ " +
      "depending on how the user navigated to the current page; the same fn returns different results " +
      "in different sessions without any visible declaration. " +
      "Neither category is captured by CAP001 (which tracks stdlib namespaces) or any " +
      "`uses {} / reads {} / writes {}` declaration.",
    idiom:
      "for history mutations: accept a `push: (url: string, state?: unknown) => void` callback as a " +
      "parameter so callers control navigation, or wrap in " +
      "`unsafe \"pushes route for <reason>\" { history.pushState(state, '', url) }` if direct access is required; " +
      "for ambient reads: accept the required value as a parameter so callers can inject a fixed value in tests",
    rewrite:
      "// before — history mutation hides a navigation side effect\n" +
      "fn navigate(url: string) -> void {\n" +
      "  history.pushState(null, '', url)  // SYN035\n" +
      "}\n\n" +
      "// after — caller controls navigation; fn is testable without a browser\n" +
      "fn navigate(url: string, push: (url: string) => void) -> void {\n" +
      "  push(url)\n" +
      "}",
    example:
      "// SYN035: history.pushState hides a navigation side effect\n" +
      "fn goTo(path: string) -> void {\n" +
      "  history.pushState(null, '', path)  // SYN035\n" +
      "}\n\n" +
      "// fix: accept a push callback; caller decides what navigation means\n" +
      "fn goTo(path: string, push: (p: string) => void) -> void {\n" +
      "  push(path)\n" +
      "}",
  },
  SYN036: {
    code: "SYN036",
    title: "WebAssembly.instantiate/compile executes opaque binary code invisible to the capability model",
    rule:
      "`WebAssembly.instantiate(bytes)`, `.instantiateStreaming(response)`, `.compile(bytes)`, " +
      "`.compileStreaming(response)`, `new WebAssembly.Instance(module)`, and `new WebAssembly.Module(bytes)` " +
      "execute or compile a binary WASM module at runtime. A WASM module's capability surface is entirely " +
      "opaque to botscript's static analysis: the module can make network requests, write to memory, call " +
      "any imported JS function, and produce any side effect — none of it visible in the caller's `uses {}`, " +
      "`reads {}`, or `writes {}` declarations. This is the WASM analogue of `eval()` (SYN004): arbitrary " +
      "execution from a binary blob that the compiler cannot inspect.",
    idiom:
      "accept the WASM module as a pre-compiled `WebAssembly.Module` parameter passed in by the caller, " +
      "so capability decisions are made at the call site; or wrap in " +
      "`unsafe \"executes <module> WASM for <reason>\" { WebAssembly.instantiate(bytes) }` " +
      "with a comment explaining what capabilities the module uses and why direct instantiation is required",
    rewrite:
      "// before — WebAssembly.instantiate hides an opaque capability surface\n" +
      "fn runWasm(bytes: ArrayBuffer) -> Promise<WebAssembly.Exports> {\n" +
      "  const { instance } = await WebAssembly.instantiate(bytes, {})  // SYN036\n" +
      "  return instance.exports\n" +
      "}\n\n" +
      "// after — caller decides when/whether to instantiate; fn receives a ready module\n" +
      "fn runWasm(mod: WebAssembly.Instance) -> WebAssembly.Exports {\n" +
      "  return mod.exports\n" +
      "}",
    example:
      "// SYN036: WebAssembly.instantiate executes opaque binary code\n" +
      "?bs 0.7\n" +
      "fn loadModule(bytes: ArrayBuffer) -> void {\n" +
      "  WebAssembly.instantiate(bytes, {})  // SYN036\n" +
      "}\n\n" +
      "// fix: accept a pre-instantiated module; let callers control WASM execution\n" +
      "fn loadModule(instance: WebAssembly.Instance) -> WebAssembly.Exports {\n" +
      "  return instance.exports\n" +
      "}",
  },
  SYN037: {
    code: "SYN037",
    title: "SYN-guarded global called via .call() / .apply() / .bind() bypasses name-token detection",
    rule:
      "`fetch.call(...)`, `fetch.apply(...)`, `WebSocket.call(...)`, and similar " +
      "`.call()` / `.apply()` / `.bind()` invocations on SYN-guarded globals bypass " +
      "SYN007–SYN036 name-token detection: the call-site token is `call`, `apply`, or " +
      "`bind` — not `fetch` or `WebSocket` — so the guarded global can be invoked without " +
      "triggering the corresponding SYN warning. A fn that calls `fetch.call(null, url)` " +
      "has the same undeclared network dependency as one that calls `fetch(url)` directly.",
    idiom:
      "call the global directly (`fetch(url)`) so SYN007–SYN036 fire on the canonical name, " +
      "then add the required capability declaration; if the indirect call is intentional, " +
      "wrap in `unsafe \"calls <global>.call for <reason>\" { <global>.call(...) }`",
    rewrite:
      "// before — fetch.call bypasses SYN007 name-token detection\n" +
      "fn load(url: string) uses { net } -> string {\n" +
      "  return fetch.call(null, url)  // SYN037\n" +
      "}\n\n" +
      "// after — direct call; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> string {\n" +
      "  return fetch(url)\n" +
      "}",
    example:
      "// SYN037: fetch.apply bypasses the capability model\n" +
      "fn request(url: string) uses { net } -> string {\n" +
      "  return fetch.apply(null, [url])  // SYN037\n" +
      "}\n\n" +
      "// fix: call fetch directly\n" +
      "fn request(url: string) uses { net } -> string {\n" +
      "  return fetch(url)\n" +
      "}",
  },
  SYN038: {
    code: "SYN038",
    title: "writing to globalThis / window / self property mutates global scope invisible to the capability model",
    rule:
      "writing to `globalThis.<member>`, `window.<member>`, or `self.<member>` adds or modifies " +
      "a property on the global object — a side effect invisible to botscript's capability model: " +
      "no `uses {}`, `reads {}`, or `writes {}` declaration covers global scope mutations. " +
      "Any code in the runtime can observe the written value; callers cannot see the dependency " +
      "from the fn header, and tests cannot isolate it without patching the global namespace.",
    idiom:
      "pass state through explicit parameters and return values so callers and tests can observe and control all data flow; " +
      "if the global write is intentional (e.g. a polyfill or initializer), wrap in " +
      "`unsafe \"writes globalThis.<member> for <reason>\" { globalThis.<member> = ... }`",
    rewrite:
      "// before — silent global write invisible to callers\n" +
      "fn register(handler: Handler) {\n" +
      "  globalThis.myHandler = handler  // SYN038\n" +
      "}\n\n" +
      "// after — state returned explicitly; caller owns the binding\n" +
      "fn register(handler: Handler) -> { myHandler: Handler } {\n" +
      "  return { myHandler: handler }\n" +
      "}",
    example:
      "// SYN038: globalThis.config write bypasses the capability model\n" +
      "fn initConfig(cfg: Config) {\n" +
      "  globalThis.config = cfg  // SYN038\n" +
      "}\n\n" +
      "// fix: accept and return config explicitly\n" +
      "fn initConfig(cfg: Config) -> Config {\n" +
      "  return cfg\n" +
      "}",
  },
  SYN039: {
    code: "SYN039",
    title: "Object.defineProperty() / Object.defineProperties() mutates property descriptors invisibly",
    rule:
      "`Object.defineProperty(target, key, descriptor)` and `Object.defineProperties(target, descriptors)` " +
      "redefine property attributes (value, writable, enumerable, configurable, get, set) at runtime. " +
      "When called on a global receiver (`globalThis`, `window`, `self`) or any shared object, they " +
      "install side effects — hidden getters/setters, non-writable locks, non-configurable seals — that " +
      "are invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}` declaration " +
      "covers property-descriptor mutations. Callers cannot audit or reverse the change from the fn's " +
      "declared surface, and tests cannot isolate the effect without patching the global.",
    idiom:
      "avoid redefining properties on shared or global objects; " +
      "if descriptor mutation is intentional (polyfill, sealed config object), wrap in " +
      "`unsafe \"redefines <target>.<key> for <reason>\" { Object.defineProperty(...) }`",
    rewrite:
      "// before — installs a hidden getter on globalThis, invisible to callers\n" +
      "fn exposeConfig(cfg: Config) -> void {\n" +
      "  Object.defineProperty(globalThis, 'config', { get: () => cfg })  // SYN039\n" +
      "}\n\n" +
      "// after — pass config explicitly; no global mutation\n" +
      "fn getConfig(cfg: Config) -> Config {\n" +
      "  return cfg\n" +
      "}",
    example:
      "// SYN039: Object.defineProperty installs a hidden getter\n" +
      "fn exposeConfig(cfg: Config) -> void {\n" +
      "  Object.defineProperty(globalThis, 'config', { get: () => cfg })  // SYN039\n" +
      "}\n\n" +
      "// SYN039: Object.defineProperties mutates multiple descriptors at once\n" +
      "fn sealApi(api: Api) -> void {\n" +
      "  Object.defineProperties(api, { fetch: { value: myFetch, writable: false } })  // SYN039\n" +
      "}",
  },
  SYN040: {
    code: "SYN040",
    title: "Object.setPrototypeOf() / __proto__ assignment mutates the prototype chain at runtime, bypassing the capability model",
    rule:
      "`Object.setPrototypeOf(target, proto)` and `target.__proto__ = proto` replace the prototype " +
      "of `target` at runtime — silently redirecting all property lookups (including capability-gated " +
      "globals such as `fetch`, `WebSocket`, `setTimeout`) through a new prototype chain that is " +
      "invisible to the static capability model. SYN007–SYN039 checks fire on the source-level token " +
      "of the guarded global; if a prototype mutation happens first, those checks are defeated at " +
      "runtime even though the source appeared safe. A fn that mutates a prototype has a hidden " +
      "side effect with no `uses {}`, `reads {}`, or `writes {}` counterpart in its header.",
    idiom:
      "avoid prototype mutation inside fn bodies; if the shape change is truly intentional, " +
      "model it as an explicit data structure transformation or wrap in " +
      "`unsafe \"mutates prototype of <target> for <reason>\" { Object.setPrototypeOf(...) }`",
    rewrite:
      "// before — prototype mutation is a hidden, undeclared side effect\n" +
      "fn patchGlobal(proto: object) -> void {\n" +
      "  Object.setPrototypeOf(globalThis, proto)  // SYN040\n" +
      "}\n\n" +
      "// after — model the shape change as an explicit data structure\n" +
      "fn withProto<T extends object>(target: T, proto: object) -> T {\n" +
      "  return Object.create(proto, Object.getOwnPropertyDescriptors(target)) as T\n" +
      "}",
    example:
      "// SYN040: Object.setPrototypeOf() bypasses the capability model\n" +
      "fn shimFetch(proto: object) -> void {\n" +
      "  Object.setPrototypeOf(globalThis, proto)  // SYN040\n" +
      "}\n\n" +
      "// SYN040: __proto__ assignment equivalent\n" +
      "fn shimProto(obj: object, proto: object) -> void {\n" +
      "  obj.__proto__ = proto  // SYN040\n" +
      "}",
  },
  SYN041: {
    code: "SYN041",
    title: "globalThis / window / self receiver routes a dangerous global past SYN capability checks",
    rule:
      "Accessing a known-dangerous global via `globalThis.X`, `window.X`, or `self.X` " +
      "bypasses the bare-identifier detection of SYN004–SYN040: the compiler's existing " +
      "checks fire on `fetch(...)`, `eval(...)`, `WebSocket(...)`, etc. as bare calls, " +
      "but those same checks exclude member-access forms — so `globalThis.fetch(...)` " +
      "reaches the network without any capability warning. The global receiver form is " +
      "equivalent at runtime; the capability bypass is identical.",
    idiom:
      "use botscript stdlib equivalents with explicit `uses {}` declarations (e.g. `http.get` " +
      "instead of `globalThis.fetch`); if the global access is intentional, wrap in " +
      "`unsafe \"uses <global> directly for <reason>\" { globalThis.<name>(...) }`",
    rewrite:
      "// before — globalThis.fetch bypasses SYN007 and the capability model\n" +
      "fn getData(url: string) -> any {\n" +
      "  return globalThis.fetch(url)  // SYN041\n" +
      "}\n\n" +
      "// after — explicit capability declaration visible to callers\n" +
      "fn getData(url: string) uses { network } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN041: globalThis receiver bypasses the fetch capability check\n" +
      "fn fetchData(url: string) -> any {\n" +
      "  return globalThis.fetch(url)  // SYN041 — same as bare fetch(), same bypass\n" +
      "}\n\n" +
      "// fix: use the stdlib capability\n" +
      "fn fetchData(url: string) uses { network } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN043: {
    code: "SYN043",
    title: "computed string property access on global receiver bypasses SYN041 name-based detection",
    rule:
      "`globalThis['fetch'](url)`, `window['eval'](code)`, and similar computed-string bracket accesses " +
      "on global receivers bypass the bare-identifier detection of SYN004–SYN042 and the dot-notation " +
      "detection of SYN041: the dangerous global name appears inside a string literal, not as a source-level " +
      "identifier, so token-level checks on the callee ident cannot fire; " +
      "at runtime the capability bypass is identical to `globalThis.fetch(url)` or `fetch(url)` directly; " +
      "detection applies to `globalThis`, `window`, and `self` receivers followed by `[<string-literal>]` " +
      "where the literal value is one of the SYN041-monitored dangerous members; " +
      "suppressed inside `unsafe {}` blocks and `unsafe \"reason\" fn` bodies",
    idiom:
      "use botscript stdlib equivalents with explicit `uses {}` declarations instead of reaching for " +
      "dangerous globals via computed property access; if a specific runtime indirection is unavoidable, " +
      "wrap in `unsafe \"reason\" { globalThis['name'](...) }` to make the bypass visible in diff review",
    rewrite:
      "// before — globalThis['fetch'] bypasses SYN007 and SYN041\n" +
      "fn load(url: string) -> any {\n" +
      "  return globalThis['fetch'](url)  // SYN043\n" +
      "}\n\n" +
      "// after — explicit capability declaration visible to callers\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN043: globalThis['fetch'] bypasses the capability check\n" +
      "?bs 0.7\n" +
      "fn request(url: string) -> any {\n" +
      "  return globalThis['fetch'](url)  // SYN043\n" +
      "}\n\n" +
      "// SYN043: window['eval'] bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> void {\n" +
      "  window['eval'](code)  // SYN043\n" +
      "}\n\n" +
      "// fix: use stdlib equivalents with declared capabilities\n" +
      "fn request(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN044: {
    code: "SYN044",
    title: "SYN-guarded global assigned to a local binding and called through the alias bypasses name-token detection",
    rule:
      "Assigning a SYN-guarded global to a local binding (`const f = fetch`, `const e = eval`) and " +
      "then calling through that alias (`f(url)`, `e(code)`) bypasses SYN004–SYN043: all name-token checks " +
      "fire on the guarded identifier itself, but the call site token is `f` or `e` — not `fetch` or `eval` — " +
      "so the capability model is invisible to the alias. At runtime, `f(url)` and `fetch(url)` are identical; " +
      "the alias is purely an evasion of the static check. " +
      "Detection covers direct single-name RHS assignments (`const f = fetch`); " +
      "computed, destructured, or member-access RHS forms are not covered and fall back to ALI001/ALI003. " +
      "Suppressed inside `unsafe {}` blocks and `unsafe \"reason\" fn` bodies.",
    idiom:
      "call the guarded global directly so SYN004–SYN043 fire on the canonical name; " +
      "if the alias is genuinely needed (e.g. dependency injection), wrap the aliased call in " +
      "`unsafe \"calls <global> via alias for <reason>\" { f(...) }`",
    rewrite:
      "// before — const f = fetch aliases the guarded global; f(url) bypasses SYN007\n" +
      "const f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)  // SYN044\n" +
      "}\n\n" +
      "// after — call fetch directly; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN044: eval aliased and called through the binding\n" +
      "?bs 0.7\n" +
      "const run = eval\n" +
      "fn execute(code: string) -> any {\n" +
      "  return run(code)  // SYN044 — same as eval(code), bypasses SYN004\n" +
      "}\n\n" +
      "// fix: call eval directly (then SYN004 fires) or use a botscript-approved alternative\n" +
      "fn execute(code: string) -> any {\n" +
      "  eval(code)  // SYN004 fires here — add unsafe \"reason\" { } to acknowledge\n" +
      "}",
  },
  SYN045: {
    code: "SYN045",
    title: "Module-scope alias of a global receiver object used as member-access receiver in fn body bypasses SYN041–SYN043",
    rule:
      "Assigning a global receiver object (`globalThis`, `window`, `self`) to a module-scope binding " +
      "(`const g = globalThis`) and then using that alias as a member-access receiver inside a fn body " +
      "(`g.fetch(url)`, `g.eval(code)`) bypasses SYN041–SYN043: those checks fire on the literal receiver " +
      "tokens `globalThis`/`window`/`self` — the alias name `g` is not in any receiver watch-list, so " +
      "`g.fetch(url)` reaches the network with no capability warning. At runtime the access is identical. " +
      "Detection: a `const`/`let`/`var` binding at module scope whose RHS is exactly one of the three " +
      "global-receiver idents (no call, no member access on the RHS); when that alias appears as a " +
      "member-access receiver for a SYN041-dangerous member inside any fn body, SYN045 fires. " +
      "Fn-body-level aliases are not tracked to avoid shadowing false positives. " +
      "Suppressed inside `unsafe {}` blocks and `unsafe \"reason\" fn` bodies.",
    idiom:
      "access the guarded global directly so SYN041 fires on the canonical receiver name; " +
      "if aliasing globalThis/window/self is genuinely required, wrap the aliased member access in " +
      "`unsafe \"uses <member> via aliased receiver for <reason>\" { g.<member>(...) }`",
    rewrite:
      "// before — const g = globalThis aliases the receiver; g.fetch() bypasses SYN041\n" +
      "const g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)  // SYN045\n" +
      "}\n\n" +
      "// after — access through canonical receiver; SYN041 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN045: globalThis aliased and used as member-access receiver\n" +
      "?bs 0.7\n" +
      "const g = globalThis\n" +
      "fn run(url: string) -> any {\n" +
      "  return g.fetch(url)  // SYN045 — same as globalThis.fetch(url), bypasses SYN041\n" +
      "}\n\n" +
      "// fix: access globalThis.fetch directly (then SYN041 fires) or use stdlib\n" +
      "fn run(url: string) uses { net } -> any {\n" +
      "  return http.get(url)  // explicit capability declaration\n" +
      "}",
  },
  SYN046: {
    code: "SYN046",
    title: "Module-scope destructuring rename of a guarded global called through the alias bypasses SYN name-token checks",
    rule:
      "Destructuring a dangerous global from `globalThis`, `window`, or `self` with a rename " +
      "(`const { fetch: req } = globalThis`) and then calling through the alias (`req(url)`) " +
      "bypasses all name-token checks SYN004–SYN045: those checks fire on the canonical name " +
      "(`fetch`, `eval`, etc.) or the canonical receiver (`globalThis`/`window`/`self`) — " +
      "the renamed alias `req` appears on no watch-list, so `req(url)` reaches the network with " +
      "no capability warning. At runtime `req(url)` and `fetch(url)` are identical. " +
      "Detection: a `const`/`let`/`var` destructuring at module scope whose RHS is a global-receiver " +
      "ident and whose pattern contains a `dangerous: alias` rename where `dangerous` is in the " +
      "SYN037-guarded set; when that alias is called in any fn body (not a method access, not a " +
      "declaration), SYN046 fires. Fn-body-level destructuring is not tracked to avoid shadowing " +
      "false positives. `unsafe {}` blocks and `unsafe \"reason\" fn` bodies are suppressed.",
    idiom:
      "call the guarded global directly so the relevant SYN check fires; " +
      "if the destructuring rename is genuinely needed (e.g. dependency injection), wrap the call in " +
      "`unsafe \"calls <global> via destructuring rename for <reason>\" { req(...) }`",
    rewrite:
      "// before — const { fetch: req } = globalThis; req() bypasses SYN007\n" +
      "const { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)  // SYN046\n" +
      "}\n\n" +
      "// after — call fetch directly; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN046: fetch renamed during destructuring; req() bypasses SYN007\n" +
      "?bs 0.7\n" +
      "const { fetch: req } = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return req(url)  // SYN046 — same as fetch(url), bypasses SYN007+SYN044\n" +
      "}\n\n" +
      "// SYN046: eval renamed; run() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "const { eval: run } = globalThis\n" +
      "fn execute(code: string) -> any {\n" +
      "  return run(code)  // SYN046\n" +
      "}\n\n" +
      "// fix: call the guarded global directly\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)  // explicit capability declaration\n" +
      "}",
  },
  SYN047: {
    code: "SYN047",
    title: "Node.js global receiver bypasses SYN041–SYN046 capability checks",
    rule:
      "In Node.js, `global` is the native global object — equivalent to `globalThis` at runtime. " +
      "Accessing a dangerous global via `global.fetch(url)`, `global['eval'](code)`, or writing " +
      "`global.foo = val` bypasses all 46 prior SYN checks: SYN041–SYN043 only watch " +
      "`globalThis`, `window`, and `self` receivers, so `global.*` routes the same capability " +
      "bypass past every token-level check. Detection: `global.<member>` or `global[<string-literal>]` " +
      "access inside a fn body where `<member>` or the literal is a SYN041-dangerous global or a " +
      "property write to `global.*`; `unsafe {}` blocks and `unsafe \"reason\" fn` bodies are suppressed. " +
      "Note: `global` used as a parameter name or local binding is not distinguished — prefer " +
      "`globalThis` (cross-environment standard) over `global` in botscript code.",
    idiom:
      "use botscript stdlib equivalents with explicit `uses {}` declarations rather than reaching for " +
      "`global.*`; if `global` access is genuinely required (e.g. Node built-in shimming), " +
      "wrap in `unsafe \"uses <member> via Node global for <reason>\" { global.<member> }`",
    rewrite:
      "// before — global.fetch bypasses SYN007 and SYN041\n" +
      "fn load(url: string) -> any {\n" +
      "  return global.fetch(url)  // SYN047\n" +
      "}\n\n" +
      "// after — explicit capability declaration visible to callers\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN047: global.fetch bypasses the network capability check\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return global.fetch(url)  // SYN047 — same bypass as globalThis.fetch (SYN041)\n" +
      "}\n\n" +
      "// SYN047: computed bracket form\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return global['eval'](code)  // SYN047 — same bypass as globalThis['eval'] (SYN043)\n" +
      "}\n\n" +
      "// fix: explicit capability\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN048: {
    code: "SYN048",
    title: "fn-body-local alias of a SYN-guarded global bypasses SYN004–SYN047 name-token detection",
    rule:
      "Declaring a binding inside a fn body that aliases a SYN-guarded global (`const req = fetch`, " +
      "`const run = eval`) and then calling through that alias (`req(url)`, `run(code)`) in the same fn body " +
      "bypasses all 47 prior SYN checks: those checks fire on the canonical identifier token, but the call-site " +
      "token is `req` or `run` — not `fetch` or `eval`. " +
      "SYN044 only covers module-scope aliases (it explicitly skips fn-body-local bindings to avoid shadowing " +
      "false positives at module scope). " +
      "SYN048 fills the gap: per-fn-body pre-pass collects `const`/`let`/`var <alias> = <guarded-global>` " +
      "declarations inside the fn body (skipping nested fn bodies to respect scope), then fires when the alias " +
      "is called (next significant token is `(` or `?.`) in the same body. Member-access calls (`obj.req()`), " +
      "declaration sites, and `unsafe {}` blocks are suppressed.",
    idiom:
      "call the guarded global directly so the relevant SYN check fires; " +
      "if aliasing is genuinely needed for readability or dependency injection, wrap the call in " +
      "`unsafe \"calls <global> via local alias for <reason>\" { req(...) }`",
    rewrite:
      "// before — const req = fetch inside fn body; req(url) bypasses SYN007\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return req(url)  // SYN048\n" +
      "}\n\n" +
      "// after — call fetch directly; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN048: fetch aliased inside fn body; req() bypasses SYN007\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const req = fetch\n" +
      "  return req(url)  // SYN048 — same as fetch(url), bypasses SYN004–SYN047\n" +
      "}\n\n" +
      "// SYN048: eval aliased inside fn body; run() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  const run = eval\n" +
      "  return run(code)  // SYN048\n" +
      "}\n\n" +
      "// fix: call the guarded global directly (then SYN007/SYN004 fires)\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN049: {
    code: "SYN049",
    title: "fn-body-local alias of a global receiver used as member-access receiver bypasses SYN041–SYN048",
    rule:
      "`const g = globalThis` (or `window`, `self`) declared inside a fn body followed by `g.fetch(url)` " +
      "or `g['eval'](code)` in the same fn body bypasses SYN041–SYN048: SYN041 fires on `globalThis.X`, " +
      "`window.X`, and `self.X` tokens directly, but when the receiver is a local alias the canonical receiver " +
      "token does not appear at the call site. " +
      "SYN045 covers module-scope receiver aliases; SYN049 closes the fn-body gap: per-fn-body pre-pass " +
      "collects `const`/`let`/`var <alias> = <receiver-global>` declarations (skipping nested fn bodies), " +
      "then fires when the alias is followed by `.` or `?.` and a dangerous member name from the SYN041 " +
      "watch-list in the same fn body. Suppressed inside `unsafe {}` blocks and `unsafe \"reason\" fn` bodies.",
    idiom:
      "access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 " +
      "fires; better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",
    rewrite:
      "// before — const g = globalThis inside fn body; g.fetch() bypasses SYN007+SYN041\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.fetch(url)  // SYN049\n" +
      "}\n\n" +
      "// after — use stdlib; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN049: globalThis aliased inside fn body; g.fetch() bypasses SYN041\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const g = globalThis\n" +
      "  return g.fetch(url)  // SYN049 — same as globalThis.fetch(url), bypasses SYN041–SYN048\n" +
      "}\n\n" +
      "// SYN049: window aliased inside fn body; w.eval() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  const w = window\n" +
      "  return w.eval(code)  // SYN049\n" +
      "}\n\n" +
      "// fix: use the botscript stdlib or access via canonical receiver\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN050: {
    code: "SYN050",
    title: "fn-body-local destructuring rename of a guarded global bypasses SYN004–SYN049 name-token detection",
    rule:
      "`const { fetch: req } = globalThis` (or `window`, `self`) declared inside a fn body followed by " +
      "`req(url)` in the same fn body bypasses all 49 prior SYN checks: those checks fire on the canonical " +
      "identifier token, but the call-site token is `req` — not `fetch`. " +
      "SYN046 covers module-scope destructuring renames; SYN050 closes the fn-body gap: per-fn-body pre-pass " +
      "collects `const`/`let`/`var { <guarded>: <alias> } = <receiver>` declarations inside each fn body " +
      "(skipping nested fn bodies), then fires when the alias is called (next significant token is `(` or `?.`) " +
      "in the same fn body. Member-access calls (`obj.req()`), declaration sites, and `unsafe {}` blocks are suppressed.",
    idiom:
      "call the guarded global directly so the relevant SYN check fires; if destructuring aliasing is " +
      "genuinely needed, wrap the call in `unsafe \"calls <global> via destructured alias for <reason>\" { req(...) }`",
    rewrite:
      "// before — const { fetch: req } = globalThis inside fn body; req(url) bypasses SYN007\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  return req(url)  // SYN050\n" +
      "}\n\n" +
      "// after — call fetch directly; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN050: fetch destructured-renamed inside fn body; req() bypasses SYN007\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  const { fetch: req } = globalThis\n" +
      "  return req(url)  // SYN050 — same as fetch(url), bypasses SYN004–SYN049\n" +
      "}\n\n" +
      "// SYN050: eval destructured-renamed inside fn body; run() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  const { eval: run } = globalThis\n" +
      "  return run(code)  // SYN050\n" +
      "}\n\n" +
      "// fix: call the guarded global directly (then SYN007/SYN004 fires)\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN042: {
    code: "SYN042",
    title: "Reflect.* call bypasses static name-based SYN capability and property checks",
    rule:
      "Six `Reflect` methods defeat botscript's token-level static checks: " +
      "`Reflect.apply(target, thisArg, args)` and `Reflect.construct(target, args)` call a function or " +
      "constructor dynamically — SYN004–SYN041 fire on source-level idents (eval, fetch, WebSocket…) and " +
      "cannot see through dynamic dispatch, so `Reflect.apply(fetch, null, [url])` reaches the network " +
      "with no capability warning; " +
      "`Reflect.set(obj, key, value)`, `Reflect.defineProperty(obj, key, attrs)`, and " +
      "`Reflect.deleteProperty(obj, key)` mutate object properties at runtime — invisible to " +
      "the capability model and equivalent to the mutations caught by SYN039; " +
      "`Reflect.setPrototypeOf(obj, proto)` replaces the prototype chain, defeating runtime-level " +
      "property-lookup guards in the same way as `Object.setPrototypeOf` (SYN040)",
    idiom:
      "avoid Reflect methods on shared or capability-gated objects; pass functions as explicit parameters " +
      "instead of dispatching them dynamically; if Reflect use is required for a legitimate reason, " +
      "wrap in `unsafe \"reason for Reflect.method\" { Reflect.method(...) }`",
    rewrite:
      "// before — Reflect.apply bypasses SYN007 and reaches the network\n" +
      "fn fetchData(url: string) -> any {\n" +
      "  return Reflect.apply(fetch, null, [url])  // SYN042\n" +
      "}\n\n" +
      "// after — explicit capability declaration visible to callers\n" +
      "fn fetchData(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN042: Reflect.apply bypasses the fetch capability check\n" +
      "fn fetchData(url: string) -> any {\n" +
      "  return Reflect.apply(fetch, null, [url])  // SYN042\n" +
      "}\n\n" +
      "// SYN042: Reflect.set mutates object property invisibly\n" +
      "fn mutate(obj: Record<string, unknown>) -> void {\n" +
      "  Reflect.set(obj, 'key', 'value')  // SYN042\n" +
      "}\n\n" +
      "// fix: pass values explicitly rather than using reflective mutation\n" +
      "fn mutate(obj: Record<string, unknown>, key: string, value: unknown) -> void {\n" +
      "  obj[key] = value\n" +
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
  MAT005: {
    code: "MAT005",
    title: "match arm on halt-annotated variant must call halt() or throw",
    rule:
      "a match arm covering a variant declared with the `halt` modifier must terminate by " +
      "calling `halt()` or using a `throw` expression — returning a continuable value is not allowed; " +
      "use `unsafe \"<reason>\" { ... }` to explicitly override the constraint when a recovery path is truly safe",
    idiom:
      "halt-annotated variants represent states that cannot be safely continued from (epistemic debt, " +
      "unresolvable errors, etc.); the compiler enforces that these arms cannot silently produce a value " +
      "that lets execution continue as if nothing happened",
    rewrite:
      "change the arm body to call `halt(<message>)` or `throw new Error(<message>)` " +
      "instead of returning a continuable value",
    example:
      "// before — Unresolvable halt arm returns a string (MAT005)\n" +
      "?bs 0.9\n" +
      "type QueryResult = Confirmed { value: string } | Unresolvable halt { reason: string }\n\n" +
      "fn handleQuery(r: QueryResult) -> string {\n" +
      "  match r {\n" +
      "    Confirmed { value } -> value\n" +
      "    Unresolvable { reason } -> \"best effort\"  // MAT005\n" +
      "  }\n" +
      "}\n\n" +
      "// after — arm terminates with halt()\n" +
      "?bs 0.9\n" +
      "type QueryResult = Confirmed { value: string } | Unresolvable halt { reason: string }\n\n" +
      "fn handleQuery(r: QueryResult) -> string {\n" +
      "  match r {\n" +
      "    Confirmed { value } -> value\n" +
      "    Unresolvable { reason } -> halt(`unresolvable: ${reason}`)\n" +
      "  }\n" +
      "}",
  },
  MAT006: {
    code: "MAT006",
    title: "distinct-annotated variant handled identically to a sibling arm",
    rule:
      "a variant declared with the `distinct` modifier requires its match arm body to differ " +
      "from all other non-wildcard arms in the same match expression — identical arm bodies " +
      "indicate the epistemic distinction between variants is being silently collapsed",
    idiom:
      "`distinct` marks a variant whose error class is fundamentally different from its siblings " +
      "(e.g. operational failure vs. epistemic debt); the compiler enforces that these arms have " +
      "observably different handling so that the type-level separation is not a no-op at runtime",
    rewrite:
      "give the arm for the `distinct` variant a body that differs from its sibling arms — " +
      "at minimum, call a different function or emit a different diagnostic to preserve the distinction",
    example:
      "// before — Unresolvable distinct arm uses same body as Recoverable arm (MAT006)\n" +
      "?bs 0.9\n" +
      "type QueryResult =\n" +
      "  | Confirmed { value: string }\n" +
      "  | Recoverable { reason: string }\n" +
      "  | Unresolvable distinct { reason: string }\n\n" +
      "fn handleQuery(r: QueryResult) -> string {\n" +
      "  match r {\n" +
      "    Confirmed { value } -> value\n" +
      "    Recoverable { reason } -> continueWithDefault(reason)\n" +
      "    Unresolvable { reason } -> continueWithDefault(reason)  // MAT006\n" +
      "  }\n" +
      "}\n\n" +
      "// after — distinct arm has observably different handling\n" +
      "?bs 0.9\n" +
      "type QueryResult =\n" +
      "  | Confirmed { value: string }\n" +
      "  | Recoverable { reason: string }\n" +
      "  | Unresolvable distinct { reason: string }\n\n" +
      "fn handleQuery(r: QueryResult) -> string {\n" +
      "  match r {\n" +
      "    Confirmed { value } -> value\n" +
      "    Recoverable { reason } -> continueWithDefault(reason)\n" +
      "    Unresolvable { reason } -> halt(`unresolvable query: ${reason}`)\n" +
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
  SYN051: {
    code: "SYN051",
    title: "module-scope assignment-expression alias of a guarded global called in a fn body bypasses SYN004–SYN050",
    rule:
      "`let f; f = fetch` at module scope followed by `f(url)` inside a fn body bypasses SYN004–SYN050: " +
      "all prior checks fire on the guarded identifier token at the call site, but `f` is not in any watch-list. " +
      "SYN044 catches the `const/let/var f = fetch` declaration form; SYN051 closes the bare assignment gap: " +
      "a pre-pass scans module-scope assignment expressions (`<ident> = <guarded>`, not preceded by `const`/`let`/`var`) " +
      "and fires when the alias is called (next significant token is `(` or `?.`) in any fn body. " +
      "Member-access calls (`obj.f()`), declaration sites, and `unsafe {}` blocks are suppressed.",
    idiom:
      "call the guarded global directly so the relevant SYN check fires; if the alias is genuinely needed, " +
      "wrap the call in `unsafe \"calls <global> via assignment alias for <reason>\" { f(...) }`",
    rewrite:
      "// before — let f at module scope; f = fetch then f(url) in fn body bypasses SYN007\n" +
      "?bs 0.7\n" +
      "let f: typeof fetch\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)  // SYN051\n" +
      "}\n\n" +
      "// after — call fetch directly; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN051: let f at module scope; f = fetch (assignment, not declaration); f() bypasses SYN007\n" +
      "?bs 0.7\n" +
      "let f: typeof fetch\n" +
      "f = fetch\n" +
      "fn load(url: string) -> any {\n" +
      "  return f(url)  // SYN051 — f is a module-scope assignment alias of fetch\n" +
      "}\n\n" +
      "// SYN051: f = eval; f() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "let f: typeof eval\n" +
      "f = eval\n" +
      "fn execute(code: string) -> any {\n" +
      "  return f(code)  // SYN051\n" +
      "}\n\n" +
      "// fix: call the guarded global directly (then SYN007/SYN004 fires)\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN052: {
    code: "SYN052",
    title: "module-scope assignment-expression alias of a global receiver used as member-access receiver bypasses SYN041–SYN050",
    rule:
      "`let g; g = globalThis` (or `window`, `self`) at module scope followed by `g.fetch(url)` inside a fn body " +
      "bypasses SYN041–SYN050: those checks fire on the literal receiver tokens (`globalThis`, `window`, `self`) " +
      "and prior alias checks fire on `const/let/var`-declared aliases, but `g` assigned via a bare expression " +
      "is not in any receiver watch-list. " +
      "SYN045 catches the `const/let/var g = globalThis` declaration form; SYN052 closes the bare assignment gap: " +
      "a pre-pass scans module-scope assignment expressions (`<ident> = <receiver-global>`, not preceded by `const`/`let`/`var`) " +
      "and fires when the alias appears as a member-access receiver (`g.member` or `g?.member`) for a dangerous " +
      "member in the SYN041 watch-list inside any fn body. `unsafe {}` blocks are suppressed.",
    idiom:
      "access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 " +
      "fires; better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",
    rewrite:
      "// before — let g at module scope; g = globalThis then g.fetch() in fn body bypasses SYN041\n" +
      "?bs 0.7\n" +
      "let g: typeof globalThis\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)  // SYN052\n" +
      "}\n\n" +
      "// after — use stdlib; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN052: let g at module scope; g = globalThis (assignment); g.fetch() bypasses SYN041\n" +
      "?bs 0.7\n" +
      "let g: typeof globalThis\n" +
      "g = globalThis\n" +
      "fn load(url: string) -> any {\n" +
      "  return g.fetch(url)  // SYN052 — g is an assignment alias of globalThis\n" +
      "}\n\n" +
      "// SYN052: g = window; g.eval() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "let g: typeof window\n" +
      "g = window\n" +
      "fn execute(code: string) -> any {\n" +
      "  return g.eval(code)  // SYN052\n" +
      "}\n\n" +
      "// fix: use the botscript stdlib or access via canonical receiver\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN053: {
    code: "SYN053",
    title: "fn-body assignment-expression alias of a guarded global called in the same fn body bypasses SYN004–SYN052",
    rule:
      "`let f; f = fetch` inside a fn body followed by `f(url)` in the same fn body bypasses SYN004–SYN052: " +
      "all prior checks fire on the guarded identifier token at the call site, but `f` is not in any watch-list. " +
      "SYN048 catches the `const/let/var f = fetch` declaration form inside fn bodies; SYN051 catches the bare " +
      "assignment form at module scope. SYN053 closes the remaining gap: a per-fn-body pre-pass scans assignment " +
      "expressions (`<ident> = <guarded>`, not preceded by `const`/`let`/`var`) inside each fn body and fires " +
      "when the alias is called (next significant token is `(` or `?.`) in the same fn body. " +
      "Member-access calls (`obj.f()`), declaration sites, and `unsafe {}` blocks are suppressed.",
    idiom:
      "call the guarded global directly so the relevant SYN check fires; if the alias is genuinely needed, " +
      "wrap the call in `unsafe \"calls <global> via assignment alias for <reason>\" { f(...) }`",
    rewrite:
      "// before — let f inside fn body; f = fetch then f(url) bypasses SYN007\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: typeof fetch\n" +
      "  f = fetch\n" +
      "  return f(url)  // SYN053\n" +
      "}\n\n" +
      "// after — call fetch directly; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN053: let f inside fn body; f = fetch (assignment, not declaration); f() bypasses SYN007\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let f: typeof fetch\n" +
      "  f = fetch\n" +
      "  return f(url)  // SYN053 — f is a fn-body assignment alias of fetch\n" +
      "}\n\n" +
      "// SYN053: f = eval; f() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  let f: typeof eval\n" +
      "  f = eval\n" +
      "  return f(code)  // SYN053\n" +
      "}\n\n" +
      "// fix: call the guarded global directly (then SYN007/SYN004 fires)\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN054: {
    code: "SYN054",
    title: "fn-body assignment-expression alias of a global receiver used as member-access receiver in the same fn body bypasses SYN041–SYN052",
    rule:
      "`let g; g = globalThis` (or `window`, `self`) inside a fn body followed by `g.fetch(url)` in the same fn body " +
      "bypasses SYN041–SYN052: those checks fire on the literal receiver tokens (`globalThis`, `window`, `self`) " +
      "and prior alias checks fire on `const/let/var`-declared aliases or module-scope assignment aliases, but " +
      "`g` assigned via a bare expression inside a fn body is not in any receiver watch-list. " +
      "SYN049 catches the `const/let/var g = globalThis` declaration form inside fn bodies; SYN052 catches the " +
      "bare assignment form at module scope. SYN054 closes the remaining gap: a per-fn-body pre-pass scans " +
      "assignment expressions (`<ident> = <receiver-global>`, not preceded by `const`/`let`/`var`) inside each " +
      "fn body and fires when the alias appears as a member-access receiver (`g.member` or `g?.member`) for a " +
      "dangerous member in the SYN041 watch-list in the same fn body. `unsafe {}` blocks are suppressed.",
    idiom:
      "access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 " +
      "fires; better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",
    rewrite:
      "// before — let g inside fn body; g = globalThis then g.fetch() bypasses SYN041\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: typeof globalThis\n" +
      "  g = globalThis\n" +
      "  return g.fetch(url)  // SYN054\n" +
      "}\n\n" +
      "// after — use stdlib; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN054: let g inside fn body; g = globalThis (assignment); g.fetch() bypasses SYN041\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  let g: typeof globalThis\n" +
      "  g = globalThis\n" +
      "  return g.fetch(url)  // SYN054 — g is a fn-body assignment alias of globalThis\n" +
      "}\n\n" +
      "// SYN054: g = window; g.eval() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn execute(code: string) -> any {\n" +
      "  let g: typeof window\n" +
      "  g = window\n" +
      "  return g.eval(code)  // SYN054\n" +
      "}\n\n" +
      "// fix: use the botscript stdlib or access via canonical receiver\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN055: {
    code: "SYN055",
    title: "default-parameter alias of a guarded global called in the fn body bypasses SYN004–SYN054",
    rule:
      "`fn run(f = fetch)` gives the fn body a parameter `f` bound to `fetch` by default. " +
      "All prior alias checks (SYN044, SYN048, SYN051, SYN053) start scanning from the opening `{` of the fn body, " +
      "so a default-parameter binding in the parameter list is never tracked. When `f` is called in the body, " +
      "SYN007 does not fire because the call site token is `f`, not `fetch`. " +
      "SYN055 closes this gap: a per-fn pre-pass scans the parameter list (tokens before the body `{`) for " +
      "`<ident> = <guarded-global>` default-value patterns and fires when the alias is called (next significant token " +
      "is `(` or `?.`) in the fn body. `unsafe {}` blocks are suppressed.",
    idiom:
      "pass the callable as an explicit parameter without a default (or with a botscript-stdlib equivalent), " +
      "so the call site token is the guarded global and the relevant SYN check fires; " +
      "if the default is intentional, wrap the call in `unsafe \"calls <global> via default-param alias for <reason>\" { f(...) }`",
    rewrite:
      "// before — default parameter f = fetch; f(url) bypasses SYN007\n" +
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return f(url)  // SYN055\n" +
      "}\n\n" +
      "// after — call fetch directly; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN055: default param f = fetch; f(url) bypasses SYN007\n" +
      "?bs 0.7\n" +
      "fn load(url: string, f = fetch) -> any {\n" +
      "  return f(url)  // SYN055 — f is a default-parameter alias of fetch\n" +
      "}\n\n" +
      "// SYN055: default param run = eval; run(code) bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn execute(code: string, run = eval) -> any {\n" +
      "  return run(code)  // SYN055\n" +
      "}\n\n" +
      "// fix: call the guarded global directly (then SYN007/SYN004 fires)\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN056: {
    code: "SYN056",
    title: "default-parameter alias of a global receiver object used as member-access receiver in the fn body bypasses SYN041–SYN054",
    rule:
      "`fn run(g = globalThis)` gives the fn body a parameter `g` bound to `globalThis` by default. " +
      "All prior receiver-alias checks (SYN045, SYN049, SYN052, SYN054) start scanning from the opening `{` of the fn body, " +
      "so a default-parameter binding in the parameter list is never tracked. When `g.fetch(url)` is used in the body, " +
      "SYN041 does not fire because the receiver token is `g`, not `globalThis`/`window`/`self`. " +
      "SYN056 closes this gap: a per-fn pre-pass scans the parameter list for `<ident> = <receiver-global>` " +
      "default-value patterns and fires when the alias appears as a member-access receiver (`alias.member` or " +
      "`alias?.member`) for a SYN041-dangerous member in the fn body. `unsafe {}` blocks are suppressed.",
    idiom:
      "access dangerous globals via their canonical receiver token (`globalThis.X`, `window.X`) so SYN041 fires; " +
      "better still, use the botscript stdlib capability equivalent with an explicit `uses {}` declaration",
    rewrite:
      "// before — default param g = globalThis; g.fetch() bypasses SYN041\n" +
      "?bs 0.7\n" +
      "fn load(url: string, g = globalThis) -> any {\n" +
      "  return g.fetch(url)  // SYN056\n" +
      "}\n\n" +
      "// after — use stdlib; SYN007 fires if uses { net } is missing\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
    example:
      "// SYN056: default param g = globalThis; g.fetch() bypasses SYN041\n" +
      "?bs 0.7\n" +
      "fn load(url: string, g = globalThis) -> any {\n" +
      "  return g.fetch(url)  // SYN056 — g is a default-parameter alias of globalThis\n" +
      "}\n\n" +
      "// SYN056: default param g = window; g.eval() bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn execute(code: string, g = window) -> any {\n" +
      "  return g.eval(code)  // SYN056\n" +
      "}\n\n" +
      "// fix: use the botscript stdlib or access via canonical receiver\n" +
      "fn load(url: string) uses { net } -> any {\n" +
      "  return http.get(url)\n" +
      "}",
  },
  SYN057: {
    code: "SYN057",
    title: "eval or Function used as a tagged-template tag bypasses SYN004 call-syntax detection",
    rule:
      "`eval\\`code\\`` and `Function\\`body\\`` are valid JavaScript: when a function appears " +
      "immediately before a template literal without `()`, the function is called as a tagged-template " +
      "handler with the template parts as its argument. SYN004 requires `eval` or `Function` to be " +
      "followed by `(`, `?.(`, or `<T>(` — a bare backtick is not `(`, so the tagged-template form " +
      "slips past detection. The template string is still executed as code at runtime, carrying all " +
      "the same capability-bypass risks as `eval(src)` or `new Function(body)`. " +
      "SYN057 closes this gap: when `eval` or `Function` is the tag of a template literal in a fn body, " +
      "the warning fires. `unsafe {}` blocks are suppressed.",
    idiom:
      "use explicit code instead of runtime string evaluation; " +
      "if the tagged-template form is genuinely required, wrap in `unsafe \"reason\" { eval\\`...\\` }`",
    rewrite:
      "// before — eval as tagged template bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval`${code}`  // SYN057\n" +
      "}\n\n" +
      "// after — avoid dynamic evaluation entirely\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  // replace with explicit logic\n" +
      "}",
    example:
      "// SYN057: eval as tagged template\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval`${code}`  // SYN057 — tagged template bypasses SYN004\n" +
      "}\n\n" +
      "// SYN057: Function as tagged template\n" +
      "?bs 0.7\n" +
      "fn build(body: string) -> any {\n" +
      "  return Function`return 42`()  // SYN057 — Function\\`...\\` constructs a fn from template\n" +
      "}\n\n" +
      "// fix: remove dynamic evaluation; use explicit code\n" +
      "// or: unsafe \"reason\" { eval`${code}` }",
  },

  SYN058: {
    code: "SYN058",
    title: "eval.constructor(...) or Function.constructor(...) bypasses SYN004 call-syntax detection",
    rule:
      "Every JavaScript function's `.constructor` property is `Function` — so `eval.constructor` " +
      "and `Function.constructor` both return the `Function` constructor without spelling out " +
      "`Function` or `eval` in a call position. SYN004 requires `eval` or `Function` to be " +
      "followed by `(`, `?.(`, `` ` ``, or `<T>(` — a trailing `.constructor` is none of these, " +
      "so the constructor-access form slips past detection. The constructed function is still " +
      "executed as code at runtime, carrying all the same capability-bypass risks as " +
      "`eval(src)` or `new Function(body)`. " +
      "SYN058 closes this gap: when `eval` or `Function` (bare, not a member access) is " +
      "followed by `.constructor(` or `?.constructor(` in a fn body, the warning fires. " +
      "`unsafe {}` blocks are suppressed.",
    idiom:
      "use explicit code instead of runtime string evaluation; " +
      "if the constructor form is genuinely required, wrap in `unsafe \"reason\" { eval.constructor(...) }`",
    rewrite:
      "// before — eval.constructor bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval.constructor(code)()  // SYN058\n" +
      "}\n\n" +
      "// after — avoid dynamic evaluation entirely\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  // replace with explicit logic\n" +
      "}",
    example:
      "// SYN058: eval.constructor bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval.constructor(code)()  // SYN058 — eval.constructor is Function\n" +
      "}\n\n" +
      "// SYN058: Function.constructor also bypasses SYN004\n" +
      "?bs 0.7\n" +
      "fn build(body: string) -> any {\n" +
      "  return Function.constructor(body)()  // SYN058\n" +
      "}\n\n" +
      "// fix: remove dynamic evaluation; use explicit code\n" +
      "// or: unsafe \"reason\" { eval.constructor(code)() }",
  },

  SYN059: {
    code: "SYN059",
    title: "eval.prototype.constructor(...) or Function.prototype.constructor(...) bypasses SYN058",
    rule:
      "`Function.prototype.constructor` evaluates to `Function` — so " +
      "`Function.prototype.constructor(body)()` creates and executes arbitrary code " +
      "just like `new Function(body)()`. SYN058 catches `eval.constructor(` and " +
      "`Function.constructor(` but not the two-hop form where `.prototype.` is " +
      "inserted between the guarded ident and `.constructor(`: SYN058 looks for " +
      "`.constructor(` as the immediate next member after the ident, so " +
      "`.prototype.constructor(` is invisible to it. The runtime behavior is " +
      "identical — code execution from a string — and all the same capability-bypass " +
      "risks apply. SYN059 closes this gap: when `eval` or `Function` (bare, not " +
      "preceded by `.`/`?.`) is followed by `.prototype.constructor(` (each dot may " +
      "be `?.`) in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",
    idiom:
      "use explicit code instead of runtime string evaluation; " +
      "if the prototype.constructor form is genuinely required, wrap in " +
      "`unsafe \"reason\" { Function.prototype.constructor(...) }`",
    rewrite:
      "// before — Function.prototype.constructor bypasses SYN058\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function.prototype.constructor(code)()  // SYN059\n" +
      "}\n\n" +
      "// after — avoid dynamic evaluation entirely\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  // replace with explicit logic\n" +
      "}",
    example:
      "// SYN059: Function.prototype.constructor bypasses SYN058\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Function.prototype.constructor(code)()  // SYN059\n" +
      "}\n\n" +
      "// SYN059: eval.prototype.constructor also bypasses SYN058\n" +
      "?bs 0.7\n" +
      "fn build(body: string) -> any {\n" +
      "  return eval.prototype.constructor(body)()  // SYN059\n" +
      "}\n\n" +
      "// fix: remove dynamic evaluation; use explicit code\n" +
      "// or: unsafe \"reason\" { Function.prototype.constructor(code)() }",
  },
  SYN060: {
    code: "SYN060",
    title: "(fn-expr).constructor(...) — function-expression .constructor bypasses SYN004–SYN059",
    rule:
      "Every JavaScript function's `.constructor` property is the `Function` constructor — so " +
      "`(()=>{}).constructor(code)()` and `(function(){}).constructor(code)()` both create " +
      "and execute arbitrary code at runtime, exactly like `new Function(code)()`. " +
      "SYN004–SYN059 guard the named idents `eval` and `Function`, but when the receiver is " +
      "an anonymous function expression literal, none of those idents appear in the source: " +
      "the guarded-name checks are invisible to this form. SYN060 closes this gap: when `)` " +
      "closes a paren group whose content is a function expression (arrow `=>` or `function` " +
      "keyword at the top level of the group) and is immediately followed by `.constructor(` " +
      "or `?.constructor(` in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",
    idiom:
      "use explicit code instead of runtime string evaluation; " +
      "if the function-expression constructor form is genuinely required, wrap in " +
      "`unsafe \"reason\" { (()=>{}).constructor(...) }`",
    rewrite:
      "// before — function-expression .constructor bypasses SYN004–SYN059\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (()=>{}).constructor(code)()  // SYN060\n" +
      "}\n\n" +
      "// after — avoid dynamic evaluation entirely\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  // replace with explicit logic\n" +
      "}",
    example:
      "// SYN060: arrow-function .constructor bypasses SYN004–SYN059\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (()=>{}).constructor(code)()  // SYN060\n" +
      "}\n\n" +
      "// SYN060: function-expression .constructor also fires\n" +
      "?bs 0.7\n" +
      "fn build(body: string) -> any {\n" +
      "  return (function(){}).constructor(body)()  // SYN060\n" +
      "}\n\n" +
      "// fix: remove dynamic evaluation; use explicit code\n" +
      "// or: unsafe \"reason\" { (()=>{}).constructor(code)() }",
  },
  SYN061: {
    code: "SYN061",
    title: "expr.constructor.constructor(...) — two-hop constructor chain reaches Function (?bs 0.7+)",
    rule:
      "Every JavaScript value's `.constructor` property is a constructor function " +
      "(`String`, `Number`, `Boolean`, `Array`, `Object`, `Function`, or a user class), " +
      "and every constructor function's `.constructor` is the `Function` constructor — " +
      "so any `.constructor.constructor(code)()` chain executes arbitrary code at runtime, " +
      "exactly like `new Function(code)()`. This applies to any receiver: " +
      "`[].constructor.constructor(code)()`, `({}).constructor.constructor(code)()`, " +
      "`(function(){}).constructor.constructor(code)()`, and `x.constructor.constructor(code)()` " +
      "are all equivalent. " +
      "SYN004–SYN060 guard `eval`/`Function` by name and fn expressions by one-hop `.constructor(`; " +
      "a two-hop chain through any expression spells none of those guarded forms. " +
      "SYN061 closes the gap: any expression immediately followed by " +
      "`.constructor.constructor(` (each dot may be `?.`) in a fn body triggers the warning. " +
      "`unsafe {}` blocks are suppressed.",
    idiom:
      "use explicit code instead of runtime string evaluation; " +
      "if the two-hop constructor form is genuinely required, wrap in " +
      "`unsafe \"reason\" { expr.constructor.constructor(...) }`",
    rewrite:
      "// before — .constructor.constructor bypasses SYN004–SYN060\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [].constructor.constructor(code)()  // SYN061\n" +
      "}\n\n" +
      "// after — avoid dynamic evaluation entirely\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  // replace with explicit logic\n" +
      "}",
    example:
      "// SYN061: array-literal constructor chain reaches Function\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return [].constructor.constructor(code)()  // SYN061\n" +
      "}\n\n" +
      "// SYN061: object-literal constructor chain also fires\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return ({}).constructor.constructor(code)()  // SYN061\n" +
      "}\n\n" +
      "// SYN061: function-expression constructor chain also fires\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return (function(){}).constructor.constructor(code)()  // SYN061\n" +
      "}\n\n" +
      "// fix: remove dynamic evaluation; use explicit code\n" +
      "// or: unsafe \"reason\" { expr.constructor.constructor(code)() }",
  },

  SYN062: {
    code: "SYN062",
    title: "Object/Reflect.getPrototypeOf(expr).constructor(...) or __proto__.constructor(...) — prototype-navigation path reaches Function (?bs 0.7+)",
    rule:
      "`Object.getPrototypeOf(fn)` and `Reflect.getPrototypeOf(fn)` both return `Function.prototype`; " +
      "calling `.constructor(...)` on `Function.prototype` invokes the `Function` constructor, " +
      "which executes a string as code at runtime — exactly like `new Function(code)()`. " +
      "Similarly, `expr.__proto__` walks the prototype chain, and `.constructor` on the result " +
      "can reach `Function` the same way. " +
      "SYN004–SYN061 guard `eval`/`Function` by name, fn-expression shape, and " +
      "any `.constructor.constructor(` two-hop chain; prototype-navigation via " +
      "`Object.getPrototypeOf`/`Reflect.getPrototypeOf`/`__proto__` spells none of those guarded forms. " +
      "SYN062 closes this gap: when `Object.getPrototypeOf(...).constructor(` (or the Reflect or " +
      "`__proto__` variants) appears in a fn body, the warning fires. `unsafe {}` blocks are suppressed.",
    idiom:
      "use explicit code instead of runtime string evaluation; " +
      "if the prototype-navigation form is genuinely required, wrap in " +
      "`unsafe \"reason\" { Object.getPrototypeOf(...).constructor(...) }`",
    rewrite:
      "// before — getPrototypeOf().constructor bypasses SYN004–SYN061\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Object.getPrototypeOf(function(){}).constructor(code)()  // SYN062\n" +
      "}\n\n" +
      "// after — avoid dynamic evaluation entirely\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  // replace with explicit logic\n" +
      "}",
    example:
      "// SYN062: Object.getPrototypeOf path reaches Function\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Object.getPrototypeOf(function(){}).constructor(code)()  // SYN062\n" +
      "}\n\n" +
      "// SYN062: Reflect.getPrototypeOf also fires\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return Reflect.getPrototypeOf(function(){}).constructor(code)()  // SYN062\n" +
      "}\n\n" +
      "// SYN062: __proto__ read + .constructor also fires\n" +
      "?bs 0.7\n" +
      "fn run(x: any, code: string) -> any {\n" +
      "  return x.__proto__.constructor(code)()  // SYN062\n" +
      "}\n\n" +
      "// fix: remove dynamic evaluation; use explicit code\n" +
      "// or: unsafe \"reason\" { Object.getPrototypeOf(fn).constructor(code)() }",
  },
  SYN063: {
    code: "SYN063",
    title: "process['member'] computed bracket access — string literal hides dangerous member name from SYN005/SYN006/SYN022 (?bs 0.7+)",
    rule:
      "SYN005 catches `process.env`, SYN006 catches `process.exit()`, and SYN022 catches other " +
      "`process.*` member accesses — but all three fire on the dot-notation token pattern. " +
      "The bracket form `process['exit']()` or `process['env']` puts the member name inside a " +
      "string literal where the token-level ident checks cannot see it; the capability bypass at " +
      "runtime is identical. SYN063 closes the gap: `process[<string-literal>]` where the string " +
      "names a member covered by SYN005/SYN006/SYN022 fires this warning. `unsafe {}` suppresses.",
    idiom:
      "use the dot-notation form (`process.env`, `process.exit()`, etc.) so the SYN005/SYN006/SYN022 " +
      "checks fire and the suppression path is visible; " +
      "if bracket notation is genuinely required, wrap in " +
      "`unsafe \"reason\" { process['member'] }`",
    rewrite:
      "// before — bracket notation bypasses SYN005/SYN006/SYN022\n" +
      "?bs 0.7\n" +
      "fn bail(code: number) -> void {\n" +
      "  process['exit'](code)  // SYN063: hides 'exit' from SYN006\n" +
      "}\n\n" +
      "// after — dot notation so SYN006 fires and suppression is explicit\n" +
      "?bs 0.7\n" +
      "fn bail(code: number) -> void {\n" +
      "  return err(\"non-zero exit\")  // idiomatic: propagate, don't terminate\n" +
      "  // or: unsafe \"exits on invalid config\" { process.exit(code) }\n" +
      "}",
    example:
      "// SYN063: process['exit'] bracket bypass\n" +
      "?bs 0.7\n" +
      "fn bail(code: number) -> void {\n" +
      "  process['exit'](code)  // SYN063\n" +
      "}\n\n" +
      "// SYN063: process['env'] bracket bypass\n" +
      "?bs 0.7\n" +
      "fn getKey() -> string {\n" +
      "  return process['env']['API_KEY']  // SYN063\n" +
      "}\n\n" +
      "// SYN063: process['argv'] bracket bypass\n" +
      "?bs 0.7\n" +
      "fn args() -> string[] {\n" +
      "  return process['argv']  // SYN063\n" +
      "}\n\n" +
      "// fix: use dot notation (SYN006 fires) then wrap in unsafe if genuinely needed\n" +
      "// or: pass exit code as explicit fn parameter with a Result return",
  },
  SYN065: {
    code: "SYN065",
    title: "bracket access on an alias of a dangerous global receiver bypasses SYN043/SYN064 (?bs 0.7+)",
    rule:
      "SYN043 guards `globalThis['fetch']` (string-literal bracket) and SYN064 guards `globalThis[key]` " +
      "(dynamic bracket) when the receiver is one of the six dangerous globals by name. " +
      "SYN045/SYN049/SYN052/SYN054/SYN056 catch dot-member access via aliases (`g.fetch()`). " +
      "When an alias of a dangerous receiver is accessed via bracket notation — " +
      "`g = globalThis; g['fetch']()` or `g[key]()` — neither the receiver-name checks " +
      "(SYN041–SYN043/SYN047/SYN063/SYN064) nor the alias dot-checks (SYN045–SYN064) fire. " +
      "SYN065 closes this gap: it fires when an alias of `globalThis`, `window`, `self`, or `global` " +
      "is accessed via bracket notation with either a string-literal key that names a dangerous member " +
      "or a non-literal key (where the member name cannot be resolved at compile time). " +
      "All five alias binding forms trigger SYN065: module-scope const/let/var, module-scope assignment, " +
      "fn-body const/let/var, fn-body assignment, and default-parameter bindings.",
    idiom:
      "use dot-notation on the direct receiver so the relevant SYN041 check fires; " +
      "if bracket notation on an alias is genuinely needed, wrap in " +
      "`unsafe \"reason\" { alias[key] }` so the access is auditable",
    rewrite:
      "// before — alias hides the receiver name from SYN041; bracket hides the member from SYN043\n" +
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      "fn load(url: string) -> any {\n" +
      "  return g['fetch'](url)  // SYN065: alias + string-literal bracket\n" +
      "}\n\n" +
      "// after — dot notation on the direct receiver so SYN041 fires\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return globalThis.fetch(url)  // SYN041: visible to checker\n" +
      "}",
    example:
      "// SYN065: module-scope const alias + string-literal bracket\n" +
      "?bs 0.7\n" +
      "const g = globalThis;\n" +
      "fn run(url: string) -> any {\n" +
      "  return g['fetch'](url)  // SYN065\n" +
      "}\n\n" +
      "// SYN065: fn-body const alias + dynamic bracket key\n" +
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  const w = window;\n" +
      "  return w[key]()  // SYN065\n" +
      "}\n\n" +
      "// SYN065: module-scope assignment alias + dynamic bracket\n" +
      "?bs 0.7\n" +
      "let g: any;\n" +
      "g = globalThis;\n" +
      "fn run(key: string) -> any {\n" +
      "  return g[key]()  // SYN065\n" +
      "}\n\n" +
      "// fix: dot notation on the direct receiver, or wrap in unsafe\n" +
      "// unsafe \"g[key] key is validated against a fixed allowlist\" { g[key] }",
  },
  SYN064: {
    code: "SYN064",
    title: "dynamic (non-literal) computed bracket access on a dangerous receiver — member name unresolvable at compile time (?bs 0.7+)",
    rule:
      "SYN041–SYN043 guard `globalThis`/`window`/`self` bracket accesses when the key is a " +
      "string literal (member name visible at compile time). SYN047 and SYN063 extend this to " +
      "`global` and `process` string-literal bracket forms. When the bracket key is a variable, " +
      "expression, or template literal, none of those checks can resolve the member name — any " +
      "member could be one of the SYN-guarded globals (`fetch`, `eval`, `WebSocket`, …) or " +
      "dangerous process members (`env`, `exit`, `argv`, …). SYN064 fires on `receiver[<non-literal>]` " +
      "where `receiver` is `globalThis`, `window`, `self`, `global`, or `process`. `unsafe {}` suppresses.",
    idiom:
      "use static dot-notation access so the relevant SYN check fires (SYN041–SYN047/SYN005/SYN006/SYN022); " +
      "if a dynamic key is genuinely required, wrap in " +
      "`unsafe \"reason\" { receiver[key] }` so the access is auditable",
    rewrite:
      "// before — dynamic key; member name unresolvable; SYN064 fires\n" +
      "?bs 0.7\n" +
      "fn lookup(key: string) -> any {\n" +
      "  return globalThis[key]  // SYN064: key unknown at compile time\n" +
      "}\n\n" +
      "// after — dot notation so the member-level SYN check fires\n" +
      "?bs 0.7\n" +
      "fn lookup(key: string) -> any {\n" +
      "  // use an explicit switch/if on the known members, each with the dot form:\n" +
      "  // or wrap the dynamic form in unsafe \"reason\" { globalThis[key] }\n" +
      "  return unsafe \"key is a fixed enum validated above\" { globalThis[key] }\n" +
      "}",
    example:
      "// SYN064: dynamic key on globalThis\n" +
      "?bs 0.7\n" +
      "fn run(key: string) -> any {\n" +
      "  return globalThis[key]()  // SYN064\n" +
      "}\n\n" +
      "// SYN064: template literal key on process\n" +
      "?bs 0.7\n" +
      "fn bail(member: string) -> void {\n" +
      "  process[`${member}`](1)  // SYN064\n" +
      "}\n\n" +
      "// SYN064: variable key on window\n" +
      "?bs 0.7\n" +
      "fn call(name: string) -> any {\n" +
      "  return window[name]()  // SYN064\n" +
      "}\n\n" +
      "// fix: use dot notation or wrap in unsafe with a narrow reason\n" +
      "// unsafe \"globalThis[key] is validated against a fixed allowlist\" { globalThis[key] }",
  },
  SYN066: {
    code: "SYN066",
    title: "object-literal property value is a SYN-guarded global, immediately called via property access — inline alias bypass (?bs 0.7+)",
    rule:
      "A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as the value of " +
      "a named property inside an inline object literal, and that property is immediately accessed and " +
      "called on the same object — `{ exec: eval }.exec(code)` or `({ run: fetch }).run(url)`. " +
      "All per-ident SYN checks (SYN004, SYN007, SYN008, …) look for the guarded ident in a call " +
      "position (followed by `(` or `?.(`). All alias-binding checks (SYN044–SYN065) look for " +
      "binding declarations (`const alias = eval`, destructuring patterns, default params). " +
      "The inline object-property form combines aliasing and calling in one expression: the guarded " +
      "global is stored as a property value then retrieved and called in the same expression. " +
      "No existing check covers this shape. SYN066 closes the gap: when a guarded global appears " +
      "after `:` in an object literal property and the same property key is dot-called on the " +
      "immediately following expression, the warning fires. " +
      "Limitation: cross-statement bindings (`const obj = { run: eval }; obj.run(code)`) require " +
      "taint analysis and are not yet detected.",
    idiom:
      "call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check " +
      "fires; if indirect invocation is genuinely needed, wrap in " +
      "`unsafe \"reason\" { { exec: eval }.exec(code) }` to make the bypass auditable",
    rewrite:
      "// before — object property hides guarded global from call-site SYN checks\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }.exec(code)  // SYN066: eval stored as property, called via .exec()\n" +
      "}\n\n" +
      "// after — call directly so SYN004 fires\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)  // SYN004: direct call, visible to checker\n" +
      "}",
    example:
      "// SYN066: eval aliased as object property, immediately called\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return { exec: eval }.exec(code)  // SYN066\n" +
      "}\n\n" +
      "// SYN066: fetch aliased, paren-wrapped form\n" +
      "?bs 0.7\n" +
      "fn load(url: string) -> any {\n" +
      "  return ({ run: fetch }).run(url)  // SYN066\n" +
      "}\n\n" +
      "// SYN066: Function aliased as property\n" +
      "?bs 0.7\n" +
      "fn execute(body: string) -> any {\n" +
      "  return { make: Function }.make(body)()  // SYN066\n" +
      "}\n\n" +
      "// fix: call the guarded global directly\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)  // SYN004 — visible to checker\n" +
      "}",
  },
  SYN067: {
    code: "SYN067",
    title: "module-scope array-destructuring alias of a SYN-guarded global called in a fn body — array-destructure alias bypass (?bs 0.7+)",
    rule:
      "A SYN-guarded global (`eval`, `fetch`, `Function`, `WebSocket`, etc.) appears as an element " +
      "in an array literal on the RHS of a module-scope array-destructuring declaration " +
      "(`const [e] = [eval]`, `const [a, r] = [x, fetch]`), and the corresponding LHS binding " +
      "is called inside a fn body. " +
      "All per-ident SYN checks (SYN004, SYN007, SYN008, …) fire on the guarded ident token in " +
      "call position. All alias-binding checks (SYN044–SYN066) look for the guarded ident in " +
      "declaration-RHS position (`const alias = eval`, object-property form, default-param form). " +
      "Array destructuring stores the guarded global positionally — the guarded ident appears as " +
      "an array element, not as a call target, so per-ident checks do not fire. The LHS binding " +
      "name is not on any watchlist, so alias checks do not fire either. " +
      "SYN067 closes the gap: a module-scope pre-pass correlates each guarded global found in " +
      "a RHS array literal with the LHS ident at the same positional index, and fires when that " +
      "ident is later called in a fn body.",
    idiom:
      "call the guarded global directly — `eval(code)` or `fetch(url)` — so the relevant SYN check " +
      "fires; if array destructuring is genuinely needed, wrap the call in " +
      "`unsafe \"reason\" { e(code) }` to make the bypass auditable",
    rewrite:
      "// before — array destructuring hides guarded global from call-site SYN checks\n" +
      "?bs 0.7\n" +
      "const [e] = [eval]  // module scope\n\n" +
      "fn run(code: string) -> any {\n" +
      "  return e(code)  // SYN067: e is an array-destructuring alias of eval\n" +
      "}\n\n" +
      "// after — call directly so SYN004 fires\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)  // SYN004: direct call, visible to checker\n" +
      "}",
    example:
      "// SYN067: eval aliased via array destructuring\n" +
      "?bs 0.7\n" +
      "const [e] = [eval]  // module scope\n\n" +
      "fn run(code: string) -> any {\n" +
      "  return e(code)  // SYN067\n" +
      "}\n\n" +
      "// SYN067: fetch at index 1\n" +
      "?bs 0.7\n" +
      "const [a, r] = [something, fetch]  // module scope\n\n" +
      "fn load(url: string) -> any {\n" +
      "  return r(url)  // SYN067\n" +
      "}\n\n" +
      "// SYN067: Function aliased via array destructuring\n" +
      "?bs 0.7\n" +
      "const [make] = [Function]  // module scope\n\n" +
      "fn execute(body: string) -> any {\n" +
      "  return make(body)()  // SYN067\n" +
      "}\n\n" +
      "// fix: call the guarded global directly\n" +
      "?bs 0.7\n" +
      "fn run(code: string) -> any {\n" +
      "  return eval(code)  // SYN004 — visible to checker\n" +
      "}",
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
