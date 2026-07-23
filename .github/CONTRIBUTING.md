# Contributing

Thanks for helping out. Small, focused PRs merge fastest.

## Development

The loop is always: edit `grammar.js` → `tree-sitter generate` → `tree-sitter test`.

- `tree-sitter generate` — regenerate `src/parser.c`, `src/grammar.json`, `src/node-types.json` after any `grammar.js` change. These generated files **are** tracked (downstream parsers such as nvim-treesitter build from them), so commit them together with the `grammar.js` change.
- `tree-sitter test` — the corpus suite under `test/corpus/`. Add or extend a case for any behavior change.
- `tree-sitter test --include "name"` — run a subset by partial name match.
- `make` — build the native library.

The external scanner lives in `src/scanner.c`; keep its `externals` list in sync with `grammar.js` (the enum order must match). Scanner line coverage is reported to Codecov in CI.

## Commits and PR titles

PRs are squash-merged, and releases are cut automatically by [release-please](https://github.com/googleapis/release-please) from the commit history — so **PR titles must follow [Conventional Commits](https://www.conventionalcommits.org)** (`feat: …`, `fix: …`, `docs: …`, etc.). CI checks the title; `feat`/`fix` determine version bumps and CHANGELOG entries. A `feat!:`/`fix!:` or `BREAKING CHANGE:` footer triggers a major bump.

Do **not** hand-edit version numbers in the manifests — release-please owns them.

## AI-assisted contributions

AI assistance (Copilot, Claude, etc.) is welcome, with three rules:

1. **Disclose it** in the PR description (a one-liner is fine).
2. **You must understand and have tested the change yourself** — run `tree-sitter generate && tree-sitter test` locally. You are the author; "the model wrote it" is not a review response.
3. **No unreviewed dumps.** Large AI-generated diffs with no accompanying reasoning, and AI-generated bug reports without a reproducible parse case, will be closed.

## Bug reports

Use the issue form. A minimal gnuplot snippet (confirmed accepted by `gnuplot` itself) plus the `tree-sitter parse` output showing the ERROR/MISSING node turns a week of back-and-forth into a same-day fix.
