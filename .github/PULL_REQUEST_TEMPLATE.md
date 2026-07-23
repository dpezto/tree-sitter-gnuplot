<!-- PR title must be a Conventional Commit: feat|fix|docs|refactor|test|chore(scope): description -->

## What & why

## Checklist

- [ ] `tree-sitter generate` run and the regenerated `src/` files (`parser.c`, `grammar.json`, `node-types.json`) are committed alongside the `grammar.js` change
- [ ] `tree-sitter test` passes
- [ ] Added/extended a corpus test in `test/corpus/` for the new behavior
- [ ] `queries/*.scm` updated if a new named node / alias was added
- [ ] AI assistance disclosed (if any) — see [CONTRIBUTING](CONTRIBUTING.md)
