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

## Old-style if bodies with more than one command

gnuplot runs the rest of the line as the body of `if (c) cmd1; cmd2`. The
grammar takes only `cmd1` into `cmd_if` and leaves `cmd2` unconditional; the
`; else` branch is supported. A zero-width external separator for `;` inside
the body was measured at 12104 to 22679 states and 27.2 to 51.8 MB of
parser.c, the same failure mode as the refuted `_eos` terminator.

## Raw text the grammar still parses as expressions

Datablock lines are parsed as expressions, so data that is not one (`1,2`,
timestamps, an unmatched quote) is an ERROR. A scanner token for the raw
lines between the markers would fix it, at the cost of the current
number/string children, which is a breaking CST change.

Inline plot data after `plot "-"` (data lines and the `e` terminator) has no
grammar at all and parses as statements. It needs a raw-data token attached
to plot/splot elements whose source is `"-"`.

## Substitution that generates syntax

Backquotes are supported as expression atoms and inside double-quoted strings
(see README.md). Substitution that generates whole commands or keywords, such
as a standalone `` `printf 'print 1'` ``, still needs preprocessing rather than
an expression node.

Parenthesized serial evaluation is also deferred; see
[the measured encoding](batch11-serial-evaluation.md).

## gnuplot 6 function blocks

`function $F(x) << EOD` ... `return` ... `EOD` and calls of the form
`$F(3)` are not supported. They need a definition rule with a `return`
statement and `$name(...)` calls in expressions.

Closed items are not listed here; git log records them.
