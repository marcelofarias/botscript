# AGENTS.md

> botscript's contribution guide, written for bots.

This project is intentionally built so that the *primary* contributors are LLMs
(Claude, Codex, Gemini, DeepSeek, future ones we haven't met yet). Humans
review the philosophy and the diff; bots write the code, the tests, and the
docs. This document is the contract that makes that work.

If you are a model reading this in the middle of a task: **stop, read, then
proceed**. Most of what would otherwise be guesswork is fixed below.

---

## Architecture in 90 seconds

```
botscript/
├── packages/
│   ├── runtime/        Pure JS/TS. Result, Option, $match, $enter, $assert.
│   ├── compiler/       String-in / TypeScript-out transformer. Pass pipeline.
│   ├── cli/            `botscript build`, `botscript fmt`, `botscript primer`. Thin wrapper.
│   ├── vite-plugin/    Vite integration. Calls compiler, then esbuild for JSX.
│   └── babel-plugin/   Babel integration. parserOverride.
├── examples/
│   ├── node-app/       CLI — shapes/area/match end-to-end.
│   └── react-app/      Vite + React — todo list, tests in .bs.
├── MANIFESTO.md        Why this project exists. Read first.
└── STDLIB.bs           Canonical example of every language feature, exactly once.
```

The compiler is a sequence of string-to-string passes (`packages/compiler/src/passes/`),
each of which targets a single syntactic form. There is **no AST** — every pass
uses bracket-aware string scanning helpers in `lex.ts`. This is deliberate:
the entire compiler fits in one head, and a bot adding a new feature touches
exactly one new file plus the pipeline list in `transform.ts`.

## The contribution rules

These are non-negotiable. CI enforces them; humans don't.

### 1. Every change ships with a test.

If you add a transform, add a test for the form it rewrites *and* a test for
a form that should NOT be rewritten (the no-op case). If you add a runtime
helper, add a test for the happy path *and* the failure mode. Tests live in
`packages/<pkg>/tests/`.

### 2. The primer is the contract.

`packages/compiler/src/primer.ts` is the single source of truth for what the
language is. If your change adds new syntax, the primer must also change in
the same PR. If your change does not add syntax, the primer must not change.
Drift here is the only thing in this codebase that compounds.

### 3. Anything you do must work end-to-end in `examples/`.

Adding a feature isn't done when tests pass — it's done when at least one
example demonstrates it. If your feature isn't useful enough for the canonical
node or react example, it's probably not useful enough to ship.

### 4. Versioned syntax is forever.

A `.bs` file pinned to `?bs 0.1` must compile identically a year from now.
New syntax goes behind a new version pin (`?bs 0.2`, `?bs 0.3`). The
`SUPPORTED_VERSIONS` array in `packages/compiler/src/passes/version.ts` is the
list every other component branches on. Never modify a shipped version's
behavior in place.

### 5. Don't add abstractions speculatively.

The compiler has six passes because that's what botscript currently does. It
does not have a pluggable pass registry, a configuration object, or a trace
mode. Add those when a real second use case appears, not before. (See
"Be small. Stay small." in the manifesto.)

### 6. Run `pnpm test` and `pnpm -r build` before claiming done.

In that order. If either fails, the change is not done. You may not skip
tests with `.skip` to land a PR; if a test is wrong, fix the test in the
same PR and explain why.

### 7. No emoji in code, comments, or commit messages.

The user has zero patience for it. Default to plain text everywhere.

### 8. Commits are atomic.

One commit, one feature/fix. The commit message starts with the package name
in scope: `compiler: add support for ?ext directive`. Body explains why,
not what. Don't reference issue numbers in the title.

## How to add a feature (the recipe)

The bot-optimized version of the contributor recipe. Steps 1-9 are mandatory;
skipping any of them is what causes "I added a feature, why doesn't anyone
know about it?" drift between the compiler, the docs, and the bots.

1. **Pick a target form.** What syntax are you adding? Write down the exact
   `.bs` snippet you want to support, and the TypeScript it should desugar to.
   Both must be in the PR description.
2. **Pick a version pin.** New syntax goes behind a new pin if (and only if)
   the change can break already-shipped files at the previous pin. A purely
   additive feature (new keyword, new block form) can land at the current
   `LATEST` pin. A behaviour change to existing forms requires bumping
   `SUPPORTED_VERSIONS` in `packages/compiler/src/passes/version.ts` and
   gating internally.
3. **Update `STDLIB.bs`.** Add one example of the new form. If you can't write
   one, the feature is probably not coherent yet.
4. **Update `primer.ts`.** Add the new form to the right section. Keep the
   primer under one screen — if the feature can't be described in three lines,
   reconsider its scope.
5. **Add a new pass.** Create `packages/compiler/src/passes/<name>.ts`.
   Export a single function `(src: string, version: VersionInfo) => string`
   (the second arg is optional — accept it if the pass branches on version).
   Reuse `lex.ts` helpers (`skipBalanced`, `findOutside`, `stepOne`,
   `readIdent`); do not write your own bracket matcher. Handle the success
   case and pass through unchanged on any malformed input.
6. **Wire the pass in.** Add it to `PASS_PIPELINE` in `transform.ts`. Order
   matters — passes that introduce new statements (like `fn`) must run before
   passes that transform statements (like `unwrap`).
7. **Add tests.** A "rewrites X" test, a "leaves Y alone" test, a
   forward-compat test (`?bs <prev>` keeps its old behaviour), and an
   integration test that uses the form alongside other features.
8. **Update the peripheral artifacts in the SAME PR.** This is non-negotiable —
   the items below are part of "done":
   - **Diagnostics:** add any new error codes to
     `packages/compiler/src/error-codes.ts` (rule/idiom/rewrite/example).
   - **MCP server:** add a long-form entry per code to
     `packages/mcp/src/explanations.ts` and update the
     "known codes match the diagnostic codes" assertion in
     `packages/mcp/tests/server.test.ts`.
   - **AGENTS.md:** add a row to the diagnostic codes table.
   - **README.md:** add the feature to the "What's new in `?bs <pin>`"
     section, and update the MCP-tools table's `explain` row to list the new
     codes.
   - **Examples:** use the form at least once in `examples/node-app/` or
     `examples/react-app/`. AGENTS.md rule 3.
9. **Run the suite.**
   ```
   pnpm install
   pnpm -r build
   pnpm test
   pnpm --filter node-app test
   pnpm --filter react-app build
   ```
   All five must succeed.

## How to fix a bug (the recipe)

1. Reproduce in a test first. Add a failing test in the appropriate package.
2. Fix the bug. Make the test pass.
3. **Do not refactor in the same PR.** A bug fix is a bug fix. Cleanup goes in
   a follow-up commit.
4. If the bug was in a pass, also add an "integration" test that exercises the
   bug alongside other passes. Most real bugs in this codebase are pass-ordering
   bugs, not local logic bugs.

## When you're stuck

Stuck means: you've tried two distinct approaches and both produced regressions
that you can't diagnose, OR you've spent more than ~30 minutes of tool calls
without converging.

When stuck, **stop**, write your findings to `STUCK.md` at the repo root with:

- the file/line you're touching
- what you've tried (in chronological order)
- what each attempt did wrong
- what you currently believe the root cause is
- what you'd try next if you had more time

Then exit. Another agent (or a human) will pick it up. Trying a third time
without writing this down is how a session burns hours and produces nothing
useful.

## Diagnostic codes (0.2+)

Compiler errors carry a stable code so bot loops can branch on the cause
without regexing English text. Add `--format=json` to `botscript build` and
parse the resulting `{ ok: false, diagnostics: [...] }` envelope.

| Code   | Cause                                         | The fix the `rewrite` field will suggest                |
| ------ | --------------------------------------------- | ------------------------------------------------------- |
| BS001  | Malformed `?bs` directive (e.g. `?bs nope`).  | `?bs 0.1` (or whatever `LATEST_VERSION` is).            |
| BS002  | Unsupported version (e.g. `?bs 99.0`).        | Pin to a supported version; see `SUPPORTED_VERSIONS`.   |
| CAP001 | A fn calls or transitively reaches `http/time/random/fs/stdout/stderr.X` whose capability isn't in its `uses { … }`. (0.2 is direct-only; 0.3 adds same-file transitive propagation; cross-file propagation via `moduleEffects` applies from 0.3.) | Either add the capability or remove the call. The diagnostic includes the literal `fn name(...) uses { … } -> ...` rewrite. |
| CAP002 | (0.3+) A fn declares a capability nothing in its body or callees reaches. | Remove the unused capability from the `uses { … }` clause, or actually use it. |
| UNS001 | (0.3+) `unsafe { … }` block missing a justification string. | `unsafe "<reason>" { … }`. |
| UNS002 | (0.3+) `unsafe "" { … }` — empty justification. (0.5+) Also fires on a declaration-level `unsafe "" fn name(…)` with an empty reason. | Replace `""` with a one-sentence reason. |
| UNS003 | (0.3+) `unsafe "reason"` with no following body. | `unsafe "reason" { <body> }`. |
| UNS004 | (0.5+) Bare `as` cast outside an `unsafe "<reason>" { ... }` block or an `unsafe "reason" fn` body. Every cast must be justified. `import * as ns`, `import { foo as bar }`, and `export * as ns` are not flagged. | `unsafe "<short reason>" { <expr> as <type> }`, or declare the fn as `unsafe "reason" fn name(…)` when the fn is the module's one safe coercion point. |
| UNS005 | (0.9+) A stdlib capability call (`http.x`, `fs.x`, `time.x`, `random.x`, `stdout.x`, `stderr.x`) appears in a fn body with no declared result contract at the call site. | Wrap in `match ns.method(...) { ok { v } -> ... err { e } -> ... }`, use `unsafe "<reason>" { ... }`, or declare the fn as `unsafe "<reason>" fn`. |
| FMT001 | (0.4+) Source is not in canonical form (RFC #13). Every program has exactly one canonical surface form; from `?bs 0.4` on, the compiler rejects whitespace / ordering variants rather than silently accepting them. The diagnostic points at the first UTF-16 code unit that differs from canonical. | `botscript fmt <file> --write`. |
| RES001 | (0.3+) `Result.try` / `Result.tryAsync` with no body. | `Result.try { <body that may throw> }`. |
| RES002 | (0.9+, warning) A same-file fn whose return type contains `Result<>` or `Option<>` is called as a bare statement — return value discarded, error/absence path permanently sealed. Excluded inside `test { }` and `unsafe { }` blocks. | Use `?` to propagate, `match` to handle, or `let x = f()` to assign. Wrap in `unsafe "intentional discard" { f() }` if the discard is deliberate. |
| INT001 | (0.7+) A fn declares `intent: "pure"` but also has `uses { … }`. (0.8+) Also fires when `intent: "pure"` is combined with `reads { … }` or `writes { … }`. (0.9+) Also fires when `intent: "pure"` is combined with `throws { … }` — throwing is a side effect; use `Result<T, E>` instead. Pure functions may not declare capabilities, resource dependencies, or throws. | Either drop the conflicting header clause(s) or change the intent to reflect the actual behaviour. For `throws {}` conflicts, replace with `Result<T, E>`. |
| SYN001 | Duplicate fn header clause (e.g. two `reads { }` on the same fn, or two `intent:`, or two `throws {}`), or a label inside `reads {}` / `writes {}` / `throws {}` that is not a plain identifier. `parseFn` is version-agnostic, so SYN001 fires whenever a duplicate clause is written regardless of the `?bs` pin. | Declare each header clause once; merge label lists rather than repeating the clause; use bare identifiers (not quoted strings) as labels. |
| SYN002 | (0.7+, warning) A fn body contains a native `throw` statement. Native throws bypass botscript's Result-based error contract: callers using `?` unwrap or `match` on Result will not observe exceptions raised via `throw`. | Replace `throw new ErrorType(...)` with `return err(new ErrorType(...))` and update the return type to `Result<T, ErrorType>`. |
| SYN003 | (0.7+, warning) A fn body contains a `console.*` call (console.log, console.error, etc.). Direct console output bypasses the `stdout`/`stderr` capability model — the compiler cannot enforce or surface the output declaration for callers. | Replace `console.log(...)` with `stdout.write(...)` and add `uses { stdout }` to the fn header; replace `console.error(...)` with `stderr.write(...)` and add `uses { stderr }`. |
| SYN004 | (0.7+, warning) A fn body calls `eval(...)` (global eval not preceded by `.`/`?.`) or constructs `new Function(...)`. Both execute strings as code at runtime — every static capability check (CAP001/CAP002), resource declaration (reads/writes), and safety check (SYN002/SYN003) can be bypassed by routing any unsafe pattern through eval. Suppressed inside `unsafe {}` blocks and `unsafe fn` bodies. `.eval(...)` (method call on a local) and `Function.*` member accesses are excluded. | Refactor the eval-based pattern to use explicit code paths. If eval is genuinely required (e.g. sandboxed interpreter), wrap in `unsafe "<reason>" { eval(...) }`. |
| SYN005 | (0.7+, warning) A fn body accesses `process.env`. `process.env` is a global deployment-environment namespace — access is invisible to callers, there is no capability or resource declaration that covers it, and the fn has an undeclared dependency on deployment configuration. Detection: `process` not preceded by `.`/`?.`, followed by `.`/`?.` then `env`. `obj.process.env` (member access on a local), `unsafe {}` blocks, and `unsafe "reason" fn` bodies are excluded. | Pass config and secrets as explicit fn parameters so the dependency is visible in the call signature; if env access is required at the load site, wrap in `unsafe "reads deployment env" { }`. |
| SYN006 | (0.7+, warning) A fn body calls `process.exit()`, `process?.exit()`, or `process.exit?.()`. All forms terminate the entire host process — not just the fn, not just the bot. They produce no return value, bypass `Result` propagation, `throws {}`, `match`, and any caller recovery path. No capability declaration covers them. Detection: `process` not preceded by `.`/`?.`, followed by `.`/`?.` then `exit` then `(` or `?.(`. `obj.process.exit(...)`, `process.exit` without `(`, and `process.exitCode` are excluded. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed. | Return `err(...)` and let the caller decide whether to terminate. If `process.exit` is genuinely required at a bootstrap entry point, wrap in `unsafe "exits on invalid config" { process.exit(1) }`. |
| INT002 | (0.7+) A fn declares `intent: "pure"` but its body directly references a stdlib capability (e.g. `http.get`, `fs.read`). Pure intent is enforced at the body level as well as the header. | Remove the stdlib call from the body, or change the intent. |
| INT003 | (0.7+) A fn declares `intent: "idempotent"` but also has `uses { random }` or `uses { time }`. Both capabilities produce different values on each call, making the function non-idempotent. Only `random` and `time` are flagged; other capabilities are not structurally flagged by this check (INT003 is a narrow heuristic, not a proof of idempotence). | Remove `random`/`time` from `uses {}`, or change the intent. |
| INT004 | (0.7+) A fn declares `intent: "idempotent"` but its body directly references `random` or `time` without declaring them. Under-declaration variant of INT003 — fires when INT003 does not. | Remove the non-idempotent call from the body, or declare the capability and remove the idempotent intent. |
| ALI001 | (0.8+, warning) A module-level `const <name> = <expr>` contains a stdlib namespace ident anywhere in the RHS but in a form too non-trivial to alias-track (member access, operator, call, conditional such as `flag ? time : null`, etc.). Static checks won't see `name` as a stdlib alias. Non-blocking. | Use a direct binding `const t = time` for alias tracking, or call the namespace directly. |
| ALI002 | (0.8+, warning) A module-level `const x = <alias>` where `<alias>` is itself a tracked stdlib alias creates an alias-of-alias chain. Chain aliases are not tracked; `x.member` will not be detected by cap/intent/uns checks. Non-blocking. | Use a direct binding (`const x = time`) or the canonical namespace name directly. |
| ALI003 | (0.8, warning; 0.9+, **error**) A module-level `const { … } = <stdlib>` object-destructuring extracts member references that no static check follows. The extracted idents are not recognized as stdlib aliases; cap/intent/uns checks will miss any calls through them. Warning at 0.8; blocking error at 0.9+ — no defensible use case. | Use a direct namespace binding (`const t = time`) and call `t.method()` instead of destructuring. |
| INT005 | (0.8+) A fn declares `intent: "idempotent"` but also has `writes { ... }`. A fn that mutates a resource produces different side effects on each call, contradicting the idempotency contract. INT005 takes priority over INT003/INT004 when both writes and non-idempotent capabilities are declared. | Remove `writes {}` if the fn does not actually mutate, or change the intent to reflect the actual behaviour. |
| CAP003 | (0.9+, warning) A fn is declared `unsafe "reason" fn name(…)` and also has a `uses { … }` clause. The compiler cannot prove the capability is actually reached — the assertion is programmer-owned. Non-blocking; the fn compiles. | Remove the `uses {}` clause if it is not needed, or document why the assertion is trusted. |
| EFF002 | (0.7+) A callback parameter declares `uses { … }` capabilities beyond what the outer fn declares. A fn that claims `uses { net }` cannot safely accept a callback that also writes to `fs` — the outer declaration would be a lie. | Extend the outer fn's `uses {}` to cover the callback's full capability set, or narrow the callback's annotation. |
| EFF003 | (0.9+) A callback parameter declares `reads { … }` labels not covered by the outer fn's `reads {}`. Same structural rule as EFF002 applied to resource read dependencies. | Add the missing label(s) to the outer fn's `reads {}`, or narrow the callback annotation. |
| EFF004 | (0.9+) A callback parameter declares `writes { … }` labels not covered by the outer fn's `writes {}`. | Add the missing label(s) to the outer fn's `writes {}`, or narrow the callback annotation. |
| DEP001 | (0.9+) A fn's body (or a callee in the same file) reads a resource label not declared in the fn's own `reads {}`. Transitivity is enforced: if `loadUser` calls `fetchRow` which reads `userDb`, `loadUser` must also declare `reads { userDb }`. | Add the missing label(s) to `reads {}`, or remove the undeclared read. |
| DEP002 | (0.9+) Same as DEP001 but for `writes {}` labels. A fn whose callee writes a resource must declare that write in its own header. | Add the missing label(s) to `writes {}`, or remove the undeclared write. |
| DEP003 | (0.9+, warning) A fn declares `reads { x }` but no tracked callee (same-file or `moduleEffects` entry, direct or transitive) also declares `reads { x }`. Suppressed when the fn body contains any opaque/untracked external call (the label may still be live cross-module). Leaf fns are excluded. Non-blocking. | Remove the stale label from `reads {}`, or verify the fn is the intended access point. |
| DEP004 | (0.9+, warning) Same as DEP003 but for `writes {}`. A fn declares a write label that no tracked callee (same-file or `moduleEffects` entry) justifies; suppressed on fns with opaque external calls. Non-blocking. | Remove the stale label from `writes {}`, or verify the fn is the intended access point. |
| THR001 | (0.9+) A fn's body (or a same-file callee) throws an exception type not declared in the fn's `throws {}`. Transitivity is enforced: if `loadUser` calls `fetchRow throws { NetworkError }`, `loadUser` must also declare `throws { NetworkError }`. | Add the missing type(s) to `throws {}`, or add a `match` / `unsafe` to suppress the propagation. |
| THR002 | (0.9+) A fn body directly constructs `err(TypeName(...))`, `err(new TypeName(...))`, or `err(TypeName)` where `TypeName` (CapCase) is not declared in the fn's own `throws {}` clause. Producer-side complement to THR001. | Add `TypeName` to the fn's `throws {}`, or change the error construction to use a declared type. |
| THR003 | (0.9+) A callback parameter declares `throws { … }` types not covered by the outer fn's `throws {}`. Same structural rule as THR001 applied to callback parameters. | Add the missing type(s) to the outer fn's `throws {}`, or narrow the callback annotation. |
| THR004 | (0.9+, warning) A fn declares `throws { X }` but no same-file callee (direct or transitive) throws `X` and the fn's body does not construct `err(X...)` directly. The annotation is likely stale. Leaf fns and fns with opaque calls are excluded. Non-blocking. | Remove the stale label from `throws {}`, or verify the fn is the actual throw point. |
| MAT001 | (0.9+) A `match` expression handles `ok` or `err` tag patterns but omits the opposing tag without a wildcard `_` arm. An incomplete Result match is a silent no-op for the missing path. | Add the missing `ok { ... } -> ...` or `err { ... } -> ...` arm, or add a wildcard `_ -> ...` arm. |
| MAT002 | (0.9+) A `match` expression handles `some` or `none` tag patterns but omits the opposing tag without a wildcard `_` arm. An incomplete Option match silently discards the missing case. | Add the missing `some { v } -> ...` or `none -> ...` arm, or add a wildcard `_ -> ...` arm. |
| MAT003 | (0.9+) A `match` expression whose arm tags all belong to a known user-defined tagged union is missing at least one variant arm and has no wildcard `_` arm. Only fires when the arm tags uniquely identify a single union (no tag name collisions across unions). | Add the missing variant arm(s), or add a wildcard `_ -> ...` arm. |
| MAT004 | (warning, 0.9+) A `match` expression on a user-defined tagged union already covers all variants explicitly AND also has a wildcard `_ -> ...` arm. The wildcard is unreachable dead code and silently absorbs future new variants, defeating the exhaustiveness check. | Remove the wildcard arm. |
| VER001 | (warning, < 0.9) A non-empty `reads {}` or `writes {}` clause is declared on a fn in a file pinned below `?bs 0.9`. DEP001/DEP002 enforcement is not active; the annotation is documentation only. Non-blocking. | Upgrade the pin to `?bs 0.9` to activate enforcement, or leave it knowing it is unenforced. |
| VER002 | (warning, < 0.9) A non-empty `throws {}` clause is declared on a fn in a file pinned below `?bs 0.9`. THR001 enforcement is not active; the annotation is documentation only. Non-blocking. | Upgrade the pin to `?bs 0.9` to activate enforcement, or leave it knowing it is unenforced. |
| VER003 | (warning, < 0.7) A non-empty `intent: "..."` clause is declared on a fn in a file pinned below `?bs 0.7`. INT001–INT005 enforcement is not active; the annotation is documentation only. Non-blocking. | Upgrade the pin to `?bs 0.7` to activate enforcement, or leave it knowing it is unenforced. |

When you add a new compiler error, allocate the next free code in the same
range (`BSnnn` for general parse errors, `CAPnnn` for capability checks,
`UNSnnn` for unsafe-block checks, `RESnnn` for Result-block checks,
`FMTnnn` for canonical-form / formatter checks, `SYNnnn` for structural /
duplicate-clause checks). The
single source of truth is `packages/compiler/src/error-codes.ts` — passes
read rule/idiom/rewrite from that registry. When you add a code:

1. Add the entry to `error-codes.ts` with rule, idiom, rewrite, and example.
2. Add a long-form entry to `packages/mcp/src/explanations.ts` so the MCP
   `explain` tool answers for it.
3. Add a row to the table above.
4. Add a row to the table in `README.md`'s "MCP server" tools section if the
   new code is part of the user-facing surface.

## Conventions checklist

A PR is ready when ALL of the following are true. CI checks the easy ones; you
check the others.

- [ ] `pnpm -r build` clean.
- [ ] `pnpm test` clean.
- [ ] `pnpm --filter node-app test` clean.
- [ ] `pnpm --filter react-app build` clean.
- [ ] Test added (rewrites X), (leaves Y alone), and forward-compat (previous `?bs` pin behaves identically).
- [ ] `STDLIB.bs` updated if syntax changed.
- [ ] `primer.ts` updated if syntax changed.
- [ ] `error-codes.ts` updated if a new diagnostic was emitted.
- [ ] `packages/mcp/src/explanations.ts` updated if a new diagnostic was emitted, and the MCP test's `KNOWN_CODES` assertion updated.
- [ ] AGENTS.md diagnostic-codes table updated if a new diagnostic was emitted.
- [ ] README.md "What's new in `?bs <pin>`" section updated if a feature was added.
- [ ] At least one `examples/` program uses the new form.
- [ ] No new dependencies (or the PR explains why a new dep was unavoidable).
- [ ] No `console.log`, `// TODO`, `// FIXME`, or `.only`/`.skip` in tests.
- [ ] No emojis anywhere.
- [ ] No backward-incompatible change to a shipped `?bs <version>`. Behaviour changes go behind a new pin.

## Reading list (in order)

1. `MANIFESTO.md` — what we're building and why.
2. `packages/compiler/src/primer.ts` (the `PRIMER` const) — what the language is.
3. `STDLIB.bs` — every feature, exactly once.
4. `packages/compiler/src/transform.ts` — the pass pipeline.
5. `packages/compiler/src/passes/<any>.ts` — pick the simplest one as a template.
6. `examples/node-app/src/main.bs` — the shape of an actual program.

If your harness has MCP, you can also wire `@mbfarias/botscript-mcp` and call
`primer` / `transform` / `explain` instead of file-reading the above. Same
content, fewer reads.

If anything in this document conflicts with the `MANIFESTO.md`, the manifesto
wins. If the manifesto conflicts with reality, file an issue. We update
docs in the same PR as the code; ambiguity gets resolved at the diff, not in
the queue.
