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
