/*
 * @file Gnuplot grammar for tree-sitter.
 * @author Dai López Jacinto <dpezto@gmail.com>
 * @see {@link http://gnuplot.info/docs_6.0/Gnuplot_6.pdf}
 * */

const PREC = {
	// ASSIGNMENT: 16,
	// COMMAND: 15,
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
	SERIAL: -2, // a,b
};

const ESCAPE_SEQUENCE = seq(
	"\\",
	choice(
		/[^uUx0-7]/,
		/[uU][0-9a-fA-F]{1,6}/,
		/[0-7]{1,3}/,
		/x[0-9a-fA-F]{2}/,
		/['"]/,
	),
);

const FMT_SEQUENCE = seq(
	"%",
	choice(
		/%?/, // HACK: % alone should be $._string_content
		/\*?(lf|\d+)/, // p. 136-137
		/[-+\s]{0,3}\d*(\.\d+)?[a-zA-Z]{1,2}/, // p. 169-171
		/\*?\d*(uchar|int|float)/, // p. 122
	),
);

const IDENTIFIER =
	/[^\d\s\-\\\.\{\}\[\]()<>%&#$@=+*/^?!'":,;|*`][^\s\-\\\.\{\}\[\]()<>%&#$@=+*/^?!'":,;|*`]*/;

const K = {
	axes: /(x|y|z|x2|y2|cb|r|t|u|v|xy|vx|vy|vz)/, // NOTE: all the options in one. vx, vy, vz just for set ()range
	zaxes: /(x|y|z|x2|y2)?/,
	// TODO: revisar /K\.[lrtbc][,)] y sus alias
	// tal vez se puede simplificar mucho
	l: reg("left", 1),
	r: reg("right", 1),
	t: reg("top", 1),
	b: reg("bottom", 1),
	c: reg("center", 1),
	as: alias(reg("arrowstyle", 10, "as"), "as"),
	dl: alias(reg("dashlength", 5, "dl"), "dl"),
	dt: alias(reg("dashtype", 5, "dt"), "dt"),
	fc: alias(reg("fillcolor", 5, "fc"), "fc"),
	fs: alias(reg("fillstyle", 4, "fs"), "fs"),
	lc: alias(reg("linecolor", 5, "lc"), "lc"),
	ls: alias(reg("linestyle", 5, "ls"), "ls"),
	lt: alias(reg("linetype", 8, "lt"), "lt"),
	lw: alias(reg("linewidth", 5, "lw"), "lw"),
	pi: alias(reg("pointinterval", 6, "pi"), "pi"),
	pn: alias(reg("pointnumber", 6, "pn"), "pn"),
	ps: alias(reg("pointsize", 6, "ps"), "ps"),
	pt: alias(reg("pointtype", 6, "pt"), "pt"),
	tc: alias(reg("textcolor", 5, "tc"), "tc"),
};

// TODO: check the alias of "no..." options to simplify highlgihts query

module.exports = grammar({
	name: "gnuplot",

	externals: ($) => [
		$.datablock_start,
		$.datablock_end,
		// $._string_start,
		// $._string_content,
		// $._string_end,
	],

	extras: ($) => [$.comment, /\s|\\|;/],

	word: ($) => $.identifier,

	// conflicts: ($) => [[$.plot_element]],

	rules: {
		source_file: ($) => repeat($._statement),

		_statement: ($) =>
			choice($._command, $.assignment, $.macro, $.datablock_definition),

		_command: ($) =>
			field(
				"command",
				choice(
					// $.c_bind, // TODO: p. 60 mouse input v6.1
					$.c_break,
					$.c_cd,
					// $.c_call,
					$.c_clear,
					$.c_continue,
					$.c_do,
					$.c_eval,
					$.c_exit,
					$.c_fit,
					// $.c_help, // NOTE: only useful in the CLI
					// $.c_history,
					$.c_if,
					// $.c_import,
					$.c_load,
					$.c_lower,
					$.c_pause,
					$.c_plot,
					$.c_print, // c_printerr
					$.c_pwd,
					$.c_raise,
					$.c_refresh,
					$.c_replot,
					$.c_reread, // Deprecated
					$.c_reset,
					$.c_save,
					$.c_set,
					$.c_show,
					$.c_splot,
					$.c_stats,
					$.c_system,
					$.c_test,
					$.c_toggle,
					$.c_undefine,
					$.c_unset,
					$.c_vclear,
					$.c_vfill,
					$.c_while,
				),
			),

		c_break: ($) => "break",

		c_cd: ($) => seq("cd", $._expression),

		c_clear: ($) => key("clear", 2),

		c_continue: ($) => "continue",

		c_do: ($) => seq("do", $.for_block, surround("{}", repeat($._statement))),

		c_eval: ($) => seq(key("evaluate", 4), $._expression),

		c_exit: ($) =>
			prec.left(
				seq(
					choice(key("exit", 2), key("quit", 1)),
					choice(
						"gnuplot",
						seq(choice("message", "status"), optional($._expression)),
					),
				),
			),

		c_fit: ($) =>
			seq(
				key("fit", 2), // HACK: so one can define a function/variable called f. (should be key("fit", 1))
				optional($.range_block),
				field("func", $.function),
				field("data", $._expression),
				optional($.datafile_modifiers),
				repeat(
					choice(
						"unitweights",
						/(y|xy|z)err(o(r)?)?/,
						seq("errors", sep(",", $._expression)),
					),
				),
				"via",
				choice(
					field("parameter_file", $._expression),
					field("var", seq($._expression, repeat1(seq(",", $._expression)))),
				),
			),

		// c_help: ($) => prec.left(seq(key("help", 2), optional($._expression))), // HACK: so one can define a function/variable called h. (should be key("help", 1))

		c_if: ($) =>
			prec.left(
				seq(
					"if",
					field(
						"conditions",
						surround("()", choice($.assignment, $._expression)), // TODO: check, unify whith what goes in using?
					),
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

		c_load: ($) => seq(key("load", 1), $._expression),

		c_lower: ($) => prec.left(seq(key("lower", 3), optional($._expression))),

		c_pause: ($) =>
			prec.right(
				seq(
					"pause",
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

		c_plot: ($) =>
			seq(key("plot", 1), optional("sample"), sep(",", $.plot_element)),

		plot_element: ($) =>
			// p. 125
			prec.left(
				1,
				seq(
					optional($.for_block),
					repeat(field("sample", $.range_block)),
					choice(
						// TODO: rework this, now I have serial expression
						// seq(
						// 	sep(",", $.assignment),
						// 	optional(","),
						// 	$._expression, // $.function,
						// 	optional($.datafile_modifiers),
						// ),
						seq(
							optional(field("sampling_range", $.range_block)),
							field("function", choice($.function)), // FIX: should accept $._expression
						),
						seq(
							// p. 177 keyentry
							field("data", choice($._expression, "keyentry")),
							optional($.datafile_modifiers),
						),
						// p. 94
						"newspiderplot",
						// TODO: add newhistogram p. 84
						// newhistogram {"<title>" {font "name,size"} {tc <colorspec>}}
						// {lt <linetype>} {fs <fillstyle>} {at <x-coord>}
						"newhistogram",
					),
					repeat(
						choice(
							seq(
								"axes",
								alias(choice("x1y1", "x2y2", "x1y2", "x2y1"), "axes_opts"),
							),
							// FIX:
							seq(
								key("title", 1, undefined, 1),
								prec.right(
									seq(
										optional(
											field(
												"title",
												choice(
													$._expression,
													key("columnheader", 3, $.columnheader),
												),
											),
										),
										repeat(
											choice(
												seq("at", choice("beginning", "end")), // TODO: add at <x>,<y> p.142
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
					// NOTE: line, point, and text properties
					key("lines", 1, "plt_st"),
					key("points", 1, "plt_st"),
					key1("plt_st", reg("linespoints", 6, "lp")),
					key("financebars", 3, "plt_st"),
					key("dots", 1, "plt_st"),
					key("impulses", 1, "plt_st"),
					seq(key("labels", 3, "plt_st"), optional($.label_opts)),
					key("surface", 3, "plt_st"),
					key("steps", 2, "plt_st"),
					key("fsteps", 6, "plt_st"),
					key("histeps", 7, "plt_st"),
					key("arrows", 3, "plt_st"),
					seq(key("vectors", 3, "plt_st"), optional($.arrow_opts)),
					key("sectors", 3, "plt_st"),
					key1("plt_st", /(x|y|xy)/, reg("errorbars", -1)),
					key1("plt_st", /(x|y|xy)/, "errorlines"),
					key("parallelaxes", 12, "plt_st"),
					// NOTE: line, point, text and fill properties
					key("boxes", 5, "plt_st"),
					key("boxerrorbars", 12, "plt_st"),
					key("boxxyerror", 10, "plt_st"),
					seq(
						key("isosurface", 10, "plt_st"),
						optional(seq("level", $._expression)),
					),
					key("boxplot", 7, "plt_st"),
					seq(
						key("candlesticks", 12, "plt_st"),
						optional(key("whiskerbars", -1)),
					),
					key("circles", 7, "plt_st"),
					key("zerrorfill", 6, "plt_st"),
					key("contourfill", 11, "plt_st"),
					key("spiderplot", 6, "plt_st"),
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
					key("histograms", 4, "plt_st"),
					seq(key("image", 3, "plt_st"), optional("pixels")),
					seq(key("pm3d", 4, "plt_st"), optional(alias($._pm3d, $.pm3d))),
					key("rgbalpha", 8, "plt_st"),
					key("rgbimage", 8, "plt_st"),
					key("polygons", 8, "plt_st"),
					// NOTE: special styles produce no immediate plot
					key("table", 5, "plt_st"),
					key("mask", 4, "plt_st"),
				),
			),

		c_print: ($) => seq(choice("print", "printerr"), $._expression),

		c_pwd: ($) => "pwd",

		c_raise: ($) => prec.left(seq(key("raise", 2), optional($._expression))),

		c_replot: ($) => key("replot", 3),

		c_refresh: ($) => key("refresh", 3),

		c_reread: ($) => key("reread", 3),

		c_reset: ($) => seq("reset", optional(choice("bind", "errors", "session"))),

		c_save: ($) =>
			seq(
				key("save", 2),
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

		c_set: ($) =>
			// prec.left(
			seq(
				seq(key("set", 2, "cmd"), optional($.for_block)),
				$._argument_set_show,
			),
		// ),

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
					$.multiplot,
					$.mxtics,
					// seq(optional($.nonlinear)), // p. 192 v6.1
					// seq(optional($.object)), // p. 193 v6.1
					seq(key("offsets", 3, "arg"), field("arg_opts", optional($.offsets))),
					// seq(optional($.origin)), // p. 196 v6.1
					seq(key("output", 1, "arg"), field("arg_opts", optional($.output))),
					seq(
						alias("overflow", "arg"),
						field("arg_opts", optional($.overflow)),
					),
					$.palette,
					key("parametric", 2, "arg"),
					$.paxis,
					// seq(optional($.pixmap)), // p. 204 v6.1
					$.pm3d,
					seq(
						key("pointintervalbox", 8, "arg"),
						field("arg_opts", optional($.pointintervalbox)),
					),
					seq(
						key("pointsize", 3, "arg"),
						field("arg_opts", optional($.pointsize)),
					),
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
					seq(key("xyplane", 3, "arg"), field("arg_opts", optional($.xyplane))),
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
							optional(field("tag", $._expression_tag)), // HACK: should be _expression
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
					alias(K.dt, "arg"),
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
							seq(
								key("separator", 3),
								choice(
									key("whitespace", 5),
									"tab",
									"comma",
									field("separator", $._expression),
								),
							),
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
			// FIX:
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
							// choice("on", "off"),
							// key("default", 3),
							// key("enhanced", 3, undefined, 1),
							seq(
								key("autotitle", 1, $.autotitle, 1), // FIX:
								optional(key("columnheader", 3, $.columnheader)), // FIX:
							),
							// seq(key("box", 3, undefined, 1), optional($.style_opts)),
							// seq(key("opaque", 6, undefined, 1), optional($._fillcolor)),
							// seq(key("width", 1), field("increment", $._expression)),
							// seq(key("height", 1), field("increment", $._expression)),
							// choice(key("vertical", 3), key("horizontal", 3)),
							seq(
								choice(key("maxcols", -1, $.maxcols), key("maxrows", -1)),
								prec(
									1,
									optional(choice($._expression, key("auto", 1, $.auto))),
								), // FIX: pedos con autotitle
							),
							seq(key("columns", 3), field("columns", $._expression)), // FIX: pedos con autotitle columnheader
							// seq(key("keywidth", 4), optional($.system), $._expression), // NOTE: system is just graph & screen
							// choice(key("Left", 1), key("Right", 1)),
							// key("reverse", 3, undefined, 1),
							// key("invert", 3, undefined, 1),
							// seq("samplen", field("length", $._expression)),
							// seq("spacing", field("spacing", $._expression)),
							// prec.right(
							// 	seq(key("title", 2, undefined, 1), optional($._expression)),
							// ),
							// $.fontspec,
							// $._textcolor,
							// choice(key("inside", 3), key("outside", 1), "fixed"),
							// key1("margin", /(l|r|t|b)/, reg("margin", 1)),
							// seq("at", $.position),
							// // simplfy next two
							// choice(alias(K.c, "cen"), alias(K.l, "lef"), alias(K.r, "rig")),
							// choice(alias(K.t, "top"), alias(K.b, "bot"), alias(K.c, "cen")),
							// seq("offset", $.position),
						),
					),
				),
			),

		label: ($) =>
			prec.right(
				seq(
					key("label", 3, "arg"),
					optional(field("tag", $._expression_tag)), // HACK: should be _expression
					optional($.label_opts),
				),
			),

		linetype: ($) =>
			prec.left(
				seq(
					alias(K.lt, "arg"),
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
					// TODO: complete and add to query
					// {noruler | ruler {at x,y}}
					// {polardistance{deg|tan} | nopolardistance}
					// {format <string>} $._expression
					// {mouseformat <int> | <string> | function <f(x,y)>} $._expression
					// {{no}labels {"labeloptions"}}
					// {{no}zoomjump} {{no}verbose}
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
						seq(key("offset", 3), $.position),
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

		// nonlinear: $ => // p.191

		// object: $ => // p.60, p.192
		// set object <index>
		//            <object-type> <object-properties>
		//            {front|back|behind|depthorder}
		//            {clip|noclip}
		//            {fc|fillcolor <colorspec>} {fs <fillstyle>}
		//            {default} {lw|linewidth <width>} {dt|dashtype <dashtype>}

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

		// origin: $ => // p.195
		// set origin <x-origin>,<y-origin>

		output: ($) => field("name", $._expression),

		overflow: ($) => choice("float", "NaN", "undefined"),

		palette: ($) =>
			seq(
				key("palette", 3, "arg"),
				repeat(
					choice(
						choice("gray", "color"),
						seq("gamma", field("gamma", $._expression)),
						// NOTE: next 3 are c_show only options
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

		paxis: ($) =>
			// FIX:
			seq(
				alias("paxis", "arg"),
				field("axisno", $._expression_tag), // TODO: should be _expression
				repeat(
					choice(
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
						seq(key("tics", 3), optional($.tics_opts)),
						seq(key("label", 3), optional($.label_opts)),
					),
				),
			),

		// pixmap: $ =>
		// <index> {"filename" | colormap <name>}
		//         at <position>
		//         {width <w> | height <h> | size <w>,<h>}
		//         {front|back|behind} {center}

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

		pointintervalbox: ($) => $._expression,

		pointsize: ($) => field("multiplier", $._expression),

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
								key("arrow", 3),
								optional(field("index", $._expression)),
								choice(key("defaults", 3), $.arrow_opts),
							),
							seq("boxplot"), // TODO: p. 214
							// set style boxplot {range <r> | fraction <f>}
							//                   {{no}outliers} {pointtype <p>}
							//                   {candlesticks | financebars}
							//                   {medianlinewidth <width>}
							//                   {separation <x>}
							//                   {labels off | auto | x | x2}
							//                   {sorted | unsorted}
							seq(key("data", 1), $.plot_style),
							seq(K.fs, $.fill_style),
							seq(key("function", 1), $.plot_style),
							seq(
								key("histogram", 4),
								choice(
									seq(key("clustered", 5), optional(seq("gap", $._expression))),
									seq(
										key("errorbars", 5),
										repeat(
											choice(
												seq("gap", $._expression),
												seq(K.lw, $._expression),
											),
										),
									),
									key("rowstacked", 4),
									key("columnstacked", 7),
									key("nokeyseparators", 5),
									seq(key("title", 3), $.fontspec),
								),
							),
							seq(key("line", 1), $.line_style),
							seq(
								key("circle", -2),
								repeat(
									choice(
										seq(key("radius", 3), optional($.system), $._expression),
										key("wedge", undefined, undefined, 1),
										key("clip", undefined, undefined, 1),
									),
								),
							),
							seq(key("rectangle", 4)), // TODO: p. 218
							// set style rectangle {front|back} {lw|linewidth <lw>}
							//                     {fillcolor <colorspec>} {fs <fillstyle>}
							seq(key("ellipse", 3), optional($.ellipse)),
							seq(
								key("parallelaxis", -4),
								seq(optional(choice("front", "back")), optional($.style_opts)),
							),
							seq(
								key("spiderplot", 6),
								repeat(
									choice(
										seq(K.fs, $.fill_style),
										seq(K.ls, field("ls", $._expression)),
										seq(
											K.lt,
											field(
												"lt",
												choice($._expression, $.colorspec, "black", "nodraw"),
											),
										),
										seq(K.lw, field("lw", $._expression)),
										$._linecolor,
										seq(K.dt, field("dt", $.dash_opts)),
										seq(K.pt, field("pt", $._expression)),
										seq(K.ps, field("ps", $._expression)),
										seq(K.pi, field("pi", $._expression)),
										seq(K.pn, field("pn", $._expression)),
									),
								),
							),
							seq(
								"textbox",
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
											seq(K.lw, $._expression),
											seq("margins", $._expression, ",", $._expression),
										),
									),
								),
							),
							seq(
								key("watchpoint", 5),
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
							// NOTE: same as in datafile, simplify?
							seq(
								key("separator", 3),
								choice(key("whitespace", 5), "tab", "comma", $._expression),
							),
						),
					),
				),
			),

		terminal: ($) =>
			seq(
				key("terminal", 1, "arg"),
				optional(choice($._terminal_type, "push", "pop")),
			),

		_terminal_type: ($) =>
			prec.left(
				choice(
					seq(key("cairolatex", 3, "name"), optional($.t_cairolatex)),
					seq(key("canvas", 3, "name"), optional($.t_canvas)),
					seq(key("cgm", 2, "name"), optional($.t_cgm)),
					seq(key("context", 2, "name"), optional($.t_context)),
					seq(key("domterm", 2, "name"), optional($.t_domterm)),
					seq(key("dumb", 2, "name"), optional($.t_dumb)),
					key("dxf", 2, "name"),
					seq(key("emf", 2, "name"), optional($.t_emf)),
					seq(key("epscairo", 1, "name"), optional($.t_epscairo)),
					seq(key("epslatex", 4, "name"), optional($.t_epslatex)),
					seq(key("fig", 1, "name"), optional($.t_fig)),
					seq(key("gif", 1, "name"), optional($.t_gif)),
					seq(key("hpgl", 1, "name"), optional($.t_hpgl)),
					seq(key("jpeg", 1, "name"), optional($.t_jpeg)),
					seq(key("kittycairo", -4, "name"), optional($.t_kittycairo)),
					seq(key("kittygd", -1, "name"), optional($.t_kittygd)),
					seq(
						key("lua", 1, "name"),
						optional(choice($.t_lua, seq("tikz", $.t_tikz))),
					),
					seq(key("pcl5", 2, "name"), optional($.t_pcl5)),
					seq(key("pdfcairo", 2, "name"), optional($.t_pdfcairo)),
					seq(key("pic2e", 2, "name"), optional($.t_pic2e)),
					seq(alias("png", "name"), optional($.t_png)),
					seq(key("pngcairo", 4, "name"), optional($.t_pngcairo)),
					seq(key("postscript", 2, "name"), optional($.t_postscript)),
					seq(
						key1("name", reg("pslatex", 3), /|/, reg("pstex", -1)),
						optional($.t_pslatex),
					),
					seq(key("qt", 1, "name"), optional($.t_qt)),
					seq(key("sixelgd", 1, "name"), optional($.t_sixelgd)),
					seq(key("svg", 2, "name"), optional($.t_svg)),
					alias(/tek4(0|1|2)\d\d/, "name"),
					seq(key("tikz", 2, "name"), optional($.t_tikz)),
					key("unknown", 1, "name"),
					seq(key("webp", 1, "name"), optional($.t_webp)),
					seq(key("wxt", 2, "name"), optional($.t_wxt)),
					seq(key("x11", 1, "name"), optional($.t_x11)),
				),
			),

		t_cairolatex: ($) =>
			repeat1(
				choice(
					choice("eps", "pdf", "png"),
					choice("standalone", "input"),
					choice("blacktext", "colortext", "colourtext"),
					choice(seq("header", field("header", $._expression)), "noheader"),
					$.mono_color,
					key("crop", undefined, undefined, 1),
					$.background,
					$.fontspec,
					$.fontscale,
					seq(K.lw, $._expression),
					$.line_drawing_method,
					seq(K.dl, $._expression),
					seq(K.ps, $._expression),
					$.canvas_size,
					seq("resolution", field("dpi", $._expression)),
				),
			),
		t_canvas: ($) =>
			repeat1(
				choice(
					$.canvas_size,
					$.background,
					$.fontspec,
					seq("fsize", $._expression),
					key("enhanced", 3, undefined, 1),
					seq(K.lw, $._expression),
					$.line_drawing_method,
					seq(K.dl, $._expression),
					seq(key("title", 2), $._expression),
					// {standalone {mousing} | name '<funcname>'}
					// {jsdir 'URL/for/javascripts'}
				),
			),
		t_cgm: ($) =>
			repeat1(
				choice(
					$.mono_color,
					choice(key("solid", 1), key("dashed", 2)),
					key("rotate", 1, undefined, 1),
					choice(key("landscape", 2), key("portrait", 2)),
					seq(key("width", 2), $._expression),
					seq(K.lw, field("lw", $._expression)),
					seq(K.dl, field("dl", $._expression)),
					$.fontspec,
					$.background,
				),
			),
		t_context: ($) =>
			repeat1(
				choice(
					key("default", 1),
					$.canvas_size,
					choice(key("input", 3), key("standalone", 5)),
					key("timestamp", 4, undefined, 1),
					choice("noheader", seq("header", field("header", $._expression))),
					$.mono_color,
					choice("rounded", "mitered", "beveled"),
					$.line_drawing_method,
					choice(key("solid", 1), key("dashed", 2)),
					seq(K.dl, field("dl", $._expression)),
					seq(K.lw, field("lw", $._expression)),
					$.fontscale,
					choice(key("mpoints", 2), key("texpoints", 3)),
					choice(key("inlineimages", 6), key("externalimages", 8)),
					$.fontspec,
				),
			),
		t_domterm: ($) => repeat1(choice()),
		t_dumb: ($) =>
			repeat1(
				choice(
					$.canvas_size,
					key("feed", 1, undefined, 1),
					seq("aspect", $._expression, optional(seq(",", $._expression))),
					key("enhanced", 3, undefined, 1),
					seq(key("fillchar", 4), choice("solid", $._expression)),
					key("attributes", 4, undefined, 1),
					choice("mono", "ansi", "ansi256", "ansirgb"),
				),
			),
		t_emf: ($) => repeat1(choice()),
		t_epscairo: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					$.mono_color,
					$.fontspec,
					$.fontscale,
					seq(K.lw, $._expression),
					$.line_drawing_method,
					seq(K.dl, $._expression),
					$.background,
					$.canvas_size,
				),
			),
		t_epslatex: ($) =>
			repeat1(
				choice(
					choice("standalone", "input"),
					// {level1 | leveldefault | level3}
					$.mono_color,
					$.background,
					seq(K.dl, $._expression),
					seq(K.lw, $._expression),
					seq(K.ps, $._expression),
					$.line_drawing_method, // no square
					key("clip", undefined, undefined, 1),
					// {palfuncparam <samples>{,<maxdeviation>}}
					$.canvas_size,
					choice(seq("header", field("header", $._expression)), "noheader"),
					choice("blacktext", "colortext", "colourtext"),
					$.fontspec,
					$.fontscale,
				),
			),
		t_fig: ($) => repeat1(choice()),
		t_gif: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					$.line_drawing_method, // NOTE: not square
					seq(K.lw, $._expression),
					seq(K.dl, $._expression),
					choice("tiny", "small", "medium", "large", "giant"),
					$.fontspec,
					$.fontscale,
					$.canvas_size,
					key("crop", undefined, undefined, 1),
					$.background,
					seq(
						key("animate", 4),
						repeat(
							choice(
								seq(key("delay"), $._expression),
								seq(key("loop"), $._expression),
							),
						),
					),
				),
			),
		t_hpgl: ($) => repeat1(choice()),
		t_jpeg: ($) => repeat1(choice()),
		t_kittycairo: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					$.mono_color,
					$.fontspec,
					$.fontscale,
					seq(K.lw, $._expression),
					$.line_drawing_method,
					seq(K.dl, $._expression),
					$.background,
					choice(key("anchor"), key("scroll")),
					$.canvas_size,
				),
			),
		t_kittygd: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					key("truecolor", 4, undefined, 1),
					$.line_drawing_method,
					seq(K.lw, $._expression),
					seq(K.dl, $._expression),
					$.fontspec,
					$.fontscale,
					$.canvas_size,
					choice(key("anchor"), key("scroll")),
					$.background,
				),
			),
		t_lua: ($) => seq(field("name", $._expression)),
		t_pcl5: ($) => repeat1(choice()),
		t_pdfcairo: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					$.mono_color,
					$.fontspec,
					$.fontscale,
					seq(K.lw, $._expression),
					$.line_drawing_method,
					seq(K.dl, $._expression),
					$.background,
					$.canvas_size,
				),
			),
		t_pic2e: ($) => repeat1(choice()),
		t_png: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					key("interlace", 5, undefined, 1),
					key("truecolor", 4, undefined, 1),
					$.line_drawing_method, // NOTE: not square
					seq(K.lw, $._expression),
					seq(K.dl, $._expression),
					choice("tiny", "small", "medium", "large", "giant"),
					$.fontspec,
					$.fontscale,
					$.canvas_size,
					$.background,
				),
			),
		t_pngcairo: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					$.mono_color,
					key("crop", undefined, undefined, 1),
					$.background,
					$.fontspec,
					$.fontscale,
					seq(K.lw, $._expression),
					$.line_drawing_method,
					seq(K.dl, $._expression),
					seq(K.ps, $._expression),
					$.canvas_size,
				),
			),
		t_postscript: ($) => repeat1(choice()),
		t_pslatex: ($) =>
			repeat1(
				choice(
					key("rotate", undefined, undefined, 1),
					key("auxfile", undefined, undefined, 1),
					choice("level1", "leveldefault", "level3"),
					$.mono_color,
					$.background,
					seq(K.dl, $._expression),
					seq(K.lw, $._expression),
					seq(K.ps, $._expression),
					$.line_drawing_method, // NOTE: not square
					key("clip", undefined, undefined, 1),
					// {palfuncparam <samples>{,<maxdeviation>}}
					$.canvas_size,
					$.fontscale,
				),
			),
		t_qt: ($) =>
			prec.left(
				repeat1(
					choice(
						field("n", $._expression),
						$.canvas_size,
						seq("position", $.position),
						seq(key("title", 2), $._expression),
						$.fontspec,
						key("enhanced", 3, undefined, 1),
						$.line_drawing_method, // NOTE: not square
						key("replotonresize", 3, undefined, 1),
						key("antialias", 2, undefined, 1),
						seq(K.lw, $._expression),
						seq(K.dl, $._expression),
						key("persist", 3, undefined, 1),
						key("raise", 3, undefined, 1),
						key("ctrl", 2, undefined, 1),
						key("close", 2),
						seq(key("widget", 1), $._expression),
					),
				),
			),
		t_sixelgd: ($) =>
			repeat1(
				choice(
					key("enhanced", 3, undefined, 1),
					key("truecolor", 4, undefined, 1),
					$.line_drawing_method, // NOTE: not square
					seq(K.dl, $._expression),
					seq(K.lw, $._expression),
					choice("tiny", "small", "medium", "large", "giant"),
					$.fontspec,
					$.fontscale,
					$.canvas_size,
					choice(key("anchor"), key("scroll")),
					$.background,
				),
			),
		t_svg: ($) =>
			repeat1(
				choice(
					$.canvas_size,
					choice("fixed", "dynamic"),
					"mouse",
					choice("standalone", seq("jsdir", $._expression)),
					seq("name", $._expression),
					$.fontspec,
					key("enhanced", 3, undefined, 1),
					$.fontscale,
					$.line_drawing_method, // NOTE: not square
					choice("solid", "dashed"),
					seq(K.lw, $._expression),
					seq(K.dl, $._expression),
					$.background,
				),
			),
		t_tikz: ($) =>
			repeat1(
				choice(
					choice(key("latex", 1), key("tex"), key("context", 3)),
					$.mono_color,
					key("originreset", 6, undefined, 1),
					key("gparrows", 5, undefined, 1),
					key("gppoints", -1, undefined, 1),
					key("picenvironment", 3, undefined, 1),
					key("clip", undefined, undefined, 1),
					$.line_drawing_method, // NOTE: only butt
					key("tightboundingbox", 5, undefined, 1),
					$.background,
					$.canvas_size,
					seq(key("scale", 2), $._size),
					seq(key("plotsize", 4), $._size),
					seq(key("charsize", 4), $._size),
					$.fontspec,
					$.fontscale,
					seq(K.dl, $._expression),
					seq(K.lw, $._expression),
					key("fulldoc", 4, undefined, 1),
					key("standalone", 5, undefined, 1),
					// {{preamble | header} "<preamble_string>"}
					// {tikzplot <ltn>,...}
					key("tikzarrows", 6, undefined, 1),
					// {rgbimages | cmykimages}
					key("externalimages", undefined, undefined, 1),
					// {bitmap | nobitmap}
					// {providevars <var name>,...}
					// {createstyle}
					// {help}
				),
			),
		t_webp: ($) => repeat1(choice()),
		t_wxt: ($) =>
			prec.left(
				repeat1(
					choice(
						field("n", $._expression),
						$.canvas_size,
						seq("position", $.position),
						seq(key("title", 2), $._expression),
						$.background,
						$.fontspec,
						$.fontscale,
						key("enhanced", 3, undefined, 1),
						key("replotonresize", 3, undefined, 1),
						key("antialias", 2, undefined, 1),
						key("persist", undefined, undefined, 1),
						seq(K.lw, $._expression),
						seq(K.dl, $._expression),
						$.line_drawing_method,
						key("raise", 3, undefined, 1),
						key("ctrlq", 2, undefined, 1),
						key("close", 2),
					),
				),
			),
		t_x11: ($) =>
			prec.left(
				repeat1(
					choice(
						field("n", $._expression),
						seq(key("window", $._expression)),
						$.canvas_size,
						seq("position", $.position),
						seq(key("title", 2), $._expression),
						$.fontspec,
						key("enhanced", 3, undefined, 1),
						key("replotonresize", 3, undefined, 1),
						key("antialias", 2, undefined, 1),
						key("persist", undefined, undefined, 1),
						seq(K.lw, $._expression),
						seq(K.dl, $._expression),
						key("raise", 3, undefined, 1),
						key("ctrlq", 2, undefined, 1),
						key("close", 2),
						key("reset"),
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
					seq(K.lw, $._expression),
					seq(K.dl, $._expression),
					seq(K.ps, $._expression),
				),
			),

		theta: ($) =>
			repeat1(choice(K.r, K.t, K.l, K.b, /(counter)?clockwise|c?cw/)),

		tics: ($) => $.tics_opts,

		timestamp: ($) =>
			prec.left(
				repeat1(
					choice(
						field("format", $._expression),
						K.t,
						K.b,
						key("rotate", 3, undefined, 1),
						seq(key("offset", 3), $.position),
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
								optional(field("title", $._expression)),
								repeat1(
									choice(
										field("offset", seq(key("offset", 3), $.position)),
										$.fontspec,
										$._textcolor,
										key("enhanced", undefined, undefined, 1),
									),
								),
							),
							field("title", $._expression),
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
					seq(K.fs, $.fill_style),
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
							seq(key("offset", 3), $.position),
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
			choice(
				seq($._expression),
				seq("at", field("zval", $._expression)),
				seq("relative", field("val", $._expression)),
			),

		zero: ($) => prec.left($._expression),

		zeroaxis: ($) =>
			seq(key1("arg", K.zaxes, reg("zeroaxis", 5)), optional($.style_opts)),

		c_show: ($) =>
			seq(
				key("show", 2),
				choice(
					$._argument_set_show,
					key("colornames", 6, "arg"),
					key("functions", 3, "arg"),
					key("plot", 1),
					key("variables", 1, "arg"),
					seq(key("version", 2, "arg"), optional(key("long", 1))),
				),
			),

		c_splot: ($) =>
			// add voxelgrids to plot_element also grid/nogrid (in style_opts?)
			seq(key("splot", 2), optional("sample"), sep(",", $.plot_element)),

		c_stats: ($) =>
			seq(
				"stats",
				field("ranges", repeat($.range_block)),
				field("filename", $._expression),
				optional(choice("matrix", repeat1($._i_e_u_directives))),
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

		c_system: ($) => seq("system", $._expression),

		c_test: ($) =>
			prec.left(seq("test", optional(choice("palette", "terminal")))),

		c_toggle: ($) =>
			prec.left(seq("toggle", optional(choice($._expression, "all")))),

		c_undefine: ($) =>
			prec.left(
				seq(
					key("undefine", 3),
					repeat(seq($.identifier, optional(token.immediate("*")))),
				),
			),

		c_unset: ($) =>
			seq(
				seq(key("unset", 3, "cmd"), optional($.for_block)),
				$._argument_set_show,
			),

		c_vclear: ($) => prec.left(seq("vclear", optional($._expression))),

		c_vfill: ($) =>
			seq(
				alias(/vg?fill/, "vfill"),
				optional("sample"),
				sep(",", $.plot_element),
			),

		c_while: ($) =>
			seq(
				"while",
				$.parenthesized_expression,
				surround("{}", repeat($._statement)),
			),

		//-------------------------------------------------------------------------

		range_block: ($) => $._range_block,

		_range_block: ($) =>
			// Array and substrings
			surround(
				"[]",
				optional(sep(":", choice($.assignment, $._expression, "*"))),
			),

		for_block: ($) =>
			prec.right(
				seq(
					"for",
					repeat1(
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

		sum_block: ($) =>
			prec.left(
				seq(
					"sum",
					surround("[]", $.identifier, "=", $._expression, ":", $._expression),
					$._expression,
				),
			),

		datafile_modifiers: ($) =>
			repeat1(
				choice(
					$.binary_options,
					$.matrix_options,
					$._i_e_u_directives,
					seq("skip", field("skip_lines", $._expression)),
					seq(
						alias(choice("convexhull", "concavehull"), $.hull),
						prec.right(
							repeat(
								choice(
									// FIX: p. 125
									field("smooth_hull", $.smooth_options),
									seq("expand", field("increment", $._expression)),
								),
							),
						),
					),
					// FIX: p. 125
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
								// TODO: add scan, transpose, rotate, perpendicular. p. 124 v6.1
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
							),
						),
						// binary matrix. Options are $.matrix_options (p. 246 v6.1)
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
						prec.left(
							seq(
								"kdensity",
								optional(
									seq(
										choice("bandwidth", "period"),
										field("bandwidth_period", $._expression),
									),
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
						seq(K.ls, field("ls", $._expression)),
						seq(
							K.lt,
							field(
								"lt",
								choice($._expression, $.colorspec, "black", "bgnd", "nodraw"),
							),
						),
						seq(K.lw, field("lw", $._expression)),
						$._linecolor,
						seq(K.dt, field("dt", $.dash_opts)),
						seq(K.pt, field("pt", $._expression)),
						seq(K.ps, field("ps", $._expression)),
						seq(K.pi, field("pi", $._expression)),
						seq(K.pn, field("pn", $._expression)),
						seq(K.as, field("as", $._expression)),
						seq(K.fs, field("fs", $.fill_style)),
						$._fillcolor,
						key("nohidden3d", -2),
						"nocontours",
						key("nosurface", 6),
						key("palette", 3), // NOTE: FIX ? p.58 (revisar $.colorspec) p.143 dice que está bien
						// $.fontspec, // NOTE: p.143 no lo menciona para style en plot_element
						// $._textcolor,
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
			prec.right(
				repeat1(
					choice(
						field("label", $._expression),
						field("at", seq("at", $.position)),
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
						choice(seq("point", field("point", $.line_style)), "nopoint"), // TODO: check
						field("offset", seq(key("offset", 3), $.position)),
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
							field("offset", seq(key("offset", 3), $.position)),
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
					optional(field("tag", $._expression)), // TODO: check if tag is optional or not
					repeat1(
						// TODO: check if it's repeat1 or repeat
						choice(
							key("default", 3),
							seq(
								K.lt,
								choice($._expression, $.colorspec, "black", "bgnd", "nodraw"),
							),
							$._linecolor,
							seq(K.lw, $._expression),
							seq(K.pt, $._expression),
							seq(K.ps, $._expression),
							seq(K.pi, $._expression),
							seq(K.pn, $._expression),
							seq(K.dt, $.dash_opts),
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
							optional(seq(optional(K.lt), $._expression)),
							optional($._linecolor),
						),
					),
				),
			),

		fontspec: ($) => seq("font", field("font", $._expression)),

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
				),
			),

		_linecolor: ($) =>
			seq(K.lc, field("lc", choice($._expression, $.colorspec))),

		_textcolor: ($) =>
			seq(K.tc, field("tc", choice($.colorspec, seq(K.lt, $._expression)))),

		_fillcolor: ($) =>
			seq(
				K.fc,
				field(
					"fc",
					choice(
						$.colorspec,
						seq(K.lt, $._expression),
						seq(K.ls, field("ls", $._expression)),
						$._expression,
					),
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
			// FIX: assignment implementation
			field(
				"using",
				seq(
					key("using", 1),
					sep(":", choice(surround("()", $.assignment), $._expression)),
				),
			),

		position: ($) =>
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

		system: ($) =>
			choice(
				key("first", 3),
				key("second", 3),
				key("graph", 2),
				key("screen", 2),
				key("character", 4),
				"polar", // NOTE: v6 not in docs but in examples
			),
		//-------------------------------------------------------------------------
		assignment: ($) =>
			choice(
				seq(
					choice($.identifier, $.array, $.function),
					alias("=", $.operator),
					choice($._expression, $.assignment),
				),
				seq(
					"array",
					$.array,
					optional(seq(alias("=", $.operator), surround("[]", $._expression))),
				),
			),

		datablock_definition: ($) =>
			seq(
				field("name", $.datablock),
				"<<",
				field("start", $.datablock_start),
				repeat($._expression),
				field("end", $.datablock_end),
			),

		//-------------------------------------------------------------------------

		_expression: ($) =>
			choice(
				$.number,
				$.complex,
				$.string_literal,
				$.array,
				$.function,
				$.sum_block,
				$.parenthesized_expression,
				$.unary_expression,
				$.binary_expression,
				$.ternary_expression,
				$.identifier,
				$.datablock,
			),

		// HACK: to make label, arrow, paxis work
		_expression_tag: ($) =>
			prec.right(2, choice($.number, $.array, $.function, $.identifier)),

		number: ($) => {
			// sep in float, integer?
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
				seq(decimal_digits),
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

		// If I end up using a external scanner
		// string_literal: ($) =>
		// 	seq(
		// 		$._string_start,
		// 		repeat(choice($._string_content, $.escape_sequence, $.fmt_sequence)),
		// 		$._string_end,
		// 	),
		string_literal: ($) =>
			choice(
				seq(
					'"',
					optional(alias($._doublequote_string_content, $.string_content)),
					'"',
				),
				seq("'", alias($._singlequote_string_content, $.string_content), "'"),
				// seq(
				// 	"`",
				// 	alias($._backquote_string_content, $.backquote_string_content),
				// 	"`",
				// ),
			),

		// NOTE: it should be able to handle escaped \" but it doesn't yet
		_doublequote_string_content: ($) =>
			repeat1(
				choice(token.immediate(/[^"\\%]+/), $.escape_sequence, $.fmt_sequence),
			),

		// NOTE: it should accept fmt_sequence
		_singlequote_string_content: ($) => token(/([^'\\]*(\\.[^'\\]*)*)/),

		// _backquote_string_content: ($) => token(/[^`]*/),

		escape_sequence: ($) => token.immediate(ESCAPE_SEQUENCE),

		fmt_sequence: ($) => token.immediate(FMT_SEQUENCE),

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
					[",", PREC.SERIAL],
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

		identifier: ($) => token(IDENTIFIER),

		array: ($) =>
			prec(
				1,
				seq(
					field("name", choice($.string_literal, $.identifier)),
					$._range_block,
				),
			),

		datablock: ($) => token(seq("$", IDENTIFIER)),

		function: ($) =>
			prec(
				1,
				seq(field("name", $.identifier), field("parameters", $.parameter_list)),
			),

		parameter_list: ($) => surround("()", sep(",", $._expression)),

		macro: ($) => token(seq("@", IDENTIFIER)),

		comment: ($) => seq("#", alias(token(/.*(\\\s*\n.*)*/), $.comment_content)),
	},
});

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
