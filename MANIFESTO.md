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

## But isn't this just stricter TypeScript?

A meticulously configured TypeScript project is in fact quite good. With the
right `tsconfig` flags and the right `eslint.config.js`, you can catch:

- Switch fallthrough (`noFallthroughCasesInSwitch`).
- Exhaustive `match` (`@typescript-eslint/switch-exhaustiveness-check`).
- Unhandled promises (`no-floating-promises`).
- Naked `any` and unsafe casts (`no-explicit-any`, `no-unsafe-*`).
- Throws disguised as control flow — by adopting `Result` via `neverthrow`
  or `effect` — and most of what `Result.try` does syntactically.

If your team writes TypeScript carefully, in a tight project with a sharp
CI, you are catching most of what botscript catches. We are not pretending
otherwise. botscript adds three things that lint cannot, in increasing
order of cost-to-replicate:

1. **Forced justification on every cast.** `unsafe "<reason>" { x as Foo }`
   makes the *reason string* mandatory and visible at every escape-hatch
   site. A lint rule can ban `as`. It cannot make a non-empty justification
   show up in `git diff`.

2. **Transitively pure functions.** `pure { … }` rejects capability use not
   just lexically, but through every callee in the same module. ESLint sees
   one file at a time and one expression at a time. A pure function that
   calls a helper that calls a logger is a bug today's lint cannot see; in
   botscript it is a CAP001 with the call path named in the diagnostic.

3. **Capability inference on the call graph.** `effect-ts` achieves
   something similar by threading `Effect<R, E, A>` through every signature
   — a pervasive runtime and syntax tax. botscript's `uses { net }` is one
   annotation in the fn header, and the compiler walks the same-file call
   graph for you. A function declared `uses { }` that reaches the network
   through three hops fails to compile.

Those three are real. They are also the smaller half of why botscript
exists. The bigger half is *who reads the rules*.

A well-tuned TypeScript project says: "the surface is huge, here are 47
rules that narrow it." That is a contract between humans and CI. A model
writing into the codebase does not see your `eslint.config.js` at
generation time. It writes idiomatic-but-locally-wrong TypeScript by
analogy from training data, and finds out the linter disagrees only on
commit. The iteration cost — read error, regenerate — is real, and it
multiplies by every PR an agent opens.

botscript's bet is that *the syntax that violates the rule should not
exist*. The model does not have to know about your lint config because
there is no `try { } catch (e) { }` to swallow, no naked `as`, no
unannotated I/O, no untraced capability. The grammar enforces what lint
requested.

Whether that is worth a new language depends on your bet:

- If you think a strict TypeScript project plus discipline plus code review
  reliably keeps machine-written code on the rails — TypeScript plus lint
  is the pragmatic answer. We agree.
- If you think models will keep slipping through the surface that lint
  cannot cover — capabilities, transitive purity, forced justifications —
  botscript's narrower grammar is the bet.

We are not telling you TypeScript is unsafe. We are telling you that the
configuration you trust to keep TypeScript safe is invisible to the
collaborator now writing most of your code, and a narrower grammar removes
that asymmetry.

## Status

This is a weekend project. The compiler is a token+small-AST preprocessor,
not a real frontend. Capability checks are a runtime tag under `?bs 0.1`;
under `?bs 0.2` the compiler also catches *direct* stdlib references whose
required capability isn't declared, but transitive call-graph propagation
is still future work. The exhaustiveness of `match` is enforced by
`ts-pattern` rather than by the language itself. None of that matters yet.
What matters is that the *shape* is right — that you can plug it into an
existing TypeScript project today, write a real function in it, and feel the
difference. Everything else is engineering.

— botscript, 2026
