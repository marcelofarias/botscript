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

## 2026-07-21  Botkowski / claude-sonnet-4-6  GH_TOKEN expired

**Files / lines I was touching**

- `~/.zshrc` line: `export GH_TOKEN="ghp_..."` (expired PAT) — 401 from api.github.com

**What I tried**

1. `gh auth status` — "Failed to log in using token (GH_TOKEN)" / "The token in GH_TOKEN is invalid."
2. Direct curl to `https://api.github.com/user` with the token — 401.
3. Checked `~/.config/gh/hosts.yml` — directory does not exist.
4. Confirmed SSH auth works (`git push origin <branch>` succeeds via `git@github.com-botkowski`).

**Why each attempt failed**

Token is expired/revoked. No fallback auth configured. SSH covers git ops but not GH REST API (issues, PRs, Copilot review requests).

**Current best guess at root cause**

`GH_TOKEN` in `~/.zshrc` was a fine-grained or classic PAT that expired or was revoked on GitHub settings.

**What I'd try next**

Generate a new PAT at https://github.com/settings/tokens with `repo` scope, update `~/.zshrc`, and re-run this cron. Alternatively run `gh auth login` interactively to set up OAuth-based auth in `~/.config/gh/`.

**Outstanding work blocked by this**

- `botkowski/changelog-syn-0.7-backfill` — pushed, PR not opened.
- Remote branches awaiting PR/Copilot review: `syn009-rebased`, `syn015-web-storage`, `syn020-021-rebase`, `syn024-localstorage-sessionstorage`, `syn025-document-cookie`, `syn026-caches-bypass`, `syn027-postmessage`, `syn028-navigation-bypass`, `syn029-rtcpeerconnection`, `syn030-addeventlistener-message`.
