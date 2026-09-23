# RFC-001: Collapse the SYN004–SYN074 reachability family into one semantic guarded-global pass

> **Status:** Draft, awaiting sign-off. Not yet filed as a GitHub issue — the
> repo-owner token currently has `contents:write` but lacks `issues:write` /
> `pull_requests:write`, so it can push commits but cannot open issues or PRs.
> File this as an `rfc`-labeled issue once the token scopes are fixed.

## Summary

Replace the SYN004–SYN074 family (74 codes, `syn-check.ts` is **7,149 lines**, **96 commits this year**) with a single **semantic guarded-global reachability pass**: resolve whether the *object/callee* of an access binds — through local const/let alias + destructuring data-flow — to a guarded global, then check the member against the existing dangerous-member table. One rule + one data table subsumes the family and stops an unwinnable regress.

## The problem (receipts)

The SYN family detects one **syntactic form** of reaching a guarded global at a time. Each new code exists *only* because the prior ones can be bypassed — the commit log and doc-comments say so explicitly:

- SYN074 — inline array `reduce()/reduceRight()` bypass
- SYN073 — `find()/findLast()` bypass
- SYN072 — `Reflect.get(<global>, '<member>')` bypass
- SYN071 — `pop()/shift()` bypass
- SYN070 — `.at(N)` bypass
- SYN069 — inline array bracket-access bypass
- SYN068 — fn-body-local array-destructuring alias bypass
- SYN067 — module-scope array-destructuring alias bypass

From the source comments (`syn-check.ts`):
> `SYN044 A module-scope binding that aliases a SYN-guarded global … **bypasses SYN004–SYN043** because all name-token checks fire on the guarded name token`
> `SYN046 A module-scope destructuring rename …`  `SYN050 A fn-body-local destructuring rename …`

This is a Turing tarpit. Static syntactic enumeration can **never** be complete — trivial escapes remain unhandled today, e.g.
```
const g = [window][0]           // wrap+index chains
const w = (0, window)           // comma operator
const k = 'win' + 'dow'; globalThis[k]   // computed member
function id(x){return x} id(setTimeout)  // pass-through fn
```
Every one is "just one more SYN code" — forever.

## Cost this is already imposing

- **8 open PRs** (#150, #162, #176, #177, #181, #182, #184) grinding **6–31 rounds** of Copilot ping-pong each, none merged.
- The ping-pong findings are *symptoms of hand-matching per form*: on #184 Copilot correctly flags the SYN028 pass suggesting **invalid code** (`location?.href = url` — optional chaining can't be an LHS) and **nonsense fixes** (`location.reload(url)` — reload takes no arg). Every hand-rolled form re-introduces these.
- 7,149 lines and 74 codes is a maintenance and diagnostic-surface liability; users can't reason about 74 near-identical warnings.

## Proposed design

One pass, roughly:

1. **Guarded-global binding resolution.** Build a per-scope map of bindings that resolve to a guarded global, seeded from `SYN037_GUARDED_GLOBALS` / `SYN038_GLOBAL_RECEIVERS`. Propagate through: direct alias (`const a = window`), destructuring (`const {open}=window`, `const [x]=[window]`), array/element access of a literal containing a global, and single-return pass-through fns. Bounded, intraprocedural, fixpoint over local decls — not full dataflow.
2. **Access check.** For any member/computed/call access whose resolved object is a guarded binding, look the member up in the existing `SYN041_DANGEROUS_MEMBERS` (+ per-global member tables). Emit **one** code, e.g. `SYN-REACH`, carrying `{global, member, viaForm}` in the diagnostic envelope so the *form* becomes data, not a new code.
3. **Suggested-fix generation** derives from the resolved (global, member) pair, not the surface syntax — eliminates the invalid-fix class Copilot keeps catching.

Keep the distinct *semantics* codes that aren't "reach a global" (e.g. capability-header mismatches). This RFC targets only the reachability family.

## Migration

- Introduce `SYN-REACH` behind `?bs 0.7+`; map retired SYN004–SYN074 to it (alias table for back-compat in diagnostics).
- Port existing per-code tests to assert `SYN-REACH` + `viaForm`.
- **Hold the 8 open SYN PRs** pending this decision rather than merging piecemeal — most are subsumed.

## Ask

Sign-off on direction before I build it. If we'd rather keep syntactic codes, we should at least stop opening a new PR per form and instead batch them — but I think that's treating the symptom.
