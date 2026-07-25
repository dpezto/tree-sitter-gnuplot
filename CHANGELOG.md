# Changelog

All notable changes are documented here. This file is maintained automatically by
[release-please](https://github.com/googleapis/release-please) from Conventional-Commit
history; do not edit it by hand.

## [3.0.0](https://github.com/dpezto/tree-sitter-gnuplot/compare/v2.0.4...v3.0.0) (2026-07-25)


### ⚠ BREAKING CHANGES

* queries matching `(plot_element data: (function ...))` no longer match and must use `(plot_element function: (function ...))`. This documents a tree change that shipped in the plot-filter work; node and field names are the query API, and a query that silently stops matching is a breaking change even when the schema itself remains valid.

### Features

* add keyword dictionary codegen (keywords.json) ([#15](https://github.com/dpezto/tree-sitter-gnuplot/issues/15)) ([3602be3](https://github.com/dpezto/tree-sitter-gnuplot/commit/3602be3ab11f62bcaaf0115bcd3364453ecb9dd0))
* binary array/perpendicular/rotate value forms, text-matrix headers ([#27](https://github.com/dpezto/tree-sitter-gnuplot/issues/27)) ([3731988](https://github.com/dpezto/tree-sitter-gnuplot/commit/37319881846a0a4de8f9f06fe5e2a707712a2d1e))
* bind function plots to the function field ([#35](https://github.com/dpezto/tree-sitter-gnuplot/issues/35)) ([4c6178f](https://github.com/dpezto/tree-sitter-gnuplot/commit/4c6178f3b79fb936092997ee004e091158ee355f))
* fit plural error keywords, plot if filter, hsteps offset, columnheader title calls ([#28](https://github.com/dpezto/tree-sitter-gnuplot/issues/28)) ([a736524](https://github.com/dpezto/tree-sitter-gnuplot/commit/a736524d571bd84b2c9ac5b602201df0c72e2581))
* hsteps, sharpen, pm3d zclip, contourfill at base, smooth mcs, whiskerbars, errorbars/errorlines data styles, specular abbrev ([#23](https://github.com/dpezto/tree-sitter-gnuplot/issues/23)) ([4787d5c](https://github.com/dpezto/tree-sitter-gnuplot/commit/4787d5c1defa7a28ed548e9b0c6b27b9997debfe))
* print iteration clause, array literal initializers ([#31](https://github.com/dpezto/tree-sitter-gnuplot/issues/31)) ([c2466e5](https://github.com/dpezto/tree-sitter-gnuplot/commit/c2466e52ce6fc35cdf0050d9f2c6d23776034745))
* printerr/warn, vclear $block, replot tail, show variables all, save changes, bind allwindows ([#22](https://github.com/dpezto/tree-sitter-gnuplot/issues/22)) ([5e1b484](https://github.com/dpezto/tree-sitter-gnuplot/commit/5e1b484c4767f2803465685d42afbbca9fe90b09))
* **queries:** builtin refresh, constant split, definition/call captures ([#29](https://github.com/dpezto/tree-sitter-gnuplot/issues/29)) ([20fb2f5](https://github.com/dpezto/tree-sitter-gnuplot/commit/20fb2f5e6a88bea31b84f9166375803163e20d0a))
* **scanner:** detached pi unit, replot range gate, same-line plot filter if ([#32](https://github.com/dpezto/tree-sitter-gnuplot/issues/32)) ([6ec3012](https://github.com/dpezto/tree-sitter-gnuplot/commit/6ec3012d4f0f3d0bd8c78f2a172346f88211cfd6))
* set view empty slots, set dummy var list, tics time/geographic/series forms ([#25](https://github.com/dpezto/tree-sitter-gnuplot/issues/25)) ([4f8ab82](https://github.com/dpezto/tree-sitter-gnuplot/commit/4f8ab82db8d32c4dce38755e3c7ebc514545b0d9))
* tek/xterm/texdraw/tkcanvas/pstricks terminals, tkcanvas and pstricks options, kitty abbreviation ([#24](https://github.com/dpezto/tree-sitter-gnuplot/issues/24)) ([8b08e9a](https://github.com/dpezto/tree-sitter-gnuplot/commit/8b08e9a14ecd6ea1fe20f575e206ecf9fd18911a))
* watchpoints, pm3d spotlight, value-binding fixes, alias taxonomy ([#21](https://github.com/dpezto/tree-sitter-gnuplot/issues/21)) ([bba115a](https://github.com/dpezto/tree-sitter-gnuplot/commit/bba115ad96e0aac45a1dfb5592a924b4a97d2723))


### Bug Fixes

* **keywords:** map KW_G_ARGV so the dictionary check can run ([#37](https://github.com/dpezto/tree-sitter-gnuplot/issues/37)) ([a5ee642](https://github.com/dpezto/tree-sitter-gnuplot/commit/a5ee6427a69e10916647623f5fe5c69ddfbbcfd4))
* **queries:** split builtin-variable pattern under Vim's group cap, add Neovim highlight check ([#34](https://github.com/dpezto/tree-sitter-gnuplot/issues/34)) ([b7dce9a](https://github.com/dpezto/tree-sitter-gnuplot/commit/b7dce9a3b8c067073f836951e1a5fccfd8b304ce))
* **scanner:** require values after by, refuse constants as keywords in option bodies ([#36](https://github.com/dpezto/tree-sitter-gnuplot/issues/36)) ([359169f](https://github.com/dpezto/tree-sitter-gnuplot/commit/359169fa52007c032ed28f5ac45fb40d733c8d4d))

## [2.0.4](https://github.com/dpezto/tree-sitter-gnuplot/compare/v2.0.3...v2.0.4) (2026-07-23)


### Bug Fixes

* **highlights:** keyword tiers for surface modes, coord chains, signed values ([ab4b5e4](https://github.com/dpezto/tree-sitter-gnuplot/commit/ab4b5e45e66afe014c655712522a28ac9e3018ac))

## [2.0.3](https://github.com/dpezto/tree-sitter-gnuplot/compare/v2.0.2...v2.0.3) (2026-07-23)


### Bug Fixes

* **release:** drop npm prepare script and untrack Cargo.lock ([#10](https://github.com/dpezto/tree-sitter-gnuplot/issues/10)) ([e8914b3](https://github.com/dpezto/tree-sitter-gnuplot/commit/e8914b3427848356816b0faf0c6fbd794a484a73))

## [2.0.2](https://github.com/dpezto/tree-sitter-gnuplot/compare/v2.0.1...v2.0.2) (2026-07-23)


### Bug Fixes

* **release:** repair npm + crates publishing, use App token for release-please ([#8](https://github.com/dpezto/tree-sitter-gnuplot/issues/8)) ([a27b849](https://github.com/dpezto/tree-sitter-gnuplot/commit/a27b8497fb673783ba7e1bbdd99cd8a5b266e19e))

## [2.0.1](https://github.com/dpezto/tree-sitter-gnuplot/compare/v2.0.0...v2.0.1) (2026-07-23)


### Bug Fixes

* **bindings:** build external scanner into node addon, revert index.js to CJS ([#6](https://github.com/dpezto/tree-sitter-gnuplot/issues/6)) ([07a1886](https://github.com/dpezto/tree-sitter-gnuplot/commit/07a1886e3d370ad06145d1319409d0da455ed416))

## [2.0.0](https://github.com/dpezto/tree-sitter-gnuplot/releases/tag/v2.0.0)

Generic set/show option bodies redesign (parser size −36.6%). Baseline for
automated releases — see the git history and tags `v1.0.0`…`v2.0.0` for earlier changes.
