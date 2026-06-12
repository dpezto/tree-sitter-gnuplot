# Grammar v2: Scanner-First Architecture

## Why

`parser.c` is 52 MB. Root cause: 503 `key()` calls generate 587 `aux_sym_*`
parse-table columns. Even though many keywords share the same alias (e.g.,
63 keywords aliased to `"arg"`), each distinct regex creates a separate symbol
column. `alias()` is a CST-only operation — it never reduces parse-table width.

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

1. **Phase 1 — Style attributes (14 K.* → 14 external tokens)**  
   Lowest risk: K.* appear in well-tested contexts. Establishes pattern for all phases.

2. **Phase 2 — Plot style names (35 → 1 token)**  
   High savings (34 fewer symbols), low risk (leaf nodes, identical continuation).

3. **Phase 3 — Terminal type names (32 → 1 token)**  
   Medium risk (terminal options are complex; scanner must store terminal name).

4. **Phase 4 — `_argument_set_show` keywords (~80 tokens, one group at a time)**  
   Highest effort. Start with minor-tics merge (D3), then per-option keywords.

5. **Phase 5 — Remaining command keyword abbreviations**  
   `set`, `show`, `unset`, `clear`, `replot`, etc.

---

## Key Invariants for v2

1. `alias($.kw_xxx, "name")` in grammar → scanner alias name → highlights.scm unchanged.
2. `is_assignment_context()` check required for any external token that can appear at statement start. Not needed for tokens that only appear after another keyword (e.g., style keywords after `with`).
3. `Scanner.word` for datablocks: unchanged.
4. `Scanner.terminal` for terminal-conditional options: scanner stores matched terminal name.
5. PREC table: unchanged.
6. `extras: ($) => [$.comment, /\s|\\|;/]`: unchanged.
