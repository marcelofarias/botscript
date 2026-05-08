# The botscript Manifesto

> A small language for a world where most code is written by machines.

## Why

TypeScript was designed for humans, in an era when humans wrote almost all the
code. We are not in that era anymore. Most lines committed to most repositories
are now drafted by language models, refined by language models, and reviewed
(at first pass) by language models. The bottleneck is no longer typing speed,
nor working memory, nor onboarding velocity. The bottleneck is **how often the
machine guesses wrong** and how cheaply we catch it when it does.

botscript starts from a single observation: *every footgun in TypeScript is a
machine-multiplied tax*. A null dereference that costs a junior dev twenty
minutes costs an autonomous agent a wasted PR, a stale review queue, and a
human's afternoon. A silent `any` that a careful reviewer would catch becomes
load-bearing infrastructure when the reviewer is also a model. The cost of
ambiguity has gone up by orders of magnitude. The language has not moved.

botscript is what you get when you redesign TypeScript with that in mind — and
nothing else.

## Principles

### 1. Make ambiguity into a syntax error.

Every place TypeScript shrugs ("you probably know what you're doing"),
botscript stops the build. No implicit `any`. No `null` *and* `undefined` — only
`Option`. No exceptions for control flow — only `Result`. No fallthrough in
`match`. No `as` casts without an explicit `unsafe { }` block that shows up in
diff review. The premise is simple: a generator that has to commit to a choice
writes better code than one that's allowed to defer.

### 2. Side effects are part of the type.

Every function declares the capabilities it consumes — `net`, `fs`, `time`,
`random`, `process`, `stdout`. The compiler enforces it. A function that says
`uses { }` cannot transitively reach the network, no matter how deep the call
graph. This is the single feature that pays back the most agent-hours: you can
hand a model a strict-pure refactor and *know* it didn't sneak a `fetch` into
your hot path.

### 3. The language ships its own teacher.

A botscript file can begin with `?primer` and the compiler will emit the full
language spec, every built-in capability, and a curated handful of canonical
idioms — as a comment block at the top of stdout — without running the program.
Every diagnostic includes a three-line "this is the rule, this is the idiom,
this is the rewrite" snippet. There is a single `STDLIB.bot` file in this repo
that demonstrates every feature exactly once. An agent dropped into a botscript
codebase cold has, by design, everything it needs to write correct code by the
end of its first tool call.

### 4. Tests are syntax, not a library.

`test "name" { … }` is a top-level form. Time, randomness, and the network are
deterministic by default inside tests — *the test runner is the only thing that
can hand a test a real clock or a real socket*. Mocks are a `with mocks { … }`
clause on the test itself, not a side effect of imports. A model writing a test
cannot accidentally make it flaky.

### 5. The cost of adoption is zero.

botscript compiles to TypeScript. Every botscript file has a `.bs` extension
and a one-line transform; everything else — types, imports, npm packages, tsc,
tsserver, your editor — works exactly as before. You can rename a single file
from `.ts` to `.bs`, fix nothing, and the build still passes. botscript adds
features; it does not subtract any.

### 6. Be small. Stay small.

The full language fits on one page. The runtime is under a thousand lines. The
compiler does six transforms and stops. Anything that *could* be a library
*is* a library. The only things that earn syntax are the things a model gets
catastrophically wrong without it.

## What botscript is not

It is not a replacement for TypeScript. It is not a research language. It is
not trying to be safe in the formal-methods sense, nor fast in the systems
sense, nor general in the academic sense. It is a delivery mechanism for a
small set of opinions about what makes code easy for a non-human collaborator
to write correctly the first time.

It is opinionated where TypeScript is permissive, and silent where TypeScript
is chatty. That is the entire trade.

## Status

This is a weekend project. The compiler is a token-aware preprocessor, not a
real frontend. The capability check is a runtime tag, not a static analysis.
The exhaustiveness of `match` is enforced by `ts-pattern` rather than by the
language itself. None of that matters yet. What matters is that the *shape* is
right — that you can plug it into an existing TypeScript project today, write
a real function in it, and feel the difference. Everything else is engineering.

— botscript, 2026
