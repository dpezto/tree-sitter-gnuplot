/*
 * @file Gnuplot grammar for tree-sitter.
 * @author Dai López Jacinto <dpezto@gmail.com>
 * @see {@link http://gnuplot.info/docs_6.0/Gnuplot_6.pdf}
 *
 * Scanner-first: gnuplot keyword-abbreviation matching lives in src/scanner.c
 * (STYLE_KWS / PLT_STYLE_KWS / CMD_KWS), not in reg()/key() here. The v2
 * size-reduction plan, phase status, and measurements are in REWORK.md.
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
	t: reg("top", 1),
	b: reg("bottom", 1),
	c: reg("center", 1),
	// Style attribute keywords (lw/lt/ls/lc/dt/dl/pt/ps/pi/pn/as/fs/fc/tc) moved
	// to the external scanner (REWORK Phase 1) — see STYLE_KWS in scanner.c and
	// the `_lw`..`_tc` hidden rules below. Aliased to the same names, so
	// highlights.scm is unchanged.
};

// Shared terminal-option fragments — factored out of the ~30 `t_*` rules to cut
// their heavy duplication. Pure source dedup: each fragment expands to the exact
// same node(s) it replaced (identical token/min_chars), so the CST and corpus
// tests are unchanged. Forms that differ between terminals (e.g. `persist` with
// different min_chars) are left inline on purpose — functionality is preserved.
const T_ENH = key("enhanced", 3, "flag", 1); // {no}enhanced
const T_CROP = key("crop", undefined, "flag", 1); // {no}crop
const T_TRUECOLOR = key("truecolor", 4, "flag", 1); // {no}truecolor
const T_INTERLACE = key("interlace", 5, "flag", 1); // {no}interlace
const T_GDSIZES = choice(
	alias("tiny", "mod"),
	alias("small", "mod"),
	alias("medium", "mod"),
	alias("large", "mod"),
	alias("giant", "mod"),
);
const T_ANCHOR = choice(key("anchor", undefined, "mod"), key("scroll", undefined, "flag"));
// $-dependent fragments return arrays meant to be spread into a choice():
const tFont = ($) => [$.fontspec, $.fontscale];

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
const fillStyleOpt = ($) => seq($._fs, $.fill_style); // `fs <fillstyle>` (×6)
const atPos = ($) => seq(alias("at", "kw_fn"), $.position); //          `at <position>` (×6)
const offsetPos = ($) => seq(key("offset", 3), $.position); // `offset <pos>` (×9)

// All terminal names collapsed into ONE token (was 32 separate `key()` tokens).
// `token(choice(...))` forces a single terminal symbol; abbreviation min_chars
// are the same reg() calls the old per-terminal `key(..., "name")` used.
const TERM_NAME = token(
	choice(
		reg("cairolatex", 3), reg("canvas", 3), reg("cgm", 2), reg("context", 2),
		reg("domterm", 2), reg("dumb", 2), reg("dxf", 2), reg("emf", 2),
		reg("epscairo", 1), reg("epslatex", 4), reg("fig", 1), reg("gif", 1),
		reg("hpgl", 1), reg("jpeg", 1), reg("kittycairo", -4), reg("kittygd", -1),
		reg("lua", 1), reg("pcl5", 2), reg("pdfcairo", 2), reg("pict2e", 2),
		"png", reg("pngcairo", 4), reg("postscript", 2),
		reg("pslatex", 3), reg("pstex", -1),
		reg("qt", 1), reg("sixelgd", 1), reg("svg", 2),
		/tek4(0|1|2)\d\d/, reg("tikz", 2), reg("unknown", 1),
		reg("webp", 1), reg("wxt", 2), reg("x11", 1),
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
		$.kw_g_arg, $.kw_g_flag, $.kw_g_mod, $.kw_g_coord, $.kw_g_axisflag,
		// autoscale-only <axis>{min|max|fix|fixmin|fixmax}? words: private token
		// so common variable names (rmax, xmin) stay identifiers elsewhere.
		$.kw_g_axisrange,
		// zero-width, same-line-only separator between an arg/coord keyword and
		// its value (newline/';' ahead = no value: next line is a new statement)
		$._gval_sep,
	],

	extras: ($) => [$.comment, /\s|\\|;/],

	word: ($) => $.identifier,

	conflicts: ($) => [
		[$.paxis, $.tics_opts],
		[$._paxis_label],
		[$.plot_element, $.style_opts],
		[$.assignment, $._var_rhs],
		[$._tag_atom, $._expression],
		[$._command, $.multiplot_block],
		// palette `file "f" using 1:2 "fmt"`: using's trailing scanf format
		// string vs a following string item in the generic palette body
		[$.using],
	],

	rules: {
		// Statements abut with no terminator token. A `_eos` terminator redesign to
		// collapse the expression-tail follow set was attempted and REFUTED — it
		// regresses parser.c (see REWORK.md Phase 6). Size wins instead come from
		// N→1 token merges with identical continuations (e.g. $._sa below, kw_plt_st).
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
		// values float as flat sibling items (no per-keyword seq — the value-union
		// trap measured in REWORK.md). Two flavors so bodies that never take style
		// attributes cannot have identifiers like `pi` eaten by the style scanner.
		// Comma-chained expression list, atomic: `0, 1, 5` is ONE item, so the
		// boundary ambiguity below never fires in the middle of a list.
		_gexprs: ($) =>
			prec.right(
				seq(
					$._expression,
					// range_block as a chain element: contourfill
					// `defined [a:b] c, [d:e] f` chains through the ranges
					repeat(seq(",", choice($._expression, $.range_block))),
				),
			),
		// Parenthesized tuple list with at least two juxtaposed groups —
		// palette `defined (0 "blue", 1 "red")`, gradient/color 4-tuples.
		// A single parenthesized expression never matches (≥2 groups), so
		// this coexists with parenthesized_expression in the same states.
		tuple: ($) => surround("()", seq($._gexprs, repeat1($._gexprs))),
		_gopt_item: ($) =>
			choice(
				alias($.kw_g_flag, "flag"),
				alias($.kw_g_mod, "mod"),
				// A value (identifier included) binds to the preceding arg/coord
				// keyword only across the same-line _gval_sep, so
				// `contourfill auto FOO` keeps FOO in the body while an
				// identifier on the NEXT line starts a fresh statement.
				prec.right(seq(alias($.kw_g_arg, "arg"), optional(seq($._gval_sep, choice($._gexprs, $.tuple))))),
				prec.right(seq(alias($.kw_g_coord, "coord"), optional(seq($._gval_sep, $._gexprs)))),
				$._gexprs,
				$.range_block,
			),
		// Bodies are prec.LEFT: at an ambiguous statement boundary (next word is
		// an identifier that could start an assignment, or `$name` starting a
		// datablock) the body STOPS instead of swallowing the next statement.
		// Sub-keywords therefore MUST be in GOPT_KWS — an unlisted keyword
		// degrades to an identifier and ends the body early.
		_gopts: ($) => prec.left(repeat1($._gopt_item)),
		_gopts_style: ($) =>
			prec.left(
				repeat1(
					choice(
						$._gopt_item,
						alias($.kw_g_axisflag, "flag"),
						prec.right(seq($.style_opts, optional(seq(",", $.style_opts)))),
					),
				),
			),

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
				seq(
					"array",
					$.array,
					optional(seq("=", surround("[]", sep(",", optional($._expression))))),
				),
				// Declaration from expr (no size brackets): array C = split(...)
				seq("array", $.identifier, "=", $._expression),
			),

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
							optional(alias("all", "mod")),
							field("key", $._expression),
							optional(field("commands", $._expression)),
						),
					),
				),
			),

		// break/clear/continue/pwd/replot/reread/refresh — one scanner token,
		// identical (empty) continuation. See KW_CMD_BARE in scanner.c.
		cmd_bare: ($) => alias($.kw_cmd_bare, "cmd"),

		// raise/lower/vclear/toggle — one scanner token + optional expression
		// ("all" is only meaningful for toggle; accepted permissively for the rest).
		cmd_opt_expr: ($) =>
			prec.left(
				seq(
					alias($.kw_cmd_optexpr, "cmd"),
					optional(choice($._expression, alias("all", "mod"))),
				),
			),

		// cd/evaluate — one scanner token + required expression.
		cmd_expr: ($) => seq(alias($.kw_cmd_expr, "cmd"), $._expression),

		cmd_call: ($) =>
			prec.right(seq(alias("call", "cmd"), $._expression, repeat($._expression))),

		cmd_do: ($) => seq("do", $.for_block, surround("{}", repeat($._statement))),

		cmd_exit: ($) =>
			prec.left(
				seq(
					alias($.kw_cmd_exit, "cmd"),
					optional(
						choice(
							alias("gnuplot", "mod"),
							seq(alias(choice("message", "status"), "arg"), optional($._expression)),
						),
					),
				),
			),

		cmd_fit: ($) =>
			seq(
				alias($.cmd_fit_kw, "cmd"),
				optional($.range_block),
				field("func", $.function),
				field("data", $._expression),
				optional($.datafile_modifiers),
				repeat(
					choice(
						"unitweights",
						alias(/(y|xy|z)err(o(r)?)?/, "errors"),
						seq("errors", sep(",", $._expression)),
					),
				),
				alias("via", "kw_fn"),
				choice(
					field("parameter_file", $._expression),
					field("var", seq($._expression, repeat1(seq(",", $._expression)))),
				),
			),

		cmd_help: ($) => prec.right(seq(alias($.cmd_help_kw, "cmd"), optional($._expression))),

		cmd_history: ($) =>
			prec.right(
				seq(
					key("history", 4, "cmd"),
					optional(
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

		cmd_import: ($) =>
			seq(
				alias("import", "cmd"),
				$.function,
				alias("from", "kw_fn"),
				$.string_literal,
			),

		cmd_if: ($) =>
			prec.left(
				seq(
					alias("if", "kw_cond"),
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

		cmd_load: ($) => seq(alias($.cmd_load_kw, "cmd"), $._expression),

		cmd_pause: ($) =>
			prec.right(
				seq(
					alias($.cmd_pause_kw, "cmd"),
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

		endcondition: ($) =>
			choice("keypress", "button1", "button2", "button3", "close", "any"),

		cmd_plot: ($) =>
			seq(alias($.cmd_plot_kw, "cmd"), optional("sample"), sep(",", $.plot_element)),

		plot_element: ($) =>
			// p. 125
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
						),
						seq(
							// p. 177 keyentry
							field("data", choice($._expression, "keyentry")),
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
										field(
											"title",
											choice(
												$._expression,
												key("columnheader", 3, $.columnheader),
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
							alias("nogrid", "flag"), // NOTE: splot only option https://stackoverflow.com/questions/74586626/gnuplot-how-to-splot-surface-and-points-with-dgrid3d
							field("with", seq(key("with", 1, "attr"), $.plot_style)),
							$.style_opts,
						),
					),
				),
			),

		plot_style: ($) =>
			prec.left(
				choice(
					// Plain styles (no style-specific continuation) are matched by the
					// external scanner as one token — see PLT_STYLE_KWS in scanner.c.
					alias($.kw_plt_st, "plt_st"),
					// Styles with trailing options keep their own regex token:
					seq(key("labels", 3, "plt_st"), optional($.label_opts)),
					seq(key("vectors", 3, "plt_st"), optional($.arrow_opts)),
					seq(
						key("isosurface", 10, "plt_st"),
						optional(seq("level", $._expression)),
					),
					seq(
						key("candlesticks", 12, "plt_st"),
						optional(key("whiskerbars", -1)),
					),
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
												"coordinate",
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
						optional(seq("y", "=", $._expression)),
					),
					seq(key("image", 3, "plt_st"), optional("pixels")),
					seq(key("pm3d", 4, "plt_st"), optional(alias($._pm3d, $.pm3d))),
				),
			),

		cmd_print: ($) => seq(alias($.cmd_print_kw, "cmd"), sep(",", $._expression)),

		cmd_reset: ($) =>
			prec.right(seq(alias("reset", "cmd"), optional(choice(alias("bind", "mod"), alias("errors", "mod"), alias("session", "mod"))))),

		cmd_save: ($) =>
			seq(
				key("save", 2, "cmd"),
				optional(
					choice(
						key("functions", 3),
						key("variables", 3),
						key("terminal", 3, "mod"),
						alias("set", "mod"),
						alias("fit", "mod"),
						key("datablocks", 4),
					),
				),
				field("filename", $._expression),
				optional("append"),
			),

		cmd_set: ($) =>
			seq(
				seq(key("set", 2, "cmd"), optional($.for_block)),
				$._argument_set_show,
			),

		//-------------------------------------------------------------------------
		// Set/show arguments (_argument_set_show and its option rules)
		//
		// ~70% of parser.c, distributed across ~85 option rules (no single whopper).
		// Bloat is structural: each option embeds expressions/colorspec/positions
		// whose tails carry the statement-start follow set, so per-token keyword
		// merges here do NOT shrink the table — only the `_eos` redesign does.
		//-------------------------------------------------------------------------
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
						key("encoding", 3, "arg"),
						field("arg_opts", optional($.encoding)),
					),
					seq(
						key1("arg", "errorbars", /|/, reg("bars", 1)),
						field("arg_opts", optional($.errorbars)),
					),
					seq(alias("fit", "arg"), field("arg_opts", optional($.fit))),
					seq(key("format", 4, "arg"), field("arg_opts", optional($.format))),
					$.grid,
					seq(
						key("hidden3d", 3, "arg"),
						field("arg_opts", optional($.hidden3d)),
					),
					seq(key("history", 3, "arg"), field("arg_opts", optional($.history))),
					seq(
						key("isosamples", 3, "arg"),
						field("arg_opts", optional($.isosamples)),
					),
					seq(
						key("isosurface", 7, "arg"),
						field("arg_opts", optional($.isosurface)),
					),
					alias("isotropic", "arg"),
					seq(alias("jitter", "arg"), field("arg_opts", optional($.jitter))),
					$.key,
					$.label,
					$.linetype,
					seq(alias("link", "arg"), field("arg_opts", optional($.link))),
					$.loadpath,
					seq(alias("locale", "arg"), field("arg_opts", optional($.locale))),
					$.logscale,
					$.mapping,
					$.margin,
					seq(alias("micro", "arg"), field("arg_opts", optional($.micro))),
					key("minussign", 5, "arg"),
					$.monochrome,
					seq(key("mouse", 2, "arg"), field("arg_opts", optional($.mouse))),
					$.mxtics,
					$.nonlinear,
					$.object,
					seq(key("offsets", 3, "arg"), field("arg_opts", optional($.offsets))),
					seq(key("origin", 2, "arg"), field("arg_opts", optional($.origin))),
					seq(key("output", 1, "arg"), field("arg_opts", optional($.output))),
					seq(
						alias("overflow", "arg"),
						field("arg_opts", optional($.overflow)),
					),
					$.palette,
					key("parametric", 2, "arg"),
					$.paxis,
					$.pixmap,
					$.pm3d,
					$.pointintervalbox,
					$.pointsize,
					seq(key("polar", 3, "arg"), field("arg_opts", optional($.polar))),
					seq(key("print", 2, "arg"), field("arg_opts", optional($.print))),
					seq(alias("psdir", "arg"), field("arg_opts", optional($.psdir))),
					key("raxis", 2, "arg"),
					seq(alias("rgbmax", "arg"), field("arg_opts", optional($.rgbmax))),
					seq(key("samples", 3, "arg"), field("arg_opts", optional($.samples))),
					seq(key("size", 2, "arg"), field("arg_opts", optional($.size))),
					key("spiderplot", 6, "arg"),
					$.style,
					seq(key("surface", 2, "arg"), field("arg_opts", optional($.surface))),
					$.table,
					$.terminal,
					seq(
						alias("termoption", "arg"),
						field("arg_opts", optional($.termoption)),
					),
					seq(alias("theta", "arg"), field("arg_opts", optional($.theta))),
					seq(key("tics", -1, "arg"), field("arg_opts", optional($.tics))),
					seq(
						key("timestamp", 5, "arg"),
						field("arg_opts", optional($.timestamp)),
					),
					seq(key("timefmt", 5, "arg"), field("arg_opts", optional($.timefmt))),
					$.title,
					seq(alias("vgrid", "arg"), field("arg_opts", optional($.vgrid))),
					seq(key("view", 2, "arg"), field("arg_opts", optional($.view))),
					seq(key("walls", -1, "arg"), field("arg_opts", optional($.walls))),
					$.xdata,
					$.xdtics,
					$.xlabel,
					$.xmtics,
					$.xrange,
					$.xtics,
					$.xyplane,
					seq(key("zero", 1, "arg"), field("arg_opts", optional($.zero))),
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
			prec.right(seq(key("angles", 2, "arg"), optional(seq($._gval_sep, $._gopts)))),

		arrow: ($) =>
			prec.left(
				seq(
					key("arrow", 3, "arg"),
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
					key("autoscale", 4, "arg"),
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
			prec.right(seq(key("border", 3, "arg"), optional(seq($._gval_sep, $._gopts_style)))),

		boxwidth: ($) =>
			prec.right(seq(key("boxwidth", 3, "arg"), optional(seq($._gval_sep, $._gopts)))),

		boxdepth: ($) =>
			prec.right(seq(alias("boxdepth", "arg"), optional(seq($._gval_sep, $._gopts)))),

		color: ($) => alias("color", "arg"),

		colormap: ($) =>
			prec.right(seq(alias("colormap", "arg"), optional(seq($._gval_sep, $._gopts)))),

		colorsequence: ($) =>
			prec.right(seq(alias("colorsequence", "arg"), optional(seq($._gval_sep, $._gopts)))),

		clip: ($) => prec.right(seq(alias("clip", "arg"), optional(seq($._gval_sep, $._gopts)))),

		cntrlabel: ($) =>
			prec.right(seq(key("cntrlabel", 5, "arg"), optional(seq($._gval_sep, $._gopts_style)))),

		// Generic body (GOPT_KWS rows: linear/cubicspline/bspline/points/order/
		// levels/auto/discrete/incremental/sorted/unsorted/firstlinetype).
		cntrparam: ($) =>
			prec.right(seq(key("cntrparam", 5, "arg"), optional(seq($._gval_sep, $._gopts)))),

		// Generic body (GOPT_KWS rows: vertical/horizontal/invert/user/default/
		// origin/size/front/back/noborder/bdefault/border/cbtics).
		colorbox: ($) =>
			prec.right(seq(key("colorbox", 6, "arg"), optional(seq($._gval_sep, $._gopts_style)))),

		contour: ($) =>
			prec.right(seq(key("contours", 5, "arg"), optional(seq($._gval_sep, $._gopts)))),

		cornerpoles: ($) => key("cornerpoles", 7, "arg"),

		contourfill: ($) =>
			prec.right(seq(alias("contourfill", "arg"), optional(seq($._gval_sep, $._gopts)))),

		dashtype: ($) =>
			prec.left(
				seq(
					alias($.kw_dt, "arg"),
					field("tag", $._expression),
					optional($.dash_opts),
				),
			),

		datafile: ($) =>
			prec.left(
				seq(
					key("datafile", 5, "arg"),
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
			prec.right(seq(key("decimalsign", 3, "arg"), optional(seq($._gval_sep, $._gopts)))),

		dgrid3d: ($) =>
			prec.left(
				seq(
					key("dgrid3d", 2, "arg"),
					repeat(
						choice(
							seq(
								field("rows", $._expression),
								optional(seq(",", field("cols", $._expression))),
							),
							choice(
								"splines",
								seq(alias("qnorm", "arg"), $._expression),
								seq(
									choice(alias("gauss", "mod"), alias("cauchy", "mod"), alias("exp", "mod"), alias("box", "mod"), alias("hann", "mod")),
									optional("kdensity"),
									optional($._expression),
									optional(seq(",", $._expression)),
								),
							),
						),
					),
				),
			),

		dummy: ($) =>
			prec.right(seq(key("dummy", 2, "arg"), optional(seq($._gval_sep, $._gopts)))),

		encoding: ($) =>
			choice(
				key("defaults", 3, "mod"),
				/iso_8859_(1|15|2|9)/,
				/koi8(r|u)/,
				/cp(437|85(0|2)|950|125(0|1|2|4))/,
				alias("sjis", "mod"),
				"utf8",
				alias("locale", "arg"),
			),

		errorbars: ($) => seq($._gval_sep, $._gopts_style),

		fit: ($) =>
			repeat1(
				choice(
					choice(
						key("nologfile", 5),
						seq(key("logfile", 3), choice($._expression, "default")),
					),
					key1("fit_out", reg("quiet", 5, 1), /|results|brief|verbose/),
					key("errorvariables", 3, "flag", 1),
					key("covariancevariables", 3, "flag", 1),
					key("errorscaling", 6, "flag", 1),
					key("prescale", undefined, "flag", 1),
					seq("maxiter", choice(field("value", $._expression), "default")),
					seq(alias("limit", "arg"), choice(field("epsilon", $._expression), "default")),
					seq(alias("limit_abs", "arg"), field("epsilon_abs", $._expression)),
					seq(alias("start-lambda", "arg"), choice($._expression, "default")),
					seq(alias("lambda-factor", "arg"), choice($._expression, "default")),
					seq(
						alias("script", "mod"),
						optional(choice(field("command", $._expression), "default")),
					),
					alias(choice("v4", "v5"), "version"),
				),
			),

		format: ($) => seq($._gval_sep, $._gopts_style),

		// Generic body (GOPT_KWS rows: polar/layerdefault/front/back/vertical/
		// spiderplot; the (no)?m?<axis>tics family is kw_g_axisflag).
		grid: ($) =>
			prec.right(seq(key("grid", 2, "arg"), optional(seq($._gval_sep, $._gopts_style)))),

		hidden3d: ($) => seq($._gval_sep, $._gopts),

		history: ($) => seq($._gval_sep, $._gopts),

		isosamples: ($) => seq($._gval_sep, $._gopts),

		isosurface: ($) => seq($._gval_sep, $._gopts),

		jitter: ($) => seq($._gval_sep, $._gopts),

		key: ($) =>
			prec.right(seq(key("key", 1, "arg"), optional(seq($._gval_sep, $._gopts_style)))),



		label: ($) =>
			prec.right(
				seq(
					key("label", 3, "arg"),
					optional(prec.dynamic(2, field("tag", $._tag_atom))),
					optional($.label_opts),
				),
			),

		linetype: ($) =>
			prec.right(seq(alias($.kw_lt, "arg"), optional(seq($._gval_sep, $._gopts_style)))),

		link: ($) =>
			repeat1(
				choice(
					alias(choice("x2", "y2"), "axis"),
					seq(alias("via", "kw_fn"), $._expression, "inverse", $._expression),
				),
			),

		loadpath: ($) =>
			prec.right(seq(key("loadpath", 4, "arg"), optional(seq($._gval_sep, $._gopts)))),

		// (the old body's head mistakenly read key("loadpath") — fixed by the
		// generic body: `set locale "en_US"` now parses the string directly)
		locale: ($) => seq($._gval_sep, $._gopts),

		logscale: ($) => {
			const axis = choice("x", "y", "z", "x2", "y2", "cb", "r");
			return seq(
				key("logscale", 3, "arg"),
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
			prec.right(seq(key("mapping", 3, "arg"), optional(seq($._gval_sep, $._gopts)))),

		margin: ($) =>
			prec.right(
				seq(key1("arg", /(l|r|t|b)?/, reg("margins", 3)), optional(seq($._gval_sep, $._gopts))),
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

		micro: ($) => prec.right(seq(alias("micro", "arg"), optional(seq($._gval_sep, $._gopts)))),

		monochrome: ($) =>
			prec.left(seq(key("monochrome", 4, "arg"), optional($.line_style))),

		mouse: ($) => seq($._gval_sep, $._gopts),

		multiplot: ($) =>
			seq(
				key("multiplot", 5, "arg"),
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

		_set_multiplot: ($) => seq(key("set", 2, "cmd"), $.multiplot),

		_unset_multiplot: ($) => seq(key("unset", 3, "cmd"), $.multiplot),

		mxtics: ($) =>
			prec.left(
				seq(
					key1("flag", "m", K.axes, reg("tics", -1)),
					optional(
						choice(
							field("freq", $._expression),
							key("default", 3),
							seq(
								optional("time"),
								field("N", $._expression),
								choice(
									key("seconds", 3),
									key("minutes", 3),
									key("hours", 4),
									key("days", 3),
									key("weeks", 4),
									key("months", 3),
									key("years", 4),
								),
							),
						),
					),
				),
			),

		// set nonlinear <axis> via f(axis) inverse g(axis)
		nonlinear: ($) =>
			seq(
				key("nonlinear", 5, "arg"),
				K.axes,
				alias("via", "kw_fn"),
				$._expression,
				"inverse",
				$._expression,
			),

		// set object <index> <shape> … — generic body (shape words, from/to/rto,
		// arc + range_block, units xx/xy/yy, layer/clip flags, style attrs).
		object: ($) =>
			prec.right(seq(key("object", 3, "arg"), optional(seq($._gval_sep, $._gopts_style)))),

		offsets: ($) => seq($._gval_sep, $._gopts),

		// set origin <x>,<y>  — lower-left corner of plot within terminal
		origin: ($) => seq($._gval_sep, $._gopts),

		output: ($) => seq($._gval_sep, $._gopts),

		overflow: ($) => choice(alias("float", "mod"), "NaN", alias("undefined", "mod")),

		// Generic items plus palette-only structural branches: the `defined`
		// gradient list (parenthesized, not an expression), `file` + datafile
		// modifiers, `model RGB|CMY|HSV` and `viridis` (both keep their
		// dedicated highlight captures). Everything else is a GOPT_KWS row.
		palette: ($) =>
			prec.right(
				seq(
					key("palette", 3, "arg"),
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

		_paxis_label: ($) =>
			seq(key("label", 3), optional($.label_opts)),

		paxis: ($) =>
			prec.left(
				seq(
					alias("paxis", "arg"),
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
					optional(seq(key("tics", 3), optional($.tics_opts))),
					optional($._paxis_label),
					optional(offsetPos($)),
				),
			),

		// set pixmap <index> {"filename" | colormap <name>} at <position>
		//            {width <w> | height <h> | size <w>,<h>} {front|back|behind} {center}
		pixmap: ($) =>
			prec.right(seq(key("pixmap", 4, "arg"), optional(seq($._gval_sep, $._gopts)))),

		pm3d: ($) => seq(alias("pm3d", "arg"), optional($._pm3d)),

		_pm3d: ($) =>
			// recycle code for pm3d plot_style
			repeat1(
				choice(
					seq(alias("at", "kw_fn"), alias(repeat1(choice("b", "s", "t")), "position")),
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
					choice(seq("clip", optional("z")), "clip1in", "clip4in"),
					key("clipcb", undefined, "flag", 1),
					seq(
						"corners2color",
						alias(/(geo|har)?mean|rms|m(edian|in|ax)|c(1|2|3|4)/, "c2c"),
					),
					seq(
						key("lighting", 5, "flag", 1),
						repeat(
							choice(
								seq("primary", field("fraction", $._expression)),
								seq("specular", field("fraction", $._expression)),
								seq("spec2", field("fraction", $._expression)),
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
			prec.right(seq(key("pointintervalbox", 8, "arg"), optional(seq($._gval_sep, $._gopts)))),

		pointsize: ($) =>
			prec.right(seq(key("pointsize", 3, "arg"), optional(seq($._gval_sep, $._gopts)))),

		polar: ($) =>
			prec.left(
				seq(
					alias("grid", "mod"),
					repeat(
						choice(
							$.dgrid3d,
							seq("scale", $._expression),
							seq("theta", $.range_block),
							seq("r", $.range_block),
							seq(
								choice(alias("gauss", "mod"), alias("cauchy", "mod"), alias("exp", "mod"), alias("box", "mod"), alias("hann", "mod")),
								optional("kdensity"),
								optional($._expression),
								optional(seq(",", $._expression)),
							),
						),
					),
				),
			),

		print: ($) => seq($._gval_sep, $._gopts),

		psdir: ($) => seq($._gval_sep, $._gopts),

		rgbmax: ($) => seq($._gval_sep, $._gopts),

		samples: ($) => seq($._gval_sep, $._gopts),

		size: ($) => seq($._gval_sep, $._gopts),

		// Selector heads keep their st_opt alias (colour); tails are generic.
		// data/function/line/ellipse keep structural tails (plot_style,
		// line_style, ellipse are shared with plot commands). `set style fill`
		// reaches the bare $._gopts_style branch via the KW_FS style token.
		style: ($) =>
			prec.left(
				1,
				seq(
					key("style", 2, "arg"),
					optional(
						choice(
							seq(key("arrow", 3, "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(alias("boxplot", "st_opt"), optional(seq($._gval_sep, $._gopts_style))),
							seq(key("data", 1, "st_opt"), $.plot_style),
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

		ellipse: ($) =>
			repeat1(
				choice(
          // TODO: units, size, angle
					seq("units", alias(choice("xx", "xy", "yy"), "units_opt")),
					seq("size", $.position, optional(seq(",", $.position))),
					field("angle", seq("angle", $._expression)),
					key("clip", undefined, "flag", 1),
				),
			),

		surface: ($) => seq($._gval_sep, $._gopts),

		table: ($) =>
			prec.right(
				seq(
					key("table", 2, "arg"),
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
					key("terminal", 1, "arg"),
					optional(choice(
						seq(alias(TERM_NAME, "name"), optional($.t_opts)),
						"push",
						"pop",
					)),
				),
			),

		// Single permissive option list shared by every terminal. A highlighter
		// does not need to reject terminal/option mismatches, so the grammar no
		// longer tracks which terminal an option belongs to. This collapsed the
		// 32 terminal-name tokens into one `TERM_NAME` token and the 30 `t_*`
		// rules into this one. Options whose abbreviation min_chars differed
		// between terminals use the loosest form here (superset — every formerly
		// valid spelling still parses).
		t_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						// shared structured options
						$.canvas_size,
						$.background,
						$.fontspec,
						$.fontscale,
						$.mono_color,
						$.line_drawing_method, // rounded / butt / square
						$._sa,
						$._sa,
						seq($._ps, $._expression),
						// value-taking options
						field("n", $.number),
						seq(key("title", undefined, "arg"), $._expression),
						seq("position", $.position),
						seq(key("window", undefined, "arg"), $._expression),
						seq("name", $._expression),
						seq(alias("fsize", "arg"), $._expression),
						seq(key("width", undefined), $._expression),
						seq(key("pointsmax", undefined, "arg"), $._expression),
						seq(key("fontsize", undefined, "arg"), $._expression),
						seq(key("pointscale", undefined, "arg"), $._expression),
						seq(key("scale", undefined), $._size),
						seq(key("plotsize", undefined, "arg"), $._size),
						seq(key("charsize", undefined, "arg"), $._size),
						seq(alias("resolution", "arg"), field("dpi", $._expression)),
						seq(
							key("palfuncparam", undefined, "arg"),
							$._expression,
							optional(seq(",", $._expression)),
						),
						seq(alias("aspect", "arg"), $._expression, optional(seq(",", $._expression))),
						seq(key("fillchar", undefined, "arg"), choice("solid", $._expression)),
						seq(alias("jsdir", "arg"), $._expression),
						// flags
						T_ENH,
						T_CROP,
						T_TRUECOLOR,
						T_INTERLACE,
						T_ANCHOR,
						T_GDSIZES,
						key("rotate", undefined, "flag", 1),
						key("timestamp", undefined, "flag", 1),
						key("attributes", undefined, "flag", 1),
						key("feed", undefined, "flag", 1),
						key("replotonresize", undefined, "flag", 1),
						key("antialias", undefined, "flag", 1),
						key("persist", undefined, "flag", 1),
						key("raise", undefined, "flag", 1),
						key("ctrl", undefined, "flag", 1),
						key("ctrlq", undefined, "flag", 1),
						key("close", undefined),
						key("reset", undefined, "mod"),
						key("eject", undefined, "mod"),
						key("noproportional", undefined, "flag"),
						key("default", undefined),
						key("originreset", undefined, "flag", 1),
						key("gparrows", undefined, "flag", 1),
						key("gppoints", undefined, "flag", 1),
						key("picenvironment", undefined, "flag", 1),
						key("tightboundingbox", undefined, "flag", 1),
						key("fulldoc", undefined, "flag", 1),
						key("standalone", undefined, "flag", 1),
						key("tikzarrows", undefined, "flag", 1),
						key("externalimages", undefined, "flag", 1),
						key("inlineimages", undefined, "flag"),
						key("noanimate", undefined, "flag"),
						key("auxfile", undefined, "flag", 1),
						key("clip", undefined, "flag", 1), // clip / noclip
						key("input", undefined),
						// output format / level / text
						key("eps", undefined, "mod"),
						alias("pdf", "mod"),
						alias("png", "mod"),
						choice(alias("level1", "mod"), alias("leveldefault", "mod"), alias("level3", "mod")),
						key("blacktext", undefined),
						key("colortext", undefined),
						key("colourtext", undefined, "colortext"),
						choice(seq(alias("header", "arg"), field("header", $._expression)), alias("noheader", "flag")),
						// orientation / mode / style
						choice(key("landscape", undefined), key("portrait", undefined)),
						alias("big", "mod"), // "small" handled by T_GDSIZES (tiny/small/medium/large/giant)
						choice(key("solid", undefined), key("dashed", undefined)),
						choice(key("defaultplex", undefined, "mod"), key("simplex", undefined, "mod"), key("duplex", undefined, "mod")),
						choice(alias("mitered", "mod"), alias("beveled", "mod")),
						choice(key("mpoints", undefined), key("texpoints", undefined)),
						alias("texarrows", "mod"),
						choice(key("smallpoints", undefined), key("tinypoints", undefined), key("normalpoints", undefined)),
						choice(key("textnormal", undefined, "mod"), alias("textspecial", "mod"), alias("texthidden", "mod"), alias("textrigid", "mod")),
						choice(alias("mono", "mod"), alias("ansi", "mod"), alias("ansi256", "mod"), alias("ansirgb", "mod")),
						choice(key("pspoints", undefined), key("nopspoints", undefined)),
						choice(key("latex", undefined, "mod"), key("tex", undefined, "mod"), key("context", undefined, "mod")),
						"mouse",
						choice(alias("fixed", "mod"), alias("dynamic", "mod")),
						seq(
							key("animate", undefined),
							repeat(choice(
								seq(alias("delay", "arg"), $._expression),
								seq(alias("loop", "arg"), $._expression),
								seq(alias("quality", "arg"), $._expression),
							)),
						),
					),
				),
			),

		// shared terminal options ----------------------------------------
		canvas_size: ($) => seq(key("size", 2), $._size),
		_size: ($) => {
			const unit = alias(
				choice("cm", "in", "inch", "mm", "pt", "pc", "bp", "dd", "cc"),
				"unit",
			);
			// height optional: pict2e/pcl5 accept `size a4` / `size letter`
			// (paper name parses as the width expression) — B15.
			return prec.right(
				seq(
					field("width", seq($._expression, optional(unit))),
					optional(seq(",", field("height", seq($._expression, optional(unit))))),
				),
			);
		},
		mono_color: ($) =>
			choice(key("monochrome", 4), key("color", 3), key("colour", 3, "color")),
		line_drawing_method: ($) => choice(key("rounded", -2, "mod"), alias("butt", "mod"), alias("square", "mod")),
		fontscale: ($) => seq("fontscale", field("scale", $._expression)),
		background: ($) =>
			choice(
				seq(key("background", 5), field("color", $._expression)),
				key("nobackground", 7),
				key("transparent", 5, "flag", 1), // NOTE: some need 6 instead of 5
			),
		// ----------------------------------------------------------------
		termoption: ($) => seq($._gval_sep, $._gopts_style),

		theta: ($) => seq($._gval_sep, $._gopts),

		tics: ($) => $.tics_opts,

		timestamp: ($) => seq($._gval_sep, $._gopts_style),

		timefmt: ($) => seq($._gval_sep, $._gopts),

		title: ($) =>
			prec.right(seq(key("title", 3, "arg"), optional(seq($._gval_sep, $._gopts_style)))),

		vgrid: ($) => seq($.datablock, optional(seq("size", $._expression))),

		view: ($) => seq($._gval_sep, $._gopts),

		walls: ($) => seq($._gval_sep, $._gopts_style),

		xdata: ($) =>
			seq(key1("arg", K.axes, reg("data", 2)), optional(key("time", 1))),

		xdtics: ($) => key1("flag", K.axes, "d", reg("tics", -1)),

		xlabel: ($) =>
			seq(
				key1("arg", K.axes, reg("label", 3)),
				prec.right(
					repeat1(
						choice(
							field("label", $._expression),
							offsetPos($),
							seq(
								key("rotate", 3, "flag", 1),
								optional(
									choice(seq(alias("by", "kw_fn"), field("angle", $._expression)), "parallel"),
								),
							),
							$._textcolor,
							$.fontspec,
							key("enhanced", undefined, "flag", 1),
						),
					),
				),
			),

		xmtics: ($) => key1("flag", K.axes, "m", reg("tics", -1)),

		xrange: ($) =>
			seq(
				key1("arg", K.axes, reg("range", 3)),
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
			prec.left(
				seq(key1("flag", K.axes, reg("tics", -1)), optional($.tics_opts)),
			),

		xyplane: ($) =>
			prec.right(seq(key("xyplane", 3, "arg"), optional(seq($._gval_sep, $._gopts)))),

		zero: ($) => seq($._gval_sep, $._gopts),

		zeroaxis: ($) =>
			seq(key1("arg", K.zaxes, reg("zeroaxis", 5)), optional($.style_opts)),

		cmd_show: ($) =>
			seq(
				key("show", 2, "cmd"),
				choice(
					$._argument_set_show,
					$.multiplot,
					key("colornames", 6, "arg"),
					key("functions", 3, "arg"),
					key("plot", 1, "arg"),
					key("variables", 1, "arg"),
					seq(key("version", 2, "arg"), optional(key("long", 1))),
				),
			),

		cmd_splot: ($) =>
			seq(alias($.cmd_splot_kw, "cmd"), optional("sample"), sep(",", $.plot_element)),

		cmd_stats: ($) =>
			seq(
				alias("stats", "cmd"),
				field("ranges", repeat($.range_block)),
				field("filename", $._expression),
				optional($.datafile_modifiers),
				repeat(
					choice(
						seq(choice("name", "prefix"), $._expression),
						key("output", 3, "flag", 1),
						seq(
							"$vgridname",
							optional(seq("name", field("name", $._expression))),
						),
					),
				),
			),

		cmd_system: ($) => seq(alias(choice("system", "!"), "cmd"), $._expression),

		cmd_test: ($) =>
			prec.left(
				seq(alias("test", "cmd"), optional(choice("palette", alias("terminal", "mod")))),
			),

		cmd_undefine: ($) =>
			seq(
				key("undefine", 3, "cmd"),
				repeat(token.immediate(UNDEFINE_ARG)),
			),

		cmd_unset: ($) =>
			seq(
				seq(key("unset", 3, "cmd"), optional($.for_block)),
				$._argument_set_show,
			),

		cmd_vfill: ($) =>
			seq(
				alias(/vg?fill/, "cmd"),
				optional("sample"),
				sep(",", $.plot_element),
			),

		cmd_while: ($) =>
			seq(
				"while",
				$.parenthesized_expression,
				surround("{}", repeat($._statement)),
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
					"mask",
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
								seq(choice("record", "format", "rotate"), "=", field("opt", $._expression)),
								seq(alias(choice("dx", "dy", "dz", "perpendicular", "skip"), "arg"), "=", field("opt", sep(":", $._expression))),
								seq(choice("array", "origin", "center"), "=", field("opt", sep(":", $.parameter_list))),
								seq("filetype", "=", field("filetype", $.identifier)),
								seq(alias("scan", "arg"), "=", field("scan", $.identifier)),
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
						key("csplines", -1, "mod"),
						key("acsplines", -1, "mod"),
						key("mcsplines", -1, "mod"),
						alias("path", "mod"),
						alias("bezier", "mod"),
						alias("sbezier", "mod"),
						seq(
							alias("kdensity", "mod"),
							optional(
								seq(
									alias(choice("bandwidth", "period"), "arg"),
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
						seq(alias("bins", "arg"), optional(seq("=", $._expression))),
						seq(alias("binrange", "arg"), $.range_block),
						seq(alias("binwidth", "arg"), "=", $._expression),
						seq(
							alias("binvalue", "arg"),
							optional(seq("=", choice(alias("sum", "mod"), alias("avg", "mod")))),
						),
					),
				),
			),

		style_opts: ($) =>
			// NOTE: sólo para plot_element?
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

		tics_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						alias(choice("axis", "border"), "axis"),
						key("mirror", undefined, "flag", 1),
						alias(choice("in", "out"), "inout"),
						seq(
							"scale",
							optional(
								choice(
									key("default", 3),
									seq($._expression, optional(seq(",", $._expression))),
								),
							),
						),
						choice(
							seq(key("rotate", 3), seq(alias("by", "kw_fn"), field("angle", $._expression))),
							key("norotate", 5, "flag"),
						),
						choice(
							field("offset", offsetPos($)),
							key("nooffset", 5),
						),
						choice(
							alias(K.c, "cen"),
							alias(K.l, "lef"),
							alias(K.r, "rig"),
							key("autojustify", 2),
						),
						"add",
						choice(
							key("autofreq", 4),
							$._expression,
							seq(
								field("start", $._expression),
								",",
								field("incr", $._expression),
								optional(seq(",", field("end", $._expression))),
							),
							surround(
								"()",
								sep(
									",",
									choice(
										field("pos", $._expression),
										seq(
											field("label", $._expression),
											field("pos", $._expression),
										),
										seq(
											field("label", $._expression),
											field("pos", $._expression),
											field("level", $._expression),
										),
									),
								),
							),
						),
						seq("format", $._expression),
						$.fontspec,
						key("enhanced", undefined, "flag", 1),
						alias(choice("numeric", "timedate", "geographic"), "mod"),
						key("logscale", 3, "log", 1),
						key("rangelimited", 5, "flag", 1),
						$._textcolor,
					),
				),
			),

		line_style: ($) =>
			prec.left(
				seq(
					optional(field("tag", $._expression)),
					repeat1(
						choice(
							key("default", 3),
							seq(
								$._lt,
								choice($._expression, $.colorspec, "black", "bgnd", "background", alias("nodraw", "mod")),
							),
							$._linecolor,
							$._sa,
							seq($._pt, $._expression),
							seq($._ps, $._expression),
							$._sa,
							$._sa,
							seq($._dt, $.dash_opts),
							key("palette", 3),
						),
					),
				),
			),

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

		fontspec: ($) => seq("font", field("font", $._expression)),

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
								seq("cb", field("val", $._expression)),
								"z",
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
				seq(
					key("using", 1, "attr"),
					sep(":", choice(
						surround("()", sep(",", choice($.assignment, $._expression))),
						$._expression,
					)),
					// Optional trailing scanf format string: `using 1:($2+$3) '%lf,%lf,%lf'`
					// (gnuplot 6 docs p.138-139). The format-only form `using "%lf"`
					// is already covered by the string as the sole entry above.
					optional(field("format", $.string_literal)),
				),
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
			return token(choice(decimal_literal, hex_literal, octal_literal));
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
					["-", PREC.UNARY],
					["+", PREC.UNARY],
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
				prec.left(PREC.UNARY, surround(alias("|", $.operator), $._expression)),
			),

		binary_expression: ($) =>
			choice(
				...[
					["**", PREC.POWER],
					["*", PREC.TIMES],
					["/", PREC.TIMES],
					["%", PREC.TIMES],
					["+", PREC.PLUS],
					["-", PREC.PLUS],
					["==", PREC.COMPARE],
					["!=", PREC.COMPARE],
					["<", PREC.COMPARE],
					["<=", PREC.COMPARE],
					[">", PREC.COMPARE],
					[">=", PREC.COMPARE],
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
					["eq", PREC.COMPARE],
					["ne", PREC.COMPARE],
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
