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
  Under ?bs 0.4 cap-check diagnostics also carry start/end byte offsets
  alongside line/column so editor and LSP integrations can map the error to
  a precise span without re-walking the source.

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
                            reviewer sees the *why* alongside the cast.

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
  http.get(url) / http.post(url)       requires uses { net }
  time.now() / time.iso()              requires uses { time }
  random.next() / random.int(a, b)     requires uses { random }
  // import { fs } from "@mbfarias/botscript-runtime/fs"; (Node only)
  fs.exists(path)                      requires uses { fs }
  fs.readText(path) -> Result          requires uses { fs }
  fs.writeText(path, body) -> Result   requires uses { fs }, atomic write
  fs.readJson(path) -> Result          requires uses { fs }
  fs.writeJson(path, value) -> Result  requires uses { fs }, atomic write
  stdout.println(s) / stderr.println(s)

== IDIOMS (the canonical way to do common things) ==
  // fail fast on a fetch
  fn loadUser(id: string) uses { net } -> Result<User, Error> {
    let res = http.get(\`/users/\${id}\`)?
    ok(res as User)
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
