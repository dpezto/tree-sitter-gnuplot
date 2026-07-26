# Batch 11 — serial evaluation: the measured encoding

Archive of the winning grammar encoding for serial evaluation inside
parentheses (`print (a=1, a+1)`), preserved because the only copy lived in a
macOS `/private/tmp` scratch directory that the OS reclaims.

## Why this is kept

Batch 11 is deferred, not abandoned. Roughly twenty encodings of the construct
were built and measured; this one was the cheapest that worked. Re-deriving
that comparison means rebuilding and regenerating each variant again, so the
surviving winner plus its cost is worth more than the disk it occupies.

## Cost, verified from the built artifacts

| | baseline | with the encoding | delta |
|---|---|---|---|
| `STATE_COUNT` | 11 564 | 11 740 | **+176** |
| `src/parser.c` | 25 667 122 B | 25 878 432 B | +211 310 B |

The +176 figure recorded in the LSP repo's `docs/notes.md` is reproduced
exactly by the two generated parsers, so the number is the encoding's own, not
a remembered one.

## What it does

Three call sites move to a shared hidden rule, and the parenthesised-expression
rule gains a serial form. The construct this fixes is also an error-free
misparse today: `print (1,2,3)` currently reads as three arguments.

## Provenance and limits

Taken from scratch directory `batch7/hA13`, whose sibling `batch7/baseline` is
the tree it was measured against. **That baseline matches no committed
`grammar.js`** — it carried uncommitted modifications — and it predates
`kw_g_argv`, `unit_pi` and `kw_filter_if`, so it is older than v3.0.0.

**This diff therefore does not apply to current main.** It is an archive of the
chosen shape and its measured cost, not a patch to land. Whoever implements
batch 11 re-expresses it against main and re-measures; the value here is
knowing which shape to re-express and what it should cost.

## The encoding

```diff
--- /private/tmp/claude-501/-Users-Dpezto-Documents-GitHub-gnuplot-lsp/aef86594-7c94-4c1f-8b49-cf433ca375c4/scratchpad/batch7/baseline/grammar.js	2026-07-24 17:58:29
+++ /private/tmp/claude-501/-Users-Dpezto-Documents-GitHub-gnuplot-lsp/aef86594-7c94-4c1f-8b49-cf433ca375c4/scratchpad/batch7/hA13/grammar.js	2026-07-24 18:12:00
@@ -474,7 +474,7 @@
 			prec.left(
 				seq(
 					alias("if", "kw_cond"),
-					field("conditions", surround("()", sep(",", choice($.assignment, $._expression)))),
+					field("conditions", surround("()", sep(",", $._assignable_expr))),
 					choice(
 						repeat1($._statement),
 						seq(
@@ -2248,7 +2248,7 @@
 				seq(
 					key("using", 1, "attr"),
 					sep(":", choice(
-						surround("()", sep(",", choice($.assignment, $._expression))),
+						surround("()", sep(",", $._assignable_expr)),
 						$._expression,
 					)),
 					// Optional trailing scanf format string: `using 1:($2+$3) '%lf,%lf,%lf'`
@@ -2422,8 +2422,10 @@
 			),
 
 		parenthesized_expression: ($) =>
-			prec(PREC.PAREN, surround("()", $._expression)),
+			prec(PREC.PAREN, surround("()", choice($._expression, seq($.def_var, repeat1(seq(",", $._assignable_expr)))))),
 
+		_assignable_expr: ($) => choice($.assignment, $._expression),
+
 		unary_expression: ($) =>
 			choice(
 				...[
```
