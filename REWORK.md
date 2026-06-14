# Grammar v2: Scanner-First Architecture

> **Living document — keep current.** Update this file in the same change as any
> phase work (see the DIRECTIVE in `CLAUDE.local.md`). Last revised 2026-06-13.

## Status

| Phase | State |
|-------|-------|
| 1 — Style attributes (14 K.* → externals) | **DONE** (2026-06-13). 14 `K.*` regex tokens → external scanner tokens (`KW_LW`..`KW_TC`, `STYLE_KWS` table) via `_lw`..`_tc` hidden alias rules. CST unchanged (all corpus passes without tree edits). **Size-NEGATIVE** (+86 KB, SYMBOL_COUNT +15): confirms the rule that 1:1 relocation without N→1 merge does not shrink — done purely to retire `reg()` (scanner-first), not for size. |
| 2 — Plot style names (→ `kw_plt_st`) | **DONE** (2026-06-09). 29 plain styles → 1 external token; 9 styles with trailing opts keep regex (different continuations). |
| 3 — Terminal names (32 → 1) | **DONE** (2026-06-13). One `TERM_NAME` token + one permissive `t_opts` rule replaced 32 name tokens and 30 `t_*` rules. **−6.1 MB / −13 %** on its own. |
| 4 — `_argument_set_show` keywords | mostly stale: axis families already merged via `K.axes`. Only D3 minor-tics (6→1) remains as a clean small win. |
| 5 — Command keyword abbreviations | partially done via scanner (`kw_cmd_bare/optexpr/exit/expr`, `cmd_*_kw`). |
| 6 — Statement-terminator (`_eos`) redesign | **ATTEMPTED & REFUTED 2026-06-14.** Implemented faithfully in 4 variants (internal `/[;\n]/`, internal run-token, external `_eos` with `}`/EOF, and a correctness-complete `_line`/`_blank`). **All REGRESS parser.c** (38.18 MB baseline → 39.4–41.6 MB) and balloon STATE_COUNT +44–48 % (17.9k → 25–26k). The earlier "−38 %" was never reproducible (see refutation bullet). **Do not re-attempt without a new mechanism.** |

Measured so far: parser.c 52.45 MB → **39.95 MB**; SYMBOL_COUNT 1,236 → **1,076**;
STATE_COUNT → **17,532**; TOKEN_COUNT → **809**. 92/92 corpus tests pass.

**Terminal merge 2026-06-13 (Phase 3 — −13 %, the big win).** All 32 terminal
names collapsed into one `TERM_NAME = token(choice(...))` aliased `"name"`, and all
30 `t_*` option rules collapsed into one permissive `t_opts`. The grammar no longer
tracks which terminal an option belongs to (a highlighter need not reject invalid
combos). parser.c **47.06 → 39.95 MB**, STATE_COUNT 20,515 → 17,532.
**Correction to the earlier size pessimism:** terminal names alone are valid in few
states (≈negligible), BUT collapsing the 30 separate `repeat1(choice(...))` *opt
rules* into one shed ~3,000 states — that is where the win came from. The lesson:
collapsing many sibling **non-terminal rules** with overlapping option sets is a
real lever, not just merging leaf tokens.

Pitfalls hit (all fixed; see CLAUDE.local for detail):
- **Empty-token infinite loop:** `seq(key("window", $._expression))` (a pre-existing
  typo from `t_x11` — `$._expression` passed as `key`'s `minChar`) made every char
  optional → a token matching the empty string → infinite loop in `repeat1`. Fixed to
  `seq(key("window"), $._expression)`. THIS, not abbreviation overlap, caused the OOM.
- **Abbreviation shadowing (mis-parse, not hang):** loose `min_chars` let
  `key("colortext", 2)` swallow `"color"` (→ wrong node). Fixed by forcing all inline
  `t_opts` option keywords to full form (no abbreviation). `K.lw/dl/ps` and
  `T_ENH/T_CROP/T_TRUECOLOR/T_INTERLACE` keep their abbreviations (no collision).
- **Bare-expression ambiguity:** `field("n", $._expression)` caused a generate
  conflict + blowup; replaced with `field("n", $.number)` (numbers don't start
  statements → no swallowing; verified `set term png⏎plot` stays two statements).

**Readability pass 2026-06-13 (preceded the merge):** the `t_*` rules were first
de-duplicated with shared fragment helpers (`T_ENH`, `T_CROP`, `T_TRUECOLOR`,
`T_INTERLACE`, `T_GDSIZES`, `T_ANCHOR`, `tLwExpr`, `tDlExpr`, `tFont`) under the `K`
object; those helpers now live inside `t_opts`.

## Why

`parser.c` was 52 MB (≈45 MB now). Root cause: the `reg()`/`key()`/`key1()`
machinery at the bottom of `grammar.js` — **555 calls as of 2026-06-13**
(502 `key()` + 15 `key1()` + 38 `reg()`), ≈ 64 % of TOKEN_COUNT 867. Each distinct
keyword regex creates a separate terminal symbol = a separate parse-table column,
and `parser.c` size ≈ parse-table width ≈ number of distinct terminals. Even
though many keywords share an alias (e.g. 63 aliased to `"arg"`), `alias()` is a
CST-only operation — it never reduces parse-table width.

**Critical caveat (measured, not theoretical).** Deleting a regex shrinks
`parser.c` *only* when it collapses **N keywords → 1 token** with an identical
grammar continuation (the `kw_plt_st` win, 29→1). **Moving a keyword into the
scanner 1:1 keeps SYMBOL_COUNT and saves ~0 bytes** — the external token still
needs the same ACTIONS entries. So the goal is "merge keyword groups into shared
external tokens," not merely "relocate every `key()` into `scanner.c`." Groups
whose continuations genuinely differ (the 14 style attrs, most set/show args)
cannot be 1→1-relocated into a smaller table; they need a *union opts* redesign to
merge, or they stay as-is.

## Guiding Principle

**The external scanner owns all keyword abbreviation matching.**
`grammar.js` contains zero `reg()` or `key()` calls for gnuplot keywords.
All keyword tokens are declared as `externals` and matched in `scanner.c`.
Gnuplot abbreviations (`lin`/`line`/`linew`/…/`linewidth`) are handled in C.

## Target Metrics

| Metric | v1 (current) | v2 (target) |
|--------|-------------|-------------|
| `SYMBOL_COUNT` | 1,236 | ~700 |
| `LARGE_STATE_COUNT` | 9,088 | ~5,500 |
| `parser.c` | 52 MB | ~25 MB |
| `grammar.js` lines | 3,500 | ~1,800 |
| `scanner.c` lines | 232 | ~1,500 |
| External tokens | 9 | ~120 |

---

## Token Grouping Strategy

The scanner returns one token per keyword match. Tokens can be shared
(one external token) only when ALL matched keywords have IDENTICAL parse
continuations in the grammar.

### Group A: Style attribute keywords (14 tokens, replacing K.* regex constants)

Each has a unique following structure → must remain separate tokens:

| External token | Matches | Continuation |
|----------------|---------|--------------|
| `kw_lw` | linewidth / lw | `_expression` |
| `kw_lt` | linetype / lt | `choice(colorspec, _expression)` |
| `kw_ls` | linestyle / ls | `_expression` |
| `kw_lc` | linecolor / lc | `colorspec` |
| `kw_dt` | dashtype / dt | `dash_opts` |
| `kw_pt` | pointtype / pt | `choice("variable", _expression)` |
| `kw_ps` | pointsize / ps | `choice("variable", _expression)` |
| `kw_pi` | pointinterval / pi | `_expression` |
| `kw_pn` | pointnumber / pn | `_expression` |
| `kw_as` | arrowstyle / as | `_expression` |
| `kw_fs` | fillstyle / fs | `fill_style` |
| `kw_fc` | fillcolor / fc | `colorspec` |
| `kw_tc` | textcolor / tc | `_textcolor` |
| `kw_dl` | dashlength / dl | `_expression` |

Alias names preserved: `alias($.kw_lw, "lw")` etc. → highlights.scm unchanged.

### Group B: Alignment tokens (5 tokens, replacing K.l/r/t/b/c)

`kw_left`, `kw_right`, `kw_top`, `kw_bottom`, `kw_center`

**Special case:** `kw_right` conflicts with `filledcurves r=N`. Scanner
checks for `=` after `r` and declines to match (same logic as current
assignment context check). Grammar retains `"r"` for the filledcurves case.

### Group C: Plot style names (1 token replacing 35 regex tokens)

All plot style names have IDENTICAL parse continuation (leaf nodes in
`plot_element`). Collapse to ONE external token:

`kw_plt_st` → matches: `lines`/`l`, `linespoints`/`lp`, `points`/`p`,
`impulses`/`i`, `dots`/`d`, `steps`, `fsteps`, `histeps`, `boxes`,
`boxerrorbars`, `boxxyerror`, `candlesticks`, `financebars`,
`vectors`, `circles`, `ellipses`, `filledcurves`, `image`, `rgbimage`,
`rgbalpha`, `pm3d`, `labels`, `histograms`, `polygons`,
`xerrorbars`, `yerrorbars`, `xyerrorbars`, `xerrorlines`, `yerrorlines`,
`xyerrorlines`, `parallelaxes`, `spiderplot`, `table`, `mask`,
`fillsteps`, `convexhull`, `concavehull`

Grammar: `alias($.kw_plt_st, "plt_st")` — CST node type unchanged.

**Savings: 35 `aux_sym_*` → 1 external token = 34 fewer parse-table columns.**

### Group D: `_argument_set_show` options (~80 tokens)

Each set/show argument typically has a unique parse continuation → most stay
separate tokens. Opportunity in **axis-symmetrical groups**:

**D1: Axis range options — 10 separate tokens (preserve CST)**
`xrange`, `yrange`, `zrange`, `x2range`, `y2range`, `cbrange`, `rrange`,
`trange`, `urange`, `vrange` — all followed by `range_block`.
Keep separate to preserve field naming and CST structure for existing queries.

**D2: Axis label options — 6 separate tokens (preserve CST)**
`xlabel`, `ylabel`, `zlabel`, `x2label`, `y2label`, `cblabel` — all followed
by `label_opts`. Keep separate.

**D3: Minor tics options — 1 token (merge; acceptable CST change)**
`mxtics`, `mytics`, `mztics`, `mx2tics`, `my2tics`, `mcbtics` — all followed
by optional `_expression`. Collapse to `kw_mtics`; axis identity from node value.

**Net savings from Group D: ~5 fewer tokens (minor tics merge only).**

### Group E: Terminal type names (1 token replacing 32 regex tokens)

All terminal names have the same position in grammar (after `set terminal`).
Terminal-specific sub-options handled by branching on scanner-stored terminal name.

`kw_terminal` → matches all terminal names; scanner stores matched name in
`Scanner.terminal` for conditional sub-option parsing.

**Savings: 32 `aux_sym_*` → 1 external token = 31 fewer parse-table columns.**

---

## scanner.c v2 Architecture

```c
// Token enum (v2, partial)
enum TokenType {
  DATABLOCK_START,
  DATABLOCK_END,

  // Commands (9 existing, keep as-is)
  CMD_FIT_KW, CMD_PLOT_KW, CMD_SPLOT_KW,
  CMD_PAUSE_KW, CMD_PRINT_KW, CMD_HELP_KW, CMD_LOAD_KW,

  // Style attributes (replacing K.* regex patterns)
  KW_LW, KW_LT, KW_LS, KW_LC, KW_DT,
  KW_PT, KW_PS, KW_PI, KW_PN, KW_AS,
  KW_FS, KW_FC, KW_TC, KW_DL,

  // Alignment (replacing K.l/r/t/b/c regex patterns)
  KW_LEFT, KW_RIGHT, KW_TOP, KW_BOTTOM, KW_CENTER,

  // Plot style names (35 → 1)
  KW_PLT_ST,

  // Terminal type names (32 → 1)
  KW_TERMINAL,

  // Set/show argument keywords (one per unique option, ~80 total)
  KW_ANGLES, KW_ARROW, KW_AUTOSCALE, KW_BORDER,
  KW_BOXWIDTH, KW_BOXDEPTH, KW_CLIP, KW_CNTRPARAM,
  // ... etc.
};

// Scanner state (v2)
typedef struct {
  char word[MAX_WORD_LENGTH];       // datablock name (existing)
  char terminal[MAX_WORD_LENGTH];   // matched terminal name (new)
} Scanner;

// Keyword table entry
typedef struct {
  const char *keyword;   // full keyword string
  const char *alt;       // short alias (e.g. "lw" for "linewidth"), or NULL
  int         min_chars; // minimum prefix length (reg() minChar equivalent)
  int         token;     // which external token to return
} KwEntry;

// Example keyword tables
static const KwEntry STYLE_KWS[] = {
  {"linewidth", "lw", 5, KW_LW},
  {"linetype",  "lt", 8, KW_LT},
  {"linestyle", "ls", 5, KW_LS},
  {"linecolor", "lc", 5, KW_LC},
  {"dashtype",  "dt", 5, KW_DT},
  {"pointtype", "pt", 6, KW_PT},
  {"pointsize", "ps", 6, KW_PS},
  {"pointinterval", "pi", 6, KW_PI},
  {"pointnumber",   "pn", 6, KW_PN},
  {"arrowstyle",    "as", 2, KW_AS},
  {"fillstyle",     "fs", 5, KW_FS},
  {"fillcolor",     "fc", 5, KW_FC},
  {"textcolor",     "tc", 5, KW_TC},
  {"dashlength",    "dl", 5, KW_DL},
  {NULL, NULL, 0, 0}
};

static const KwEntry PLT_STYLE_KWS[] = {
  {"linespoints", "lp", 6, KW_PLT_ST},
  {"lines",       "l",  1, KW_PLT_ST},
  {"points",      "p",  1, KW_PLT_ST},
  {"impulses",    "i",  1, KW_PLT_ST},
  {"dots",        "d",  1, KW_PLT_ST},
  {"steps",       NULL, 4, KW_PLT_ST},
  {"fsteps",      NULL, 2, KW_PLT_ST},
  {"histeps",     NULL, 2, KW_PLT_ST},
  {"boxes",       NULL, 2, KW_PLT_ST},
  // ... all 35 styles
  {NULL, NULL, 0, 0}
};

// Universal prefix matcher
// Returns token type if match, -1 if no match.
static int match_kw_table(const char *word, int wlen, const KwEntry *table) {
  for (int i = 0; table[i].keyword != NULL; i++) {
    const KwEntry *e = &table[i];
    int klen = (int)strlen(e->keyword);
    // Valid prefix: word_len in [min_chars, len(keyword)] and is a prefix
    if (wlen >= e->min_chars && wlen <= klen &&
        strncmp(word, e->keyword, wlen) == 0) {
      return e->token;
    }
    // Exact alt match (e.g. "lw")
    if (e->alt && strcmp(word, e->alt) == 0) {
      return e->token;
    }
  }
  return -1;
}
```

---

## grammar.js v2 Skeleton

```javascript
module.exports = grammar({
  name: "gnuplot",

  // No more reg() / key() for gnuplot keywords
  // helpers.js keeps only surround(), sep(), PREC, IDENTIFIER

  externals: ($) => [
    $.datablock_start, $.datablock_end,

    // Commands (keep existing 7; add more as scanner grows)
    $.cmd_fit_kw, $.cmd_plot_kw, $.cmd_splot_kw,
    $.cmd_pause_kw, $.cmd_print_kw, $.cmd_help_kw, $.cmd_load_kw,

    // Style attribute keywords (14 external, replacing K.*)
    $.kw_lw, $.kw_lt, $.kw_ls, $.kw_lc, $.kw_dt,
    $.kw_pt, $.kw_ps, $.kw_pi, $.kw_pn, $.kw_as,
    $.kw_fs, $.kw_fc, $.kw_tc, $.kw_dl,

    // Alignment
    $.kw_left, $.kw_right, $.kw_top, $.kw_bottom, $.kw_center,

    // Plot style names (35 → 1)
    $.kw_plt_st,

    // Terminal type name (32 → 1)
    $.kw_terminal,

    // Set/show argument keywords (~80 external tokens)
    $.kw_angles, $.kw_arrow, $.kw_autoscale, $.kw_border,
    // ... etc.
  ],

  extras: ($) => [$.comment, /\s|\\|;/],  // unchanged
  word:   ($) => $.identifier,             // unchanged

  // Conflicts shrink: scanner resolves abbreviation ambiguity
  conflicts: ($) => [
    [$.paxis, $.tics_opts],
    [$._paxis_label],
    [$.plot_element, $.style_opts],
    [$.assignment, $._var_rhs],
    // B16 fix (optional): [$._tag_atom, $._expression],
  ],

  rules: {
    // Top-level structure: UNCHANGED
    source_file: ($) => repeat($._statement),

    // Style opts: same structure as v1, external tokens instead of K.*
    style_opts: ($) => prec.left(repeat1(choice(
      seq(alias($.kw_lw, "lw"), field("lw", $._expression)),
      seq(alias($.kw_lt, "lt"), field("lt", choice(/*colorspec|expr*/))),
      seq(alias($.kw_ls, "ls"), field("ls", $._expression)),
      // ... same 14 branches
    ))),

    // Set/show: same _argument_set_show structure, external tokens
    _argument_set_show: ($) => prec.right(choice(
      seq(alias($.kw_angles, "arg"), field("arg_opts", optional($.angles))),
      seq(alias($.kw_arrow,  "arg"), field("arg_opts", optional($.arrow))),
      // ... same ~85 branches, just external token refs instead of key()
    )),

    // Plot style: one external token for all style names
    plot_style: ($) => alias($.kw_plt_st, "plt_st"),

    // Expressions: UNCHANGED
    // PREC: UNCHANGED
  }
});
```

---

## File Structure v2

```
grammar.js        (~1,800 lines — no key()/reg() for gnuplot keywords)
helpers.js        (~50 lines  — surround(), sep(), PREC, IDENTIFIER only)
src/
  scanner.c       (~1,500 lines — all keyword matching)
  scanner_kw.h    (~300 lines  — KwEntry tables, hand-written or generated)
  parser.c        (~25 MB target)
queries/          (unchanged — alias() names preserved)
test/corpus/      (mostly unchanged — CST node types preserved via aliases)
```

---

## Implementation Order

Each phase: `tree-sitter generate && tree-sitter test && parse pruebadefuego.plt`

The original order below was risk-first. **Re-prioritized 2026-06-13 by actual
size payoff** (size shrinks only via N→1 merges — see the Why caveat):

- **Biggest remaining size win: Phase 3 — terminal names (32 → 1).** Needs a
  permissive union `t_opts` rule so all terminals share one continuation, plus
  corpus-test updates for the changed CST. Medium risk, highest payoff.
- **Small clean win: Phase 4/D3 — minor tics (6 → 1, `kw_mtics`).** Low risk.
- **No size payoff: Phase 1 — style attrs (14 → 14).** Do only as grammar
  simplification / to retire `reg()` calls; it will not shrink `parser.c`.
- **REFUTED — Phase 6 statement-terminator `_eos` redesign does NOT shrink
  parser.c (it regresses it).** See the refutation bullet in empirical
  corrections. The real cost is set/show option-repeat follow sets, not the
  statement boundary.

Original phase list (kept for reference; statuses in the Status table at top):

1. **Phase 1 — Style attributes (14 K.* → 14 external tokens)**  
   Size-neutral (14 distinct continuations). Lowest risk; establishes the
   external-token pattern. Pursue for simplification, not size.

2. **Phase 2 — Plot style names (35 → 1 token)** — **DONE 2026-06-09.**

3. **Phase 3 — Terminal type names (32 → 1 token)**  
   Medium risk (each terminal's options differ → needs union `t_opts` rule).

4. **Phase 4 — `_argument_set_show` keywords (~80 tokens, one group at a time)**  
   Mostly stale (axis families already merged via `K.axes`). Only D3 minor-tics
   (6→1) is a clean remaining win.

5. **Phase 5 — Remaining command keyword abbreviations**  
   Partially done via scanner (`kw_cmd_bare/optexpr/exit/expr`, `cmd_*_kw`).

---

## Empirical corrections (measured)

- **Set/show options are ~70 % of parser.c (measured 2026-06-14).** Stubbing
  `_argument_set_show` to a trivial rule: parser.c 40 → 12 MB, STATE_COUNT
  17,532 → 5,301, SYMBOL_COUNT 1,091 → 475. The cost is DISTRIBUTED across ~85
  option rules (style −3.85 MB, palette −2.5, object −2.4, key −1.6, colorbox
  −1.3; most others <1 MB each) — no single whopper. Each option rule embeds
  expressions/colorspec/positions inside `repeat1(choice(...))` option lists, so
  every option's expression tail carries the whole OPTION-START follow set (not
  the statement-start set — see the Phase 6 refutation below) → the bloat is
  structural, not per-token, and is NOT addressed by statement terminators.
- **Statement-terminator (`_eos`) redesign is REFUTED — it does NOT shrink
  parser.c; it regresses it (measured 2026-06-14, the implementation attempt).**
  Baseline with tree-sitter 0.26.9 is **38.18 MB / STATE 17,882 / LARGE_STATE
  7,378** (NOTE: the committed `src/parser.c` reads 39.95 MB because it was
  generated by an OLDER tree-sitter — always re-measure the baseline with your
  own `tree-sitter generate` before comparing). Four faithful variants of
  `source_file: repeat(seq($._statement, $._eos))` (+ the 8 block/multiplot sites,
  `extras` dropping `\n`/`;`):
    - internal `_eos = /[;\n]/` (strict): **39.39 MB, STATE 25,328** (breaks
      blank lines / EOF / comment-only files);
    - internal run-token `/[;\n][ \t\r;\n]*/`: **39.39 MB, STATE 25,328**;
    - external `_eos` (`;`/newline-run + `}`/EOF zero-width): **40.18 MB, STATE
      25,933**, corpus **89/92** (comment-only files orphan the trailing newline);
    - correctness-complete `_line`/`_blank` wrapper (handles blank/comment-only
      lines + single-line `{stmt}`): **41.58 MB, STATE 26,025**, full corpus.
  Every variant balloons STATE_COUNT **+44–48 %** and leaves parser.c flat-or-
  larger. The per-state follow-set collapse *does* happen (LARGE_STATE_COUNT drops
  7,378 → ~4,400, so parser.c doesn't track the +48 % states), but the terminator
  structure ADDS far more states than it removes once blocks, `multiplot_block`,
  comments (which orphan the post-comment newline once `\n` leaves `extras`) and
  EOF are handled correctly. **Why the old "−38 % / 15,406" was bogus:** that
  number came from the *strict, broken* intermediate that got corpus 0/92 — i.e.
  it was measured on a grammar that didn't parse, and REWORK itself noted the
  correctness fix "EXPLODES to 57 MB." Even the strict variant does not reproduce
  15,406 states here (it gives 25,328). **Root cause the redesign misses:** the
  real cost center is NOT the statement-boundary follow set — it is the set/show
  *option-repeat* follow sets (the ~70 % `_argument_set_show` chunk, where each
  option's expression tail is followed by the whole option-start set via
  `repeat1(choice(...))`, not by statement starts). `_eos` does not touch those.
  A future size win must restructure set/show option parsing, not statement
  boundaries. **Do not re-attempt `_eos` without a genuinely new mechanism.**
- Parse-table entries are sparse-initialized — removing a token column only saves
  the entries where that token was actually valid.
  Savings ≈ (tokens merged − 1) × (states where the token was valid).
- **Moving a keyword to the scanner WITHOUT merging N→1 saves nothing** (the
  external token still needs the same ACTIONS entries). Phase 1 is the example.
- **"Statement-start tokens are the cost center" was the WORKING HYPOTHESIS — and
  it is WRONG (disproven by the Phase 6 attempt 2026-06-14).** The theory: every
  expression-tail state carries the statement-start follow set because
  `source_file: repeat($._statement)` lets statements abut. But making statements
  terminator-separated (which DOES collapse that follow set — LARGE_STATE_COUNT
  fell 7,378 → ~4,400) did NOT shrink parser.c; it grew. So the statement-boundary
  follow set was never the dominant cost. The dominant cost is the set/show
  option-repeat follow sets (~70 %, the `_argument_set_show` chunk). Earlier probe
  (2026-06-13): removing `\n` from `extras` alone left STATE_COUNT unchanged and
  parser.c −0.015 % — consistent with the refutation.
- Group D (set/show args) is largely stale: axis families (x/y/z/x2/y2/cb ranges,
  labels, m*tics) are ALREADY merged via `K.axes` regexes.
- Terminal names have NON-identical continuations (each `t_*` opts rule differs);
  merging requires a permissive union `t_opts` rule + corpus test updates.
- Merging changes CST rule names — grep `test/corpus/` and `queries/` first.
  `cmd_system` is referenced in `injections.scm`; keep it separate.

---

## Key Invariants for v2

1. `alias($.kw_xxx, "name")` in grammar → scanner alias name → highlights.scm unchanged.
2. `is_assignment_context()` check required for any external token that can appear at statement start. Not needed for tokens that only appear after another keyword (e.g., style keywords after `with`).
3. `Scanner.word` for datablocks: unchanged.
4. `Scanner.terminal` for terminal-conditional options: scanner stores matched terminal name.
5. PREC table: unchanged.
6. `extras: ($) => [$.comment, /\s|\\|;/]`: unchanged.
