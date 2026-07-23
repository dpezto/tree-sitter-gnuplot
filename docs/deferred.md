# Deferred work

Design sketches for changes that were evaluated and consciously postponed.
Estimates come from the 2026-07 shrink campaign measurements (see git log,
commits `3552257..c9a4871`).

## Statement-head merge (reset / test / history)

Each statement-start token costs ~0.19 MB of reduce-lookahead entries across
the expression-tail states. Merging `reset`, `test`, and `cmd_history` heads
into one scanner token group (pattern: `CMD_KWS` + a permissive
`optional(repeat(choice(<rows>, expression)))` tail) would save an estimated
0.4–0.6 MB and a few tokens.

Cost: the distinct `cmd_reset` / `cmd_test` / `cmd_history` CST nodes collapse
into one generic command node. Deferred 2026-07-23: not worth the CST loss
after the campaign's gains. `set`/`unset`/`show` must keep distinct nodes
regardless.

Refuted alternative (do not revisit): the `_eos` statement-terminator
redesign — four faithful variants all regressed parser.c +44–48 % states.

## B3 — full expression in `plot_element` `function:` field

The `function:` field accepts only `$.function | $.unary_expression`; full
`$._expression` creates an LALR conflict where the expression's follow set
swallows a trailing `title`/`with`/... keyword. In practice most expressions
already parse through the `data:` branch (which is full `_expression`), so the
impact is field labeling and edge forms.

Viable redesign: move the plot-element attribute keywords (`title`, `notitle`,
`with`, `using`, `every`, `axes`, `smooth`) to external scanner tokens using
the same word-peek machinery as `_gval_sep`. External tokens win over internal
expression lexing, so the expression can never swallow an attribute keyword,
and the `function:` field can then take full `_expression` without conflict.
Medium effort; touches the scanner enum, `externals`, and `plot_element`.

## Closed

- **B15** (`set term pict2e size a4`): fixed by the t_opts generic conversion —
  paper names parse via the identifier fallback.
- **B6** (scanner `ending_char` serialization): stale — the Scanner struct is
  `{ char word[] }` only and serialize/deserialize round-trips it fully.
