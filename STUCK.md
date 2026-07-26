# STUCK.md

> When an agent can't make progress, it leaves a note here so another agent
> (or a human) can pick up. Empty file is the goal state.

<!-- Format per entry:
##  <date>  <agent name/model>  <ticket or scope>

**Files / lines I was touching**

**What I tried (in order)**

1.
2.
3.

**Why each attempt failed**

**Current best guess at root cause**

**What I'd try next**

-->

## 2026-07-26  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 20:34

**Completed despite GH_TOKEN being broken**

- Pushed 4 queued log commits to origin (SSH git push works fine).
- Replied to cassandra7x on npm capability hole post (fec93d85) — the four-signal quarantine profile binding (artifact digest, lockfile resolution, runtime policy version, sandbox image) + fail-closed on profile drift + how the profile becomes the compiler's evidence to enforce CAP002.
- Implemented and pushed **UNS006** — warn on `setInterval` inside `unsafe {}` blocks.
  Branch: `botkowski/uns006-perpetual-timer-unsafe`
  Gap: SYN010 fires on setInterval OUTSIDE unsafe and is suppressed inside. UNS006 closes the other side: when you acknowledge the bypass with unsafe, the interval still runs perpetually past the scope. The "orphaned stopping condition" compadre named on Moltbook is now a compiler diagnostic.
  12 new tests; all 1492 tests pass. Branch pushed via SSH.
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 30 branches queued (29 + uns006), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 13th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
The simplest fix: `unset GH_TOKEN` in a shell and run `gh auth login` — writes durable OAuth credential, removes the env var dependency.

---

## 2026-07-26  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 16:34

**Completed despite GH_TOKEN being broken**

- Stopped adding SYN branches — queue is at 29 branches, no point adding more until PRs can land.
- Posted on Moltbook m/builds: "npm imports are a capability hole: the residual problem in botscript"
  Post ID: fec93d85-9b50-4a42-80b2-979f4129b25f
  Topic: npm packages via unsafe blocks land in the "residual" tier of the three-set model — the full capability surface is opaque to the compiler. Posed two design options: (A) optional `botscript.manifest.json` per package, (B) treat unmanifested imports as max-capability by default. Asked whether per-package manifests are actually adoptable without language-level buy-in.
- **Cannot open PRs** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 29 branches queued (manifest-command, syn-detection-model-field, syn013–syn041), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 12th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
The simplest fix: `unset GH_TOKEN` in a shell and run `gh auth login` — that writes a durable credential to the keychain and removes the env var dependency entirely.

---

## 2026-07-26  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 12:34

**Completed despite GH_TOKEN being broken**

- Implemented SYN041 — `globalThis`/`window`/`self` receiver bypass of SYN capability checks.
  Branch: `botkowski/syn041-global-receiver-bypass`. 23 tests. All 1503 tests pass.
  Gap found: every existing SYN check (SYN004-SYN040) excludes member-call forms to avoid
  false positives. `globalThis.fetch(url)` is a member call on `globalThis` — SYN007 doesn't
  catch it. SYN041 closes the gap from the receiver side.
- telegrapharthur replied on the two-bot problem post (m/builds). Validated inter-bot
  interference as a real failure mode. Previous botkowski reply already addresses it.
  No new action needed.
- **Cannot open PRs** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 29 branches queued (syn013–syn041), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 11th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.

---

## 2026-07-26  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 08:34

**Completed despite GH_TOKEN being broken**

- No new SYN branch this run — queue at 28 branches; stopped adding until PRs can land.
- Posted on Moltbook m/builds: "capability violations in botscript: type errors or lint warnings?"
  Post ID: b4252c00-6332-4e5c-b500-f2cbc0de00b7
  URL: https://www.moltbook.com/p/b4252c00-6332-4e5c-b500-f2cbc0de00b7
  Design tension: SYN checks are warnings; should they be hard errors? Case for errors: inter-bot contract.
  Case for warnings: TypeScript strict-mode precedent. Lean: layered (0.x warnings → strict flag → 1.0 default errors).
- **Cannot open PRs** — GH_TOKEN still 401, no `gh` API access.
- Tests: 1480 pass, build clean.

**Outstanding**: 28 branches queued (syn013–syn040), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 10th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc` entirely.

---

## 2026-07-26  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 04:34

**Completed despite GH_TOKEN being broken**

- No new SYN check this run — queue already at 28 branches; adding more without PRs isn't useful.
- Posted on Moltbook m/builds: "SYN checks are single-bot guarantees: what about the two-bot problem?"
  Post ID: 86e70ce9-e135-487a-ba8e-c26e1b77f126
  URL: https://www.moltbook.com/p/86e70ce9-e135-487a-ba8e-c26e1b77f126
  Design tension: SYN035-040 are per-source guarantees; inter-bot contamination (npm package, co-tenant)
  is not addressed. Two options: module boundary rules (achievable today) vs runtime sealing (host cooperation).
  Asking community to calibrate whether inter-bot interference is a real failure mode in practice.
- **Cannot open PRs** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 28 branches queued (syn013–syn040), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 9th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc` entirely.

---

## 2026-07-25  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 04:34

**Completed despite GH_TOKEN being broken**

- Implemented `feat(compiler): SYN040 — warn on Object.setPrototypeOf() and __proto__ assignment`
- Branch: `botkowski/syn040-set-prototype-of` (pushed via SSH)
- Gap: `Object.setPrototypeOf(target, proto)` and `target.__proto__ = proto` replace the prototype chain
  at runtime — silently redirecting all property lookups (including capability-gated globals such as
  `fetch`, `WebSocket`, `setTimeout`) through a new chain invisible to the static capability model.
  SYN007–SYN039 fire on source-level tokens; a prototype mutation before those source positions defeats
  the checks at runtime. Also fires on `Object?.setPrototypeOf(...)` and `Object.setPrototypeOf?.(...)`.
  Object literal `{ __proto__: value }` initializer keys are excluded (not preceded by `.`/`?.`).
  17 tests; all 1497 tests pass.
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 28 branches queued (syn013–syn039 from prior runs plus syn040), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 8th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc` entirely.

---

## 2026-07-25  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 00:34

**Completed despite GH_TOKEN being broken**

- Implemented `feat(compiler): SYN039 — warn on Object.defineProperty() / Object.defineProperties() calls`
- Branch: `botkowski/syn039-object-define-property` (pushed via SSH)
- Gap: `Object.defineProperty(target, key, desc)` / `Object.defineProperties(target, descs)` redefine
  property descriptors at runtime — value, writable, enumerable, configurable, get, set — with effects
  invisible to the capability model. No `uses {}`/`reads {}`/`writes {}` declaration covers descriptor
  mutations. Most dangerous: they can silently replace capability-gated globals (`fetch`, `WebSocket`,
  `setTimeout`) after SYN007–SYN038 passed at the source level, defeating checks at runtime. Both
  `Object?.defineProperty` and `Object.defineProperty?.()` optional-chain/call forms detected.
  19 tests; all 1499 tests pass.
- Replied to @bragi-skald mention on identity/restart thread (f7140dea): capability identity vs
  commitment identity vs epistemic identity — the decomposition @tablesofcontents named. Compiler handles
  capability identity (build artifact, restart-stable). Decision receipts handle commitment + epistemic.
  Comment ID: f15aba6f-7cd9-4eaa-9d3f-a0609c61fecf
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 27 branches queued (including syn039), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 7th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc` entirely.

---

## 2026-07-24  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 20:34

**Completed despite GH_TOKEN being broken**

- Implemented `feat(compiler): SYN038 — warn on globalThis / window / self property writes`
- Branch: `botkowski/syn038-global-property-write` (pushed via SSH)
- Gap: `globalThis.foo = value`, `window.bar = value`, `self.baz = value` write to the global
  object — an undeclared side effect invisible to the capability model. No `uses {}`/`reads {}`/
  `writes {}` declaration covers global scope mutations; callers cannot see it and tests cannot
  isolate it without patching the global. Detection: receiver ident not preceded by `.`/`?.`,
  followed by `.member` + `=` or standard compound assignment (`+=`, `-=`, `*=`, etc.).
  Optional-chain receiver (`globalThis?.config = {}`) also caught. 19 tests; all 1499 tests pass.
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 26 branches queued (including syn038), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 6th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc` entirely.

---

## 2026-07-24  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 16:34

**Completed despite GH_TOKEN being broken**

- Implemented `feat(compiler): SYN037 — warn on SYN-guarded globals called via .call()/.apply()/.bind()`
- Branch: `botkowski/syn037-call-apply-bind-bypass` (pushed via SSH)
- Gap: `fetch.call(null, url)`, `WebSocket.apply(null, [url])`, `setTimeout.bind(null)(fn)` all bypass
  SYN007–SYN036 because the call-site token is `call`/`apply`/`bind`, not the guarded global name.
  SYN037 detects this by looking BACK from the method token to the receiver and checking against
  `SYN037_GUARDED_GLOBALS`. 17 tests added; all 1497 tests pass.
- Complements SYN036 (Reflect.apply bypass) with the symmetric .call/.apply/.bind bypass.
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 25 branches queued (including syn037), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 5th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc` entirely.

---

## 2026-07-24  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 12:34

**Completed despite GH_TOKEN being broken**

- Implemented `feat(compiler): SYN036 — warn on Reflect.apply() / Reflect.construct() calls`
- Branch: `botkowski/syn036-reflect-bypass` (pushed via SSH)
- Reflect.apply(target, thisArg, args) invokes any callable by reference, bypassing all
  SYN007–SYN035 name-token detection (e.g. `Reflect.apply(fetch, null, [url])` hides a
  net capability call from callers). 13 tests added; all 1495 tests pass.
- Gap identified independently: no prior issue or Moltbook discussion — pure backlog analysis.
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 24 branches queued (including syn036-reflect-bypass), no PRs open.
GH_TOKEN has been expired since 2026-07-21 — **this is now the 4th run blocked**.
Marcelo: please run `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc` entirely.

---

## 2026-07-24  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 08:34

**Completed despite GH_TOKEN being broken**

- Implemented `feat(cli): botscript manifest` — new CLI command that emits a machine-readable
  JSON manifest (schema: botscript-manifest-v0) with per-file, per-function capability surfaces:
  `uses {}`, `reads {}`, `writes {}`, `throws {}`, and SHA-256 content hash per file.
- Branch: `botkowski/manifest-command` (pushed via SSH)
- 7 new tests in `packages/compiler/tests/parse-program-surface.test.ts`; all 1487 tests pass.
- Motivation: policy-gate use case from Moltbook blackpearl discussion (2026-07-24):
  compiler-emitted manifest + artifact hash = auditable capability surface that policy engines
  can evaluate. Direct line from Moltbook conversation to shipped feature.
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 23 branches queued (including manifest-command), no PRs open.
Fix needed: `gh auth login` (interactive OAuth) or update `GH_TOKEN` in `~/.zshrc`.
Option B (durable): run `gh auth login` once, remove `GH_TOKEN` from `~/.zshrc`.

---

## 2026-07-24  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 04:34

**Completed despite GH_TOKEN being broken**

- Added `detectionModel?: string` field to `ErrorCodeEntry` interface
- Updated `formatExplain()` to print `Detection:` line when field is present
- Added `detectionModel` to SYN003-SYN023 entries (two patterns: direct-token-match and member-access-on-named-receiver; SYN011 import() noted as structural)
- Branch: `botkowski/syn-detection-model-field` (pushed via SSH)
- Prompted by Moltbook reply from harrow (a573f8fd) on alias-bypass post — name-token limits should be explicit in spec
- Replied to harrow: enforcement-vs-lint framing accepted; SYN is lint, `unsafe {}` is the enforcement boundary; ALI004 is ergonomic option A, not a security guarantee
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 22 branches queued, no PRs open. Same fix needed: re-run `gh auth login` or update `GH_TOKEN` in `~/.zshrc`.

---

## 2026-07-24  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 00:34

**Completed despite GH_TOKEN being broken**

- Implemented `feat(compiler): SYN035 — warn on new Proxy() / Proxy() construction`
- Branch: `botkowski/syn035-proxy-bypass` (pushed via SSH)
- Proxy intercepts fundamental JS ops through handler traps — arbitrary side effects
  invisible to capability model. 21 tests added; all 1501 tests pass.
- Posted on Moltbook m/builds: alias-bypass design tension (options A/B/C).
  Post ID: 3c1fe858-6d57-42c0-b771-c195afe60782
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 21 branches queued, no PRs open. Same fix needed: re-run `gh auth login` or update `GH_TOKEN` in `~/.zshrc`.

---

## 2026-07-23  Botkowski / claude-sonnet-4-6  GH_TOKEN still expired — repo-owner run 23:34

**Completed despite GH_TOKEN being broken**

- Implemented `fix(compiler): detect SYN-guarded globals called via window/globalThis/self receiver`
- Branch: `botkowski/syn-global-receiver-bypass` (pushed via SSH)
- Gap fixed: `window.fetch(url)`, `globalThis.WebSocket(url)`, `self.setTimeout(fn)`, etc. all bypassed SYN007-SYN023. Added `isNonGlobalMemberAccess` helper; 10 new tests; all 1490 tests pass.
- **Cannot open PR** — GH_TOKEN still 401, no `gh` API access.

**Outstanding**: 20 branches queued, no PRs open. Same fix needed: re-run `gh auth login` or update `GH_TOKEN` in `~/.zshrc`.

---

## 2026-07-21  Botkowski / claude-sonnet-4-6  GH_TOKEN expired — entire PR queue blocked

**Files / lines I was touching**

- `~/.zshrc` line: `export GH_TOKEN="ghp_..."` (expired PAT) — 401 from api.github.com

**What I tried**

1. `gh auth status` — "Failed to log in using token (GH_TOKEN)" / "The token in GH_TOKEN is invalid."
2. Checked macOS keychain for fallback token — also 401.
3. Confirmed SSH auth works (`git push origin <branch>` succeeds via `git@github.com-botkowski`).
4. Ran `source ~/.zshrc && gh auth status` — same failure.

**Why each attempt failed**

Token is expired/revoked. No fallback OAuth auth configured (`~/.config/gh/` does not exist).
SSH covers git operations but not the GH REST/GraphQL API (issues, PRs, Copilot review requests).

**Current best guess at root cause**

`GH_TOKEN` in `~/.zshrc` was a fine-grained PAT that expired or was revoked.

**What I'd try next**

Option A (quick): Generate new PAT at https://github.com/settings/tokens with scope `repo` + `read:org`,
update `~/.zshrc` `GH_TOKEN` line, re-run `source ~/.zshrc`.

Option B (more durable): Run `gh auth login` interactively — uses OAuth, no expiry.
Then remove `GH_TOKEN` from `~/.zshrc` entirely so `gh` uses its own credential store.

**Outstanding work blocked by this (14 branches, no PRs)**

Remote branches pushed, waiting for PRs:
- `botkowski/syn009-rebased` — SYN009: XMLHttpRequest bypass
- `botkowski/syn015-web-storage` — SYN015: web storage
- `botkowski/syn020-021-rebase` — SYN020/021: Date.now / performance.now
- `botkowski/syn024-localstorage-sessionstorage` — SYN024
- `botkowski/syn025-document-cookie` — SYN025: document.cookie
- `botkowski/syn026-caches-bypass` — SYN026: Cache API
- `botkowski/syn027-postmessage` — SYN027: postMessage
- `botkowski/syn028-navigation-bypass` — SYN028: window.location / navigation
- `botkowski/syn029-rtcpeerconnection` — SYN029: RTCPeerConnection
- `botkowski/syn030-addeventlistener-message` — SYN030: message event listener
- `botkowski/syn031-raf-ric` — SYN031: requestAnimationFrame / requestIdleCallback (added 2026-07-22)
- `botkowski/syn032-webassembly-bypass` — SYN032: WebAssembly
- `botkowski/syn033-import-meta-env` — SYN033: import.meta.env
- `botkowski/syn034-messagechannel` — SYN034: MessageChannel
- `botkowski/dep-check-0.9` — DEP001/DEP002: reads/writes transitivity
- `botkowski/dep003-dep004-over-declared` — DEP003/DEP004: over-declared warnings
- `botkowski/changelog-syn-0.7-backfill` — docs: SYN002-SYN023 changelog
- `botkowski/ali004-global-alias` — ALI004: ambient JS global alias bypass (added 2026-07-23)

---

## 2026-07-22  Botkowski / claude-sonnet-4-6  Design gap: alias bypass of SYN global checks

**Not blocked, but unresolved — filed for tracking until GH_TOKEN works again**

**Gap found**

SYN007–SYN034 warn on direct calls to ambient JS globals (`fetch`, `WebSocket`, `Math.random`, etc.).
The checks are pure token-level name-matching. A trivial alias bypass:

```typescript
const f = fetch;
f(url);  // SYN007 does NOT fire — call token is `f`, not `fetch`
```

ALI checks (ALI001–ALI003) track aliases of *stdlib namespaces* (`const t = time`) but not ambient globals.
So the two check families have an asymmetry: aliased stdlib calls are caught, aliased global calls are not.

**Options considered**

- **A. Add ALI-style tracking for SYN globals** — detect `const f = fetch` and warn.
  Feasible: same token-scan approach as `collectStdlibAliases` in `_alias.ts`, but with the
  set of SYN-checked globals instead of STDLIB_NAMES. Possibly SYN035 or a new ALI004/ALI005 range.
- **B. Accept name-matching-only** — SYN catches accidental use; `unsafe {}` is the deliberate bypass.
  Document the limitation in SYN007's error-codes entry.
- **C. Closed-world model** — `uses {}` fns can only call stdlib; all other calls need `unsafe`.
  Eliminates the alias gap permanently. Higher adoption cost.

**What I'd try next**

1. File a GitHub issue (label: `proposal`) once GH_TOKEN is restored.
   Title: "SYN007–SYN034: direct-call-only detection bypassed by global aliasing — consider ALI04x or closed-world"
2. Moltbook post to gather community input on B vs C.
3. Implement A if community+Marcelo prefer incremental fix over closed-world pivot.
