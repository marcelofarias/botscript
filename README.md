<p align="center">
  <img src="./images/botscript.svg" alt="botscript" width="120" />
</p>

# botscript

A small TypeScript-superset language for a world where most code is written by
machines. Read [`MANIFESTO.md`](./MANIFESTO.md) for the why.

> Try it locally: clone, run `pnpm install && pnpm play`, open http://localhost:5173.
> Type `.bs` on the left, see the desugared TypeScript on the right — the
> actual compiler bundle running in your browser.

## .bs vs .ts at a glance

The same program in idiomatic TypeScript and in botscript:

| TypeScript | botscript |
| ---------- | --------- |
| <pre lang="ts">async function loadUser(id: string) {<br/>  try {<br/>    const res = await fetch(`/users/${id}`);<br/>    if (!res.ok) throw new Error(`HTTP ${res.status}`);<br/>    return await res.json();<br/>  } catch (e) {<br/>    return { error: String(e) };<br/>  }<br/>}</pre> | <pre lang="bs">async fn loadUser(id: string) uses { net }<br/>    -> Result&lt;User, string&gt; {<br/>  let res = http.get(`/users/${id}`)?<br/>  ok(await res.json() as User)<br/>}</pre> |
| <pre lang="ts">function area(s: Shape): number {<br/>  switch (s.kind) {<br/>    case "Circle": return Math.PI * s.r * s.r;<br/>    case "Square": return s.side * s.side;<br/>    default: throw new Error("unhandled");<br/>  }<br/>}</pre> | <pre lang="bs">fn area(s: Shape) -> number = match s {<br/>  Circle { r }    -> Math.PI * r * r<br/>  Square { side } -> side * side<br/>}</pre> |
| <pre lang="ts">function slug(s: string): string {<br/>  return s.trim().toLowerCase()<br/>          .replaceAll(" ", "-");<br/>}</pre> | <pre lang="bs">fn slug(s: string) -> string = pure {<br/>  s.trim().toLowerCase().replaceAll(" ", "-")<br/>}</pre> |

The `.bs` versions are not just shorter — they make properties the TS compiler can't enforce (purity, declared side effects, exhaustive matching, no thrown control-flow) part of the function signature. The whole point.

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
