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
