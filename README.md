<p align="center">
  <img src="./images/botscript.svg" alt="botscript" width="120" />
</p>

# botscript

A small TypeScript-superset language for a world where most code is written by
machines. Read [`MANIFESTO.md`](./MANIFESTO.md) for the why.

> **Live playground:** [marcelofarias.github.io/botscript](https://marcelofarias.github.io/botscript/)
> — type `.bs` on the left, see the desugared TypeScript on the right. The
> actual compiler bundle, running in your browser, no install required.
>
> Or run it locally: `pnpm install && pnpm play` → http://localhost:5173.

## .bs vs .ts at a glance

The same program in idiomatic TypeScript and in botscript:

### Async fetch with errors

<table>
<tr><th>TypeScript</th><th>botscript</th></tr>
<tr>
<td>

```ts
async function loadUser(id: string) {
  try {
    const res = await fetch(`/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}
```

</td>
<td>

```bs
async fn loadUser(id: string) uses { net }
    -> Result<User, string> {
  let res = http.get(`/users/${id}`)?
  ok(await res.json() as User)
}
```

</td>
</tr>
</table>

### Exhaustive shape dispatch

<table>
<tr><th>TypeScript</th><th>botscript</th></tr>
<tr>
<td>

```ts
function area(s: Shape): number {
  switch (s.kind) {
    case "Circle": return Math.PI * s.r * s.r;
    case "Square": return s.side * s.side;
    default: throw new Error("unhandled");
  }
}
```

</td>
<td>

```bs
fn area(s: Shape) -> number = match s {
  Circle { r }    -> Math.PI * r * r
  Square { side } -> side * side
}
```

</td>
</tr>
</table>

### Pure helper

<table>
<tr><th>TypeScript</th><th>botscript</th></tr>
<tr>
<td>

```ts
function slug(s: string): string {
  return s.trim().toLowerCase()
          .replaceAll(" ", "-");
}
```

</td>
<td>

```bs
fn slug(s: string) -> string = pure {
  s.trim().toLowerCase().replaceAll(" ", "-")
}
```

</td>
</tr>
</table>

The `.bs` versions are not just shorter — they make properties the TS compiler can't enforce (purity, declared side effects, exhaustive matching, no thrown control-flow) part of the function signature. The whole point.

## Why this is better for bots than vanilla TypeScript

The features above aren't aesthetic — each one closes off a class of bug that
language models reliably ship in TypeScript. Pick any row; that's a real failure
this codebase has caught more than once:

| Bot failure mode in TypeScript | botscript fix |
| ------------------------------ | ------------- |
| Sneaks a `fetch()` into a function the human asked to be "pure" — survives review because the call is three layers deep. | `uses { … }` is part of the signature. A function declared with empty capabilities cannot reach the network. Under `?bs 0.1` the runtime throws on violation; under `?bs 0.2` the compiler also rejects direct stdlib refs at parse time. |
| Forgets a `case` in a `switch` and falls into `default`. The bug ships because the `default` branch silently swallows it. | `match` has no `default` and no fallthrough. A missing arm is a parse error; an unhandled value at runtime throws with a printed scrutinee. |
| Wraps a `Result`-shaped return in `try/catch` and accidentally swallows the `Err`, returning `undefined` from the catch. | `Result<T, E>` is the return type. `expr?` postfix is the *only* way to unwrap. There is no try-catch flowing-through pattern to mis-write. |
| Generates `null` checks in some paths and `undefined` checks in others, drifting over time. | `Option<T>` is the only optional type. No `null`. No `undefined`. The compiler refuses to model "missing" two ways. |
| Adds an `as any` cast under reviewer pressure to make the build green; the cast becomes load-bearing. | `as` outside an explicit `unsafe { }` block is a parse error. Every cast shows up in diff review with a keyword the human will see. |
| Writes a test that depends on `Date.now()` or `Math.random()`; flake creeps in over time. | Tests run in a frame where `time` and `random` capabilities are denied by default. The `with mocks { … }` clause on `test "…"` is the only way to inject them, and it does so deterministically. |
| Hallucinates a built-in or convention that doesn't exist — costs a debug cycle. | The `?primer` directive emits the canonical spec as a top-of-file comment. Any agent dropped into a botscript file cold has the entire language surface in the same file. |
| Models a tagged union with hand-written `kind: "Tag"` literals and drifts between the type and the `match` arms. | (0.2+) `type Shape = Circle { r: number } \| Square { side: number }` is native syntax. The desugaring is the discriminator the `match` arms already destructure on, so type and dispatch can't drift. |
| Loops `compile → regex error text → patch` because the compiler only emits English prose. | `botscript build … --format=json` emits `{ ok, diagnostics: [{ code, file, line, column, message, rule, idiom, rewrite }] }`. A bot parses and patches; no regex on prose. |

Every other choice in the language is in service of one of these. If a feature
doesn't close a bot failure mode, it isn't here.

## Real bugs this design would have prevented

These are *real, public* issues and PRs from real TypeScript projects (mostly
Microsoft's own TypeScript repo, since they're heavily used and the linked
artifacts will outlive most projects). Every row is a class of bug that's
either parse-time-impossible or signature-visible in botscript.

| Real-world bug                                                                                                                                                                      | What botscript does instead |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Hidden `useEffect` side effect breaks SSR hydration.** [vercel/swr#2391](https://github.com/vercel/swr/pull/2391) — a hook reading from cache during streaming hydration produced a mismatch between server and client render. The side effect was buried in a hook deep in the component tree. | A function with side effects must declare `uses { net }` (etc.) in its signature. The hydration-time reader's capability set is part of the type — it can't hide three layers down. |
| **Exhaustive switch can't actually be made exhaustive.** [microsoft/TypeScript#9838](https://github.com/microsoft/TypeScript/issues/9838), [#40160](https://github.com/microsoft/TypeScript/issues/40160), [#13467](https://github.com/microsoft/TypeScript/issues/13467) — adding a `default` case for safety silently breaks exhaustiveness narrowing. Real bugs filed against the TS compiler itself. | `match` has no `default` and no fallthrough. A new tag added to a tagged union is a parse error in every `match` that doesn't update — not a silent runtime fall-through. |
| **`catch` clause's `unknown` was originally `any`, swallowing typed errors industry-wide.** [microsoft/TypeScript#26174](https://github.com/microsoft/TypeScript/issues/26174) — every `try { … } catch (e) { return undefined; }` returning a typed promise `Promise<T>` silently masked failures for years until the `useUnknownInCatchVariables` option (TS 4.0). | `Result<T, E>` is the return type. `expr?` is the *only* unwrap. There is no try-catch flowing-through pattern to mis-write; the error path is in the type. |
| **TS's own null-narrowing fails through callbacks.** [microsoft/TypeScript#18244](https://github.com/microsoft/TypeScript/issues/18244) — `if (x !== null) { fn(() => x.method()) }` re-widens `x` to nullable inside the callback. Workarounds for this issue are load-bearing in real codebases. | `Option<T>` is the only optional type. There is no `null` and no `undefined` in business logic. A missing value is unwrapped with `match` or `?`, not narrowed across closure boundaries. |
| **`as any` regressions ship with TypeScript itself.** [microsoft/TypeScript#56618](https://github.com/microsoft/TypeScript/issues/56618), [#45640](https://github.com/microsoft/TypeScript/issues/45640) — even Microsoft's own `.d.ts` shipping uses `any` in places that have caused regressions across versions. | `as` outside an explicit `unsafe { … }` block is a parse error. Every cast surfaces in diff review under a keyword the human will see. |
| **Copilot routinely hallucinates methods and even whole repos.** [microsoft/vscode-copilot-release#281](https://github.com/microsoft/vscode-copilot-release/issues/281), [#1407](https://github.com/microsoft/vscode-copilot-release/issues/1407) — a model fabricates `array.removeAt`, an entire repo's contents. The code looks right; the method doesn't exist. | The `?primer` directive embeds the canonical language spec as a top-of-file comment. `STDLIB.bs` shows every feature exactly once. An agent has the entire surface in the same file before it writes a token. |
| **Tests baked on `Date.now()` and timezone-sensitive math break years later.** GitHub's own engineering team has shipped tests that pass for three years and then fail every leap year, plus tests that break at midnight and during DST transitions ([herodevs.com](https://www.herodevs.com/blog-posts/future-proof-your-javascript-datetime-tests)). | (0.2) `test "name" with mocks { time, random } { … }` swaps `time.now()` for a deterministic counter and `random.next()` for a deterministic seeded RNG. Sources are restored on body exit, even on throw. |

If you've hit a bug a feature in this README would have prevented and it's
publicly linkable, [open a PR](https://github.com/marcelofarias/botscript/pulls)
adding a row.

## What's new in `?bs 0.2` (opt-in)

`LATEST` is still 0.1, so existing files compile unchanged. Pin a file to
`?bs 0.2` to opt into:

- **Static capability check.** Direct references to `http.X` / `time.X` /
  `random.X` / `fs.X` / `stdout.X` / `stderr.X` inside a `fn` whose
  `uses { … }` clause doesn't list the matching capability are now a parse
  error (code `CAP001`), not just a runtime trap. The runtime check is still
  there as the second line of defence.
- **Tagged-union sugar.** `type Shape = Circle { r: number } | Square { side: number }`
  desugars to a TS discriminated union keyed on `kind`. Bare-tag alternatives
  (`Idle | Loading | Done { value: string }`) are supported. Generics, leading-pipe,
  and `export type` all work.
- **Structured diagnostics.** Compiler errors carry stable codes (`BS001`,
  `BS002`, `CAP001`) and a `{ rule, idiom, rewrite }` triple. The CLI exposes
  `--format=json` so a bot can `compile → JSON.parse → patch` deterministically.
- **`with mocks { time, random }` on tests.** `test "name" with mocks { time }
  { … }` swaps `time.now()` for a deterministic 0,1,2,… counter (and
  `random.next()` for a seeded RNG) inside the body, restoring the real
  sources when it returns or throws. The only way to inject deterministic
  time/RNG into a test, by design.
- **MCP server.** `@mbfarias/botscript-mcp` exposes the compiler over the
  Model Context Protocol so a model can `primer` / `transform` / `explain`
  via tool calls. See "MCP server" below.

## MCP server (for bots)

A botscript-aware bot doesn't need to read this README, the manifesto, or
`STDLIB.bs` to write correct `.bs`. Wire the MCP server into the agent's
config and the language surface becomes a tool call away.

**Install in Claude Code:**

```sh
claude mcp add botscript -- npx -y @mbfarias/botscript-mcp
```

**Tools exposed:**

| Tool        | Input                                  | Output                                                                                              |
| ----------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `primer`    | (no args)                              | The canonical language primer (same text the `?primer` directive emits).                            |
| `transform` | `{ source: string, filename?: string }` | `{ ok: true, code, forms, version }` on success, or `{ ok: false, diagnostics: [...] }` on failure. |
| `explain`   | `{ code: string }`                     | Long-form explanation for a stable diagnostic code (`BS001`, `BS002`, `CAP001`) plus a fails/passes example pair. |

A bot's loop becomes deterministic: `transform` → if `ok=false`, read
`diagnostics[0].code` → `explain(code)` → apply `rewrite` → `transform` again.
No regex on English error text.

---

## The one-shot prompt

> Copy-paste this into an LLM (Claude, Codex, Gemini, etc.) inside an **empty
> directory**. The agent will scaffold a working full-stack botscript app from
> scratch — backend, frontend, tests, the lot — without any follow-up from you.

```text
You are creating a small full-stack app called "shapebook" using botscript, a
TypeScript-superset language designed for bot-written code. Botscript files
end in .bs and compile to TypeScript via @mbfarias/botscript-compiler.

Read this once before starting:
- README + manifesto: https://github.com/marcelofarias/botscript
- The full language primer is the PRIMER export in
  @mbfarias/botscript-compiler/dist/primer.js, and STDLIB.bs in the repo above
  shows every feature exactly once. Read both before writing any .bs.

Stack:
- pnpm workspace with two packages: apps/api and apps/web.
- apps/api: Node 22, Fastify (or stock node:http), persists to ./data/shapes.json.
- apps/web: Vite + React 18, uses @mbfarias/botscript-vite-plugin.
- Both apps use @mbfarias/botscript-runtime for Result/Option/match.
- All business logic in .bs files; framework glue (server bootstrap, ReactDOM)
  may stay in .ts/.tsx.

What "shapebook" does:
- A user can submit shapes (Circle{r}, Square{side}, Triangle{base,height})
  via a small React form, and see a list of submissions with computed area.
- Each submission gets an auto-incrementing id and an iso timestamp.
- The API persists submissions to disk between restarts.
- The frontend talks to the API at http://localhost:3000.

Botscript usage requirements (this is the actual test — please use them all):
- At least one `fn ... uses { fs } -> Result<..., ...>` for the persistence
  layer.
- At least one `match` expression for shape dispatch (e.g. computing area).
- At least one `pure { ... }` block.
- At least one `?` postfix unwrap.
- At least three `test "name" { ... }` blocks across the two apps, all passing.

Hard rules:
- Pin every .bs file to `?bs 0.1` at the top.
- Never use `any`, `null`, or unchecked exceptions in business logic; use
  Result + Option + match.
- The frontend must show an error message when the API returns Err — never
  swallow.
- Run `pnpm -r build && pnpm -r test` and confirm green BEFORE you say "done".
- Run the api on port 3000 and the web on port 5173, manually open the browser,
  add one circle and one square, confirm both render with computed areas, then
  stop the servers.

Deliverables:
- A README.md at the root that explains how to install, run, test.
- All source committed in a single commit titled "feat: shapebook v0".
- A short note at the bottom of the README listing which botscript features
  you used and where (one line each).
```

You can also feed this to the agent piece-by-piece if you want to watch it
work. The above is the minimum viable spec for an end-to-end run.

---

## Install (for bots)

> If you are an LLM wiring botscript into an existing project, the rest of this
> section is the entire contract. Pick the row that matches the project, run
> the commands, done. No questions back.

| Project type     | One-liner                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------ |
| Vite (any)       | `pnpm add @mbfarias/botscript-runtime @mbfarias/botscript-vite-plugin`                     |
| Babel-based      | `pnpm add @mbfarias/botscript-runtime @mbfarias/botscript-babel-plugin`                    |
| Plain Node / TS  | `pnpm add @mbfarias/botscript-runtime && pnpm add -D @mbfarias/botscript-cli`              |

Then **one** of:

```ts
// vite.config.ts
import botscript from "@mbfarias/botscript-vite-plugin";
export default { plugins: [botscript()] };
```

```js
// babel.config.js
import { parser } from "@mbfarias/botscript-babel-plugin";
export default { parserOpts: { parser }, presets: ["@babel/preset-typescript"] };
```

```json
// package.json — plain Node / TS, compile *.bs to *.ts in place
{ "scripts": { "build": "botscript build src && tsc" } }
```

**Verify the wiring** in 30 seconds:

1. Pick any small `.ts` file with a function — say `src/util.ts`.
2. Rename it to `src/util.bs`. Update its imports' references in callers.
3. Above the imports, add `?bs 0.1`. The file still typechecks.
4. Convert one function from `function name(...) { ... }` to `fn name(...) -> Type = pure { … }`. Build.
5. If both build and tests still pass, botscript is wired.

If the project has a CLAUDE.md / AGENTS.md, append the line:

```
botscript is enabled in this repo. The language primer is at
node_modules/@mbfarias/botscript-compiler/dist/primer.js (export PRIMER) — read it before
writing .bs.
```

That's the whole install. Skip the rest of this README; it's for humans.

---

## Quick start

```bash
pnpm install
pnpm test
```

Try the examples:

```bash
# Node CLI example
pnpm --filter node-app dev

# React + Vite example
pnpm --filter react-app dev
```

## What it looks like

```bs
?primer

import { z } from "zod"

fn fetchUser(id: string) uses { net } -> Result<User, FetchError> {
  let res = http.get(`/users/${id}`)?
  ok(User.parse(res.body))
}

fn normalize(name: string) -> string = pure {
  name.trim().toLowerCase()
}

fn describe(s: Shape) -> string = match s {
  Circle { r }    -> `circle(${r})`
  Square { side } -> `square(${side})`
}

test "normalize trims and lowercases" {
  assert normalize("  HI  ") == "hi"
}
```

## Conventions worth knowing

- **Test files end in `.test.bs`.** `test "name" { … }` blocks inside non-test
  files (e.g. `shape.bs`) re-execute every time something imports that file,
  which inflates test counts and is almost never what you want. Keep tests in
  dedicated `*.test.bs` files alongside the code under test.
- **Use `.bs` extensions in imports.** With the Vite plugin, `import "./foo.bs"`
  Just Works. The Vite plugin also rewrites `import "./foo.js"` to the `.bs`
  sibling automatically, so you can use the TS-ESM `.js` convention if you
  prefer (handy when you also compile to `.ts` ahead of time).
- **JSX inside `.bs` is fine.** The Vite plugin runs your file through botscript
  then through esbuild with `loader: "tsx"`. Write JSX in `.bs` like you would
  in `.tsx`.
- **Vitest wiring requires `globals: true`** plus the botscript Vite plugin so
  vitest's global `test` is what `$test` forwards to. Minimal config:
  ```ts
  // vitest.config.ts
  import { defineConfig } from "vitest/config";
  import botscript from "@mbfarias/botscript-vite-plugin";
  export default defineConfig({
    plugins: [botscript()],
    test: { globals: true, include: ["src/**/*.test.bs"] },
  });
  ```

## Plugging into a TypeScript project

Three options, all equivalent:

```ts
// Vite
import botscript from "@mbfarias/botscript-vite-plugin";
export default { plugins: [botscript()] };

// Babel
{
  "plugins": ["@mbfarias/botscript-babel-plugin"]
}

// CLI (one-shot, watches *.bot)
botscript build src --out src   # compiles *.bs to *.ts in place
```

## Packages

| Package                    | What it does                                      |
| -------------------------- | ------------------------------------------------- |
| `@mbfarias/botscript-runtime`       | Result/Option, match, capability registry         |
| `@mbfarias/botscript-compiler`      | `transform(src) -> ts` — the only thing that bites |
| `@mbfarias/botscript-cli`           | `botscript build`, `botscript primer`             |
| `@mbfarias/botscript-vite-plugin`   | Vite integration                                  |
| `@mbfarias/botscript-babel-plugin`  | Babel integration                                 |

## Status

Weekend project. See the [manifesto](./MANIFESTO.md) for what is and isn't real.
