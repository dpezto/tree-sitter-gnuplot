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
const T_ENH = key("enhanced", 3, undefined, 1); // {no}enhanced
const T_CROP = key("crop", undefined, undefined, 1); // {no}crop
const T_TRUECOLOR = key("truecolor", 4, undefined, 1); // {no}truecolor
const T_INTERLACE = key("interlace", 5, undefined, 1); // {no}interlace
const T_GDSIZES = choice("tiny", "small", "medium", "large", "giant");
const T_ANCHOR = choice(key("anchor"), key("scroll"));
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
const atPos = ($) => seq("at", $.position); //          `at <position>` (×6)
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
							optional("all"),
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
					optional(choice($._expression, "all")),
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
							"gnuplot",
							seq(choice("message", "status"), optional($._expression)),
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
				"via",
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
				"from",
				$.string_literal,
			),

		cmd_if: ($) =>
			prec.left(
				seq(
					"if",
					field("conditions", surround("()", sep(",", choice($.assignment, $._expression)))),
					choice(
						repeat1($._statement),
						seq(
							surround("{}", repeat($._statement)),
							repeat(
								seq(
									"else",
									"if",
									repeat1(field("conditions", surround("()", $._expression))),
									surround("{}", repeat($._statement)),
								),
							),
						),
					),
					optional(seq("else", surround("{}", repeat($._statement)))),
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
									seq("at", field("at", $._expression)),
								),
							),
						),
					),
					repeat(
						choice(
							seq(
								"axes",
								alias(choice("x1y1", "x2y2", "x1y2", "x2y1"), "axes_opts"),
							),
              choice(
								key("notitle", 3),
								prec.left(
									seq(
										key("title", 1),
										field(
											"title",
											choice(
												$._expression,
												key("columnheader", 3, $.columnheader),
											),
										),
										repeat(
											choice(
												seq("at", choice("beginning", "end", $.position)),
												key("enhanced", 3, undefined, 1),
											),
										),
									),
								),
							),
							"nogrid", // NOTE: splot only option https://stackoverflow.com/questions/74586626/gnuplot-how-to-splot-surface-and-points-with-dgrid3d
							field("with", seq(key("with", 1), $.plot_style)),
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
			prec.right(seq(alias("reset", "cmd"), optional(choice("bind", "errors", "session")))),

		cmd_save: ($) =>
			seq(
				key("save", 2, "cmd"),
				optional(
					choice(
						key("functions", 3),
						key("variables", 3),
						key("terminal", 3),
						"set",
						"fit",
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
				),
			),

		angles: ($) =>
			seq(
				key("angles", 2, "arg"),
				optional(choice(key("degrees", 1), key("radians", 1))),
			),

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
										optional(seq("from", $.position)),
										alias(/r?to/, "to_rto"),
										$.position,
									),
									seq(
										"from",
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

		autoscale: ($) =>
			seq(
				key("autoscale", 4, "arg"),
				repeat(
					choice(
						alias(
							token(
								seq(
									K.axes,
									optional(choice("min", "max", "fixmin", "fixmax", "fix")),
								),
							),
							"axes",
						),
						"fix",
						"keepfix",
						key("noextend", 5),
					),
				),
			),

		border: ($) =>
			prec.left(
				seq(
					key("border", 3, "arg"),
					repeat(
						choice(
							$._expression,
							"front",
							"back",
							"behind",
							$.style_opts,
							"polar",
						),
					),
				),
			),

		boxwidth: ($) =>
			prec.left(
				seq(
					key("boxwidth", 3, "arg"),
					repeat(
						choice(
							field("width", $._expression),
							key("absolute", 1),
							key("relative", 1),
						),
					),
				),
			),

		boxdepth: ($) =>
			prec.left(
				seq(
					alias("boxdepth", "arg"),
					repeat(choice(field("y_extent", $._expression), "square")),
				),
			),

		color: ($) => alias("color", "arg"),

		colormap: ($) =>
			prec.left(
				seq(
					alias("colormap", "arg"),
					optional(
						choice(
							seq("new", $._expression),
							seq($._expression, $.range_block),
						),
					),
				),
			),

		colorsequence: ($) =>
			seq(
				alias("colorsequence", "arg"),
				optional(choice("default", "classic", "podo")),
			),

		clip: ($) =>
			seq(
				alias("clip", "arg"),
				optional(
					choice(
						key("points", 1),
						key("one", 1),
						key("two", 1),
						key("radial", 1),
					),
				),
			),

		cntrlabel: ($) =>
			seq(
				key("cntrlabel", 5, "arg"),
				repeat(
					choice(
						seq("format", $._expression),
						$.fontspec,
						seq("start", $._expression),
						seq("interval", $._expression),
						"onecolor",
					),
				),
			),

		cntrparam: ($) =>
			seq(
				key("cntrparam", 5, "arg"),
				repeat(
					choice(
						key("linear", 2),
						key("cubicspline", 1),
						key("bspline", 1),
						seq(key("points", 1), $._expression),
						seq(key("order", 1), $._expression),
						seq(
							key("levels", 2),
							choice(
								$._expression,
								seq("auto", optional($._expression)),
								seq("discrete", $._expression, repeat(seq(",", $._expression))),
								seq(
									key("incremental", 2),
									$._expression,
									",",
									$._expression,
									optional(seq(",", $._expression)),
								),
							),
							optional(alias(/((un)?sorted)/, "sorted")),
							optional(seq("firstlinetype", $._expression)),
						),
					),
				),
			),

		colorbox: ($) =>
			seq(
				key("colorbox", 6, "arg"),
				repeat(
					choice(
						key("vertical", 1),
						key("horizontal", 1),
						key("invert", 3, undefined, 1),
						key("user", 1),
						key("default", 3),
						seq(key("origin", 1), $.position),
						seq(key("size", 1), $.position),
						key("front", 2),
						key("back", 2),
						choice(
							key("noborder", 4),
							key("bdefault", 2),
							seq(key("border", 2), choice($.style_opts, $._expression)),
						),
						seq("cbtics", $.style_opts),
					),
				),
			),

		contour: ($) =>
			seq(
				key("contours", 5, "arg"),
				optional(choice(key("base", 2), key("surface", 1), key("both", 2))),
			),

		cornerpoles: ($) => key("cornerpoles", 7, "arg"),

		contourfill: ($) =>
			seq(
				alias("contourfill", "arg"),
				repeat(
					choice(
						seq("auto", $._expression),
						choice("ztics", "cbtics"),
						key("palette", 3),
						seq(key("firstlinetype", 5), $._expression),
					),
				),
			),

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
							key("columnheaders", -3, undefined, 1),
							key("fortran", 4),
							"nofpe_trap",
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
			prec.left(
				seq(
					key("decimalsign", 3, "arg"),
					optional(
						choice($._expression, seq("locale", optional($._expression))),
					),
				),
			),

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
								seq("qnorm", $._expression),
								seq(
									choice("gauss", "cauchy", "exp", "box", "hann"),
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
			prec.left(
				seq(
					key("dummy", 2, "arg"),
					optional(seq($._expression, ",", $._expression)),
				),
			),

		encoding: ($) =>
			choice(
				key("defaults", 3),
				/iso_8859_(1|15|2|9)/,
				/koi8(r|u)/,
				/cp(437|85(0|2)|950|125(0|1|2|4))/,
				"sjis",
				"utf8",
				"locale",
			),

		errorbars: ($) =>
			prec.left(
				repeat1(
					choice(
						choice("small", "large", "fullwidth", field("size", $._expression)),
						choice("front", "back"),
						$.style_opts,
					),
				),
			),

		fit: ($) =>
			repeat1(
				choice(
					choice(
						key("nologfile", 5),
						seq(key("logfile", 3), choice($._expression, "default")),
					),
					key1("fit_out", reg("quiet", 5, 1), /|results|brief|verbose/),
					key("errorvariables", 3, undefined, 1),
					key("covariancevariables", 3, undefined, 1),
					key("errorscaling", 6, undefined, 1),
					key("prescale", undefined, undefined, 1),
					seq("maxiter", choice(field("value", $._expression), "default")),
					seq("limit", choice(field("epsilon", $._expression), "default")),
					seq("limit_abs", field("epsilon_abs", $._expression)),
					seq("start-lambda", choice($._expression, "default")),
					seq("lambda-factor", choice($._expression, "default")),
					seq(
						"script",
						optional(choice(field("command", $._expression), "default")),
					),
					alias(choice("v4", "v5"), "version"),
				),
			),

		format: ($) =>
			seq(
				optional(alias(K.axes, "axis")),
				field("fmt_str", $._expression),
				optional(choice("numeric", "timedate", "geographic")),
			),

		grid: ($) =>
			seq(
				key("grid", 2, "arg"),
				repeat(
					choice(
						key1("tics", reg("m", 0, 1), K.axes, reg("tics", 0)),
						seq(
							key("polar", 2, undefined, 1),
							optional(field("angle", $._expression)),
						),
						choice(key("layerdefault", 6), "front", "back"),
						key("vertical", 4, undefined, 1),
						seq(
							field("major", $.style_opts),
							optional(seq(",", field("minor", $.style_opts))),
						),
						key("spiderplot", 6),
					),
				),
			),

		hidden3d: ($) =>
			choice(
				key("defaults", 3),
				repeat1(
					choice(
						"front",
						"back",
						seq(key("offset", 3, undefined, 1), field("offset", $._expression)),
						seq("trianglepattern", $._expression),
						seq(key("undefined", 5), $._expression),
						key("noundefined", 5),
						key("altdiagonal", 3, undefined, 1),
						key("bentover", 4, undefined, 1),
					),
				),
			),

		history: ($) =>
			repeat1(
				choice(
					field("size", seq("size", $._expression)),
					choice("quiet", key("numbers", 3)),
					choice("full", "trip"),
					key("default", 3),
				),
			),

		isosamples: ($) =>
			prec.left(seq($._expression, optional(seq(",", $._expression)))),

		isosurface: ($) =>
			choice(
				choice(key("mixed", 3), key("triangles", 6)),
				choice("noinsidecolor", seq(key("insidecolor", 6), $._expression)),
			),

		jitter: ($) =>
			repeat1(
				choice(
					seq(key("overlap", 4), $._expression),
					seq("spread", $._expression),
					seq("wrap", $._expression),
					choice("swarm", "square", key("vertical", 4)),
				),
			),

		key: ($) =>
			seq(
				key("key", 1, "arg"),
				prec.right(
					repeat(
						choice(
							choice("on", "off"),
							key("default", 3),
							key("enhanced", 3, undefined, 1),
							seq(key("autotitle", 1, $.autotitle, 1), optional(key("columnheader", 3, $.columnheader))),
							seq(key("box", 3, undefined, 1), optional($.style_opts)),
							seq(key("opaque", 6, undefined, 1), optional($._fillcolor)),
							seq(key("width", 1), field("increment", $._expression)),
							seq(key("height", 1), field("increment", $._expression)),
							choice(key("vertical", 3), key("horizontal", 3)),
							seq(key("maxcols", -1, $.maxcols), choice(key("auto", 1, $.auto), $._expression)),
							seq(key("maxrows", -1), choice(key("auto", 1, $.auto), $._expression)),
							seq(key("columns", 7), field("columns", $._expression)), // NOTE: limitation with columnheader, should be 3, not 7
							seq(key("keywidth", 4), optional($.system), $._expression), // NOTE: system is just graph & screen
							choice(key("Left", 1), key("Right", 1)),
							key("reverse", 3, undefined, 1),
							key("invert", 3, undefined, 1),
							seq("samplen", field("length", $._expression)),
							seq("spacing", field("spacing", $._expression)),
							prec.right(
								seq(key("title", 2, undefined, 1), optional($._expression)),
							),
							$.fontspec,
							$._textcolor,
							choice(key("inside", 3), key("outside", 1), "fixed"),
							key1("margin", /(l|r|t|b)/, reg("margin", 1)),
							atPos($),
							// simplfy next two
							choice(alias(K.c, "cen"), alias(K.l, "lef"), alias(K.r, "rig")),
							choice(alias(K.t, "top"), alias(K.b, "bot"), alias(K.c, "cen")),
							seq("offset", $.position),
						),
					),
				),
			),



		label: ($) =>
			prec.right(
				seq(
					key("label", 3, "arg"),
					optional(prec.dynamic(2, field("tag", $._tag_atom))),
					optional($.label_opts),
				),
			),

		linetype: ($) =>
			prec.left(
				seq(
					alias($.kw_lt, "arg"),
					optional(choice($.line_style, seq("cycle", $._expression))),
				),
			),

		link: ($) =>
			repeat1(
				choice(
					alias(choice("x2", "y2"), "axis"),
					seq("via", $._expression, "inverse", $._expression),
				),
			),

		loadpath: ($) => seq(key("loadpath", 4, "arg"), $._expression),

		locale: ($) =>
			prec.left(
				seq(
					key("loadpath", 3, "arg"),
					optional(field("locale", $._expression)),
				),
			),

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
			seq(
				key("mapping", 3, "arg"),
				optional(choice("cartesian", "spherical", "cylindrical")),
			),

		margin: ($) => seq(key1("arg", /(l|r|t|b)?/, reg("margins", 3)), $._margin),

		_margin: ($) =>
			prec.left(
				choice(
					seq(optional(seq(optional("at"), "screen")), $._expression),
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

		micro: ($) => prec.left(seq("micro", optional($._expression))),

		monochrome: ($) =>
			prec.left(seq(key("monochrome", 4, "arg"), optional($.line_style))),

		mouse: ($) =>
			repeat1(
				choice(
					seq(key("doubleclick", 2), $._expression),
					key("nodoubleclick", 4),
					key("zoomcoordinates", 6, undefined, 1),
					seq(
						key("zoomfactors", 6),
						optional(seq($._expression, optional(seq(",", $._expression)))),
					),
					"noruler",
					seq("ruler", optional(atPos($))),
					seq(
						alias(/polardistance(deg|tan)?/, "polardistance"),
						optional(choice("deg", "tan")),
					),
					"nopolardistance",
					seq("format", field("format", $._expression)),
					seq(
						"mouseformat",
						choice(
							seq("function", field("mouseformat_fn", $._expression)),
							field("mouseformat", $._expression),
						),
					),
					seq(key("labels", 3, undefined, 1), optional(field("labeloptions", $._expression))),
					key("zoomjump", 5, undefined, 1),
					key("verbose", 3, undefined, 1),
				),
			),

		multiplot: ($) =>
			seq(
				key("multiplot", 5, "arg"),
				repeat(
					choice(
						seq(
							key("title", 1),
							field("title", $._expression),
							optional($.fontspec),
							optional(key("enhanced", undefined, undefined, 1)),
						),
						seq(
							"layout",
							field("rows", $._expression),
							",",
							field("cols", $._expression),
						),
						choice("rowsfirst", "columnsfirst"),
						choice("downwards", "upwards"),
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
						alias(choice("previous", "next"), "prevnext"),
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
					key1("arg", "m", K.axes, reg("tics", -1)),
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
				"via",
				$._expression,
				"inverse",
				$._expression,
			),

		// set object <index> <type> <type-props> {front|back|behind|depthorder}
		//            {clip|noclip} {fc <colorspec>} {fs <fillstyle>}
		//            {default} {lw <w>} {dt <dashtype>}
		object: ($) =>
			seq(
				key("object", 3, "arg"),
				field("index", $._expression),
				optional(
					choice(
						// rectangle: from <pos> to <pos>  OR  center <pos> size <w>,<h>
						seq(
							key("rectangle", 3),
							optional(
								choice(
									seq("from", $.position, "to", $.position),
									seq(
										choice("at", "center"),
										$.position,
										"size",
										$._expression,
										",",
										$._expression,
									),
								),
							),
						),
						// circle: {at|center} <pos> {size <r>} {arc [b:e]} {no{wedge}}
						seq(
							key("circle", 4),
							optional(choice("at", "center")),
							$.position,
							optional(seq("size", $._expression)),
							optional(
								seq("arc", "[", $._expression, ":", $._expression, "]"),
							),
							optional(key("wedge", 2, undefined, 1)),
						),
						// ellipse: {at|center} <pos> {size <w>,<h>} {angle <a>} {units xy|xx|yy}
						seq(
							key("ellipse", 3),
							optional(choice("at", "center")),
							$.position,
							optional(seq("size", $._expression, ",", $._expression)),
							optional(seq("angle", $._expression)),
							optional(seq("units", alias(choice("xy", "xx", "yy"), "units_opt"))),
						),
						// polygon: from <pos> to <pos> {to <pos>}*
						seq(
							key("polygon", 3),
							"from",
							$.position,
							repeat1(seq("to", $.position)),
						),
					),
				),
				repeat(
					choice(
						choice("front", "back", "behind", "depthorder"),
						choice("clip", "noclip"),
						$._fillcolor,
						fillStyleOpt($),
						"default",
						$._sa,
						seq($._dt, $.dash_opts),
					),
				),
			),

		offsets: ($) =>
			seq(
				optional($.system), // NOTE: only needs graph
				field("left", $._expression),
				optional(
					seq(
						",",
						optional($.system),
						field("right", $._expression),
						optional(
							seq(
								",",
								optional($.system),
								field("top", $._expression),
								optional(
									seq(",", optional($.system), field("bottom", $._expression)),
								),
							),
						),
					),
				),
			),

		// set origin <x>,<y>  — lower-left corner of plot within terminal
		origin: ($) => seq($._expression, ",", $._expression),

		output: ($) => field("name", $._expression),

		overflow: ($) => choice("float", "NaN", "undefined"),

		palette: ($) =>
			seq(
				key("palette", 3, "arg"),
				repeat(
					choice(
						choice("gray", "color"),
						seq("gamma", field("gamma", $._expression)),
						// NOTE: next 3 are cmd_show only options
						key("gradient", 3),
						key("fit2rgbformulae", 7),
						seq(
							key("palette", 3),
							optional($._expression),
							optional(choice("float", "int", "hex")),
						),
						seq(
							key("rgbformulae", 3),
							field("r", $._expression),
							",",
							field("g", $._expression),
							",",
							field("b", $._expression),
						),
						seq(
							key("defined", 3),
							optional(
								surround(
									"()",
									sep(
										",",
										seq(
											field("gray", $._expression),
											field(
												"color",
												choice(
													field(
														"rgb",
														seq($._expression, $._expression, $._expression),
													),
													field("namehex", $._expression),
												),
											),
										),
									),
								),
							),
						),
						seq(
							"file",
							field("filename", $._expression),
							optional($.datafile_modifiers),
						),
						seq(key("colormap"), field("colormap_name", $._expression)),
						seq(
							key("functions", 4),
							field("R", $._expression),
							",",
							field("G", $._expression),
							",",
							field("B", $._expression),
						),
						seq(
							"cubehelix",
							optional(seq("start", field("start", $._expression))),
							optional(seq("cycles", field("cycles", $._expression))),
							optional(seq("saturation", field("sat", $._expression))),
						),
						"viridis",
						seq(
							key("model", 2),
							choice(
								"RGB",
								"CMY",
								seq(
									"HSV",
									optional(seq("start", field("radians", $._expression))),
								),
							),
						),
						choice(key("positive", 3), key("negative", 3)),
						choice("nops_allcF", "ps_allcF"),
						seq(key("maxcolors", 4), field("maxcolors", $._expression)),
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
									key("reverse", 3, undefined, 1),
									key("writeback", 3, undefined, 1),
									key("extend", 3, undefined, 1),
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
			seq(
				key("pixmap", 4, "arg"),
				field("index", $._expression),
				optional(
					choice(
						$.string_literal,
						seq("colormap", $._expression),
					),
				),
				repeat(
					choice(
						atPos($),
						seq("width", $._expression),
						seq("height", $._expression),
						seq("size", $._expression, ",", $._expression),
						choice("front", "back", "behind"),
						"center",
					),
				),
			),

		pm3d: ($) => seq(alias("pm3d", "arg"), optional($._pm3d)),

		_pm3d: ($) =>
			// recycle code for pm3d plot_style
			repeat1(
				choice(
					seq("at", alias(repeat1(choice("b", "s", "t")), "position")),
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
						key("hidden3d", 2, undefined, 1),
					),
					seq("flush", choice("begin", "center", "end")),
					key("ftriangles", undefined, undefined, 1),
					choice(seq("clip", optional("z")), "clip1in", "clip4in"),
					key("clipcb", undefined, undefined, 1),
					seq(
						"corners2color",
						alias(/(geo|har)?mean|rms|m(edian|in|ax)|c(1|2|3|4)/, "c2c"),
					),
					seq(
						key("lighting", undefined, undefined, 1),
						repeat(
							choice(
								seq("primary", field("fraction", $._expression)),
								seq("specular", field("fraction", $._expression)),
								seq("spec2", field("fraction", $._expression)),
							),
						),
					),
					seq(
						key("border", undefined, undefined, 1),
						optional("retrace"),
						optional($.style_opts),
					),
					choice("implicit", "explicit"),
					"map",
				),
			),

		pointintervalbox: ($) =>
			prec.left(
				seq(
					key("pointintervalbox", 8, "arg"),
					field("arg_opts", optional($._expression)),
				),
			),

		pointsize: ($) =>
			prec.left(
				seq(
					key("pointsize", 3, "arg"),
					field("arg_opts", optional(field("multiplier", $._expression))),
				),
			),

		polar: ($) =>
			prec.left(
				seq(
					"grid",
					repeat(
						choice(
							$.dgrid3d,
							seq("scale", $._expression),
							seq("theta", $.range_block),
							seq("r", $.range_block),
							seq(
								choice("gauss", "cauchy", "exp", "box", "hann"),
								optional("kdensity"),
								optional($._expression),
								optional(seq(",", $._expression)),
							),
						),
					),
				),
			),

		print: ($) => $._expression,

		psdir: ($) => $._expression,

		rgbmax: ($) => $._expression,

		samples: ($) => seq($._expression, optional(seq(",", $._expression))),

		size: ($) =>
			prec.left(
				repeat1(
					choice(
						choice(
							key("square", undefined, undefined, 1),
							seq(key("ratio", 2), $._expression),
							key("noratio", 4),
						),
						seq(
							field("xscale", $._expression),
							optional(seq(",", field("yscale", $._expression))),
						),
					),
				),
			),

		style: ($) =>
			prec.left(
				1,
				seq(
					key("style", 2, "arg"),
					optional(
						choice(
							seq(
								key("arrow", 3, "st_opt"),
								optional(field("index", $._expression)),
								choice(key("defaults", 3), $.arrow_opts),
							),
							seq(
								alias("boxplot", "st_opt"),
								repeat(
									choice(
										seq("range", field("range", $._expression)),
										seq("fraction", field("fraction", $._expression)),
										key("outliers", 3, undefined, 1),
										seq($._pt, field("pt", $._expression)),
										"candlesticks",
										"financebars",
										seq("medianlinewidth", field("medianlinewidth", $._expression)),
										seq("separation", field("separation", $._expression)),
										seq("labels", choice("off", "auto", "x", "x2")),
										"sorted",
										"unsorted",
									),
								),
							),
							seq(key("data", 1, "st_opt"), $.plot_style),
							fillStyleOpt($),
							seq(key("function", 1, "st_opt"), $.plot_style),
							seq(
								key("histogram", 4, "st_opt"),
								choice(
									seq(key("clustered", 5), optional(seq("gap", $._expression))),
									seq(
										key("errorbars", 5),
										repeat(
											choice(
												seq("gap", $._expression),
												$._sa,
											),
										),
									),
									key("rowstacked", 4),
									key("columnstacked", 7),
									key("nokeyseparators", 5),
									seq(key("title", 3), $.fontspec),
								),
							),
							seq(key("line", 1, "st_opt"), $.line_style),
							seq(
								key("circle", -2, "st_opt"),
								repeat(
									choice(
										seq(key("radius", 3), optional($.system), $._expression),
										key("wedge", undefined, undefined, 1),
										key("clip", undefined, undefined, 1),
									),
								),
							),
							seq(
								key("rectangle", 4, "st_opt"),
								repeat(
									choice(
										"front",
										"back",
										seq(key("linewidth", 5, "lw"), field("lw", $._expression)),
										seq(key("fillcolor", 5, "fc"), field("fc", $.colorspec)),
										fillStyleOpt($),
									),
								),
							),
							seq(key("ellipse", 3, "st_opt"), optional($.ellipse)),
							seq(
								key("parallelaxis", -4, "st_opt"),
								seq(optional(choice("front", "back")), optional($.style_opts)),
							),
							seq(
								key("spiderplot", 6, "st_opt"),
								repeat(
									choice(
										fillStyleOpt($),
										$._sa,
										seq(
											$._lt,
											field(
												"lt",
												choice($._expression, $.colorspec, "black", "background", "nodraw"),
											),
										),
										$._sa,
										$._linecolor,
										seq($._dt, field("dt", $.dash_opts)),
										seq($._pt, field("pt", $._expression)),
										seq($._ps, field("ps", $._expression)),
										$._sa,
										$._sa,
									),
								),
							),
							seq(
								alias("textbox", "st_opt"),
								seq(
									optional(field("index", $._expression)),
									repeat(
										choice(
											choice("opaque", "transparent"),
											$._fillcolor,
											seq(
												key("border", undefined, undefined, 1),
												optional($._linecolor),
											),
											$._sa,
											seq("margins", $._expression, ",", $._expression),
										),
									),
								),
							),
							seq(
								key("watchpoint", 5, "st_opt"),
								key("labels", -1, undefined, 1),
								optional($.label_opts),
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
					key("clip", undefined, undefined, 1),
				),
			),

		surface: ($) => choice("implicit", "explicit"),

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
						seq(key("title", undefined), $._expression),
						seq("position", $.position),
						seq(key("window"), $._expression),
						seq("name", $._expression),
						seq("fsize", $._expression),
						seq(key("width", undefined), $._expression),
						seq(key("pointsmax", undefined), $._expression),
						seq(key("fontsize", undefined), $._expression),
						seq(key("pointscale", undefined), $._expression),
						seq(key("scale", undefined), $._size),
						seq(key("plotsize", undefined), $._size),
						seq(key("charsize", undefined), $._size),
						seq("resolution", field("dpi", $._expression)),
						seq(
							key("palfuncparam", undefined),
							$._expression,
							optional(seq(",", $._expression)),
						),
						seq("aspect", $._expression, optional(seq(",", $._expression))),
						seq(key("fillchar", undefined), choice("solid", $._expression)),
						seq("jsdir", $._expression),
						// flags
						T_ENH,
						T_CROP,
						T_TRUECOLOR,
						T_INTERLACE,
						T_ANCHOR,
						T_GDSIZES,
						key("rotate", undefined, undefined, 1),
						key("timestamp", undefined, undefined, 1),
						key("attributes", undefined, undefined, 1),
						key("feed", undefined, undefined, 1),
						key("replotonresize", undefined, undefined, 1),
						key("antialias", undefined, undefined, 1),
						key("persist", undefined, undefined, 1),
						key("raise", undefined, undefined, 1),
						key("ctrl", undefined, undefined, 1),
						key("ctrlq", undefined, undefined, 1),
						key("close", undefined),
						key("reset"),
						key("eject", undefined),
						key("noproportional", undefined),
						key("default", undefined),
						key("originreset", undefined, undefined, 1),
						key("gparrows", undefined, undefined, 1),
						key("gppoints", undefined, undefined, 1),
						key("picenvironment", undefined, undefined, 1),
						key("tightboundingbox", undefined, undefined, 1),
						key("fulldoc", undefined, undefined, 1),
						key("standalone", undefined, undefined, 1),
						key("tikzarrows", undefined, undefined, 1),
						key("externalimages", undefined, undefined, 1),
						key("inlineimages", undefined),
						key("noanimate", undefined),
						key("auxfile", undefined, undefined, 1),
						key("clip", undefined, undefined, 1), // clip / noclip
						key("input", undefined),
						// output format / level / text
						key("eps", undefined),
						"pdf",
						"png",
						choice("level1", "leveldefault", "level3"),
						key("blacktext", undefined),
						key("colortext", undefined),
						key("colourtext", undefined, "colortext"),
						choice(seq("header", field("header", $._expression)), "noheader"),
						// orientation / mode / style
						choice(key("landscape", undefined), key("portrait", undefined)),
						"big", // "small" handled by T_GDSIZES (tiny/small/medium/large/giant)
						choice(key("solid", undefined), key("dashed", undefined)),
						choice(key("defaultplex", undefined), key("simplex", undefined), key("duplex", undefined)),
						choice("mitered", "beveled"),
						choice(key("mpoints", undefined), key("texpoints", undefined)),
						"texarrows",
						choice(key("smallpoints", undefined), key("tinypoints", undefined), key("normalpoints", undefined)),
						choice(key("textnormal", undefined), "textspecial", "texthidden", "textrigid"),
						choice("mono", "ansi", "ansi256", "ansirgb"),
						choice(key("pspoints", undefined), key("nopspoints", undefined)),
						choice(key("latex", undefined), key("tex"), key("context", undefined)),
						"mouse",
						choice("fixed", "dynamic"),
						seq(
							key("animate", undefined),
							repeat(choice(
								seq("delay", $._expression),
								seq("loop", $._expression),
								seq("quality", $._expression),
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
			return seq(
				field("width", seq($._expression, optional(unit))),
				",",
				field("height", seq($._expression, optional(unit))),
			);
		},
		mono_color: ($) =>
			choice(key("monochrome", 4), key("color", 3), key("colour", 3, "color")),
		line_drawing_method: ($) => choice(key("rounded", -2), "butt", "square"),
		fontscale: ($) => seq("fontscale", field("scale", $._expression)),
		background: ($) =>
			choice(
				seq(key("background", 5), field("color", $._expression)),
				key("nobackground", 7),
				key("transparent", 5, undefined, 1), // NOTE: some need 6 instead of 5
			),
		// ----------------------------------------------------------------
		termoption: ($) =>
			repeat1(
				choice(
					key("enhanced", undefined, undefined, 1),
					$.fontspec,
					$.fontscale,
					$._sa,
					$._sa,
					seq($._ps, $._expression),
				),
			),

		theta: ($) =>
			repeat1(
				choice(
					alias(K.r, "theta_dir"),
					alias(K.t, "theta_dir"),
					alias(K.l, "theta_dir"),
					alias(K.b, "theta_dir"),
					alias(/(counter)?clockwise|c?cw/, "theta_dir"),
				),
			),

		tics: ($) => $.tics_opts,

		timestamp: ($) =>
			prec.left(
				repeat1(
					choice(
						field("format", $._expression),
						alias(K.t, "top"),
						alias(K.b, "bot"),
						key("rotate", 3, undefined, 1),
						offsetPos($),
						$.fontspec,
						$._textcolor,
					),
				),
			),

		timefmt: ($) => field("format", $._expression),

		title: ($) =>
			prec.right(
				seq(
					key("title", 3, "arg"),
					optional(
						choice(
							seq(
								field("title", $._expression),
								repeat(
									choice(
										field("offset", offsetPos($)),
										field("at", atPos($)),
										$.fontspec,
										$._textcolor,
										key("enhanced", undefined, undefined, 1),
									),
								),
							),
							repeat1(
								choice(
									field("offset", offsetPos($)),
									field("at", atPos($)),
									$.fontspec,
									$._textcolor,
									key("enhanced", undefined, undefined, 1),
								),
							),
						),
					),
				),
			),

		vgrid: ($) => seq($.datablock, optional(seq("size", $._expression))),

		view: ($) =>
			prec.left(
				repeat1(
					choice(
						seq(
							$._expression,
							optional(
								seq(
									",",
									$._expression,
									optional(
										seq(",", $._expression, optional(seq(",", $._expression))),
									),
								),
							),
						),
						seq("map", optional(seq("scale", $._expression))),
						seq(
							"projection",
							optional(alias(choice("xy", "xz", "yz"), "plane")),
						),
						seq(
							key("equal", undefined, undefined, 1),
							optional(alias(choice("xy", "xyz"), "viewaxis")),
						),
						seq("azimuth", $._expression),
					),
				),
			),

		walls: ($) =>
			repeat1(
				choice(
					alias(choice("x0", "y0", "z0", "x1", "y1"), "wall"),
					fillStyleOpt($),
					$._fillcolor,
				),
			),

		xdata: ($) =>
			seq(key1("arg", K.axes, reg("data", 2)), optional(key("time", 1))),

		xdtics: ($) => key1("arg", K.axes, "d", reg("tics", -1)),

		xlabel: ($) =>
			seq(
				key1("arg", K.axes, reg("label", 3)),
				prec.right(
					repeat1(
						choice(
							field("label", $._expression),
							offsetPos($),
							seq(
								key("rotate", 3, undefined, 1),
								optional(
									choice(seq("by", field("angle", $._expression)), "parallel"),
								),
							),
							$._textcolor,
							$.fontspec,
							key("enhanced", undefined, undefined, 1),
						),
					),
				),
			),

		xmtics: ($) => key1("arg", K.axes, "m", reg("tics", -1)),

		xrange: ($) =>
			seq(
				key1("arg", K.axes, reg("range", 3)),
				repeat(
					choice(
						$.range_block,
						key("reverse", 3, undefined, 1),
						key("writeback", 3, undefined, 1),
						key("extend", 3, undefined, 1),
						"restore",
					),
				),
			),

		xtics: ($) =>
			prec.left(
				seq(key1("arg", K.axes, reg("tics", -1)), optional($.tics_opts)),
			),

		xyplane: ($) =>
			prec.left(
				seq(
					key("xyplane", 3, "arg"),
					field(
						"arg_opts",
						optional(
							choice(
								$._expression,
								seq("at", field("zval", $._expression)),
								seq("relative", field("val", $._expression)),
							),
						),
					),
				),
			),

		zero: ($) => prec.left($._expression),

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
					key("plot", 1),
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
						key("output", 3, undefined, 1),
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
				seq(alias("test", "cmd"), optional(choice("palette", "terminal"))),
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
								seq("array", "=", field("array", sep(":", $.parameter_list))),
								seq("record", "=", field("record", $._expression)),
								seq("format", "=", field("format", $._expression)),
								seq("filetype", "=", field("filetype", $.identifier)),
								seq(
									choice("origin", "center"),
									"=",
									field("origin_center", sep(":", $.parameter_list)),
								),
								seq(
									choice("dx", "dy", "dz"),
									"=",
									field("dxyz", sep(":", $._expression)),
								),
								"flipx",
								"flipy",
								"flipz",
								"transpose",
								seq("scan", "=", field("scan", $.identifier)),
								seq("rotate", "=", field("rotate", $._expression)),
								seq("perpendicular", "=", field("perpendicular", sep(":", $._expression))),
								seq(key("endian", 3), "=", field("endian", choice("little", "big", "default", "swap", "swab", "middle", "pdp"))),
								seq("skip", "=", field("skip_bytes", sep(":", $._expression))),
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
				"smooth",
				repeat(
					choice(
						"unique",
						"frequency",
						"fnormal",
						"cumulative",
						"cnormal",
						key("csplines", -1),
						key("acsplines", -1),
						key("mcsplines", -1),
						"path",
						"bezier",
						"sbezier",
						seq(
							"kdensity",
							optional(
								seq(
									choice("bandwidth", "period"),
									field("bandwidth_period", $._expression),
								),
							),
						),
						"unwrap",
					),
				),
			),

		_bins: ($) =>
			prec.right(
				repeat1(
					choice(
						seq("bins", optional(seq("=", $._expression))),
						seq("binrange", $.range_block),
						seq("binwidth", "=", $._expression),
						seq("binvalue", optional(seq("=", choice("sum", "avg")))),
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
								choice($._expression, $.colorspec, "black", "bgnd", "background", "nodraw"),
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
						key("nohidden3d", -2),
						"nocontours",
						key("nosurface", 6),
						key("palette", 3),
						$.fontspec,
						key("enhanced", 3, undefined, 1),
						choice(alias(K.c, "cen"), alias(K.l, "lef"), alias(reg("right", 2), "rig")),
						seq(key("rotate", 3, undefined, 1), optional(choice(seq("by", $._expression), "variable"))),
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
						"fixed",
						choice("filled", "empty", "nofilled", "noborder"),
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
						key("rotate", 3, undefined, 1),
						optional(
							choice(
								seq("by", field("angle", $._expression)),
								key("variable", 3),
							),
						),
					),
					$.fontspec,
					key("enhanced", undefined, undefined, 1),
					choice("front", "back"),
					$._textcolor,
					choice(seq("point", field("point", $.line_style)), "nopoint"),
					field("offset", offsetPos($)),
					choice(
						key("noboxed", -2),
						seq(
							"boxed",
							optional(field("boxstyle", seq("bs", $._expression))),
						),
					),
					"hypertext",
				),
				),
			),

		tics_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						alias(choice("axis", "border"), "axis"),
						key("mirror", undefined, undefined, 1),
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
							seq(key("rotate", 3), seq("by", field("angle", $._expression))),
							key("norotate", 5),
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
						key("enhanced", undefined, undefined, 1),
						alias(choice("numeric", "timedate", "geographic"), "type"),
						key("logscale", 3, "log", 1),
						key("rangelimited", 5, undefined, 1),
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
								choice($._expression, $.colorspec, "black", "bgnd", "background", "nodraw"),
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
							key("border", 2, undefined, 1),
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
					key("index", 1),
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
					"every",
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
					key("using", 1),
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

		system: (_) =>
			choice(
				key("first", 3),
				key("second", 3),
				key("graph", 2),
				key("screen", 2),
				key("character", 4),
				"polar", // NOTE: v6 not in docs but in examples
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
				/\\(?:[ \t]*\n|[\\'"nrtabu]|\d{3}|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4,8}|.)/
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
					"sum",
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
