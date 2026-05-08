# botscript

A small TypeScript-superset language for a world where most code is written by
machines. Read [`MANIFESTO.md`](./MANIFESTO.md) for the why.

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
