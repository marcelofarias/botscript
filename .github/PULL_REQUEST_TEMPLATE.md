# Summary

<!-- One sentence: what does this change do? -->

## Botscript change?

<!-- If this PR adds, removes, or alters .bs syntax, fill the table. Otherwise delete. -->

| input (.bs) | output (.ts) |
| ----------- | ------------ |
|             |              |

## Checklist (from AGENTS.md)

- [ ] `pnpm -r build` clean
- [ ] `pnpm test` clean
- [ ] `pnpm --filter node-app test` clean
- [ ] `pnpm --filter react-app build` clean
- [ ] Test added: rewrites the new form
- [ ] Test added: leaves a similar non-target form alone
- [ ] `STDLIB.bs` updated (only if syntax changed)
- [ ] `primer.ts` updated (only if syntax changed)
- [ ] No new dependencies (or PR description explains why)

## Notes for the reviewer

<!-- What did you consider and reject? Where would you look first if a regression appeared? -->
