# botscript

A small TypeScript-superset language for a world where most code is written by
machines. Read [`MANIFESTO.md`](./MANIFESTO.md) for the why.

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
