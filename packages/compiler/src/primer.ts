/**
 * The primer. Emitted as a comment block when a file begins with `?primer`,
 * or printed by `botscript primer`. Single source of truth for the language.
 *
 * Keep this concise. The primer is the contract every model relies on; if it
 * grows past one screen we have lost the plot.
 */
export const PRIMER = `botscript v0.1 — primer

A small TypeScript-superset language. All TypeScript syntax is legal. The
additions below are the entire language surface.

== FILE EXTENSION ==
  *.bs       Source file. Compiled to TypeScript by @mbfarias/botscript-compiler.

== DIRECTIVES ==
  ?primer    First line of a file. Emits this primer as a comment block.

== FUNCTIONS ==
  fn name(args) uses { caps } -> ReturnType { body }
                                              capabilities the function may use
  fn name(args) -> ReturnType = pure { expr }
                                              equivalent to uses { } + return expr
  fn name<T>(args) -> ReturnType { body }     (0.4+) type parameters between
                                              the name and the args. Constraints
                                              (T extends U) and defaults (T = D)
                                              are accepted and emitted verbatim.
  fn name(args) intent: "claim" -> ReturnType (0.7+) machine-checkable intent.
                                              The compiler verifies declared
                                              intent against the fn's header
                                              (body-shape checks are planned,
                                              not implemented yet). Recognised
                                              mechanical claim: "pure" — no
                                              capability declarations allowed
                                              (INT001). intent: and uses { }
                                              may coexist; the check fires only
                                              when they conflict.
  Capabilities: net, fs, time, random, process, stdout, stderr.
  Under ?bs 0.2 the capability declaration is checked statically — a function
  declared uses { } that names http/time/random/fs/stdout/stderr.X is a parse
  error, not a runtime trap.
  Under ?bs 0.3 the check also infers transitively across same-file calls
  AND flags over-declaration:
    CAP001  uses clause is missing a capability the body (or a callee in the
            same file) actually consumes. The diagnostic names the call path:
            "f -> g -> http.get".
    CAP002  uses clause names a capability nothing in the body reaches. The
            declaration must match what the function actually uses.
  Under ?bs 0.7 the intent check adds:
    INT001  intent contains 'pure' but the function has capability declarations.
  cap-check diagnostics also carry start/end UTF-16 string offsets alongside
  line/column from 0.2 onward, so editor and LSP integrations can map the
  error to a precise span without re-walking the source. (The whole-file
  parseProgram surface that cap-check now consumes shipped at 0.4.)

== TAGGED UNIONS (0.2+) ==
  type Shape = Circle { r: number } | Square { side: number };
  type Status = Idle | Loading | Done { value: string };
                                              desugars to a TS discriminated
                                              union keyed on \`kind\`. Bare and
                                              field-bearing alternatives mix.

== BLOCKS ==
  pure { expr }    no capabilities allowed; throws CapabilityViolation if any escape
  io   { expr }    documents that this expression performs effects (informational)
  unsafe "reason" { expr }  (0.3+) escape hatch around \`as\` casts and similar.
                            The justification string is mandatory and shows up
                            in the compiled output as a comment so the diff
                            reviewer sees the *why* alongside the cast. From
                            ?bs 0.5, a bare \`as\` cast outside an
                            unsafe "<reason>" { ... } block is a parse error
                            (UNS004). Casts must be justified.

  unsafe "reason" fn name(…) -> T { … }
                            Declaration-level escape hatch. Marks the fn
                            itself as the trust boundary for type coercions.
                            Inside the body, bare \`as\` casts are allowed
                            without repeating the justification at every
                            call site. The reason is emitted as a leading
                            /* unsafe: "…" */ comment in the compiled output.
                            Use this for adapter/normalization fns that are
                            the one safe coercion point in a module — callers
                            treat the fn as a normal fn with no unsafe context
                            required. Works with async: unsafe "r" async fn …

== RESULT / OPTION ==
  Result<T, E>     ok(value) | err(error)
  Option<T>        some(value) | none
  expr?            on a Result: unwrap or short-circuit Err out of the enclosing fn
                   (only at end of let/const/return statement, never in expressions)
  Result.try { body }       (0.3+) lift a throwing call into Result<T, string>
  Result.tryAsync { body }  (0.3+) async variant; lifts rejections too

== MATCH ==
  match value {
    Tag             -> arm       (tag-only)
    Tag { a, b }    -> arm       (tag with field bindings)
    "literal"       -> arm       (literal string/number/bool/null)
    _               -> arm       (wildcard; required if not exhaustive)
  }

== TESTS ==
  test "name" { body }                                vitest-compatible
  test "name" with mocks { time, random } { body }    deterministic time
                                                      and random in body
                                                      (0.2+); time.now()
                                                      returns 0,1,2,…
  assert expr                                         throws on falsy

== STDLIB CALLS ==
  http.get(url) -> Promise<Result<Response, Error>>   requires uses { net }
  http.post(url) -> Promise<Result<Response, Error>>  requires uses { net }
  time.now() / time.iso()              requires uses { time }
  random.next() / random.int(a, b)     requires uses { random }
  // import { fs } from "@mbfarias/botscript-runtime/fs"; (Node only)
  fs.exists(path)                      requires uses { fs }
  fs.readText(path) -> Result          requires uses { fs }
  fs.writeText(path, body) -> Result   requires uses { fs }, atomic write
  fs.readJson(path) -> Result          requires uses { fs }
  fs.writeJson(path, value) -> Result  requires uses { fs }, atomic write
  stdout.println(s) / stderr.println(s)

  Under ?bs 0.6 the compiler auto-imports every stdlib symbol you reference
  from the main entry (ok, err, http, time, random, stdout, stderr, Result,
  Option, …) — no manual import preamble needed. The fs surface lives at
  @mbfarias/botscript-runtime/fs and is NOT auto-imported — keep an explicit
  import { fs } from "@mbfarias/botscript-runtime/fs" in any file that uses
  it. Pre-0.6 pins keep their old behaviour.

== IDIOMS (the canonical way to do common things) ==
  // fail fast on a fetch — await, unwrap the Result, then parse the body
  // ?bs 0.6  <- stdlib symbols (ok, http, Result, …) are auto-imported
  async fn loadUser(id: string) uses { net } -> Promise<Result<User, Error>> {
    let res = (await http.get(\`/users/\${id}\`))?
    let json = await res.json()
    return ok(unsafe "shape validated upstream" { json as User })
  }

  // pure helper
  fn slugify(s: string) -> string = pure { s.toLowerCase().replaceAll(" ", "-") }

  // exhaustive dispatch
  fn area(s: Shape) -> number = match s {
    Circle { r }    -> Math.PI * r * r
    Square { side } -> side * side
  }

== WHEN IN DOUBT ==
  - prefer pure { } over io { }
  - prefer Result over throw
  - prefer Option over null
  - prefer match over if/else chains on tagged unions
  - never use \`as\` outside an \`unsafe "reason" { }\` block
  - run \`botscript explain <CODE>\` to see the rule/idiom/rewrite for any
    diagnostic the compiler emits
`;

/** Wrap the primer as a leading comment block suitable for injection. */
export function primerAsComment(): string {
  const lines = PRIMER.split("\n").map((l) => ` * ${l}`.trimEnd());
  return ["/**", ...lines, " */"].join("\n");
}
