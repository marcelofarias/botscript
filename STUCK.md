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
