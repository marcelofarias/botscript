# Changelog

All notable changes to botscript. Each release pins a `?bs` version; shipped
pins do not change behaviour after release (AGENTS.md rule 4). New behaviour
goes behind a new pin.

## ?bs 0.6 — unreleased

### Added
- **Stdlib auto-import** — the compiler's final pass now also detects
  user-facing stdlib names in the rewritten output (`ok`, `err`, `http`,
  `time`, `random`, `stdout`, `stderr`, `Result`, `Option`, `Some`, `None`,
  `Ok`, `Err`, and the family of helpers). Any name that's used but not
  already in scope gets added to an auto-generated
  `import { … } from "@mbfarias/botscript-runtime";` (or a separate
  `import type { … } …` line for the type-only members), so the canonical
  primer examples compile through `tsc` without a manual import preamble.
  Closes #25.
- The auto-import recognises pre-existing runtime imports, including
  `import type` lines and `import { ok as myOk }` aliases, and never
  double-imports or shadows the user's existing bindings.
- `findExistingRuntimeImport` now skips matches that fall inside comments
  or string literals (so a `// import …` line doesn't suppress a real
  auto-import). Gated at 0.6+ for forward-compat.

### Unchanged
- `fs` still lives at `@mbfarias/botscript-runtime/fs` and is NOT
  auto-imported. Keep an explicit
  `import { fs } from "@mbfarias/botscript-runtime/fs";` in any file that
  uses it.
- Files pinned to `?bs 0.5` (or earlier) compile to byte-identical output:
  the new auto-import behaviour and the new comment-aware import detection
  both gate at `atLeast(version.resolved, "0.6")`.

## ?bs 0.5 — 2026-05-09

### Added
- **`UNS004` — bare `as` cast outside `unsafe "<reason>" { ... }` is a parse
  error.** The manifesto promise that every cast carries a written reason
  was unenforced under 0.3 and 0.4 — nothing stopped a bot from writing
  `value as User` without justification. From `?bs 0.5`, the new `bareAs`
  pass walks the source pre-unsafe-rewrite, finds every `unsafe "..." { }`
  body, and flags every `as` cast outside one of those bodies as `UNS004`.
  The fix every diagnostic suggests is the same: wrap the cast in
  `unsafe "<short reason>" { ... }` so the *why* shows up in the diff next
  to the *what*.
- The pass deliberately disambiguates non-cast `as` keywords: the
  namespace-import form `import * as ns from "..."`, named-binding renames
  `import { foo as bar }`, `export * as ns from "..."`, and re-export
  renames `export { foo as bar } from "..."` are not flagged. For
  `import`, the implementation skips the entire statement (every TS-legal
  `import` shape uses `as` only structurally). For `export`, only the
  namespace/rename shapes (`export *…`, `export {…}`, `export default *`)
  are skipped wholesale; value-introducing forms like `export const`,
  `export let`, `export function`, and `export default <expr>` are walked
  normally so a bare `as` inside an initializer or function body still
  fires UNS004.
- Pipeline ordering: `bareAs` is wired into `PASS_PIPELINE` BEFORE
  `unsafe`, because `passUnsafe` rewrites the source and erases the
  original `unsafe` keyword. The bare-`as` walk has to run on the
  pre-rewrite token stream so it can see the original `unsafe "..." { }`
  body ranges and skip them.
- `examples/node-app/src/parse-json.bs` is now pinned at `?bs 0.5` and
  uses the unsafe-with-reason form to demonstrate the new check
  end-to-end (AGENTS.md rule 3).

### Forward compatibility
- Files pinned to `?bs 0.4` (or earlier) compile to byte-identical
  TypeScript. The forward-compat snapshot suite at
  `packages/compiler/tests/forward-compat.test.ts` is the gate. New
  enforced check on previously-legal syntax → behind a new pin per
  AGENTS.md rule 4.

## ?bs 0.4 — 2026-05-08

### Added
- **`botscript fmt` — canonical-form formatter (RFC #13).** Token-level
  whitespace tidier: collapses mid-line whitespace runs to a single space,
  converts leading tabs to two spaces, strips trailing whitespace, collapses
  blank-line runs, and ensures exactly one trailing newline. Cross-version:
  works on any pinned `?bs` version. Modes: `fmt <file>` prints to stdout
  (gofmt-style), `fmt <dir>` writes in place, `--check` exits 1 if any file
  differs from canonical, `--write` rewrites files. Content inside strings,
  templates, regex, and comments is preserved verbatim; declaration / import /
  union-member ordering, brace-style re-flow, and quote normalization are
  deliberately out of scope for v1 (each needs proof of order-irrelevance or
  an AST). Idempotent and semantics-preserving. Exported as `formatSource`
  from `@mbfarias/botscript-compiler`.
- **Type parameters in `fn` signatures.** `fn id<T>(x: T) -> T`, multi-param
  `<A, B>`, `extends` constraints, and `= Default` defaults. Emitted verbatim
  into the TS output; capability inference, `match`, and async fn compose
  unchanged.
- **Whole-file AST surface.** `parseProgram(src)` (exported from
  `@mbfarias/botscript-compiler`) returns a `Program` carrying source ranges
  per top-level fn declaration, plus the underlying `FnDecl`. `FnDecl`
  carries `start` / `end` (UTF-16 source offsets), `tokenStart` / `tokenEnd`
  (token-array indices for callers that walk the lexer output), plus
  `fnKeywordStart` and `nameStart` for diagnostic anchoring. Shallow on
  purpose: only fn declarations are surfaced as nodes, per AGENTS.md
  rule 5. Foundation for future LSP and rename tooling.
- **Source offsets on diagnostics.** `Diagnostic.start` / `Diagnostic.end`
  are populated by `cap-check` from `?bs 0.2` onward. Offsets are UTF-16
  string offsets (JS string indices, not UTF-8 bytes) into the source as
  the pass sees it (after `?bs` directive stripping); line and column
  continue to refer to the original source numbering thanks to the
  preserved newline.

### Changed
- `cap-check` now consumes `parseProgram` end-to-end and derives fn-header
  source locations from offsets on the parsed `FnDecl` rather than searching
  the source with a regex. No observable change in line/column for any
  0.2 or 0.3 file (forward-compat snapshots gate this).
- The duplicated `atLeast()` version-comparison helper is now exported
  once from `passes/version.ts` and imported by every pass that gates on a
  resolved version.

### Fixed
- Block bodies in expression position (`pure { let; expr }`,
  `Result.try { let; expr }`, `match` arms with brace-block bodies, and
  `fn name(args) -> T = pure { let; expr }`) now lower to valid TypeScript.
  Previously the lowering helper tested only for top-level `;` and the literal
  substring `return`, then unconditionally prefixed `return` to the rest, so
  newline-separated bodies like `pure { let lower = s.toLowerCase()\n lower }`
  emitted `return let lower = ...;` (parse error) and brace-block match arms
  emitted `({ value }: any) => ({ let prefix = ... })` (`let` inside a
  parenthesized expression). The new shared lowering in
  `passes/_block-body.ts` splits the body into top-level statement segments
  (separated by `;` or unambiguous newlines, with continuation-token
  detection on both sides of the newline), terminates each with `;`, and
  `return`-wraps only the tail expression. `match` arms whose body is a
  full `{ ... }` block now emit `(...) => { ...lowered... }` instead of
  `(...) => (...)`. Single-expression arms keep their existing
  parenthesized-arrow form, so forward-compat snapshots are byte-identical.
  Closes #23.
- The fn return-type scanner now tracks `<...>` depth instead of
  case-analysing what follows each matched `{...}`. Object types nested
  inside generic args — `Result<{ name: string }, string>`,
  `Map<K, Vec<T>>`, `{ a: T } | string` — used to be mis-parsed as the
  body opener, silently dropping the body and producing wrong CAP002
  diagnostics on declared capabilities the body actually consumed.
- The `?` postfix unwrap pass no longer rewrites a `?` whose apparent
  statement-start tokenises as a non-prefix operator. The lexer treats
  `<` and `>` as comparison-shaped operators and doesn't pair them, so
  the walk-back from `?` could cross JSX text content like
  `<a>foo bar?</a>`, land on the enclosing `(` of `return (...)`, and
  rewrite the whole markup as
  `const __r1 = <...>; if (__r1.kind === "err") return __r1;` — leaking
  the unwrap desugar into the rendered DOM. A `<` at statement-start
  could be a JSX element, a TSX generic call/cast, or a stray comparison
  fragment, and the unwrap pass has no AST to disambiguate them; it now
  refuses to rewrite. Unary-prefix operators (`+`, `-`, `!`, `~`, `++`,
  `--`) and proper expression heads (idents, keywords, parens, etc.)
  still lead to a rewrite as before.

### Forward compatibility
- Files pinned to `?bs 0.3` (or earlier) compile to byte-identical TypeScript.
  The forward-compat snapshot suite at
  `packages/compiler/tests/forward-compat.test.ts` is the gate.

## ?bs 0.3 — 2026-05-08

### Added
- Capability inference across the same-file call graph. `CAP001` names the
  path: `fn 'loadOne' transitively consumes 'net' via loadOne -> doFetch -> http.get`.
- `CAP002` — over-declared capability. Declarations must match what the body
  (or its callees) actually reach.
- `unsafe "<reason>" { … }` — escape hatch for `as` casts; the justification
  string is mandatory (`UNS001`/`UNS002`/`UNS003`).
- `Result.try { body }` / `Result.tryAsync { body }` — lift a throwing
  JS-boundary call into `Result<T, string>`, composes with `?`.
- `botscript explain <CODE>` and `botscript check` CLI subcommands; both
  accept `--format json`.

## ?bs 0.2 — 2026-05-07

### Added
- Static capability check (direct stdlib references): a fn that names
  `http.…` / `time.…` / etc. without declaring the matching capability is
  a parse error (`CAP001`).
- Tagged-union sugar: `type Shape = Circle { r: number } | Square { side: number };`
  desugars to a TS discriminated union keyed on `kind`.
- `test "name" with mocks { time, random } { body }` — deterministic clock
  and PRNG injected by the runner; sources restored on return or throw.
- `?bs <version>` directive validation.
- Structured diagnostics: compiler errors carry stable codes (`BS001`,
  `BS002`, `CAP001`) and a `{ rule, idiom, rewrite }` triple. The CLI
  exposes `--format=json` so a bot can `compile → JSON.parse → patch`
  deterministically.
- MCP server (`@mbfarias/botscript-mcp`) exposes the compiler over the
  Model Context Protocol so a model can `primer` / `transform` / `explain`
  via tool calls.

## ?bs 0.1 — 2026-05-03

Initial public release.

### Added
- `fn name(args) uses { caps } -> ReturnType { body }` and the `= pure { … }`
  / `= io { … }` / `= <expr>` shorthand.
- `pure { … }` and `io { … }` block forms at expression position.
- `match` with tag, tag-with-binds, literal, and wildcard patterns.
- `Result<T, E>` / `Option<T>` runtime helpers and the `?` unwrap operator.
- `test "name" { body }` and `assert <expr>` top-level forms.
- `?primer` directive that injects the primer as a comment block.
- Vite plugin and Babel plugin for `.bs` files.
