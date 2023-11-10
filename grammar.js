// Based on http://gnuplot.info/docs_5.5/Gnuplot_5_5.pdf

const PREC = {
	TERNARY: -1, // a?b:c
	OR: 1, // a||b
	AND: 2, // a&&b
	COMPARE: 3, // a==b a!=b a<b a>b a<=b a>=b  A eq B  A ne B
	BIT_OR: 4, // a|b a^b
	BIT_NOT: 5, // ~a
	BIT_AND: 6, // a&b
	SHIFT: 7, // << >>
	CONCAT: 8, // A.B
	PLUS: 9, // a+b a-b
	TIMES: 10, // a*b a/b a%b
	UNARY: 11, // -a +a !a $a |a|
	POWER: 12, // a**b a!
	PAREN: 14, // (a)
};

const K = {
	as: /arrowstyle|as/,
	axes: /(x|y|z|x2|y2|cb|r|t|u|v|xy|vx|vy|vz)/, // HACK: all the options in one. vx, vy, vz just for set ()range
	b: /b(o(t(t(o(m)?)?)?)?)?/,
	c: /c(e(n(t(e(r)?)?)?)?)?/,
	dl: /dashl(e(n(g(t(h)?)?)?)?)?|dl/,
	dt: /dasht(y(p(e)?)?)?|dt/,
	fc: /fillc(o(l(o(r)?)?)?)?|fc/,
	fs: /fill(s(t(y(l(e)?)?)?)?)?|fs/,
	l: /l(e(f(t)?)?)?/,
	lc: /linec(o(l(o(r)?)?)?)?|lc/,
	ls: /lines(t(y(l(e)?)?)?)?|ls/,
	lt: /linetype|lt/,
	lw: /linew(i(d(t(h)?)?)?)?|lw/,
	pi: /pointi(n(t(e(r(v(a(l)?)?)?)?)?)?)?|pi/,
	pn: /pointn(u(m(b(e(r)?)?)?)?)?|pn/,
	ps: /points(i(z(e)?)?)?|ps/,
	pt: /pointt(y(p(e)?)?)?|pt/,
	r: /r(i(g(h(t)?)?)?)?/,
	t: /t(o(p)?)?/,
	tc: /textc(o(l(o(r)?)?)?)?|tc/,
	zaxes: /(x|y|z|x2|y2)?/,
};

module.exports = grammar({
	name: "gnuplot",

	extras: ($) => [$.comment, /[\s\f\uFEFF\u2060\u200B]|\\\r?\n/, /\\\s*\n/],

	word: ($) => $.identifier,

	conflicts: ($) => [
		[$._argument_set_show],
		[$.position],
		[$.plot_style],
		[$._lab_tag, $._lab_lab],
		[$._i_e_u_directives],
	],

	rules: {
		source_file: ($) => repeat($._statement),

		_statement: ($) =>
			prec.right(
				seq(choice($._command, $._assignment, $.macro), optional(";")),
			),

		_command: ($) =>
			choice(
				// $.c_bind, // p. 64 mouse input
				$.c_break, // only in loops do/while
				$.c_cd,
				// $.c_call,
				$.c_clear,
				$.c_continue, // only in loops do/while
				$.c_do,
				$.c_eval,
				$.c_exit,
				$.c_fit,
				$.c_help,
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
				$.c_set, // set, unset
				$.c_show, // show only p. 242
				$.c_splot,
				$.c_stats,
				// $.c_system,
				$.c_test,
				// $.c_toggle,
				$.c_undefine,
				$.c_vclear,
				$.c_vfill,
				$.c_while,
			),

		//-------------------------------------------------------------------------
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
				key("fit", 1),
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

		c_help: ($) => prec.left(seq(key("help", 1), optional($._expression))),

		c_if: ($) =>
			prec.left(
				seq(
					"if",
					$.parenthesized_expression,
					choice(
						repeat1($._statement),
						seq(
							surround("{}", repeat($._statement)),
							repeat(
								seq(
									"else",
									"if",
									repeat1($.parenthesized_expression),
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
			prec.left(
				seq(
					"pause",
					choice(
						seq(
							field("time", $._expression),
							optional(field("str", $._expression)),
						),
						seq(
							"mouse",
							$._endcondition,
							optional(seq(",", $._endcondition)),
							optional(field("str", $._expression)),
						),
					),
				),
			),

		_endcondition: ($) =>
			choice("keypress", "button1", "button2", "button3", "close", "any"),

		c_plot: ($) =>
			seq(key("plot", 1), optional("sample"), sep(",", $.plot_element)),

		plot_element: ($) =>
			seq(
				repeat($.range_block),
				optional($.for_block),
				choice(
					seq(
						sep(",", $._assignment),
						",",
						$._expression, // $.function,
					),
					field("func", $.function),
					seq(
						field("data", choice($._expression, "keyentry")),
						optional($.datafile_modifiers), // TODO: check smooth_opts convexhull/concavehull with "with"
					),
					// newhistogram {"<title>" {font "name,size"} {tc <colorspec>}}
					//              {lt <linetype>} {fs <fillstyle>} {at <x-coord>}
				),
				repeat(
					choice(
						seq("axes", choice("x1y1", "x2y2", "x1y2", "x2y1")),
						seq(
							key("title", 1),
							field("title", $._expression),
							repeat(
								choice(
									seq("at", choice("beginning", "end")),
									key("enhanced", undefined, undefined, 1),
								),
							),
						),
						seq(key("notitle", 3), optional($._expression)),
						"nogrid", // NOTE: splot only option https://stackoverflow.com/questions/74586626/gnuplot-how-to-splot-surface-and-points-with-dgrid3d
						choice(
							seq(
								key("with", 1),
								field("with", $.plot_style), // TODO: check smooth_opts convexhull/concavehull with "with"
								optional($.style_opts),
							),
							$.style_opts,
						),
					),
				),
			),

		plot_style: ($) =>
			choice(
				key("lines", 1),
				key("points", 1),
				alias(/linesp(o(i(n(t(s)?)?)?)?)?|lp/, "lp"),
				key("financebars", 3),
				key("dots", 1),
				key("impulses", 1),
				seq(key("labels", 3), optional($.label_opts)),
				key("surface", 3),
				key("steps", 2),
				"fsteps",
				"histeps",
				key("arrows", 3),
				seq(key("vectors", 3), $.arrow_opts),
				key("sectors", 3), // NOTE: gnuplot v6?
				alias(/(x|y|xy)errorbars?/, "errorbar"),
				alias(/(x|y|xy)errorlines/, "errorlines"),
				"parallelaxes",
				"boxes",
				"boxerrorbars",
				"boxxyerror",
				"isosurface",
				"boxplot",
				"candlesticks", // TODO: add its options p.77
				"circles",
				key("zerrorfill", 6),
				"contourfill", // NOTE: gnuplot v6?
				// alias(/spider(p(l(o(t)?)?)?)?/, "spiderplot"), // NOTE: gnuplot v6?
				"ellipses", // TODO: add its options
				seq(
					key("filledcurves", 7),
					optional(
						choice(
							"closed",
							"between",
							seq(
								optional(choice("above", "below")),
								optional(
									seq(
										choice("x1", "x2", "y1", "y2", "y", "r"),
										optional(seq("=", $._expression)),
									),
								),
							),
						),
					),
				),
				seq(
					"fillsteps",
					optional(choice("above", "below")),
					optional(seq("y", "=", $._expression)),
				),
				key("histograms", -1), // TODO: add its options p.83 (should work in set style)
				seq(key("image", 3), optional("pixels")),
				seq("pm3d", optional($.pm3d)),
				"rgbalpha",
				"rgbimage",
				"polygons",
				"table",
				"mask",
			),

		style_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						seq(alias(K.ls, "ls"), field("ls", $._expression)),
						seq(
							alias(K.lt, "lt"),
							field(
								"lt",
								choice($._expression, $.colorspec, "black", "bgnd", "nodraw"),
							),
						),
						seq(alias(K.lw, "lw"), field("lw", $._expression)),
						seq(
							alias(K.lc, "lc"),
							field("lc", choice($._expression, $.colorspec)),
						),
						seq(alias(K.dt, "dt"), field("dt", $.dash_opts)),
						seq(alias(K.pt, "pt"), field("pt", $._expression)),
						seq(
							alias(K.ps, "ps"),
							field("ps", choice($._expression, "variable")),
						), // NOTE: p. 140 variable
						seq(alias(K.pi, "pi"), field("pi", $._expression)),
						seq(alias(K.pn, "pn"), field("pn", $._expression)),
						seq(alias(K.as, "as"), field("as", $._expression)),
						seq(alias(K.fs, "fs"), field("fs", $.fill_style)),
						seq(
							alias(K.fc, "fc"),
							field(
								"fc",
								choice(
									$._expression,
									$.colorspec,
									seq(alias(K.lt, "lt"), $._expression),
									seq(alias(K.ls, "ls"), $._expression),
								),
							),
						),
						key("nohidden3d", -2),
						"nocontours",
						key("nosurface", 6),
						key("palette", 3),
						$.font_spec,
					),
				),
			),

		c_print: ($) => seq(choice("print", "printerr"), sep(",", $._expression)),

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
			seq(
				seq(alias(/set?|uns(e(t)?)?/, "cmd"), optional($.for_block)),
				$._argument_set_show,
			),

		_argument_set_show: ($) =>
			choice(
				seq(key("angles", 2, "arg"), optional($.angles)),
				seq(key("arrow", 3, "arg"), optional($.arrow)),
				seq(key("autoscale", 4, "arg"), optional($.autoscale)),
				seq(key("border", 3, "arg"), optional($.border)),
				seq(key("boxwidth", 3, "arg"), optional($.boxwidth)),
				seq(alias("boxdepth", "arg"), optional($.boxdepth)),
				alias("color", "arg"),
				seq(alias("colormap", "arg"), optional($.colormap)),
				seq(alias("colorsequence", "arg"), optional($.colorsequence)),
				seq(alias("clip", "arg"), optional($.clip)),
				seq(key("cntrlabel", 5, "arg"), optional($.cntrlabel)),
				seq(key("cntrparam", 5, "arg"), optional($.cntrparam)),
				seq(key("colorbox", 6, "arg"), optional($.colorbox)),
				seq(key("contours", 5, "arg"), optional($.contour)),
				key("cornerpoles", 7, "arg"),
        seq(alias("contourfill", "arg"), $.contourfill),
				seq(alias(K.dt, "arg"), optional($.dashtype)),
				seq(key("datafile", 5, "arg"), optional($.datafile)),
				seq(key("decimalsign", 3, "arg"), optional($.decimalsign)),
				seq(key("dgrid3d", 2, "arg"), optional($.dgrid3d)),
				seq(key("dummy", 2, "arg"), optional($.dummy)),
				seq(key("encoding", 3, "arg"), optional($.encoding)),
				seq(key1("arg", /errorbars|/, reg("bars", 1)), optional($.errorbars)),
				seq(alias("fit", "arg"), optional($.fit)),
				seq(key("format", 4, "arg"), optional($.format)),
				seq(key("grid", 2, "arg"), optional($.grid)),
				seq(key("hidden3d", 3, "arg"), optional($.hidden3d)),
				seq(key("history", 3, "arg"), optional($.history)),
				seq(key("isosamples", 3, "arg"), optional($.isosamples)),
				seq(key("isosurface", 7, "arg"), optional($.isosurface)),
				alias("isotropic", "arg"),
				seq(alias("jitter", "arg"), optional($.jitter)),
				seq(key("key", 1, "arg"), optional($.key)),
				seq(key("label", 3, "arg"), optional($.label)),
				seq(alias(K.lt, "arg"), optional($.linetype)),
				seq(alias("link", "arg"), optional($.link)),
				seq(key("loadpath", 3, "arg"), optional($.loadpath)),
				seq(alias("locale", "arg"), optional($.locale)),
				seq(key("logscale", 3, "arg"), optional($.logscale)),
				seq(key("mapping", 3, "arg"), optional($.mapping)),
				seq(key1("arg", /(l|r|t|b)?/, reg("margins", 3)), optional($.margin)),
				seq(alias("micro", "arg"), optional($.micro)), // NOTE: experimental p. 184
				key("minussign", 5, "arg"), // NOTE: experimental p. 184
				seq(key("monochrome", 4, "arg"), optional($.monochrome)),
				seq(key("mouse", 2, "arg"), optional($.mouse)),
				seq(key("multiplot", 5, "arg"), optional($.multiplot)),
				seq(key1("arg", "m", K.axes, reg("tics", -1)), optional($.mxtics)),
				// seq(optional($.nonlinear)), // p. 191
				// seq(optional($.object)), // p. 192
				seq(key("offsets", 3, "arg"), optional($.offsets)), // p. 194
				// seq(optional($.origin)), // p. 195
				seq(key("output", 1, "arg"), optional($.output)),
				seq(alias("overflow", "arg"), optional($.overflow)),
				seq(key("palette", 3, "arg"), optional($.palette)),
				key("parametric", 2, "arg"),
				seq(alias("paxis", "arg"), optional($.paxis)),
				// seq(optional($.pixmap)), // p. 203
				seq(alias("pm3d", "arg"), optional($.pm3d)),
				seq(key("pointintervalbox", 8, "arg"), optional($.pointintervalbox)),
				seq(key("pointsize", 3, "arg"), optional($.pointsize)),
				seq(key("polar", 3, "arg"), optional($.polar)),
				seq(key("print", 2, "arg"), optional($.print)),
				seq(alias("psdir", "arg"), optional($.psdir)),
				key("raxis", 2, "arg"),
				seq(alias("rgbmax", "arg"), optional($.rgbmax)),
				seq(key("samples", 3, "arg"), optional($.samples)),
				seq(key("size", 2, "arg"), optional($.size)),
				key("spiderplot", 6, "arg"),
				seq(key("style", 2, "arg"), optional($.style)),
				seq(key("surface", 2, "arg"), optional($.surface)),
				seq(key("table", 2, "arg"), optional($.table)),
				seq(key("terminal", 1, "arg"), optional($.terminal)),
				seq(alias("termoption", "arg"), optional($.termoption)),
				seq(alias("theta", "arg"), optional($.theta)),
				seq(key("tics", -1, "arg"), optional($.tics)),
				seq(key("timestamp", 5, "arg"), optional($.timestamp)),
				seq(key("timefmt", 5, "arg"), optional($.timefmt)),
				seq(key("title", 3, "arg"), optional($.title)),
				seq(alias("vgrid", "arg"), optional($.vgrid)),
				seq(key("view", 2, "arg"), optional($.view)),
				seq(key("walls", -1, "arg"), optional($.walls)),
				seq(key1("arg", K.axes, reg("data", 2)), optional($.xdata)),
				key1("arg", K.axes, "d", reg("tics", -1)),
				seq(key1("arg", K.axes, reg("label", 3)), optional($.xlabel)),
				key1("arg", K.axes, "m", reg("tics", -1)),
				seq(key1("arg", K.axes, reg("range", 3)), optional($.xrange)),
				seq(key1("arg", K.axes, reg("tics", -1)), optional($.xtics)),
				seq(key("xyplane", 3, "arg"), optional($.xyplane)),
				seq(key("zero", 1, "arg"), optional($.zero)),
				seq(key1("arg", K.zaxes, reg("zeroaxis", 5)), optional($.zeroaxis)),
			),

		angles: ($) => choice(key("degrees", 1), key("radians", 1)),

		arrow: ($) =>
			prec.left(
				seq(
					optional(field("tag", choice($.number, $.identifier, $.array))),
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

		autoscale: ($) =>
			repeat1(
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

		border: ($) =>
			prec.left(
				repeat1(
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

		boxwidth: ($) =>
			prec.left(
				repeat1(
					choice(
						field("width", $._expression),
						key("absolute", 1),
						key("relative", 1),
					),
				),
			),

		boxdepth: ($) =>
			prec.left(repeat1(choice(field("y_extent", $._expression), "square"))),

		colormap: ($) =>
			prec.left(
				choice(seq("new", $._expression), seq($._expression, $.range_block)),
			),

		colorsequence: ($) => choice("default", "classic", "podo"),

		clip: ($) =>
			choice(key("points", 1), key("one", 1), key("two", 1), key("radial", 1)),

		cntrlabel: ($) =>
			repeat1(
				choice(
					seq("format", $._expression),
					$.font_spec,
					seq("start", $._expression),
					seq("interval", $._expression),
					"onecolor",
				),
			),

		cntrparam: ($) =>
			repeat1(
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

		colorbox: ($) =>
			repeat1(
				choice(
					key("vertical", 1),
					key("horizontal", 1),
					key("invert", 3, undefined, 1),
					alias(/def(a(u(l(t)?)?)?)?|u(s(e(r)?)?)?/, "default"),
					seq(key("origin", 1), $.position),
					seq(key("size", 1), $.position),
          key("front", 2), key("back", 2),
					choice(
						key("noborder", 4),
						key("bdefault", 2),
						seq(key("border", 2), choice($.style_opts, $._expression)),
					),
					seq("cbtics", $.style_opts),
				),
			),

		contour: ($) => choice(key("base", 2), key("surface", 1), key("both", 2)),

    contourfill: ($) => 
      repeat1(
        choice(
          seq("auto", $._expression),
          choice("ztics", "cbtics"),
          seq(key("firstlinetype", 5), $._expression),
        ),
      ),

		dashtype: ($) => seq(field("tag", $._expression), $.dash_opts),

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

		datafile: ($) =>
			prec.left(
				repeat1(
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
						seq(key("commentschars", 3), optional(field("srt", $._expression))),
						seq("binary", $._expression), // binary list pag 160 -> 118 -> 245
					),
				),
			),

		decimalsign: ($) =>
			prec.left(choice($._expression, seq("locale", optional($._expression)))),

		dgrid3d: ($) =>
			prec.left(
				repeat1(
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

		dummy: ($) => seq($._expression, ",", $._expression),

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
					alias(/((no)?quiet|results|brief|verbose)/, "fit_out"),
					key("errorvariables", 3, undefined, 1),
					key("covariancevariables", 3, undefined, 1),
					key("errorscaling", 6, undefined, 1),
					alias(/(no)?prescale/, "prescale"),
					seq("maxiter", choice(field("value", $._expression), "default")),
					seq("limit", choice(field("epsilon", $._expression), "default")),
					seq("limit_abs", field("epsilon_abs", $._expression)),
					seq("start-lambda", choice($._expression, "default")),
					seq("lambda-factor", choice($._expression, "default")),
					seq(
						"script",
						optional(choice(field("command", $._expression), "default")),
					),
					alias(/v4|v5/, "version"),
				),
			),

		format: ($) =>
			seq(
				optional(choice("x", "y", "xy", "x2", "y2", "z", "cb")),
				field("fmt_str", $._expression),
				optional(choice("numeric", "timedate", "geographic")),
			),

		grid: ($) =>
			repeat1(
				choice(
					key1("tics", /(no)?m?/, K.axes, /tics?/),
					seq(
						key("polar", 2, undefined, 1),
						optional(field("angle", $._expression)),
					),
					choice(key("layerdefault", 6), "front", "back"),
					key("vertical", 4, undefined, 1),
					seq($.style_opts, optional(seq(",", $.style_opts))),
				),
			),

		hidden3d: ($) =>
			choice(
				key("defaults", 3),
				repeat1(
					choice(
            "front", "back",
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
			repeat1(
				choice(
					choice("on", "off"),
					key("default", 3),
					key("enhanced", undefined, undefined, 1),
					seq(key("autotitle", 1, "a", 1), optional(key("columnheader", 6))),
					seq(alias(/(no)?box/, "box"), optional($.style_opts)),
					seq(
						alias(/(no)?opaque/, "opaque"),
						optional(
							seq(
								alias(K.fc, "fc"),
								choice(
									$.colorspec,
									seq(K.lt, $._expression),
									seq(K.ls, $._expression),
								),
							),
						),
					),
					seq("width", field("increment", $._expression)),
					seq("height", field("increment", $._expression)),
					// layout
					choice(key("vertical", 3), key("horizontal", 3)),
					seq("maxcols", optional(choice($._expression, "auto"))),
					seq("maxrows", optional(choice($._expression, "auto"))),
					seq("columns", $._expression),
					seq("keywidth", choice("screen", "graph"), $._expression),
					alias(/Left|Right/, "lr"),
          key("reverse", 3, undefined, 1), key("invert", 3, undefined, 1),
					seq("samplen", field("length", $._expression)),
					seq("spacing", field("spacing", $._expression)),
					seq(
						key("title", 2),
						optional($._expression),
						optional(key("enhanced", undefined, undefined, 1)),
						optional(alias(choice(K.c, K.l, K.r), $.position)),
					),
					$.font_spec,
					seq(
						alias(K.tc, "tc"),
						choice(
							$.colorspec,
							seq(choice(alias(K.lt, "lt"), alias(K.ls, "ls")), $._expression),
						),
					),
					// placement
					choice(key("inside", 3), key("outside", 1), "fixed"),
					key1("margin", /(l|r|t|b)/, reg("margin", 1)),
					seq("at", $.position),
					choice(alias(K.c, "cen"), alias(K.l, "lef"), alias(K.r, "rig")),
					choice(alias(K.t, "top"), alias(K.b, "bot"), alias(K.c, "cen")),
				),
			),

		label: ($) =>
			// FIX:
			prec.left(
				1,
				choice(
					seq(
						field("tag", $._lab_tag),
						field("label", $._lab_lab),
						optional($.label_opts),
					),
					seq(
						field("tag", $._lab_tag),
						$.label_opts,
						optional(field("label", $._lab_lab)),
					),
					seq(field("label", $._lab_lab), optional($.label_opts)),
					seq($.label_opts, optional(field("label", $._lab_lab))),
				),
			),

		linetype: ($) => choice($.line_style, seq("cycle", $._expression)),

		link: ($) =>
			repeat1(
				choice(
					choice("x2", "y2"),
					seq("via", $._expression, "inverse", $._expression),
				),
			),

		loadpath: ($) => $._expression,

		locale: ($) => prec.left(field("locale", $._expression)),

		logscale: ($) => {
			const axis = choice("x", "y", "z", "x2", "y2", "cb", "r");
			return prec.left(
				seq(
					alias(token(repeat1(seq(axis))), "axis"),
					optional(field("base", $._expression)),
				),
			);
		},

		mapping: ($) => choice("cartesian", "spherical", "cylindrical"),

		margin: ($) =>
			prec.left(
				choice(
					seq(optional(seq(optional("at"), "screen")), $._expression),
					seq(
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

		micro: ($) => "micro",

		monochrome: ($) => $.line_style,

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
					// TODO: complete
					// {noruler | ruler {at x,y}}
					// {polardistance{deg|tan} | nopolardistance}
					// {format <string>} $._expression
					// {mouseformat <int> | <string> | function <f(x,y)>} $._expression
					// {{no}labels {"labeloptions"}}
					// {{no}zoomjump} {{no}verbose}
				),
			),

		multiplot: ($) =>
			repeat1(
				choice(
					seq(
						key("title", 1),
						field("title", $._expression),
						optional($.font_spec),
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
					seq(
						// NOTE: same as margins
						"margins",
						field("lm", $._expression),
						",",
						field("rm", $._expression),
						",",
						field("bm", $._expression),
						",",
						field("tm", $._expression),
					),
					seq(
						"spacing",
						field("xspacing", $._expression),
						optional(seq(",", field("yspacing", $._expression))),
					),
					alias(/previous|next/, "prevnext"),
				),
			),

		mxtics: ($) =>
			prec.left(
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

		// nonlinear: $ => // p.191

		// object: $ => // p.192
		// set object <index>
		//            <object-type> <object-properties>
		//            {front|back|behind|depthorder}
		//            {clip|noclip}
		//            {fc|fillcolor <colorspec>} {fs <fillstyle>}
		//            {default} {lw|linewidth <width>} {dt|dashtype <dashtype>}

		offsets: ($) =>
			seq(
				optional($.system), // NOTE: en realidad sólo usa graph
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
			repeat1(
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
					choice(
						seq(
							key("rgbformulae", 3),
							field("r", $._expression), // TODO: make the next 2 optional
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
						seq(key("colormap", 3), field("colormap_name", $._expression)),
						seq(
							key("functions", 4),
							field("R", $._expression),
							",",
							field("G", $._expression),
							",",
							field("B", $._expression),
						),
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

		paxis: ($) =>
			seq(
				field("axisno", $._expression),
				repeat(
					choice(
						seq(
							key("range", 3),
							$.range_block,
							repeat(
								choice(
									alias(/(no)?reverse/, "reverse"),
									alias(/(no)?writeback/, "writeback"),
									alias(/(no)?extend/, "extend"),
									"restore",
								),
							),
						),
						seq(key("tics", -1), optional($.tics_opts)),
						seq(
							key("label", 3), // TODO: this can improve
							choice(
								seq(field("label", $._expression), optional($.label_opts)),
								seq(optional(field("label", $._expression)), $.label_opts),
							),
						),
						seq(key("offset", 3), alias("offset", $.position)),
					),
				),
			),

		// pixmap: $ =>
		// <index> {"filename" | colormap <name>}
		//         at <position>
		//         {width <w> | height <h> | size <w>,<h>}
		//         {front|back|behind} {center}

		pm3d: ($) =>
			repeat1(
				choice(
					seq("at", $.position),
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
					alias(/(no)?ftriangles/, "ftriangles"),
					choice(seq("clip", optional("z")), "clip1in", "clip4in"),
					alias(/(no)?clipcb/, "clipcb"),
					seq(
						"corners2color",
						alias(/(geo|har)?mean|rms|m(edian|in|ax)|c(1|2|3|4)/, "c2c"),
					),
					seq(
						alias(/(no)?lighting/, "lighting"),
						repeat(
              choice(
                seq("primary", field("fraction", $._expression)),
						    seq("specular", field("fraction", $._expression)),
						    seq("spec2", field("fraction", $._expression))
              ),
            ),
					),
					seq(
						alias(/(no)?border/, "border"),
						optional("retrace"),
						optional($.style_opts),
					),
					choice("implicit", "explicit"),
					"map",
				),
			),

		pointintervalbox: ($) => $._expression,

		pointsize: ($) => field("multiplier", $._expression),

		polar: ($) => seq("grid"), // TODO: complete

		print: ($) => $._expression,

		psdir: ($) => $._expression,

		rgbmax: ($) => $._expression,

		samples: ($) => seq($._expression, optional(seq(",", $._expression))),

		size: ($) =>
			prec.left(
				repeat1(
					choice(
						choice(
							alias(/(no)?square/, "square"),
							seq(key("ratio", 2), $._expression),
							key("noratio", 4),
						),
						seq(
							field("xscale", $._expression),
							",",
							field("yscale", $._expression),
						),
					),
				),
			),

		style: ($) =>
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
				seq(key("data", 1), choice($.plot_style, key("spiderplot", 6))),
				seq(alias(K.fs, "fs"), $.fill_style),
				seq(key("function", 1), $.plot_style),
				seq(key("line", 1), $.line_style),
				seq(
					key("circle", -2),
					repeat(
						choice(
							seq(key("radius", 3), optional($.system), $._expression),
							/(no)?wedge/,
							/(no)?clip/,
						),
					),
				),
				seq(key("rectangle", 4)), // TODO: p. 218
				// set style rectangle {front|back} {lw|linewidth <lw>}
				//                     {fillcolor <colorspec>} {fs <fillstyle>}
				seq(key("ellipse", 3)), // TODO: p. 219
				// set style ellipse {units xx|xy|yy}
				//                   {size {graph|screen} <a>, {{graph|screen} <b>}}
				//                   {angle <angle>}
				//                   {clip|noclip}
				seq(
					key("parallelaxis", -4),
					seq(optional(choice("front", "back")), optional($.style_opts)),
				),
				seq(
					key("spiderplot", 6),
					optional(seq(alias(K.fs, "fs"), $.fill_style)),
				), // TODO: p. 219
				// set style spiderplot
				//                     {fillstyle <fillstyle-properties>}
				//                     {<line-properties> | <point-properties>}
				seq( // TODO: p. 221
          "textbox",
          repeat(
            // TODO: add boxstyle-index
            choice(
              choice("opaque", "transparent"),
              seq(alias(K.fc, "fc"), $.colorspec),
              seq(
                key("border", undefined, undefined, 1),
                optional(seq(alias(K.lc, "lc"), $.colorspec))
              ),
              seq(alias(K.lw, "lw"), $._expression),
              // TODO: add margins
            ),
          ),
        ),
        seq(
          key("watchpoint", 5), 
          key("labels", -1, undefined, 1),
          optional($.label_opts),
        )
			),

		surface: ($) => choice("implicit", "explicit"),

		table: ($) =>
			prec.left(
				repeat1(
					choice(
						choice($.string_literal, $.datablock),
						"append",
						// NOTE: same as in datafile simplify?
						seq(
							key("separator", 3),
							choice(key("whitespace", 5), "tab", "comma", $._expression),
						),
					),
				),
			),

		terminal: ($) => choice($._terminal_type, "push", "pop"),

		_terminal_type: ($) =>
			choice(
				seq(key("cairolatex", 3, "name"), optional($.t_cairolatex)),
				seq(key("canvas", 3, "name"), optional($.t_canvas)),
				seq(key("cgm", 2, "name"), optional($.t_cgm)),
				seq(key("context", 2, "name"), optional($.t_context)),
				// seq(alias(/do(m(t(e(r(m)?)?)?)?)?/, "name"), optional($.t_domterm)),
				seq(key("dumb", 2, "name"), optional($.t_dumb)),
				// seq(alias(/dxf?/, "name"), optional($.t_dxf)),
				// seq(alias(/emf?/, "name"), optional($.t_emf)),
				seq(key("epscairo", 1, "name"), optional($.t_epscairo)),
				seq(key("epslatex", 4, "name"), optional($.t_epslatex)),
				// seq(alias(/f(i(g)?)?/, "name"), optional($.t_fig)),
				// seq(alias(/g(i(f)?)?/, "name"), optional($.t_gif)),
				// seq(alias(/h(p(g(l)?)?)?/, "name"), optional($.t_hpgl)),
				// seq(alias(/j(p(e(g)?)?)?/, "name"), optional($.t_jpeg)),
				// seq(alias(/l(u(a)?)?/, "name"), optional($.t_lua)),
				// seq(alias(/pc(l(5)?)?/, "name"), optional($.t_pcl5)),
				seq(key("pdfcairo", 2, "name"), optional($.t_pdfcairo)),
				seq(alias("png", "name"), optional($.t_png)),
				seq(key("pngcairo", 4, "name"), optional($.t_pngcairo)),
				// seq(
				// 	alias(/po(s(t(s(c(r(i(p(t)?)?)?)?)?)?)?)?/, "name"),
				// 	optional($.t_postscript),
				// ),
				// seq(optional($.t_pslatex)),
				// seq(alias(/pstr(i(c(k(s)?)?)?)?/, "name"), optional($.t_pstricks)),
				seq(key("qt", 1, "name"), optional($.t_qt)),
				// seq(alias(/si(x(e(l(g(d)?)?)?)?)?/, "name"), optional($.t_sixelgd)),
				seq(key("svg", 2, "name"), optional($.t_svg)),
				// seq(alias(/tek4(0|1|2)\d\d/, "name"), optional($.t_tek4xxx)),
				// $.t_texdraw,
				// $.t_tikz,
				// $.t_tkcanvas,
				key("unknown", 1, "name"),
				// $.t_webp
			),

		t_cairolatex: ($) =>
			repeat1(
				choice(
					choice("eps", "pdf", "png"),
					choice("standalone", "input"),
					choice("blacktext", "colortext", "colourtext"),
					choice(seq("header", field("header", $._expression)), "noheader"),
					choice("mono", "color"),
					key("transparent", 6, undefined, 1),
					/(no)?crop/,
					seq("background", field("color", $._expression)),
					$.font_spec,
					seq("fontscale", field("scale", $._expression)),
					seq(K.lw, field("lw", $._expression)),
					choice("rounded", "butt", "square"),
					seq(K.dl, field("dl", $._expression)),
					$.canvas_size,
					seq("resolution", field("dpi", $._expression)),
				),
			),
		t_canvas: ($) => repeat1(choice($.canvas_size, $.font_spec)),
		// canvas {size <xsize>, <ysize>} {background <rgb_color>}
		//                        {font {<fontname>}{,<fontsize>}} | {fsize <fontsize>}
		//                        {{no}enhanced} {linewidth <lw>}
		//                        {rounded | butt | square}
		//                        {dashlength <dl>}
		//                        {standalone {mousing} | name '<funcname>'}
		//                        {jsdir 'URL/for/javascripts'}
		//                        {title '<some string>'}
		t_cgm: ($) => repeat1(choice($.font_spec)),
		// cgm {color | monochrome} {solid | dashed} {{no}rotate}
		//                     {<mode>} {width <plot_width>} {linewidth <line_width>}
		//                     {font "<fontname>,<fontsize>"}
		//                     {background <rgb_color>}
		t_context: ($) => repeat1(choice($.canvas_size, $.font_spec)),
		// context {default}
		//           {defaultsize | size <scale> | size <xsize>{in|cm}, <ysize>{in|cm}}
		//           {input | standalone}
		//           {timestamp | notimestamp}
		//           {noheader | header "<header>"}
		//           {color | colour | monochrome}
		//           {rounded | mitered | beveled} {round | butt | squared}
		//           {dashed | solid} {dashlength | dl <dl>}
		//           {linewidth | lw <lw>}
		//           {fontscale <fontscale>}
		//           {mppoints | texpoints}
		//           {inlineimages | externalimages}
		//           {defaultfont | font "{<fontname>}{,<fontsize>}"}
		// t_domterm: ($) => repeat1(choice()),
		t_dumb: ($) => repeat1(choice($.canvas_size)),
		// dumb {size <xchars>,<ychars>} {[no]feed}
		//                      {aspect <htic>{,<vtic>}}
		//                      {[no]enhanced}
		//                      {fillchar {solid|"<char>"}}
		//                      {[no]attributes}
		//                      {mono|ansi|ansi256|ansirgb}
		// t_dxf: ($) => repeat1(choice()),
		// t_emf: ($) => repeat1(choice()),
		t_epscairo: ($) => repeat1(choice($.font_spec)), // same as pdfcairo
		t_epslatex: ($) => repeat1(choice($.canvas_size, $.font_spec)),
		// t_fig: ($) => repeat1(choice()),
		// t_gif: ($) => repeat1(choice()),
		// t_hpgl: ($) => repeat1(choice()),
		// t_jpeg: ($) => repeat1(choice()),
		// t_lua: ($) => repeat1(choice()),
		// t_pcl5: ($) => repeat1(choice()),
		t_pdfcairo: ($) => repeat1(choice($.canvas_size, $.font_spec)),
		// pdfcairo
		//                   {{no}enhanced} {mono|color}
		//                   {font <font>} {fontscale <scale>}
		//                   {linewidth <lw>} {rounded|butt|square} {dashlength <dl>}
		//                   {background <rgbcolor>}
		//                   {size <XX>{unit},<YY>{unit}}
		t_png: ($) => repeat1(choice($.canvas_size, $.font_spec)),
		// png
		//           {{no}enhanced}
		//           {{no}transparent} {{no}interlace}
		//           {{no}truecolor} {rounded|butt}
		//           {linewidth <lw>} {dashlength <dl>}
		//           {tiny | small | medium | large | giant}
		//           {font "<face> {,<pointsize>}"} {fontscale <scale>}
		//           {size <x>,<y>} {{no}crop}
		//           {background <rgb_color>}
		t_pngcairo: ($) => repeat1(choice($.canvas_size, $.font_spec)),
		// t_postscript: ($) => repeat1(choice()),
		// t_pslatex: ($) => seq(choice(/psl(a(t(e(x)?)?)?)?/, /pstex?/)),
		// t_pstricks: ($) => repeat1(choice()),
		t_qt: ($) => repeat1(choice($.canvas_size, $.font_spec)), // TODO: complete
		// t_sixelgd: ($) => repeat1(choice()),
		t_svg: ($) => repeat1(choice($.canvas_size, $.font_spec)), // TODO: complete
		// t_tek4xxx: ($) => repeat1(choice()),
		// t_texdraw: $ =>
		// t_tikz: $ =>
		// t_tkcanvas: $ =>
		// t_webp: $ =>
		// shared terminal options-----------------------------------------
		canvas_size: ($) =>
			seq(
				key("size", 2),
				field("x", seq($._expression, optional(choice("cm", "in")))),
				",",
				field("y", seq($._expression, optional(choice("cm", "in")))),
			),
		font_spec: ($) => seq("font", field("font", $._expression)),
		// ----------------------------------------------------------------
		termoption: ($) =>
			repeat1(
				choice(
					key("enhanced", undefined, undefined, 1),
					$.font_spec, // string with font name and optional size
					seq("fontscale", $._expression),
					seq(alias(K.lw, "lw"), $._expression),
				),
			),

		theta: ($) =>
			repeat1(
				choice(K.r, K.t, K.l, K.b, /clockwise|cw/, /counterclockwise|ccw/),
			),

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
						// TODO: complete p. 224
					),
				),
			),

		timefmt: ($) => field("format", $._expression),

		title: ($) =>
			choice(
				seq(
					optional(field("title", $._expression)),
					repeat1(
						choice(
							field("offset", seq(key("offset", 3), $.position)),
							$.font_spec,
							seq(
								alias(K.tc, "tc"),
								choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
							),
							key("enhanced", undefined, undefined, 1),
						),
					),
				),
				field("title", $._expression),
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
						seq("projection", optional(choice("xy", "xz", "yz"))),
						seq(alias(/(no)?equal/, "equal"), optional(choice("xy", "xyz"))),
						seq("azimuth", $._expression),
					),
				),
			),

		walls: ($) =>
			repeat1(
				choice(
					alias(/(x0|y0|z0|x1|y1)/, "wall"),
					seq(alias(K.fs, "fs"), $.fill_style),
					seq(
						alias(K.fc, "fc"),
						choice(
							$.colorspec,
							seq(K.lt, $._expression),
							seq(K.ls, $._expression),
						),
					),
				),
			),

		xdata: ($) => key("time", 1),

		xlabel: ($) =>
			choice(
				seq(
					optional(field("label", $._expression)),
					repeat1(
						choice(
							seq(key("offset", 3), $.position),
							seq(
								key("rotate", 3, undefined, 1),
								optional(
									choice(seq("by", field("angle", $._expression)), "parallel"),
								),
							),
							seq(
								alias(K.tc, "tc"),
								choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
							),
							$.font_spec,
							key("enhanced", undefined, undefined, 1),
						),
					),
				),
				field("label", $._expression),
			),

		xrange: ($) =>
			repeat1(
				choice(
					$.range_block,
					key("reverse", 3, undefined, 1),
					key("writeback", 3, undefined, 1),
					key("extend", 3, undefined, 1),
					"restore",
				),
			),

		xtics: ($) => $.tics_opts,

		xyplane: ($) =>
			choice(
				seq($._expression),
				seq("at", field("zval", $._expression)),
				seq("relative", field("val", $._expression)),
			),

		zero: ($) => prec.left($._expression),

		zeroaxis: ($) => $.style_opts,

		c_show: ($) =>
			seq(
				key("show", 2),
				choice(
					$._argument_set_show,
					"colornames",
					"functions",
					key("plot", 1),
					key("variables", 1),
					seq(key("version", 2), optional(key("long", 1))),
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

		c_test: ($) => prec.left(seq("test", optional(choice("palette", "terminal")))),

		c_undefine: ($) =>
			prec.left(seq(key("undefine", 3), repeat($._expression))),

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

		range_block: ($) =>
			surround(
				"[]",
				optional(seq(field("dummy_var", $.identifier), "=")),
				optional(choice($._expression, "*")),
				optional(":"),
				optional(choice($._expression, "*")),
				optional(":"),
				optional($._expression),
			),

		for_block: ($) =>
			seq(
				"for",
				surround(
					"[]",
					choice(
						seq($._expression, "in", $._expression),
						seq(
							field("start", $.var_def),
							":",
							field("end", choice($._expression, "*")),
							optional(seq(":", field("incr", $._expression))),
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

		// plot ’<file_name>’ {binary <binary list>}
		//                     {bins <options>}
		datafile_modifiers: ($) =>
			repeat1(
				choice(
					field("binary", seq("binary")), // TODO: add binary list p. 121
					field(
						"matrix",
						choice(
							"matrix",
							seq("nonuniform", "matrix"),
							seq(
								"sparce", // FIX: sparce matrix p.247
								"matrix",
								"=",
								surround(
									"()",
									field("cols", $._expression),
									",",
									field("rows", $._expression),
								),
								optional(
									seq(
										"origin",
										"=",
										surround(
											"()",
											field("x0", $._expression),
											",",
											field("y0", $._expression),
										),
									),
								),
								optional(seq("dx", "=", field("dx", $._expression))),
								optional(seq("dy", "=", field("dy", $._expression))),
							),
						),
					),
					$._i_e_u_directives,
					field("skip", seq("skip", field("N_lines", $._expression))),
					seq("smooth", optional($.smooth_options)),
					seq("bins"), // TODO: finish this p. 125
					"mask",
					"convexhull",
          "concavehull",
					"volatile",
					"zsort",
					"noautoscale",
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

		label_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						choice(
							key("norotate", 5),
							seq(
								key("rotate", 3),
								optional(seq("by", field("degrees", $._expression))),
							),
						),
						$.font_spec,
						key("enhanced", undefined, undefined, 1),
						"front", "back",
						seq( // TODO: check
							alias(K.tc, "tc"),
							field(
								"tc",
								choice(
									$.colorspec,
									seq(
										choice(alias(K.lt, "lt"), alias(K.ls, "ls")),
										$._expression,
									),
                  $._expression, // TODO: check if this is correct
								),
							),
						),
						seq(key("offset", 3), $.position),
						field("align", alias(choice(K.l, K.r, K.c), "align")),
						seq("at", $.position),
						choice(seq("point", field("point", $.line_style)), "nopoint"), // TODO: check
						choice(
							key("noboxed", -2),
							seq("boxed", optional(field("bs", seq("bs", $._expression)))), // NOTE: bs == boxstyle
						),
						"hypertext",
					),
				),
			),

		tics_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						alias(/axis|border/, "axis"),
						key("mirror", undefined, undefined, 1),
						alias(/in|out/, "inout"),
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
						choice(seq(key("offset", 3), $.position), key("nooffset", 5)),
						alias(choice(K.l, K.r, K.c, reg("autojustify", 2)), "align"),
						"add",
						choice(
							"autofreq",
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
						$.font_spec, // string with font name and optional size
						key("enhanced", undefined, undefined, 1),
						alias(/numeric|timedate|geographic/, "type"),
						key("logscale", 3, "log", 1),
						key("rangelimited", 5, undefined, 1),
						seq(
							alias(K.tc, "tc"),
							choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
						),
					),
				),
			),

		line_style: ($) =>
			prec.left(
				seq(
					optional(field("tag", $._expression)), // TODO: check if tag is optional or not
					repeat1( // TODO: check if it's repeat1 or repeat
						choice(
							key("default", 3),
							seq(
								alias(K.lt, "lt"),
								choice($._expression, $.colorspec, "black", "bgnd", "nodraw"),
							),
							seq(alias(K.lc, "lc"), choice($._expression, $.colorspec)),
							seq(alias(K.lw, "lw"), $._expression),
							seq(alias(K.pt, "pt"), $._expression),
							seq(alias(K.ps, "ps"), $._expression),
							seq(alias(K.pi, "pi"), $._expression),
							seq(alias(K.pn, "pn"), $._expression),
							seq(alias(K.dt, "dt"), $.dash_opts),
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
							optional(seq(optional(alias(K.lt, "lt")), $._expression)),
							optional(
								seq(alias(K.lc, "lc"), choice($._expression, $.colorspec)),
							),
						),
					),
				),
			),

		colorspec: ($) =>
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
					"variable",
					"bgnd",
					"black",
				),
			),

		_i_e_u_directives: ($) =>
			choice(
				field(
					"index",
					seq(
						key("index", 1),
						choice(
							seq(
								field("m", $._expression),
								optional(seq(":", field("n", $._expression))),
								optional(seq(":", field("p", $._expression))),
							),
							alias($._expression, $.name),
						),
					),
				),
				seq(
					"every",
					optional(field("point_incr", $._expression)),
					optional(seq(":", optional(field("block_incr", $._expression)))),
					optional(seq(":", optional(field("start_point", $._expression)))),
					optional(seq(":", optional(field("start_block", $._expression)))),
					optional(seq(":", optional(field("end_point", $._expression)))),
					optional(seq(":", optional(field("end_block", $._expression)))),
				),
				field("using", seq(key("using", 1), sep(":", $._expression))),
			),

		smooth_options: ($) =>
			repeat1(
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
					seq("kdensity", optional(field("bandwidth_period", $._expression))),
				),
				"unwrap",
        seq("expand", $._expression), // NOTE: p. 128 v6.1
			  ),
      ),

		position: ($) =>
			seq(
				optional($.system),
				field("x", $._expression),
				optional(seq(",", optional($.system), field("y", $._expression))),
				optional(seq(",", optional($.system), field("z", $._expression))),
			),

		system: ($) =>
			choice(
				key("first", 3),
				key("second", 3),
				key("graph", 2),
				key("screen", 2),
				key("character", 4),
			),
		//-------------------------------------------------------------------------
		_assignment: ($) =>
			choice($.func_def, $.var_def, $.array_def, $.datablock_def),

		func_def: ($) => seq($.function, "=", $._expression),

		var_def: ($) =>
			seq(field("var", $.identifier), "=", sep("=", $._expression)),

		array_def: ($) =>
			choice(
				seq(
					"array",
					$.array,
					optional(seq("=", surround("[]", sep(",", $._expression)))),
				),
				seq(
					field("name", $.identifier),
					surround("[]", $._expression),
					"=",
					$._expression,
				),
			),

		datablock_def: ($) =>
			seq($.datablock, "<<", surround($.identifier, repeat($._expression))), // FIX: surround, identifier MUST be the same at both ends

		macro: ($) => token(seq("@", /([a-zA-Z_\u0370-\u26FF])+\w*/)),

		//-------------------------------------------------------------------------

		_expression: ($) =>
			prec(
				2,
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
			),

		_lab_lab: ($) =>
			// HACK: to make label work
			choice(
				$.string_literal,
				$.array,
				$.function,
				$.parenthesized_expression,
				$.binary_expression,
				$.identifier,
				$.datablock,
			),

		_lab_tag: ($) =>
			// HACK: to make label work
			choice($.number, $.array, $.function, $.identifier, $.macro, $.datablock),

		number: ($) => {
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

		string_literal: ($) =>
			choice(
				token(/"([^"\\\n]|\\.)*"/), // 1
				token(/"([^"\\\n]|\\.)*/, token.immediate('"')), // 2
				token(/'([^'\\\n]|\\.)*'/), // 1
				token(/'([^'\\\n]|\\.)*/, token.immediate("'")), // 2
			),

		array: ($) => seq($.identifier, surround("[]", $._expression)),

		function: ($) =>
			prec(
				14, // NOTE: maybe don't need to be so high?
				seq(
					field("name", $.identifier),
					surround("()", sep(",", field("arg", $._expression))),
				),
			),

		parenthesized_expression: ($) =>
			prec(PREC.PAREN, seq("(", $._expression, ")")),

		unary_expression: ($) =>
			choice(
				prec.left(PREC.UNARY, seq("-", $._expression)),
				prec.left(PREC.UNARY, seq("+", $._expression)),
				prec.left(PREC.BIT_NOT, seq("~", $._expression)),
				prec.left(PREC.UNARY, seq("!", $._expression)),
				prec.left(PREC.POWER, seq($._expression, "!")),
				prec.left(PREC.UNARY, seq("$", $.number)),
				prec.left(PREC.UNARY, seq("|", $._expression, "|")),
			),

		binary_expression: ($) =>
			choice(
				prec.left(PREC.POWER, seq($._expression, "**", $._expression)),
				prec.left(PREC.TIMES, seq($._expression, "*", $._expression)),
				prec.left(PREC.TIMES, seq($._expression, "/", $._expression)),
				prec.left(PREC.TIMES, seq($._expression, "%", $._expression)),
				prec.left(PREC.PLUS, seq($._expression, "+", $._expression)),
				prec.left(PREC.PLUS, seq($._expression, "-", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, "==", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, "!=", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, "<", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, "<=", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, ">", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, ">=", $._expression)),
				prec.left(PREC.SHIFT, seq($._expression, ">>", $._expression)),
				prec.left(PREC.SHIFT, seq($._expression, "<<", $._expression)),
				prec.left(PREC.BIT_AND, seq($._expression, "&", $._expression)),
				prec.left(PREC.BIT_OR, seq($._expression, "^", $._expression)),
				prec.left(PREC.BIT_OR, seq($._expression, "|", $._expression)),
				prec.left(PREC.AND, seq($._expression, "&&", $._expression)),
				prec.left(PREC.OR, seq($._expression, "||", $._expression)),
				prec.left(PREC.CONCAT, seq($._expression, ".", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, "eq", $._expression)),
				prec.left(PREC.COMPARE, seq($._expression, "ne", $._expression)),
			),

		ternary_expression: ($) =>
			prec.left(
				PREC.TERNARY,
				seq(
					field("condition", $._expression),
					"?",
					field("true", $._expression),
					":",
					field("false", $._expression),
				),
			),

		identifier: ($) => /([a-zA-Z_\u0370-\u26FF])+\w*/, // HACK: Not pretty but works

		datablock: ($) =>
			prec.left(
				seq(
					token(seq("$", /([a-zA-Z_\u0370-\u26FF])+\w*/)),
					optional(surround("[]", $._expression)),
				),
			),

		comment: ($) => token(seq("#", /.*/, repeat(seq(/\\\s*\n/, /.*/)))),
	},
});

function sep(separator, rule) {
	return seq(rule, repeat(seq(separator, rule)));
}

function surround(bracket, ...rules) {
	const surr = bracket;
	if (surr === "()") {
		return seq("(", ...rules, ")");
	} else if (surr === "[]") {
		return seq("[", ...rules, "]");
	} else if (surr === "{}") {
		return seq("{", ...rules, "}");
	} else {
		return seq(surr, ...rules, surr);
	}
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
		: new RegExp(`(no)?${regexPattern}`);
}
