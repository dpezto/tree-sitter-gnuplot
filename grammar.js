/*
 * @file Gnuplot grammar for tree-sitter.
 * @author Dai López Jacinto <dpezto@gmail.com>
 * @see {@link http://gnuplot.info/docs_6.0/Gnuplot_6.pdf}
 *
 * Scanner-first: gnuplot keyword-abbreviation matching lives in src/scanner.c
 * (STYLE_KWS / PLT_STYLE_KWS / CMD_KWS / GOPT_KWS), not in reg()/key() here.
 * Deferred design work is documented in docs/deferred.md.
 * */

const PREC = {
	// assignment/command bind above PAREN conceptually; not modeled in this table
	PAREN: 14, // (a)
	POWER: 12, // a**b a!
	UNARY: 11, // -a +a !a $a |a|
	TIMES: 10, // a*b a/b a%b
	PLUS: 9, // a+b a-b
	CONCAT: 8, // A.B
	SHIFT: 7, // << >>
	BIT_AND: 6, // a&b
	BIT_NOT: 5, // ~a
	BIT_OR: 4, // a|b a^b
	COMPARE: 3, // a==b a!=b a<b a>b a<=b a>=b  A eq B  A ne B
	AND: 2, // a&&b
	OR: 1, // a||b
	TERNARY: -1, // a?b:c
};

const IDENTIFIER = /[A-Za-z_\u00A1-\uFFFF][A-Za-z0-9_\u00A1-\uFFFF′⁀-⁑₀-₉]*/;
const UNDEFINE_ARG = new RegExp(`[ \\t]+${IDENTIFIER.source}\\*?`);

const K = {
	axes: /(x|y|z|x2|y2|cb|r|t|u|v|xy|vx|vy|vz)/, // NOTE: all the options in one. vx, vy, vz just for set ()range
	zaxes: /(x|y|z|x2|y2)?/,
	l: reg("left", 1),
	r: reg("right", 1),
	c: reg("center", 1),
	// Style attribute keywords (lw/lt/ls/lc/dt/dl/pt/ps/pi/pn/as/fs/fc/tc) live
	// in the external scanner — see STYLE_KWS in scanner.c and the `_lw`..`_tc`
	// hidden rules below. Aliased to the same names, so highlights.scm is
	// unchanged.
};

// Shared option fragments (DRY; expand inline, so the CST is unchanged at each
// site). `separator <whitespace|tab|comma|"str">` is identical in `set datafile`
// and `table`.
const dataSeparator = ($) =>
	seq(
		key("separator", 3),
		choice(key("whitespace", 5), "tab", "comma", field("separator", $._expression)),
	);


// Frequently-repeated option fragments (found via a structural clone-scan of
// src/grammar.json). Pure refactor — each expands to the exact inline form it
// replaces, so the generated parser is byte-identical. Centralizes the spelling
// (e.g. change `offset`'s min_chars in one place).
const fillStyleOpt = ($) => seq($._fs, $.fill_style); // `fs <fillstyle>`
const atPos = ($) => seq(alias("at", "kw_fn"), $.position); //          `at <position>`
const offsetPos = ($) => seq(key("offset", 3), $.position); // `offset <pos>`

// All terminal names collapsed into ONE token (was 32 separate `key()` tokens).
// `token(choice(...))` forces a single terminal symbol; abbreviation min_chars
// are the same reg() calls the old per-terminal `key(..., "name")` used.
// NOTE: gen-keywords.mjs mines this block textually — no comments inside it.
// kittycairo min "kit": gnuplot 6 resolves that shared prefix to kittycairo
// (probed live on 6.0.4), not an ambiguity error. tek40xx/tek410x are the
// literal names (trailing letter x's — the old \d\d digit-tail regex matched
// neither); kc-tek40xx / km-tek40xx are build-conditional, docs-verified only,
// full name required. Other min_chars (vttek 1, xterm 2, texdraw 3,
// tkcanvas 2, pstricks 4) mirror gnuplot 6.0.4's accepted abbreviations.
const TERM_NAME = token(
	choice(
		reg("cairolatex", 3), reg("canvas", 3), reg("cgm", 2), reg("context", 2),
		reg("domterm", 2), reg("dumb", 2), reg("dxf", 2), reg("emf", 2),
		reg("epscairo", 1), reg("epslatex", 4), reg("fig", 1), reg("gif", 1),
		reg("hpgl", 1), reg("jpeg", 1),
		reg("kittycairo", 3), reg("kittygd", -1),
		reg("lua", 1), reg("pcl5", 2), reg("pdfcairo", 2), reg("pict2e", 2),
		"png", reg("pngcairo", 4), reg("postscript", 2),
		reg("pslatex", 3), reg("pstex", -1), reg("pstricks", 4),
		reg("qt", 1), reg("sixelgd", 1), reg("svg", 2),
		/k[cm]-tek40xx/, reg("tek40xx", 5), reg("tek410x", 5),
		reg("texdraw", 3), reg("tikz", 2), reg("tkcanvas", 2), reg("unknown", 1),
		reg("vttek", 1), reg("webp", 1), reg("wxt", 2), reg("x11", 1),
		reg("xterm", 2),
	),
);

module.exports = grammar({
	name: "gnuplot",

	externals: ($) => [
		$.datablock_start,
		$.datablock_end,
		$.cmd_fit_kw,    // f / fi / fit  — disambiguated by scanner lookahead
		$.cmd_plot_kw,   // p / pl / plo / plot
		$.cmd_splot_kw,  // sp / spl / splo / splot
		$.cmd_pause_kw,  // pa / pau / paus / pause
		$.cmd_print_kw,  // pr / pri / prin / print
		$.cmd_help_kw,   // he / hel / help
		$.cmd_load_kw,   // l / lo / loa / load
		$.kw_plt_st,      // plain plot style names — see PLT_STYLE_KWS in scanner.c
		$.kw_cmd_bare,    // break/clear/continue/pwd/replot/reread/refresh
		$.kw_cmd_optexpr, // raise/lower/vclear/toggle
		$.kw_cmd_exit,    // exit/quit
		$.kw_cmd_expr,    // cd/evaluate
		// Style attribute keywords — order MUST match the enum in scanner.c.
		// kw_sa = lw/ls/pi/pn/as/dl collapsed (all `<kw> <expr>`); the rest stay
		// distinct (different continuations). Aliased via the _sa / _lt.._tc rules.
		$.kw_sa, $.kw_lt, $.kw_lc, $.kw_dt, $.kw_pt, $.kw_ps,
		$.kw_fs, $.kw_fc, $.kw_tc,
		// Generic set/show option-body tier tokens (GOPT_KWS in scanner.c).
		// Sub-keywords of converted option bodies are matched by the scanner and
		// tagged with their highlight tier; the bodies themselves share the
		// _gopts/_gopts_style rules. kw_g_axisflag is the (no)?m?<axis>tics
		// family ((no)mxtics/x2tics/...), valid only in style-flavor bodies.
		// kw_g_argv is the value-REQUIRED flavor of kw_g_arg (see _gopt_item).
		$.kw_g_arg, $.kw_g_argv, $.kw_g_flag, $.kw_g_mod, $.kw_g_coord, $.kw_g_axisflag,
		// autoscale-only <axis>{min|max|fix|fixmin|fixmax}? words: private token
		// so common variable names (rmax, xmin) stay identifiers elsewhere.
		$.kw_g_axisrange,
		// zero-width, same-line-only separator between an arg/coord keyword and
		// its value (newline/';' ahead = no value: next line is a new statement)
		$._gval_sep,
		// same shape, but exclusively for VALUE binding inside _gopts items
		// (the ~70 option-head body gates keep _gval_sep). The scanner declines
		// _gval_bind before grammar-literal keywords like `font` so they start
		// a new item instead of binding as the previous keyword's value.
		$._gval_bind,
		// detached `pi` angle unit after `binary rotate=<value>`; own token so
		// the scanner can prefer it over kw_sa's `pi` (pointinterval) in the
		// merged plot-element state
		$.unit_pi,
		// same-line gate for the cmd_bare plot-element tail; like _gval_sep but
		// also opens on '[' so `replot [0:1] x/2` reaches the range prefix
		$._gval_tail,
		// plot-element filter `if`, matched only when it is on the same logical
		// line as the element (a statement-level `if` on the next line must not
		// attach as a filter)
		$.kw_filter_if,
	],

	extras: ($) => [$.comment, /\s|\\|;/],

	word: ($) => $.identifier,

	conflicts: ($) => [
		[$.plot_element, $.style_opts],
		// Companion to _plot_data_expr (plot_element's data: branch): an atom
		// after the plot keyword reduces to _plot_data_expr (data) or to
		// _expression (feeding a larger expression / the function: branch);
		// GLR forks and the wrong branch dies on the next token.
		[$._plot_data_expr, $._expression],
		// Same shape for the function: branch — a bare function/unary either
		// completes plot_element or keeps growing as an expression (`-x + 1`);
		// the wrong fork dies on the following token.
		[$.plot_element, $._expression],
		// `with hsteps … offset <expr>`: offset continues the hsteps option
		// cluster (_hsteps_opts, dynamic 1) or closes plot_style and starts
		// style_opts' generic offset-position; GLR fork, hsteps side preferred
		// when both survive.
		[$.plot_style],
		[$.assignment, $._var_rhs],
		[$._tag_atom, $._expression],
		[$._command, $.multiplot_block],
		// palette `file "f" using 1:2 "fmt"`: using's trailing scanf format
		// string vs a following string item in the generic palette body
		// `set view 60,30`: full-slot comma lists parse as a _gexprs chain OR
		// as _view_angles slots; dynamic prec on _view_angles picks the slot
		// form, keeping the empty-slot shapes (`,,0.5`, `60,`) in one rule
		[$._gexprs, $._view_slot],
	],

	rules: {
		// Statements abut with no terminator token. A `_eos` terminator redesign to
		// collapse the expression-tail follow set was attempted and REFUTED — it
		// regresses parser.c (+44-48% states, four variants). Size wins instead come
		// from N→1 token merges with identical continuations ($._sa, kw_plt_st).
		source_file: ($) => repeat($._statement),

		// Style attribute keywords: hidden rules aliasing the external scanner
		// tokens. $._sa is the collapsed lw/ls/pi/pn/as/dl option (`<kw> <expr>`,
		// node "sa"); the rest keep their own short-name nodes for highlights.scm.
		_sa: ($) => seq(alias($.kw_sa, "sa"), $._expression),
		_lt: ($) => alias($.kw_lt, "lt"),
		_lc: ($) => alias($.kw_lc, "lc"),
		_dt: ($) => alias($.kw_dt, "dt"),
		_pt: ($) => alias($.kw_pt, "pt"),
		_ps: ($) => alias($.kw_ps, "ps"),
		_fs: ($) => alias($.kw_fs, "fs"),
		_fc: ($) => alias($.kw_fc, "fc"),
		_tc: ($) => alias($.kw_tc, "tc"),

		// Generic set/show option bodies. Converted options share these two rules:
		// the scanner tags sub-keywords with their tier (arg/flag/mod/coord), and
		// values float as flat sibling items (no per-keyword seq — the measured
		// value-union state explosion). Two flavors so bodies that never take style
		// attributes cannot have identifiers like `pi` eaten by the style scanner.
		// Comma-chained expression list, atomic: `0, 1, 5` is ONE item, so the
		// boundary ambiguity below never fires in the middle of a list.
		_gexprs: ($) =>
			prec.right(
				seq(
					$._expression,
					// range_block as a chain element: contourfill
					// `defined [a:b] c, [d:e] f` chains through the ranges.
					// Optional coord prefix per element: `set offsets
					// graph 0, 0, graph 0.1, graph 0.1` (the leading coord
					// comes in via the _gopt_item coord branch instead).
					repeat(
						seq(
							",",
							optional(alias($.kw_g_coord, "coord")),
							choice($._expression, $.range_block),
						),
					),
				),
			),
		// Parenthesized tuple list — palette `defined (0 "blue", 1 "red")`,
		// gradient 4-tuples, tics `(1, 2, 3)` / `("lbl" 1, "x" 2 1)`: one or
		// more juxtaposed comma-chain groups. A lone `(expr)` also matches;
		// prec.dynamic(-1) cedes that overlap to parenthesized_expression
		// (which cannot hold a comma, so every real list lands here).
		tuple: ($) =>
			prec.dynamic(-1, surround("()", seq($._gexprs, repeat($._gexprs)))),
		_gopt_item: ($) =>
			choice(
				alias($.kw_g_flag, "flag"),
				// Optional `, <exprs>` tail: tics time-series `"start", 1 month,
				// "end"` — the unit word (mod row) sits mid-chain, so the chain
				// resumes after it. Superset elsewhere (a mod directly followed
				// by a comma was previously an ERROR in every body).
				prec.right(seq(alias($.kw_g_mod, "mod"), optional(seq(",", $._gexprs)))),
				// A value (identifier included) binds to the preceding arg/coord
				// keyword only across the same-line _gval_sep, so
				// `contourfill auto FOO` keeps FOO in the body while an
				// identifier on the NEXT line starts a fresh statement.
				prec.right(seq(alias($.kw_g_arg, "arg"), optional(seq($._gval_bind, choice($._gexprs, $.tuple))))),
				// Arg keywords whose value is REQUIRED — deliberately NOT wrapped in
				// `optional`, so the state after the keyword admits only an
				// expression and every keyword-table token drops out of
				// valid_symbols at the value slot (e.g. `rotate by pi`).
				seq(alias($.kw_g_argv, "arg"), $._gval_bind, choice($._gexprs, $.tuple)),
				prec.right(seq(alias($.kw_g_coord, "coord"), optional(seq($._gval_bind, $._gexprs)))),
				$._gexprs,
				// bare label/position list: `set xtics ("NE" 72, "S" 42)`
				$.tuple,
				$.range_block,
			),
		// Bodies are prec.LEFT: at an ambiguous statement boundary (next word is
		// an identifier that could start an assignment, or `$name` starting a
		// datablock) the body STOPS instead of swallowing the next statement.
		// Sub-keywords therefore MUST be in GOPT_KWS — an unlisted keyword
		// degrades to an identifier and ends the body early.
		_gopts: ($) => prec.left(repeat1($._gopt_item)),
		_gopts_style: ($) =>
			prec.left(repeat1(choice($._gopt_item, alias($.kw_g_axisflag, "flag"), ...gopts_style_extras($)))),

		// The style body minus the per-axis tics family. `set key` needs it:
		// the axisflag matcher accepts a bare axis letter (`set grid x` is
		// valid gnuplot), so inside the generic body it claimed the `t` of
		// `set k t l` before the keyword table could read it as `top` — and
		// gnuplot's key has no per-axis words at all.
		_gopts_key: ($) =>
			prec.left(repeat1(choice($._gopt_item, ...gopts_style_extras($)))),

		_statement: ($) => choice($._command, $.assignment, $.macro),

		_command: ($) =>
			choice(
				$.cmd_bind,
				$.cmd_bare,
				$.cmd_call,
				$.cmd_do,
				$.cmd_expr,
				$.cmd_exit,
				$.cmd_fit,
				$.cmd_help,
				$.cmd_history,
				$.cmd_if,
				$.cmd_import,
				$.cmd_load,
				$.cmd_opt_expr,
				$.cmd_pause,
				$.cmd_plot,
				$.cmd_print,
				$.cmd_reset,
				$.cmd_save,
				$.cmd_set,
				$.cmd_show,
				$.cmd_splot,
				$.cmd_stats,
				$.cmd_system,
				$.cmd_test,
				$.cmd_undefine,
				$.cmd_unset,
				$.cmd_vfill,
				$.cmd_while,
				$.multiplot_block,
				// standalone `unset multiplot` (defensive use, no opener)
				alias($._unset_multiplot, $.cmd_unset),
			),

		assignment: ($) =>
			choice($.def_var, $.def_func, $.def_array, $.def_datablock),

		def_var: ($) => prec.right(seq($.identifier, "=", $._var_rhs)),
		_var_rhs: ($) => prec.right(choice($.def_var, $._expression)),

		def_array: ($) =>
			choice(
				// Element assignment: A[i] = expr
				seq($.array, "=", $._expression),
				// Declaration with size: array A[6]  /  array A[6] = [e1, e2, ...]
				// The sized form takes ONLY a bracketed literal — `array A[3] =
				// split("a b c")` is rejected by the runtime.
				seq("array", $.array, optional(seq("=", $._array_literal))),
				// Declaration without size brackets, from an expression or from a
				// literal: `array C = split(...)` / `array A = [1, 2, 3]`.
				seq("array", $.identifier, "=", choice($._array_literal, $._expression)),
			),

		// `[e1, e2, ...]` element list. Slots may be empty (`array A = [1, , 3]`
		// leaves element 2 undefined) and the whole list may be empty (`array A =
		// []` builds a zero-length array). Elements are plain expressions —
		// nesting (`[[1,2],[3,4]]`) is not valid gnuplot, and a bare `[1,2,3]` is
		// not an expression, so the literal only appears after `array … =`.
		// Hidden: the brackets stay inlined in def_array, as before.
		_array_literal: ($) => surround("[]", sep(",", optional($._expression))),

		def_func: ($) => seq($.function, "=", $._expression),

		def_datablock: ($) =>
			prec(
				1,
				seq(
					field("name", $.datablock),
					"<<",
					field("start", $.datablock_start),
					repeat($._expression),
					field("end", $.datablock_end),
				),
			),

		macro: ($) => token(seq("@", IDENTIFIER)),

		//-------------------------------------------------------------------------
		// Commands (cmd_*)
		//-------------------------------------------------------------------------
		cmd_bind: ($) =>
			prec.right(
				seq(
					alias("bind", "cmd"),
					optional(
						seq(
							$._gval_sep,
							// `allwindows` (min "all") applies the binding to every plot
							// window; bare `bind allwindows` just lists bindings, so the
							// key is independent of the modifier.
							optional(key("allwindows", 3, "mod")),
							optional(
								seq(
									field("key", $._expression),
									optional(field("commands", $._expression)),
								),
							),
						),
					),
				),
			),

		// break/clear/continue/pwd/replot/reread/refresh — one scanner token. See
		// KW_CMD_BARE in scanner.c. `replot` takes a same-line plot-element tail
		// (appended to the previous plot/splot command); the one-token collapse
		// extends the tail permissively to the other bare commands. The _gval_tail
		// gate keeps the tail same-line, so the next line always starts a fresh
		// statement. _gval_tail is the '['-opening variant of _gval_sep, so the
		// runtime's `replot [range] ...` form reaches plot_element's leading
		// range_block while the ~70 set/show body gates keep declining '['.
		cmd_bare: ($) =>
			seq(
				alias($.kw_cmd_bare, "cmd"),
				optional(seq($._gval_tail, sep(",", $.plot_element))),
			),

		// raise/lower/vclear/toggle — one scanner token + optional expression
		// ("all" is only meaningful for toggle; accepted permissively for the rest).
		// `warn` (message to stderr, one optional string) shares the shape; the
		// runtime accepts no abbreviation, so it stays a grammar literal. The
		// _gval_sep gate keeps the argument same-line: `vclear $grid` binds the
		// datablock, `raise <winid>` binds the identifier, while a datablock
		// definition or assignment on the next line starts a fresh statement.
		cmd_opt_expr: ($) =>
			seq(
				alias($.kw_cmd_optexpr, "cmd"),
				optional(seq($._gval_sep, choice($._expression, alias("all", "mod")))),
			),

		// cd/evaluate — one scanner token + required expression.
		cmd_expr: ($) =>
			seq(
				alias($.kw_cmd_expr, "cmd"),
				optional(seq($._gval_sep, $._expression)),
			),

		cmd_call: ($) =>
			prec.right(
				seq(
					alias("call", "cmd"),
					optional(
						seq($._gval_sep, $._expression, repeat($._expression)),
					),
				),
			),

		cmd_do: ($) =>
			seq(
				"do",
				optional(
					seq($._gval_sep, $.for_block, surround("{}", repeat($._statement))),
				),
			),

		cmd_exit: ($) =>
			prec.left(
				seq(
					alias($.kw_cmd_exit, "cmd"),
					optional(
						seq(
							$._gval_sep,
							choice(
								alias("gnuplot", "mod"),
								seq(choice("message", "status"), optional($._expression)),
							),
						),
					),
				),
			),

		cmd_fit: ($) =>
			seq(
				alias($.cmd_fit_kw, "cmd"),
				optional(
					seq(
						$._gval_tail,
						optional($.range_block),
						field("func", $.function),
						field("data", $._expression),
						optional($.datafile_modifiers),
						repeat(
							choice(
								"unitweights",
								// yerr(o(r(s)?)?)? — plural forms (yerrors/xyerrors/zerrors) are
								// the documented spellings; singular + prefix abbreviations down
								// to yerr/xyerr/zerr probed on 6.0.4.
								alias(/(y|xy|z)err(o(r(s)?)?)?/, "errors"),
								seq("errors", sep(",", $._expression)),
							),
						),
						alias("via", "kw_fn"),
						choice(
							field("parameter_file", $._expression),
							field("var", seq($._expression, repeat1(seq(",", $._expression)))),
						),
					),
				),
			),

		cmd_help: ($) =>
			prec.right(
				seq(
					alias($.cmd_help_kw, "cmd"),
					optional(seq($._gval_sep, $._expression)),
				),
			),

		cmd_history: ($) =>
			prec.right(
				seq(
					key("history", 4, "cmd"),
					optional(
						seq(
							$._gval_sep,
							repeat1(
								choice(
									$._expression,     // count or filename/pipe
									key("append", 3),
									key("quiet", 2),
									key("numbers", 3),
									key("trim", 2),
									key("full", 4),
								),
							),
						),
					),
				),
			),

		cmd_import: ($) =>
			seq(
				alias("import", "cmd"),
				optional(
					seq(
						$._gval_sep,
						$.function,
						alias("from", "kw_fn"),
						$.string_literal,
					),
				),
			),

		cmd_if: ($) =>
			prec.left(
				seq(
					alias("if", "kw_cond"),
					optional(
						seq(
							$._gval_sep,
							field("conditions", surround("()", sep(",", choice($.assignment, $._expression)))),
							choice(
								repeat1($._statement),
								seq(
									surround("{}", repeat($._statement)),
									repeat(
										seq(
											alias("else", "kw_cond"),
											alias("if", "kw_cond"),
											repeat1(field("conditions", surround("()", $._expression))),
											surround("{}", repeat($._statement)),
										),
									),
								),
							),
							optional(seq(alias("else", "kw_cond"), surround("{}", repeat($._statement)))),
						),
					),
				),
			),

		cmd_load: ($) =>
			seq(
				alias($.cmd_load_kw, "cmd"),
				optional(seq($._gval_sep, $._expression)),
			),

		cmd_pause: ($) =>
			prec.right(
				seq(
					alias($.cmd_pause_kw, "cmd"),
					optional(
						seq(
							$._gval_sep,
							choice(
								seq(
									field("time", $._expression),
									optional(field("str", $._expression)),
								),
								seq(
									"mouse",
									sep(",", $.endcondition),
									optional(field("str", $._expression)),
								),
							),
						),
					),
				),
			),

		endcondition: ($) =>
			// Enumerated values of `pause mouse` (gnuplot: "the possible end
			// conditions are keypress, button1, button2, button3, close, any"),
			// so they carry the `mod` tier rather than the option-name tier.
			choice(
				alias("keypress", "mod"),
				alias("button1", "mod"),
				alias("button2", "mod"),
				alias("button3", "mod"),
				alias("close", "mod"),
				alias("any", "mod"),
			),

		cmd_plot: ($) =>
			seq(
				alias($.cmd_plot_kw, "cmd"),
				optional(
					seq($._gval_tail, optional("sample"), sep(",", $.plot_element)),
				),
			),

		plot_element: ($) =>
			// p. 125
			// prec.left(1) spans only the element PREFIX (not the trailing
			// options repeat): with the marker over the whole rule, the
			// `if`-filter shift/reduce against a following cmd_if statement is
			// statically resolved toward reduce inside plot_element itself
			// (repeat extension = same-rule decision) and the filter can never
			// fire. Narrowing the span leaves that decision unannotated so the
			// scanner's same-line kw_filter_if token can resolve it lexically.
			seq(
					prec.left(
						1,
						seq(
							optional($.for_block),
							repeat(field("sample", $.range_block)),
							choice(
								seq(
									sep(",", $.assignment),
									optional(","),
									$._expression, // $.function,
									optional($.datafile_modifiers),
								),
								seq(
									field("function", choice($.function, $.unary_expression)),
									// function plots accept datafile-modifier filters too
									// (`plot sqrt(sin(x)) sharpen`); before _plot_data_expr
									// split off the data: branch these rode along there.
									optional($.datafile_modifiers),
								),
								seq(
									// p. 177 keyentry. Data takes _expression MINUS bare
									// function/unary (see _plot_data_expr): those belong to
									// the function: branch above. With the narrowed
									// prec.left(1) span the old whole-rule marker no longer
									// settles that overlap statically, and a GLR fork here
									// merges mid-production (post-merge the reduce's
									// production id is fixed, so prec.dynamic cannot pick
									// the branch) — removing the overlap is the only stable
									// encoding.
									field("data", choice($._plot_data_expr, "keyentry")),
									optional($.datafile_modifiers),
								),
								// p. 94
								"newspiderplot",
								seq(
									"newhistogram",
									repeat(
										choice(
											field("title", $.string_literal),
											$.fontspec,
											$._textcolor,
											seq($._lt, field("lt", $._expression)),
											fillStyleOpt($),
											seq(alias("at", "kw_fn"), field("at", $._expression)),
										),
									),
								),
							),
						),
					),
					repeat(
						choice(
							seq(
								alias("axes", "attr"),
								alias(choice("x1y1", "x2y2", "x1y2", "x2y1"), "axes_opts"),
							),
              choice(
								key("notitle", 3, "attr"),
								prec.left(
									seq(
										key("title", 1, "attr"),
										choice(
											field("title", $._expression),
											// columnhead(er) keyword: bare, or call form
											// `columnheader(<expr>)` (probed 6.0.4: both
											// spellings take an argument; `at end`/`enhanced`
											// still legal after the call).
											seq(
												field("title", key("columnheader", 3, $.columnheader)),
												optional(surround("()", field("column", $._expression))),
											),
										),
										repeat(
											choice(
												seq(alias("at", "kw_fn"), choice("beginning", "end", $.position)),
												key("enhanced", 3, "flag", 1),
											),
										),
									),
								),
							),
							// p. 129 watchpoints: watch mouse | watch {x|y|z|F(...)} = <value> {label <expr>}
						seq(
							alias("watch", "attr"),
							choice(
								alias("mouse", "mod"),
								seq(
									field("target", choice($.function, $.identifier)),
									"=",
									field("value", $._expression),
									optional(seq(alias("label", "attr"), field("label", $._expression))),
								),
							),
						),
						alias("nogrid", "flag"), // NOTE: splot only option https://stackoverflow.com/questions/74586626/gnuplot-how-to-splot-surface-and-points-with-dgrid3d
							// candlesticks/boxplot whisker clause — floats here because
							// 6.0.4 accepts it on either side of style opts. Probed
							// minimum: whisker (7); optional bar-width fraction.
							seq(key("whiskerbars", 7), optional(field("fraction", $._expression))),
							// 6.0 datafile filter `if <expr>` (probed 6.0.4: parens are
							// optional — `if $2<5` accepted; full-word only; terminates the
							// i/e/u section (`if … every` rejected) but is legal before
							// `with` and after `title`; runtime restricts it to datafile
							// plots and rejects duplicates — grammar stays lenient).
							$._plot_filter,
							field("with", seq(key("with", 1, "attr"), $.plot_style)),
							$.style_opts,
						),
					),
				),

		// hsteps option cluster. Probed minima: base(line) 4, fo(rward) 2,
		// ba(ckward) 2, link/nolink full-word only. `offset <y-offset>` floats
		// within the cluster (`offset 1 forward` accepted) but not outside it
		// (`lw 2 offset 1` and pre-`with` both rejected; grammar leaves the
		// post-style-opts form to style_opts' generic offset-position, and
		// accepts abbreviated `off`/`offs` here because the token is shared
		// with that rule — gnuplot itself wants the full word after hsteps).
		// Own UNANNOTATED rule: inside plot_style's prec.left span the
		// offset shift/reduce against style_opts' offset would statically
		// resolve toward closing plot_style; here it goes through the
		// declared single-symbol [$.plot_style] GLR conflict and
		// prec.dynamic(1) keeps the offset in the hsteps cluster when both
		// parses survive.
		_hsteps_opts: ($) =>
			repeat1(
				choice(
					key("baseline", 4, "mod"),
					key("forward", 2, "mod"),
					key("backward", 2, "mod"),
					key("link", 4, "mod", 1),
					// The offset value is atom-restricted (rotate=-style, see
					// binary_options): a full $._expression here hands the shared
					// expression machine a unique follow set (the hsteps mods) and
					// clones it (+248 states measured). Compound values still parse
					// via the GLR fallback into style_opts' offset-position
					// (`offset 1+2 lw 2`); only `offset <compound> <mod>` — compound
					// value AND a trailing hsteps mod — is lost (parenthesize).
					prec.dynamic(
						1,
						seq(
							key("offset", 3, "mod"),
							field(
								"offset",
								choice(
									$.number,
									$.identifier,
									$.parenthesized_expression,
									// non-recursive signed form; CST matches real
									// unary_expression for these shapes
									alias(
										seq(
											alias(/[-+]/, $.operator),
											choice($.number, $.identifier, $.parenthesized_expression),
										),
										$.unary_expression,
									),
								),
							),
						),
					),
				),
			),

		// _expression minus bare function/unary_expression, for plot_element's
		// data: field only — the two excluded members are the function: branch.
		// Keep the member list in sync with _expression.
		_plot_data_expr: ($) =>
			prec.left(
				choice(
					$.identifier,
					$.array,
					$.subscript,
					$.datablock,
					$.number,
					$.complex,
					$.string_literal,
					$.sum_block,
					$.parenthesized_expression,
					$.binary_expression,
					$.ternary_expression,
				),
			),

		// 6.0 datafile filter `if <expr>` (probed 6.0.4: parens optional —
		// `if $2<5` accepted; full-word only; terminates the i/e/u section
		// (`if … every` rejected) but legal before `with` and after `title`;
		// runtime restricts it to datafile plots and rejects duplicates —
		// grammar stays lenient). Own hidden rule. The filter `if` is the
		// scanner's kw_filter_if, emitted only when the word is on the same
		// logical line as the element, so an old-style `if (c) <cmd>` statement
		// on the line after a plot command stays its own statement instead of
		// mis-attaching as a filter. That token decides the shift/reduce against
		// a following cmd_if lexically, so no GLR fork arises here: neither a
		// [$.plot_element] conflict nor a dynamic precedence is needed.
		_plot_filter: ($) =>
			seq(alias($.kw_filter_if, "attr"), field("filter", $._expression)),

		plot_style: ($) =>
			// The hsteps branch sits OUTSIDE the prec.left span: its option
			// cluster (_hsteps_opts) shares the `offset` token with style_opts,
			// and inside the marker the offset shift/reduce would statically
			// resolve toward closing plot_style (a precedence-marked reduce
			// silently beats an unmarked shift). Unannotated, the decision goes
			// through a declared GLR conflict instead (see conflicts).
			choice(
				// hsteps (6.0): options repeat in any order, but only BEFORE
				// style opts (`hsteps lw 2 baseline` is rejected by 6.0.4).
				seq(key("hsteps", 2, "plt_st"), optional($._hsteps_opts)),
				prec.left(
					choice(
					// Plain styles (no style-specific continuation) are matched by the
					// external scanner as one token — see PLT_STYLE_KWS in scanner.c.
					// `at base` trails contourfill (6.0.4 accepts base abbreviated to
					// any prefix incl. `b`; `at surface`/`both` REJECTED). Attached to
					// the whole kw_plt_st token — permissive for the other plain
					// styles, like `nogrid` in plot_element.
					seq(
						alias($.kw_plt_st, "plt_st"),
						optional(seq(alias("at", "kw_fn"), key("base", 1))),
					),
					// Styles with trailing options keep their own regex token:
					seq(key("labels", 3, "plt_st"), optional($.label_opts)),
					seq(key("vectors", 3, "plt_st"), optional($.arrow_opts)),
					seq(
						key("isosurface", 10, "plt_st"),
						optional(seq("level", $._expression)),
					),
					// `whiskerbars {<fraction>}` floats in the plot_element repeat
					// (6.0.4 accepts it before AND after style opts: `candlesticks
					// lt 3 whiskerbars 0.5` and `whiskerbars 0.5 lt 3`).
					key("candlesticks", 12, "plt_st"),
					seq(key("ellipses", 8, "plt_st"), optional($.ellipse)),
					seq(
						key("filledcurves", 7, "plt_st"),
						optional(
							choice(
								"closed",
								"between",
								seq(
									optional(choice("above", "below")),
									optional(
										seq(
											alias(
												choice("x1", "x2", "y1", "y2", "y", "r"),
												"axis",
											),
											optional(seq("=", $._expression)),
										),
									),
								),
							),
						),
					),
					seq(
						key("fillsteps", 9, "plt_st"),
						optional(choice("above", "below")),
						optional(seq(alias("y", "axis"), "=", $._expression)),
					),
					seq(key("image", 3, "plt_st"), optional("pixels")),
					seq(key("pm3d", 4, "plt_st"), optional(alias($._pm3d, $.pm3d))),
					),
				),
			),

		// `printerr` is print-to-stderr with the identical argument list; the
		// runtime accepts no abbreviation, so it stays a grammar literal beside
		// the scanner's pr/pri/prin/print token.
		cmd_print: ($) =>
			seq(
				alias($.cmd_print_kw, "cmd"),
				optional(
					seq(
						$._gval_sep,
						// `print for [i=1:|A|] A[i]`. The runtime iterates the FIRST item
						// only; any further comma-separated items are evaluated once after
						// the loop ends (so `print for [i=1:2] i, "-"` prints `1 2 -`).
						optional($.for_block),
						sep(",", $._expression),
					),
				),
			),

		cmd_reset: ($) =>
			prec.right(
				seq(
					alias("reset", "cmd"),
					optional(
						seq(
							$._gval_sep,
							choice(alias("bind", "mod"), alias("errors", "mod"), alias("session", "mod")),
						),
					),
				),
			),

		cmd_save: ($) =>
			seq(
				key("save", 2, "cmd"),
				optional(
					seq(
						$._gval_sep,
						optional(
							choice(
								key("functions", 3),
								key("variables", 3),
								// `save changes` (6.0) — only settings changed from defaults;
								// the runtime accepts "change" but not "chang", hence min 6.
								key("changes", 6),
								key("terminal", 3, "mod"),
								alias("set", "mod"),
								alias("fit", "mod"),
								key("datablocks", 4),
							),
						),
						field("filename", $._expression),
						optional("append"),
					),
				),
			),

		cmd_set: ($) =>
			seq(
				key("set", 2, "cmd"),
				optional(
					seq($._gval_sep, optional($.for_block), $._argument_set_show),
				),
			),

		//-------------------------------------------------------------------------
		// Set/show arguments (_argument_set_show and its option rules)
		//
		// ~70% of parser.c, distributed across ~85 option rules (no single whopper).
		// Bloat is structural: each option embeds expressions/colorspec/positions
		// whose tails carry the statement-start follow set, so per-token keyword
		// merges here do NOT shrink the table — only the `_eos` redesign does.
		//-------------------------------------------------------------------------
		_gopt_body: ($) => seq($._gval_sep, $._gopts),

		_gopt_body_style: ($) => seq($._gval_sep, $._gopts_style),

		_argument_set_show: ($) =>
			prec.right(
				choice(
					$.angles,
					$.arrow,
					$.autoscale,
					$.border,
					$.boxwidth,
					$.boxdepth,
					$.color,
					$.colormap,
					$.colorsequence,
					$.clip,
					$.cntrlabel,
					$.cntrparam,
					$.colorbox,
					$.contour,
					$.cornerpoles,
					$.contourfill,
					$.dashtype,
					$.datafile,
					$.decimalsign,
					$.dgrid3d,
					$.dummy,
					seq(
						key("encoding", 3, "opt"),
						field("arg_opts", optional(alias($._gopt_body, $.encoding))),
					),
					seq(
						key1("opt", "errorbars", /|/, reg("bars", 1)),
						field("arg_opts", optional(alias($._gopt_body_style, $.errorbars))),
					),
					seq(alias("fit", "opt"), field("arg_opts", optional(alias($._gopt_body, $.fit)))),
					seq(key("format", 4, "opt"), field("arg_opts", optional(alias($._gopt_body_style, $.format)))),
					$.grid,
					seq(
						key("hidden3d", 3, "opt"),
						field("arg_opts", optional(alias($._gopt_body, $.hidden3d))),
					),
					seq(key("history", 3, "opt"), field("arg_opts", optional(alias($._gopt_body, $.history)))),
					seq(
						key("isosamples", 3, "opt"),
						field("arg_opts", optional(alias($._gopt_body, $.isosamples))),
					),
					seq(
						key("isosurface", 7, "opt"),
						field("arg_opts", optional(alias($._gopt_body, $.isosurface))),
					),
					alias("isotropic", "opt"),
					seq(alias("jitter", "opt"), field("arg_opts", optional(alias($._gopt_body, $.jitter)))),
					$.key,
					$.label,
					$.linetype,
					seq(alias("link", "opt"), field("arg_opts", optional($.link))),
					$.loadpath,
					seq(alias("locale", "opt"), field("arg_opts", optional(alias($._gopt_body, $.locale)))),
					$.logscale,
					$.mapping,
					$.margin,
					seq(alias("micro", "opt"), field("arg_opts", optional($.micro))),
					key("minussign", 5, "opt"),
					$.monochrome,
					seq(key("mouse", 2, "opt"), field("arg_opts", optional(alias($._gopt_body, $.mouse)))),
					$.mxtics,
					$.nonlinear,
					$.object,
					seq(key("offsets", 3, "opt"), field("arg_opts", optional(alias($._gopt_body, $.offsets)))),
					seq(key("origin", 2, "opt"), field("arg_opts", optional(alias($._gopt_body, $.origin)))),
					seq(key("output", 1, "opt"), field("arg_opts", optional(alias($._gopt_body, $.output)))),
					seq(
						alias("overflow", "opt"),
						field("arg_opts", optional($.overflow)),
					),
					$.palette,
					key("parametric", 2, "opt"),
					$.paxis,
					$.pixmap,
					$.pm3d,
					$.pointintervalbox,
					$.pointsize,
					seq(key("polar", 3, "opt"), field("arg_opts", optional($.polar))),
					seq(key("print", 2, "opt"), field("arg_opts", optional(alias($._gopt_body, $.print)))),
					seq(alias("psdir", "opt"), field("arg_opts", optional(alias($._gopt_body, $.psdir)))),
					key("raxis", 2, "opt"),
					seq(alias("rgbmax", "opt"), field("arg_opts", optional(alias($._gopt_body, $.rgbmax)))),
					seq(key("samples", 3, "opt"), field("arg_opts", optional(alias($._gopt_body, $.samples)))),
					seq(key("size", 2, "opt"), field("arg_opts", optional(alias($._gopt_body, $.size)))),
					key("spiderplot", 6, "opt"),
					$.style,
					seq(key("surface", 2, "opt"), field("arg_opts", optional(alias($._gopt_body, $.surface)))),
					$.table,
					$.terminal,
					seq(
						alias("termoption", "opt"),
						field("arg_opts", optional(alias($._gopt_body_style, $.termoption))),
					),
					seq(alias("theta", "opt"), field("arg_opts", optional(alias($._gopt_body, $.theta)))),
					seq(key("tics", -1, "opt"), field("arg_opts", optional($.tics))),
					seq(
						key("timestamp", 5, "opt"),
						field("arg_opts", optional(alias($._gopt_body_style, $.timestamp))),
					),
					seq(key("timefmt", 5, "opt"), field("arg_opts", optional(alias($._gopt_body, $.timefmt)))),
					$.title,
					seq(alias("vgrid", "opt"), field("arg_opts", optional($.vgrid))),
					seq(key("view", 2, "opt"), field("arg_opts", optional($.view))),
					seq(key("walls", -1, "opt"), field("arg_opts", optional(alias($._gopt_body_style, $.walls)))),
					$.xdata,
					$.xdtics,
					$.xlabel,
					$.xmtics,
					$.xrange,
					$.xtics,
					$.xyplane,
					seq(key("zero", 1, "opt"), field("arg_opts", optional(alias($._gopt_body, $.zero)))),
					$.zeroaxis,
					// Fallback: unknown/future option words parse clean (plain
					// identifier colour) instead of producing ERROR nodes. Known
					// option keywords are tokens and always win over identifier.
					prec.dynamic(
						-1,
						prec.right(seq(field("opt", $.identifier), optional(seq($._gval_sep, $._gopts)))),
					),
				),
			),

		angles: ($) =>
			prec.right(seq(key("angles", 2, "opt"), optional(seq($._gval_sep, $._gopts)))),

		arrow: ($) =>
			prec.left(
				seq(
					key("arrow", 3, "opt"),
					optional(
						seq(
							optional(field("tag", $._expression)),
							repeat1(
								choice(
									seq(
										optional(seq(alias("from", "kw_fn"), $.position)),
										alias(/r?to/, "kw_fn"),
										$.position,
									),
									seq(
										alias("from", "kw_fn"),
										$.position,
										key("length", 3),
										field("length", $._expression),
										key("angle", 2),
										field("angle", $._expression),
									),
									$.arrow_opts,
								),
							),
						),
					),
				),
			),

		// Generic body plus the autoscale-only axis-range token (xmin/rmax/…);
		// fix/keepfix/noextend are ordinary GOPT_KWS rows.
		autoscale: ($) =>
			prec.right(
				seq(
					key("autoscale", 4, "opt"),
					optional(
						seq(
							$._gval_sep,
							prec.left(
								repeat1(
									choice($._gopt_item, alias($.kw_g_axisrange, "arg")),
								),
							),
						),
					),
				),
			),

		border: ($) =>
			prec.right(seq(key("border", 3, "opt"), optional(seq($._gval_sep, $._gopts_style)))),

		boxwidth: ($) =>
			prec.right(seq(key("boxwidth", 3, "opt"), optional(seq($._gval_sep, $._gopts)))),

		boxdepth: ($) =>
			prec.right(seq(alias("boxdepth", "opt"), optional(seq($._gval_sep, $._gopts)))),

		color: ($) => alias("color", "opt"),

		colormap: ($) =>
			prec.right(seq(alias("colormap", "opt"), optional(seq($._gval_sep, $._gopts)))),

		colorsequence: ($) =>
			prec.right(seq(alias("colorsequence", "opt"), optional(seq($._gval_sep, $._gopts)))),

		clip: ($) => prec.right(seq(alias("clip", "opt"), optional(seq($._gval_sep, $._gopts)))),

		cntrlabel: ($) =>
			prec.right(seq(key("cntrlabel", 5, "opt"), optional(seq($._gval_sep, $._gopts_style)))),

		// Generic body (GOPT_KWS rows: linear/cubicspline/bspline/points/order/
		// levels/auto/discrete/incremental/sorted/unsorted/firstlinetype).
		cntrparam: ($) =>
			prec.right(seq(key("cntrparam", 5, "opt"), optional(seq($._gval_sep, $._gopts)))),

		// Generic body (GOPT_KWS rows: vertical/horizontal/invert/user/default/
		// origin/size/front/back/noborder/bdefault/border/cbtics).
		colorbox: ($) =>
			prec.right(seq(key("colorbox", 6, "opt"), optional(seq($._gval_sep, $._gopts_style)))),

		contour: ($) =>
			prec.right(seq(key("contours", 5, "opt"), optional(seq($._gval_sep, $._gopts)))),

		cornerpoles: ($) => key("cornerpoles", 7, "opt"),

		contourfill: ($) =>
			prec.right(seq(alias("contourfill", "opt"), optional(seq($._gval_sep, $._gopts)))),

		dashtype: ($) =>
			prec.left(
				seq(
					alias($.kw_dt, "opt"),
					field("tag", $._expression),
					optional($.dash_opts),
				),
			),

		datafile: ($) =>
			prec.left(
				seq(
					key("datafile", 5, "opt"),
					repeat(
						choice(
							key("columnheaders", -3, "flag", 1),
							key("fortran", 4, "mod"),
							alias("nofpe_trap", "flag"),
							seq(key("missing", 4), field("missing", $._expression)),
							dataSeparator($),
							seq(
								key("commentschars", 3),
								optional(field("srt", $._expression)),
							),
							$.binary_options,
						),
					),
				),
			),

		decimalsign: ($) =>
			prec.right(seq(key("decimalsign", 3, "opt"), optional(seq($._gval_sep, $._gopts)))),

		// Generic body (rows: splines/qnorm/gauss/cauchy/hann/kdensity; `exp`
		// stays an identifier — exp() is a builtin, same rule as int/log)
		dgrid3d: ($) =>
			prec.right(seq(key("dgrid3d", 2, "opt"), optional(seq($._gval_sep, $._gopts)))),

		// Bespoke body: operands are variable NAMES, not option keywords — the
		// generic body's rows shadow short names (`u`, `v`, `t`). Slots may be
		// empty (`set dummy ,v` keeps x) and a trailing comma is accepted;
		// gnuplot 6.0.4 takes any arity (probed up to 6).
		dummy: ($) =>
			prec.right(seq(key("dummy", 2, "opt"), optional(seq($._gval_sep, $._dummy_vars)))),

		// The slot is a NAMED hidden rule so its prec.right reaches the
		// productions: the empty-optional production must lose to shifting the
		// identifier, or `set dummy foo, bar` stops after the comma (the
		// statement-boundary reduce wins by default; inline annotations inside
		// repeat() are dropped during flattening).
		_dummy_vars: ($) =>
			prec.right(
				choice(
					seq($.identifier, repeat($._dummy_slot)),
					repeat1($._dummy_slot),
				),
			),

		_dummy_slot: ($) => prec.right(seq(",", optional($.identifier))),

		// Generic body: encoding names (iso_8859_*, koi8*, cp*, sjis, utf8)
		// parse as identifier items; defaults/locale are existing rows


		// Generic body (rows: logfile min 4 — bare `log` is a builtin —
		// results/brief/errorvariables/covariancevariables/errorscaling/
		// prescale/maxiter/limit/limit_abs/script/v4/v5; quiet/verbose/
		// default rows exist). `start-lambda`/`lambda-factor` parse via the
		// start row / identifier plus a minus-expression — permissive.


		// Generic body (GOPT_KWS rows: polar/layerdefault/front/back/vertical/
		// spiderplot; the (no)?m?<axis>tics family is kw_g_axisflag).
		grid: ($) =>
			prec.right(seq(key("grid", 1, "opt"), optional(seq($._gval_sep, $._gopts_style)))),






		key: ($) =>
			prec.right(seq(key("key", 1, "opt"), optional(seq($._gval_sep, $._gopts_key)))),



		label: ($) =>
			prec.right(
				seq(
					key("label", 3, "opt"),
					optional(prec.dynamic(2, field("tag", $._tag_atom))),
					optional($.label_opts),
				),
			),

		linetype: ($) =>
			prec.right(seq(alias($.kw_lt, "opt"), optional(seq($._gval_sep, $._gopts_style)))),

		link: ($) =>
			repeat1(
				choice(
					alias(choice("x2", "y2"), "axis"),
					seq(alias("via", "kw_fn"), $._expression, "inverse", $._expression),
				),
			),

		loadpath: ($) =>
			prec.right(seq(key("loadpath", 4, "opt"), optional(seq($._gval_sep, $._gopts)))),

		// (the old body's head mistakenly read key("loadpath") — fixed by the
		// generic body: `set locale "en_US"` now parses the string directly)

		logscale: ($) => {
			const axis = choice("x", "y", "z", "x2", "y2", "cb", "r");
			return seq(
				key("logscale", 3, "opt"),
				optional(
					prec.left(
						seq(
							alias(token(repeat1(axis)), "axis"),
							optional(field("base", $._expression)),
						),
					),
				),
			);
		},

		mapping: ($) =>
			prec.right(seq(key("mapping", 3, "opt"), optional(seq($._gval_sep, $._gopts)))),

		margin: ($) =>
			prec.right(
				seq(key1("opt", /(l|r|t|b)?/, reg("margins", 3)), optional(seq($._gval_sep, $._gopts))),
			),

		_margin: ($) =>
			prec.left(
				choice(
					seq(optional(seq(optional(alias("at", "kw_fn")), alias("screen", "coord"))), $._expression),
					seq(
						// recycle code for multiplot
						field("lm", $._expression),
						",",
						field("rm", $._expression),
						",",
						field("bm", $._expression),
						",",
						field("tm", $._expression),
					),
				),
			),

		micro: ($) => prec.right(seq(alias("micro", "opt"), optional(seq($._gval_sep, $._gopts)))),

		monochrome: ($) =>
			prec.left(seq(key("monochrome", 4, "opt"), optional($.line_style))),


		multiplot: ($) =>
			seq(
				key("multiplot", 5, "opt"),
				repeat(
					choice(
						seq(
							key("title", 1),
							field("title", $._expression),
							optional($.fontspec),
							optional(key("enhanced", undefined, "flag", 1)),
						),
						seq(
							"layout",
							field("rows", $._expression),
							",",
							field("cols", $._expression),
						),
						choice(alias("rowsfirst", "mod"), alias("columnsfirst", "mod")),
						choice(alias("downwards", "mod"), alias("upwards", "mod")),
						seq(
							"scale",
							field("xscale", $._expression),
							optional(seq(",", field("yscale", $._expression))),
						),
						offsetPos($),
						seq("margins", alias($._margin, $.margin)), // only the second option
						seq(
							"spacing",
							field("xspacing", $._expression),
							optional(seq(",", field("yspacing", $._expression))),
						),
						alias(choice("previous", "next"), "mod"),
					),
				),
			),

		// `set multiplot … unset multiplot` parsed as one block so editors can
		// fold the region. Opener/closer keep the cmd_set/cmd_unset node names;
		// `multiplot` lives here (and in cmd_show), not in _argument_set_show.
		// Closed form outranks unclosed-block + standalone-unset (prec.dynamic);
		// an unclosed block swallows statements to EOF.
		multiplot_block: ($) =>
			choice(
				prec.dynamic(
					1,
					seq(
						alias($._set_multiplot, $.cmd_set),
						repeat($._statement),
						alias($._unset_multiplot, $.cmd_unset),
					),
				),
				prec.right(
					seq(alias($._set_multiplot, $.cmd_set), repeat($._statement)),
				),
			),

		_set_multiplot: ($) => seq(key("set", 2, "cmd"), $._gval_sep, $.multiplot),

		_unset_multiplot: ($) =>
			seq(key("unset", 3, "cmd"), $._gval_sep, $.multiplot),

		// Generic body (time-unit rows seconds/minutes min 4 — min() is a
		// builtin — hours/days/weeks/months/years; `time` is a mod row (full
		// word), freq exprs are plain items; sec–second abbreviations hit the
		// coord row first)
		mxtics: ($) =>
			prec.right(
				seq(
					key1("opt", "m", K.axes, reg("tics", -1)),
					optional(seq($._gval_sep, $._gopts)),
				),
			),

		// set nonlinear <axis> via f(axis) inverse g(axis)
		nonlinear: ($) =>
			seq(
				key("nonlinear", 5, "opt"),
				alias(K.axes, "axis"),
				alias("via", "kw_fn"),
				$._expression,
				"inverse",
				$._expression,
			),

		// set object <index> <shape> … — generic body (shape words, from/to/rto,
		// arc + range_block, units xx/xy/yy, layer/clip flags, style attrs).
		object: ($) =>
			prec.right(seq(key("object", 3, "opt"), optional(seq($._gval_sep, $._gopts_style)))),


		// set origin <x>,<y>  — lower-left corner of plot within terminal


		overflow: ($) => choice(alias("float", "mod"), "NaN", alias("undefined", "mod")),

		// Generic items plus palette-only structural branches: the `defined`
		// gradient list (parenthesized, not an expression), `file` + datafile
		// modifiers, `model RGB|CMY|HSV` and `viridis` (both keep their
		// dedicated highlight captures). Everything else is a GOPT_KWS row.
		palette: ($) =>
			prec.right(
				seq(
					key("palette", 3, "opt"),
					optional(
						seq(
						$._gval_sep,
						prec.left(
							repeat1(
								choice(
									$._gopt_item,
									prec.right(
										seq(
											alias("file", "arg"),
											field("filename", $._expression),
											optional($.datafile_modifiers),
										),
									),
									seq(key("model", 2), choice("RGB", "CMY", "HSV")),
									"viridis",
								),
							),
						),
					),
				),
			),
		),

		// prec.right settles the dangling label_opts tail. It was a declared
		// conflict, which licensed GLR forking across the whole rule for a
		// single shift/reduce tie; associativity is the narrower tool and is
		// byte-identical on the corpus, the oracle and 16 targeted probes.
		_paxis_label: ($) =>
			prec.right(seq(key("label", 3), optional($.label_opts))),

		paxis: ($) =>
			prec.left(
				seq(
					alias("paxis", "opt"),
					field("axisno", $._expression),
					optional(
						seq(
							key("range", 3),
							$.range_block,
							repeat(
								choice(
									key("reverse", 3, "flag", 1),
									key("writeback", 3, "flag", 1),
									key("extend", 3, "flag", 1),
									"restore",
								),
							),
						),
					),
					optional(seq(key("tics", 3), optional(seq($._gval_sep, $.tics_opts)))),
					optional($._paxis_label),
					optional(offsetPos($)),
				),
			),

		// set pixmap <index> {"filename" | colormap <name>} at <position>
		//            {width <w> | height <h> | size <w>,<h>} {front|back|behind} {center}
		pixmap: ($) =>
			prec.right(seq(key("pixmap", 4, "opt"), optional(seq($._gval_sep, $._gopts)))),

		pm3d: ($) => seq(alias("pm3d", "opt"), optional($._pm3d)),

		_pm3d: ($) =>
			// recycle code for pm3d plot_style
			repeat1(
				choice(
					// `at bst` — the layer letters are CONCATENATED into one word
					// (bottom/surface/top, up to 6). gnuplot rejects the
					// space-separated `at b t`, so this must not be a repeat.
					seq(alias("at", "kw_fn"), alias(token(/[bst]{1,6}/), "mod")),
					seq(
						key("interpolate", 6),
						field("steps", $._expression),
						",",
						field("between", $._expression),
					),
					choice(
						alias(
							/scans(auto(m(a(t(i(c)?)?)?)?)?|forward|backward)/,
							"scanorder",
						),
						seq(key("depthorder", 3), optional("base")),
						key("hidden3d", 2, "flag", 1),
					),
					seq(alias("flush", "arg"), choice("begin", "center", "end")),
					key("ftriangles", undefined, "flag", 1),
					choice(seq("clip", optional(alias("z", "axis"))), "clip1in", "clip4in"),
					key("clipcb", undefined, "flag", 1),
					// splot `with pm3d zclip [min:max]` (6.0): range is MANDATORY
					// ("expecting zclip [min:max]"), open/starred ends accepted;
					// no abbreviation; runtime rejects it in `set pm3d` and demands
					// it be the last with-pm3d option (grammar stays permissive on
					// both, matching the shared-body convention).
					seq("zclip", $.range_block),
					seq(
						"corners2color",
						alias(/(geo|har)?mean|rms|m(edian|in|ax)|c(1|2|3|4)/, "c2c"),
					),
					seq(
						key("lighting", 5, "flag", 1),
						repeat(
							choice(
								seq("primary", field("fraction", $._expression)),
								// probed 6.0.4 minima: spec(ular) 4; primary and spec2
								// are full-word only (p/pr/pri/prim and sp2/spe2 all
								// rejected). `spec2` outlasts the 4-char `spec` match
								// by token length, so the two never collide.
								seq(key("specular", 4), field("fraction", $._expression)),
								seq("spec2", field("fraction", $._expression)),
							),
						),
					),
					seq(
						key("spotlight", 4, "arg"),
						repeat(
							choice(
								seq(key("rgbcolor", 3), field("color", $._expression)),
								seq("rot_x", field("angle", $._expression)),
								seq("rot_z", field("angle", $._expression)),
								seq("Phong", field("exponent", $._expression)),
								"default",
							),
						),
					),
					seq(
						key("border", undefined, "flag", 1),
						optional("retrace"),
						optional($.style_opts),
					),
					choice(alias("implicit", "mod"), alias("explicit", "mod")),
					"map",
				),
			),

		pointintervalbox: ($) =>
			prec.right(seq(key("pointintervalbox", 8, "opt"), optional(seq($._gval_sep, $._gopts)))),

		pointsize: ($) =>
			prec.right(seq(key("pointsize", 3, "opt"), optional(seq($._gval_sep, $._gopts)))),

		// `set polar grid …` — generic body (kernel words share the dgrid3d
		// rows; theta/r + range_blocks and scale exprs are plain items)
		polar: ($) =>
			prec.right(seq(alias("grid", "mod"), optional(seq($._gval_sep, $._gopts)))),






		// Selector heads keep their st_opt alias (colour); tails are generic.
		// data/function/line/ellipse keep structural tails (plot_style,
		// line_style, ellipse are shared with plot commands). `set style fill`
		// reaches the bare $._gopts_style branch via the KW_FS style token.
		style: ($) =>
			prec.left(
				1,
				seq(
					key("style", 2, "opt"),
					// gated like every other option body: without it the parser can
					// reduce an empty body mid-line and let the next word start a
					// command, so `set style l 1` read `l` as `load`
					optional(
						seq(
						$._gval_sep,
						choice(
							seq(key("arrow", 3, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(alias("boxplot", "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							// data also takes the generic errorbar/errorline names,
							// which resolve to yerrorbars/yerrorlines at runtime and
							// are rejected by `set style function` ("style not usable
							// for function plots"). Probed minima: e(rrorbars) 1,
							// errorl(ines) 6.
							seq(
								key("data", 1, "st_opt"),
								choice(
									$.plot_style,
									key("errorbars", 1, "plt_st"),
									key("errorlines", 6, "plt_st"),
								),
							),
							seq(key("function", 1, "st_opt"), $.plot_style),
							seq(key("histogram", 4, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(key("line", 1, "st_opt"), $.line_style),
							seq(key("circle", -2, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(key("rectangle", 4, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(key("ellipse", 3, "st_opt"), optional($.ellipse)),
							seq(key("parallelaxis", -4, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(key("spiderplot", 6, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(alias("textbox", "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(key("watchpoint", 5, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							// `set style fill …` — KW_FS head + structural fill_style.
							// NOT a bare $._gopts_style branch: that would make tier
							// tokens valid right after `set style`, letting GOPT rows
							// (function/rectangle/…) steal the selector heads.
							fillStyleOpt($),
						),
						),
					),
				),
			),

		ellipse: ($) =>
			repeat1(
				choice(
					seq("units", alias(choice("xx", "xy", "yy"), "units_opt")),
					seq("size", $.position, optional(seq(",", $.position))),
					field("angle", seq("angle", $._expression)),
					key("clip", undefined, "flag", 1),
				),
			),


		table: ($) =>
			prec.right(
				seq(
					key("table", 2, "opt"),
					repeat(
						choice(
							choice($.string_literal, $.datablock),
							"append",
							dataSeparator($),
						),
					),
				),
			),

		terminal: ($) =>
			prec.right(
				seq(
					key("terminal", 1, "opt"),
					optional(choice(
						// _gval_sep gates the body to the same (continued) line,
						// so a next-line `reset`/`raise` stays a command
						seq(alias(TERM_NAME, "name"), optional(seq($._gval_sep, $.t_opts))),
						"push",
						"pop",
					)),
				),
			),

		// Terminal options (the 2026-06 terminal merge collapsed 32 terminal
		// name tokens into one TERM_NAME and 30 t_* rules into one body; the
		// generic-body conversion then moved the option keywords into GOPT_KWS
		// scanner rows — see the terminal section there for which words are
		// deliberately absent and why). `size a4` (B15) parses via the
		// identifier fallback; unit-suffixed sizes (10cm) lex inside `number`.
		// t_opts IS the shared style body: a separate rule (even with identical
		// items) duplicates the whole expression sub-automaton for its states —
		// measured +0.97 MB / +415 states vs this alias. The terminal-only
		// keepers live in _gopts_style itself; the permissiveness cost (those
		// words become valid in every style body) is the usual generic-body
		// tradeoff and is bounded by the same-line _gval_sep gates.
		t_opts: ($) => $._gopts_style,

		// shared terminal options ----------------------------------------
		// canvas_size/_size/fontscale were dropped with the t_opts generic
		// conversion: `size`/`scale`/`fontscale` are GOPT_KWS rows, so those
		// branches could never lex again (the external scanner wins).
		mono_color: ($) =>
			choice(key("monochrome", 4), key("color", 3), key("colour", 3, "color")),
		line_drawing_method: ($) => choice(key("rounded", -2, "mod"), alias("butt", "mod"), alias("square", "mod")),
		background: ($) =>
			choice(
				// Both `background rgb "gray75"` and the bare `background
				// "#ffffff"` are accepted, so the value is a colorspec OR a
				// plain expression.
				seq(key("background", 5), field("color", choice($.colorspec, $._expression))),
				key("nobackground", 7),
				key("transparent", 5, "flag", 1), // NOTE: some need 6 instead of 5
			),
		// ----------------------------------------------------------------


		tics: ($) => seq($._gval_sep, $.tics_opts),



		title: ($) =>
			prec.right(seq(key("title", 3, "opt"), optional(seq($._gval_sep, $._gopts_style)))),

		vgrid: ($) => seq($.datablock, optional(seq("size", $._expression))),

		// `set view` positional slots may be EMPTY (`,,0.5`, `60,,,1.5`, bare
		// trailing commas) — gnuplot keeps the previous value for each skipped
		// slot. Any comma-bearing form goes through _view_angles (dynamic prec
		// wins the full-slot overlap with the _gopts expression chain); keyword
		// forms (map/equal/azimuth/projection) and comma-less `set view 60`
		// stay in the generic body. Angles and keywords do NOT mix (probed:
		// `set view 60,30 equal xy` is rejected by 6.0.4).
		view: ($) => seq($._gval_sep, choice($._view_angles, $._gopts)),

		// Named slot rule for the same reason as _dummy_slot: the empty-slot
		// production must lose to shifting an expression after a comma.
		_view_angles: ($) =>
			prec.dynamic(1, seq(optional($._expression), repeat1($._view_slot))),

		// Trade-off: after a TRAILING comma an identifier on the next line is
		// swallowed as a slot value (`set view 60,` + `w = 1`); the reverse
		// choice would break same-line identifier angles (`set view rx, rz`).
		_view_slot: ($) => prec.right(seq(",", optional($._expression))),


		xdata: ($) =>
			seq(key1("opt", K.axes, reg("data", 2)), optional(key("time", 1))),

		xdtics: ($) => key1("opt", K.axes, "d", reg("tics", -1)),

		xlabel: ($) =>
			// Generic style body: label text is a plain expression item;
			// offset/rotate-by/textcolor/font/enhanced arrive via style_opts,
			// `parallel` via its row
			seq(
				key1("opt", K.axes, reg("label", 3)),
				optional(seq($._gval_sep, $._gopts_style)),
			),

		xmtics: ($) => key1("opt", K.axes, "m", reg("tics", -1)),

		xrange: ($) =>
			seq(
				key1("opt", K.axes, reg("range", 3)),
				repeat(
					choice(
						$.range_block,
						key("reverse", 3, "flag", 1),
						key("writeback", 3, "flag", 1),
						key("extend", 3, "flag", 1),
						"restore",
					),
				),
			),

		xtics: ($) =>
			// "opt" tier: as a set/show/unset option head, <axis>tics is an
			// option name like any other (body occurrences — grid, autoscale —
			// keep the kw_g_axisflag "flag" tier)
			prec.left(
				seq(
					// probed 6.0.4: `set xti 5` is accepted, `set xt 5` is rejected.
					// The m/d/xm variants have their own minima and are left alone.
					key1("opt", K.axes, reg("tics", 2)),
					optional(seq($._gval_sep, $.tics_opts)),
				),
			),

		xyplane: ($) =>
			prec.right(seq(key("xyplane", 3, "opt"), optional(seq($._gval_sep, $._gopts)))),


		zeroaxis: ($) =>
			seq(key1("opt", K.zaxes, reg("zeroaxis", 5)), optional($.style_opts)),

		cmd_show: ($) =>
			seq(
				key("show", 2, "cmd"),
				optional(
					seq(
						$._gval_sep,
						choice(
							$._argument_set_show,
							$.multiplot,
							key("colornames", 6, "opt"),
							key("functions", 3, "opt"),
							key("plot", 1, "opt"),
							// `show variables` — bare, `all` (include GPVAL_*), or a name
							// prefix. The _gval_sep gate keeps the operand same-line, so an
							// identifier on the next line starts a fresh statement.
							seq(
								key("variables", 1, "opt"),
								optional(
									seq($._gval_sep, choice(alias("all", "mod"), $.identifier)),
								),
							),
							seq(key("version", 2, "opt"), optional(key("long", 1))),
						),
					),
				),
			),

		cmd_splot: ($) =>
			seq(
				alias($.cmd_splot_kw, "cmd"),
				optional(
					seq($._gval_tail, optional("sample"), sep(",", $.plot_element)),
				),
			),

		cmd_stats: ($) =>
			seq(
				alias("stats", "cmd"),
				optional(
					seq(
						$._gval_tail,
						field("ranges", repeat($.range_block)),
						field("filename", $._expression),
						optional($.datafile_modifiers),
						repeat(
							choice(
								// `name` and `prefix` are synonyms in gnuplot 6.0, valid on both
								// stats forms. The field was previously declared only on a
								// `"$vgridname"` branch — a doc placeholder no real input can
								// reach, since a voxel grid name lexes as `datablock` — so
								// node-types.json advertised a cmd_stats.name that no parse
								// ever produced. Declaring it here matches the reachable shape.
								seq(choice("name", "prefix"), field("name", $._expression)),
								key("output", 3, "flag", 1),
							),
						),
					),
				),
			),

		cmd_system: ($) =>
			seq(
				alias(choice("system", "!"), "cmd"),
				optional(seq($._gval_sep, $._expression)),
			),

		cmd_test: ($) =>
			prec.left(
				seq(
					alias("test", "cmd"),
					optional(
						seq($._gval_sep, choice("palette", alias("terminal", "mod"))),
					),
				),
			),

		cmd_undefine: ($) =>
			seq(
				key("undefine", 3, "cmd"),
				repeat(token.immediate(UNDEFINE_ARG)),
			),

		cmd_unset: ($) =>
			seq(
				key("unset", 3, "cmd"),
				optional(
					seq($._gval_sep, optional($.for_block), $._argument_set_show),
				),
			),

		cmd_vfill: ($) =>
			seq(
				alias(/vg?fill/, "cmd"),
				optional(
					seq($._gval_tail, optional("sample"), sep(",", $.plot_element)),
				),
			),

		cmd_while: ($) =>
			seq(
				"while",
				optional(
					seq(
						$._gval_sep,
						$.parenthesized_expression,
						surround("{}", repeat($._statement)),
					),
				),
			),

		//-------------------------------------------------------------------------

		range_block: ($) => $._range_block,

		_range_block: ($) =>
			// Ranges / array / substring: [lo], [lo:hi], [:hi], [lo:], [:],
			// [lo:hi:inc], [lo:hi:] — every bound optional, `*` = autoscale.
			surround(
				"[]",
				optional(
					seq(
						optional(choice($.assignment, $._expression, "*")),
						optional(
							seq(
								":",
								optional(choice($._expression, "*")),
								optional(seq(":", optional($._expression))),
							),
						),
					),
				),
			),

		for_block: ($) =>
			// Single or nested: `for [i=1:5]`, `for [s in "a b"]`, `for [..] for [..]`.
			prec.right(
				repeat1(
					seq(
						"for",
						surround(
							"[]",
							choice(
								seq(field("start", $.identifier), "in", $._expression),
								seq(
									field("start", $.assignment),
									":",
									field("end", choice($._expression, "*")),
									optional(seq(":", field("increment", $._expression))),
								),
							),
						),
					),
				),
			),

		//-------------------------------------------------------------------------
		// Data/file handling (datafile_modifiers, using, every, index)
		//-------------------------------------------------------------------------
		datafile_modifiers: ($) =>
			repeat1(
				choice(
					$.binary_options,
					$.matrix_options,
					$._i_e_u_directives,
					seq("skip", field("skip_lines", $._expression)),
					alias(choice("convexhull", "concavehull"), $.hull),
					seq("expand", field("increment", $._expression)),
					field("smooth_data", $.smooth_options),
					field("bins", $._bins),
					// text-matrix header labels (6.0): runtime requires `matrix` to
					// appear first, but they are otherwise free datafile modifiers
					// (probed: `matrix every 2 columnheaders` is legal, `columnheaders
					// matrix` is not — order left to runtime). Minima: columnhead /
					// rowhead; not valid with binary matrix (runtime conflict).
					key("columnheaders", -3),
					key("rowheaders", -3),
					"mask",
					// 6.0 filter, full-word only, no argument; plot-only at runtime
					// (splot rejects it) and accepted on function plots too.
					"sharpen",
					"volatile",
					"zsort",
					"noautoscale",
				),
			),

		binary_options: ($) =>
			prec.left(
				seq(
					"binary",
					choice(
						// binary general
						repeat1(
							choice(
								seq(choice("record", "format"), "=", field("opt", $._expression)),
								// rotate=<angle> takes an optional unit suffix (probed 6.0.4):
								// any prefix of "degrees" down to bare "d" (90deg, 90d), or
								// "pi" (0.5pi); unit may be detached (`45 deg`) or follow a
								// parenthesized expr (`(45)deg`). Bare value = radians.
								seq(
									"rotate",
									"=",
									choice(
										// unit binds only to a simple value (probed shapes:
										// 90deg, 0.5pi, (45)deg, -45deg); a bare full
										// expression stays radians. Restricting the pre-unit
										// expression keeps the unit follow set off the shared
										// expression machine (a full $._expression here clones
										// the whole expression sub-automaton: +564 states).
										prec(1, seq(
											field("opt", choice(
												$.number,
												$.parenthesized_expression,
												// non-recursive signed form; CST matches real
												// unary_expression for these shapes
												alias(seq(alias(/[-+]/, $.operator), choice($.number, $.parenthesized_expression)), $.unary_expression),
											)),
											field("unit", choice(key("degrees", 1), alias($.unit_pi, "pi"))),
										)),
										field("opt", $._expression),
									),
								),
								seq(alias(choice("dx", "dy", "dz", "skip"), "attr"), "=", field("opt", sep(":", $._expression))),
								// perpendicular requires a 3-tuple at runtime (`perpendicular=1`
								// → "Invalid numeric or tuple form"), so tuple-only here.
								seq(alias("perpendicular", "attr"), "=", field("opt", $.parameter_list)),
								// array RHS per record: tuple `(10,10)`, bare integer `10`, or
								// NxM dims `10x20` / `10x2x3` (probed: identifiers/expressions
								// are only legal inside parens — `array=Nx20` is rejected);
								// multiple records separated by `:` in any mix.
								seq("array", "=", field("opt", sep(":", choice($.parameter_list, $.number, alias(token(/\d+(x\d+)+/), $.number))))),
								seq(choice("origin", "center"), "=", field("opt", sep(":", $.parameter_list))),
								seq("filetype", "=", field("filetype", $.identifier)),
								seq(alias("scan", "attr"), "=", field("scan", $.identifier)),
								seq(key("endian", 3), "=", field("endian", choice("little", "big", "default", "swap", "swab", "middle", "pdp"))),
								"flipx",
								"flipy",
								"flipz",
								"transpose",
							),
						),
						$.matrix_options,
					),
				),
			),

		matrix_options: ($) =>
			choice(
				"matrix",
				seq("nonuniform", "matrix"),
				seq(
					"sparse",
					"matrix",
					"=",
					surround(
						"()",
						field("cols", $._expression),
						",",
						field("rows", $._expression),
					),
					optional(
						field(
							"origin",
							seq(
								"origin",
								"=",
								surround("()", $._expression, ",", $._expression),
							),
						),
					),
					optional(seq("dx", "=", field("dx", $._expression))),
					optional(seq("dy", "=", field("dy", $._expression))),
				),
			),

		smooth_options: ($) =>
			seq(
				alias("smooth", "attr"),
				repeat(
					choice(
						alias("unique", "mod"),
						alias("frequency", "mod"),
						alias("fnormal", "mod"),
						alias("cumulative", "mod"),
						alias("cnormal", "mod"),
						// probed 6.0.4 minima by resolution: `smooth cs` and `smooth acs` produce
						// output byte-identical to the full words and distinct from bezier.
						key("csplines", 2, "mod"),
						key("acsplines", 3, "mod"),
						// probed 6.0.4 minimum: mcs (3); every longer prefix accepted.
						key("mcsplines", 3, "mod"),
						alias("path", "mod"),
						alias("bezier", "mod"),
						alias("sbezier", "mod"),
						seq(
							alias("kdensity", "mod"),
							optional(
								seq(
									alias(choice("bandwidth", "period"), "attr"),
									field("bandwidth_period", $._expression),
								),
							),
						),
						alias("unwrap", "mod"),
					),
				),
			),

		_bins: ($) =>
			prec.right(
				repeat1(
					choice(
						seq(alias("bins", "attr"), optional(seq("=", $._expression))),
						seq(alias("binrange", "attr"), $.range_block),
						seq(alias("binwidth", "attr"), "=", $._expression),
						seq(
							alias("binvalue", "attr"),
							optional(seq("=", choice(alias("sum", "mod"), alias("avg", "mod")))),
						),
					),
				),
			),

		style_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						$._sa,
						seq(
							$._lt,
							field(
								"lt",
								choice($._expression, $.colorspec, "black", "bgnd", "background", alias("nodraw", "mod")),
							),
						),
						$._sa,
						$._linecolor,
						seq($._dt, field("dt", $.dash_opts)),
						seq($._pt, field("pt", choice("variable", $._expression))),
						seq($._ps, field("ps", choice("variable", $._expression))),
						$._sa,
						$._sa,
						$._sa,
						seq($._fs, field("fs", $.fill_style)),
						$._fillcolor,
						key("nohidden3d", -2, "flag"),
						alias("nocontours", "flag"),
						key("nosurface", 6, "flag"),
						key("palette", 3),
						$.fontspec,
						key("enhanced", 3, "flag", 1),
						choice(alias(K.c, "cen"), alias(K.l, "lef"), alias(reg("right", 2), "rig")),
						seq(key("rotate", 3, "flag", 1), optional(choice(seq(alias("by", "kw_fn"), $._expression), "variable"))),
						offsetPos($),
						$._textcolor,
					),
				),
			),

		arrow_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						$.style_opts,
						alias(/(no|back)?heads?/, "head"),
						seq("size", $.position),
						alias("fixed", "mod"),
						choice("filled", "empty", "nofilled", alias("noborder", "flag")),
						choice("front", "back"),
					),
				),
			),

		dash_opts: ($) =>
			choice(
				$._expression,
				"solid",
				surround(
					"()",
					sep(
						",", // NOTE: only 4 repeats allowed
						seq(
							field("solid", $._expression),
							",",
							field("empty", $._expression),
						),
					),
				),
			),

		label_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						prec.dynamic(1, field("label", $._expression)),
					field("at", atPos($)),
					choice(alias(K.c, "cen"), alias(K.l, "lef"), alias(K.r, "rig")),
					seq(
						key("rotate", 3, "flag", 1),
						optional(
							choice(
								seq(alias("by", "kw_fn"), field("angle", $._expression)),
								key("variable", 3),
							),
						),
					),
					$.fontspec,
					key("enhanced", undefined, "flag", 1),
					choice("front", "back"),
					$._textcolor,
					choice(seq("point", field("point", $.line_style)), alias("nopoint", "flag")),
					field("offset", offsetPos($)),
					seq(
						key("boxed", -2, "flag", 1),
						optional(field("boxstyle", seq(alias("bs", "arg"), $._expression))),
					),
					alias("hypertext", "flag"),
				),
				),
			),

		// Tics options are the shared style body (same alias-don't-clone rule
		// as t_opts): sub-keywords live as GOPT_KWS rows (tics section);
		// rotate/enhanced/offset/justify/font/textcolor arrive via style_opts.
		// `in`/`out` and bare l/r/c justify letters degrade to identifier items
		// (no rows: common variable names / for-loop keyword). start,incr,end
		// chains are _gexprs — a mid-chain time unit (`"start", 1 month, "end"`)
		// resumes via the mod branch's comma tail; `("label" pos level, ...)`
		// lists are `tuple`.
		tics_opts: ($) => $._gopts_style,

		// `set style line 1` is a complete command: gnuplot defines the style
		// with its defaults. The attribute list is therefore optional after a
		// tag, and the two shapes are spelled out rather than made optional
		// separately so the rule can never match nothing at all.
		line_style: ($) => {
			const attr = choice(
				key("default", 3),
				seq(
					$._lt,
					choice($._expression, $.colorspec, "black", "bgnd", "background", alias("nodraw", "mod")),
				),
				$._linecolor,
				$._sa,
				seq($._pt, $._expression),
				seq($._ps, $._expression),
				seq($._dt, $.dash_opts),
				key("palette", 3),
			);
			return prec.left(
				choice(
					seq(field("tag", $._expression), repeat(attr)),
					repeat1(attr),
				),
			);
		},

		fill_style: ($) =>
			prec.left(
				repeat1(
					choice(
						choice(
							"empty",
							seq(
								optional(key("transparent", 5)),
								key("solid", 1),
								optional(field("density", $._expression)),
							),
							seq(
								optional(key("transparent", 5)),
								key("pattern", 3),
								optional(field("n", $._expression)),
							),
						),
						seq(
							key("border", 2, "flag", 1),
							optional(seq(optional($._lt), $._expression)),
							optional($._linecolor),
						),
					),
				),
			),

		// `font` takes a value, so it is an option-body suboption name (`arg`),
		// not a toggle. The scanner matches the literal text, not the alias, so
		// the _gval_bind refusal for `font` is unaffected.
		fontspec: ($) => seq(alias("font", "arg"), field("font", $._expression)),

		_linecolor: ($) =>
			seq($._lc, field("lc", choice($._expression, $.colorspec))),

		_textcolor: ($) =>
			seq(
				$._tc,
				field(
					"tc",
					choice(
						$.colorspec,
						seq($._lt, $._expression),
						$._sa,
						"default",
						$._expression,
						"variable",
					),
				),
			),

		_fillcolor: ($) =>
			seq(
				$._fc,
				field(
					"fc",
					choice(
						$.colorspec,
						seq($._lt, $._expression),
						$._sa,
						$._expression,
					),
				),
			),

		colorspec: ($) =>
			// p. 57
			prec.left(
				1,
				choice(
					seq(key("rgbcolor", 3), choice($._expression, "variable")),
					seq(
						key("palette", 3),
						optional(
							choice(
								seq("frac", field("val", $._expression)),
								seq(alias("cb", "axis"), field("val", $._expression)),
								alias("z", "axis"),
							),
						),
					),
					key("variable", 3),
					"bgnd",
					"black",
					"background",
				),
			),

		_i_e_u_directives: ($) => choice($.index, $.every, $.using),

		index: ($) =>
			prec.left(
				seq(
					key("index", 1, "attr"),
					seq(
						field("start_name", $._expression),
						optional(
							seq(
								":",
								field("end", $._expression),
								optional(seq(":", field("step", $._expression))),
							),
						),
					),
				),
			),

		every: ($) =>
			prec.left(
				seq(
					alias("every", "attr"),
					optional(
						seq(
							optional(field("point_incr", $._expression)),
							optional(
								seq(
									":",
									optional(field("block_incr", $._expression)),
									optional(
										seq(
											":",
											optional(field("start_point", $._expression)),
											optional(
												seq(
													":",
													optional(field("start_block", $._expression)),
													optional(
														seq(
															":",
															optional(field("end_point", $._expression)),
															optional(
																seq(
																	":",
																	optional(field("end_block", $._expression)),
																),
															),
														),
													),
												),
											),
										),
									),
								),
							),
						),
					),
				),
			),

		using: ($) =>
			field(
				"using",
				// prec.right binds the trailing scanf string into `using` as
				// `format:`. Previously a declared conflict, which resolved the
				// other way inside `set palette file` and left the string as a
				// palette body item — gnuplot treats it as the using format, so
				// that tree was wrong. Every non-palette `using` form is
				// unchanged; the four affected inputs are pinned in
				// test/corpus/datafile_using.txt.
				prec.right(seq(
					key("using", 1, "attr"),
					sep(":", choice(
						surround("()", sep(",", choice($.assignment, $._expression))),
						$._expression,
					)),
					// Optional trailing scanf format string: `using 1:($2+$3) '%lf,%lf,%lf'`
					// (gnuplot 6 docs p.138-139). The format-only form `using "%lf"`
					// is already covered by the string as the sole entry above.
					optional(field("format", $.string_literal)),
				)),
			),

		position: ($) =>
			prec.left(
				seq(
					optional($.system),
					field("x", $._expression),
					optional(
						seq(
							",",
							optional($.system),
							field("y", $._expression),
							optional(seq(",", optional($.system), field("z", $._expression))),
						),
					),
				),
			),

		// Coordinate systems — all aliased to one `coord` node (capture taxonomy:
		// @keyword.directive). Adding a coord keyword needs no highlights.scm edit.
		system: (_) =>
			choice(
				key("first", 3, "coord"),
				key("second", 3, "coord"),
				key("graph", 2, "coord"),
				key("screen", 2, "coord"),
				key("character", 4, "coord"),
				alias("polar", "coord"), // v6 not in docs but in examples
			),

		//-------------------------------------------------------------------------
		// Expressions
		//-------------------------------------------------------------------------
		_expression: ($) =>
			prec.left(
				choice(
					$.identifier,
					$.function,
					$.array,
					$.subscript,
					$.datablock,
					$.number,
					$.complex,
					$.string_literal,
					$.sum_block,
					$.parenthesized_expression,
					$.unary_expression,
					$.binary_expression,
					$.ternary_expression,
				),
			),

		// label tags are always integers or identifiers, never strings — keeping strings
		// out avoids a real LALR conflict with label_opts which also starts with string_literal.
		_tag_atom: ($) =>
			choice(
				$.number,
				$.unary_expression,
				$.identifier,
			),

		number: (_) => {
			const hex_literal = seq(choice("0x", "0X"), /[\da-fA-F](_?[\da-fA-F])*/);
			const octal_literal = seq(choice("0o", "0O"), /[0-7](_?[0-7])*/);
			const decimal_digits = /\d(_?\d)*/;
			const signed_integer = seq(optional(choice("-", "+")), decimal_digits);
			const exponent_part = seq(choice("e", "E"), signed_integer);
			const decimal_integer_literal = choice(
				"0",
				seq(
					optional("0"),
					/[1-9]/,
					optional(seq(optional("_"), decimal_digits)),
				),
			);

			const decimal_literal = choice(
				seq(
					decimal_integer_literal,
					".",
					optional(decimal_digits),
					optional(exponent_part),
				),
				seq(".", decimal_digits, optional(exponent_part)),
				seq(decimal_integer_literal, exponent_part),
				decimal_digits,
			);
			// Optional ATTACHED unit suffix (10cm, 3.0in): replaces the old
			// canvas_size unit handling for `set term ... size 10cm,5in`.
			// Folded into the number token (not a separate item/token) — a
			// standalone unit word or a value-level choice both measured badly
			// (boundary misparse / state split). Permissive: a suffixed
			// number lexes everywhere, not just in size values.
			// "pi" joins the size units for `binary rotate=0.5pi` (attached
			// multiplier form): at expression position the external style
			// scanner's KW_SA "pi" (pointinterval) is not a valid symbol, so
			// the folded token lexes cleanly; the detached form (`rotate=0.5
			// pi`) stays scanner-blocked in plot contexts (KW_SA wins there).
			const unit = choice("cm", "in", "inch", "mm", "pt", "pc", "bp", "dd", "cc", "pi");
			return token(
				seq(choice(decimal_literal, hex_literal, octal_literal), optional(unit)),
			);
		},

		complex: ($) =>
			surround(
				"{}",
				field("Re", $._expression),
				",",
				field("Im", $._expression),
			),

		// Alt design: scanner-based string tokens (_string_start/_content/_end);
		// the inline format_specifier below works, so the scanner path isn't needed.
		string_literal: ($) =>
			choice(
				seq(
					'"',
					repeat(
						choice(
							token.immediate(prec(1, /[^"\\%\n]+/)),
							$.escape_sequence,
							$.format_specifier,
							token.immediate(prec(0, /%/)), // bare % not starting a specifier
						),
					),
					token.immediate('"'),
				),
				seq(
					"'",
					repeat(
						choice(
							token.immediate(prec(1, /[^'%\n]+/)),
							$.format_specifier,
							token.immediate(prec(0, /%/)), // bare % not starting a specifier
						),
					),
					token.immediate("'"),
				),
			),

		escape_sequence: (_) =>
			token.immediate(
				// \uXXXX (UTF-16) and \UXXXXXXXX (UTF-32) unicode escapes (4–8 hex),
				// octal \NNN, hex \xHH, named (\n \t …), line continuation, or \<char>.
				/\\(?:[ \t]*\n|[\\'"nrtab]|\d{3}|x[0-9a-fA-F]{2}|[uU][0-9a-fA-F]{4,8}|.)/
			),

		format_specifier: (_) =>
			token.immediate(
				// printf + gnuplot-specific (%t %T %l %L %S %n %r %k %K) + the C scanf
				// read-formats used in `using`: length modifiers (%lf), skip (%*lf),
				// and scansets with width (%*20[^\n]).
				/%%|%[-+0 #*]*\d*(?:\.\d+)?(?:\[[^\]]*\]|uchar|int|float|(?:hh|ll|[hlLjztq])?[a-zA-Z])/
			),

		sum_block: ($) =>
			prec.left(
				seq(
					alias("sum", "kw_fn"),
					surround("[]", $.identifier, "=", $._expression, ":", $._expression),
					$._expression,
				),
			),

		parenthesized_expression: ($) =>
			prec(PREC.PAREN, surround("()", $._expression)),

		unary_expression: ($) =>
			choice(
				...[
					// +/- merged into one regex token; identical pattern in the
					// binary PLUS row below dedups to the SAME lexer token, so
					// unary and binary +/- share it (−1 token, CST unchanged:
					// alias keeps node type `operator` with the matched text)
					[/[-+]/, PREC.UNARY],
					["~", PREC.BIT_NOT],
					["!", PREC.UNARY],
				].map(([operator, precedence]) =>
					prec.left(
						precedence,
						seq(alias(operator, $.operator), $._expression),
					),
				),
				prec.left(PREC.POWER, seq($._expression, alias("!", $.operator))),
				prec.left(
					PREC.UNARY,
					seq(alias("$", $.operator), choice($.number, token.immediate("#"))),
				),
				// `|A|` is cardinality (array/datablock element count), NOT absolute
				// value: gnuplot 6 rejects `|-5|` as an invalid expression and
				// `|x|` on a scalar as "cardinality of a scalar variable".
				prec.left(PREC.UNARY, surround(alias("|", $.operator), $._expression)),
			),

		binary_expression: ($) =>
			choice(
				...[
					// Same-precedence operator groups merged into single regex
					// tokens (parser-size/generate-RAM lever: each distinct
					// token appears in ~4-5k expression-tail states). Longer
					// alternatives first (maximal munch). NOT merged: `*`
					// (ranges/array decl), `<<`/`>>` (`<<` shared with
					// def_datablock), `^`/`|` (`|` doubles as unary cardinality),
					// `&&`/`||` (different precedence — merge changes parses).
					["**", PREC.POWER],
					["*", PREC.TIMES],
					[/[\/%]/, PREC.TIMES],
					[/[-+]/, PREC.PLUS],
					[/==|!=|<=|>=|<|>/, PREC.COMPARE],
					[">>", PREC.SHIFT],
					["<<", PREC.SHIFT],
					["&", PREC.BIT_AND],
					["^", PREC.BIT_OR],
					["|", PREC.BIT_OR],
					["&&", PREC.AND],
					["||", PREC.OR],
					// comma/"serial" intentionally NOT a binary operator (would
					// conflict with argument lists and range syntax)
					[".", PREC.CONCAT],
				].map(([operator, precedence]) =>
					prec.left(
						precedence,
						seq($._expression, alias(operator, $.operator), $._expression),
					),
				),
				...[
					// eq/ne merged; regex (not strings) opts out of keyword
					// extraction — safe: the op token is only expected in
					// after-expression states where identifier is not valid,
					// and maximal munch keeps `equals`/`next` as identifiers
					[/eq|ne/, PREC.COMPARE],
				].map(([operator, precedence]) =>
					prec.left(
						precedence,
						seq($._expression, alias(operator, $.keyword_op), $._expression),
					),
				),
			),

		ternary_expression: ($) =>
			prec.left(
				PREC.TERNARY,
				seq(
					field("condition", choice($.assignment, $._expression)),
					alias("?", $.ternary_op),
					field("true", choice($.assignment, $._expression)),
					alias(":", $.ternary_op),
					field("false", choice($.assignment, $._expression)),
				),
			),

		identifier: (_) => token(IDENTIFIER),

		array: ($) =>
			prec(
				1,
				seq(
					field("name", $.identifier),
					surround("[]", $._expression),
					// note: no range form — array name[expr] only, not name[lo:hi]
				),
			),

		subscript: ($) =>
			prec(
				2,
				seq(
					choice($.identifier, $.string_literal),
					"[",
					optional(choice($._expression, "*")),
					":",
					optional(choice($._expression, "*")),
					"]",
				),
			),

		datablock: (_) => token(seq("$", IDENTIFIER)),

		function: ($) =>
			prec(
				1,
				seq(field("name", $.identifier), field("parameters", $.parameter_list)),
			),

		parameter_list: ($) => surround("()", sep(",", $._expression)),

		comment: ($) => seq("#", alias(token(/.*(\\\s*\n.*)*/), $.comment_content)),
	},
});

//---------------------------------------------------------------------------
// Helper functions (list/bracket builders + keyword abbreviation system)
//---------------------------------------------------------------------------
function sep(separator, rule, rep = 0, assoc = "") {
	const repeatedRule =
		rep === 0 ? repeat(seq(separator, rule)) : repeat1(seq(separator, rule));

	const associatedRule =
		assoc === "l"
			? prec.left(repeatedRule)
			: assoc === "r"
				? prec.right(repeatedRule)
				: repeatedRule;

	return seq(rule, associatedRule);
}

function surround(bracket, ...rules) {
	const brackets = {
		"()": ["(", ")"],
		"[]": ["[", "]"],
		"{}": ["{", "}"],
	};

	const [open, close] = brackets[bracket] || [bracket, bracket];
	return seq(open, ...rules, close);
}
// keyword
// Choice items shared by _gopts_style and _gopts_key: everything the generic
// style body accepts beyond _gopt_item and the per-axis tics family.
// Terminal-flavored keepers (t_opts = these rules): words deliberately
// without GOPT_KWS rows — structured values, command collisions
// (reset/raise), common variable names.
function gopts_style_extras($) {
	return [
		prec.right(seq($.style_opts, optional(seq(",", $.style_opts)))),
		$.background,
		$.mono_color,
		$.line_drawing_method,
		seq("position", $.position),
		seq("name", $._expression),
		key("eps", undefined, "mod"),
		key("reset", undefined, "mod"),
		key("raise", undefined, "flag", 1),
		key("input", undefined),
		seq(
			key("animate", undefined),
			repeat(choice(
				seq(alias("delay", "arg"), $._expression),
				seq(alias("loop", "arg"), $._expression),
				seq(alias("quality", "arg"), $._expression),
			)),
		),
		key("noanimate", undefined, "flag"),
	];
}

function key1(aka, ...reg) {
	const regStr = reg.map((reg) => (reg instanceof RegExp ? reg.source : reg));
	return alias(new RegExp(regStr.join("")), aka);
}

function key(word, minChar = word.length, aka = word, opt = 0) {
	return alias(reg(word, minChar, opt), aka);
}

// regex
function reg(word, minChar = word.length, opt = 0) {
	const regexPattern =
		word.slice(0, minChar) +
		word
			.slice(minChar)
			.split("")
			.map((char) => `(${char}`)
			.join("") +
		")?".repeat(word.slice(minChar).length);
	return opt === 0
		? new RegExp(regexPattern)
		: opt === 1
			? new RegExp(`(no)?${regexPattern}`)
			: new RegExp(`${regexPattern}|${opt}`);
}
