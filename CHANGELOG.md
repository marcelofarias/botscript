# Changelog

All notable changes to botscript. Each release pins a `?bs` version; shipped
pins do not change behaviour after release (AGENTS.md rule 4). New behaviour
goes behind a new pin.

## ?bs 0.4 — 2026-05-08

### Added
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
