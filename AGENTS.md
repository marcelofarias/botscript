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
│   ├── cli/            `botscript build`, `botscript primer`. Thin wrapper.
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

The bot-optimized version of the contributor recipe:

1. **Pick a target form.** What syntax are you adding? Write down the exact
   `.bs` snippet you want to support, and the TypeScript it should desugar to.
   Both must be in the PR description.
2. **Update `STDLIB.bs`.** Add one example of the new form. If you can't write
   one, the feature is probably not coherent yet.
3. **Update `primer.ts`.** Add the new form to the right section. Keep the
   primer under one screen — if the feature can't be described in three lines,
   reconsider its scope.
4. **Add a new pass.** Create `packages/compiler/src/passes/<name>.ts`.
   Export a single function `(src: string) => string`. Reuse `lex.ts` helpers
   (`skipBalanced`, `findOutside`, `stepOne`, `readIdent`); do not write your
   own bracket matcher. Handle the success case and pass through unchanged on
   any malformed input.
5. **Wire the pass in.** Add it to `PASS_PIPELINE` in `transform.ts`. Order
   matters — passes that introduce new statements (like `fn`) must run before
   passes that transform statements (like `unwrap`).
6. **Add tests.** A "rewrites X" test, a "leaves Y alone" test, an integration
   test that uses the form alongside other features.
7. **Run the suite.**
   ```
   pnpm install
   pnpm -r build
   pnpm test
   pnpm --filter node-app test
   pnpm --filter react-app build
   ```
   All five must succeed.
8. **Use the form in an example.** Add a usage to `node-app` or `react-app`.
   This catches integration bugs that unit tests miss.

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
| CAP001 | A fn calls `http/time/random/fs/stdout/stderr.X` whose capability isn't in its `uses { … }`. | Either add the capability or remove the call. The diagnostic includes the literal `fn name(...) uses { … } -> ...` rewrite. |

When you add a new compiler error, allocate the next free code in the same
range (`BSnnn` for general parse errors, `CAPnnn` for capability checks). Add
a row to the table above in the same PR.

## Conventions checklist

A PR is ready when ALL of the following are true. CI checks the easy ones; you
check the others.

- [ ] `pnpm -r build` clean.
- [ ] `pnpm test` clean.
- [ ] `pnpm --filter node-app test` clean.
- [ ] `pnpm --filter react-app build` clean.
- [ ] Test added (rewrites X) and (leaves Y alone).
- [ ] `STDLIB.bs` updated if syntax changed.
- [ ] `primer.ts` updated if syntax changed.
- [ ] No new dependencies (or the PR explains why a new dep was unavoidable).
- [ ] No `console.log`, `// TODO`, `// FIXME`, or `.only`/`.skip` in tests.
- [ ] No emojis anywhere.
- [ ] No backward-incompatible change to a shipped `?bs <version>`.

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
