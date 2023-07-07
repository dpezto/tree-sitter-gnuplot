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
	PAREN: 13, // (a)
};

const K = {
	NO: /(no)?/,
	as: /arrowstyle|as/,
	autojustify: /au(t(o(j(u(s(t(i(f(y)?)?)?)?)?)?)?)?)?/,
	axes: /(x|y|z|x2|y2|cb)/,
	axesr: /(x|y|z|x2|y2|cb|r)/, // TODO: check if unnessesary
	bottom: /b(o(t(t(o(m)?)?)?)?)?/,
	center: /c(e(n(t(e(r)?)?)?)?)?/,
	def: /def(a(u(l(t)?)?)?)?/,
	dl: /dashl(e(n(g(t(h)?)?)?)?)?|dl/,
	dt: /dasht(y(p(e)?)?)?|dt/,
	enhanced: /(no)?enhanced/,
	fc: /fillc(o(l(o(r)?)?)?)?|fc/,
	label: /lab(e(l)?)?/,
	left: /l(e(f(t)?)?)?/,
	lc: /linec(o(l(o(r)?)?)?)?|lc/,
	logfile: /logf(i(l(e)?)?)?/,
	logscale: /log(s(c(a(l(e)?)?)?)?)?/,
	ls: /lines(t(y(l(e)?)?)?)?|ls/,
	lt: /linetype|lt/,
	lw: /linew(i(d(t(h)?)?)?)?|lw/,
	mirror: /(no)?mirror/,
	mxtics: /m(x|y|z|x2|y2|cb|r|t)tics?/,
	offset: /off(s(e(t)?)?)?/,
	output: /o(u(t(p(u(t)?)?)?)?)?/,
	palette: /pal(e(t(t(e)?)?)?)?/,
	pt: /pointt(y(p(e)?)?)?|pt/,
	ps: /points(i(z(e)?)?)?|ps/,
	range: /ran(g(e)?)?/,
	right: /r(i(g(h(t)?)?)?)?/,
	rotate: /rot(a(t(e)?)?)?/,
	sep: /sep(ar(a(t(o(r)?)?)?)?)?/,
	size: /si(z(e)?)?/,
	spider: /spider(p(l(o(t)?)?)?)?/,
	tc: /textc(o(l(o(r)?)?)?)?|tc/,
	tics: /tics?/,
	top: /t(o(p)?)?/,
	transparent: /trans(p(a(r(e(n(t)?)?)?)?)?)?/,
	white: /white(s(p(a(c(e)?)?)?)?)?/,
};

// TODO: check for cohesion within the similar options e.x. offset

module.exports = grammar({
	name: "gnuplot",

	extras: ($) => [$.comment, /[\s\f\uFEFF\u2060\u200B]|\\\r?\n/, /\\/],

	// inline: ($) => [$.string_literal],

	word: ($) => $.identifier,

	conflicts: ($) => [
		[$._expression],
		[$.argument_set_show],
		[$.style_opts],
		[$.label],
		[$.xlabel],
		[$.position],
		[$.plot_style],
		[$._i_e_u_directives],
		[$.fill_style],
		[$.title],
	],

	rules: {
		source_file: ($) => repeat($._statement),

		_statement: ($) =>
			seq(choice($.command, $._assignment, $.macro), optional(";")),

		command: ($) =>
			choice(
				// $.c_bind, // p. 64
				// $.c_break, // only in loops do/while
				$.c_cd,
				// $.c_call,
				$.c_clear,
				// $.c_continue, // only in loops do/while
				$.c_do,
				$.c_eval,
				// $.c_exit, // quit p. 104
				$.c_fit,
				$.c_help,
				// $.c_history,
				$.c_if,
				// $.c_import,
				$.c_load,
				// $.c_lower, // p. 142
				// $.c_pause,
				$.c_plot,
				$.c_print, // printerr
				// $.c_pwd,
				// $.c_quit,
				// $.c_raise, // p. 142
				// $.c_refresh,
				$.c_replot,
				$.c_reset,
				// $.c_save,
				$.c_set, // set, unset, show
				$.c_show, // show only p. 242
				$.c_splot,
				$.c_stats,
				// $.c_system,
				$.c_test,
				// $.c_toggle,
				$.c_undefine,
				// $.c_vclear,
				// $.c_vfill,
				$.c_while,
			),

		//-------------------------------------------------------------------------
		c_cd: ($) => seq("cd", $._expression),

		c_clear: ($) => "clear",

		c_do: ($) => seq("do", $.for_block, "{", repeat($._statement), "}"),

		c_eval: ($) => seq("eval", $._expression),

		c_fit: ($) =>
			seq(
				"fit",
				optional($.range_block),
				field("func", $.function),
				field("data", $._expression),
				optional($.datafile_modifiers),
				optional(
					repeat1(
						choice(
							"unitweights",
							/(y|xy|z)err(o(r)?)?/,
							seq(
								"errors",
								$._expression,
								optional(repeat1(seq(",", $._expression))),
							),
						),
					),
				),
				"via",
				choice(
					field("parameter_file", $._expression),
					field("var", seq($._expression, repeat1(seq(",", $._expression)))),
				),
			),

		c_help: ($) => prec.left(seq(/h(e(l(p)?)?)?/, optional($._expression))),

		c_if: ($) =>
			seq(
				"if",
				"(",
				$._expression,
				")",
				"{",
				repeat($._statement),
				"}",
				repeat(
					seq(
						"else",
						"if",
						"(",
						repeat1($._expression),
						")",
						"{",
						repeat($._statement),
						"}",
					),
				),
				optional(seq("else", "{", repeat($._statement), "}")),
			),

		c_load: ($) => seq("load", $._expression),

		c_plot: ($) =>
			seq(
				alias(/p(l(o(t)?)?)?/, $.plot),
				optional("sample"),
				repeat($.range_block),
				$.plot_element,
				repeat(seq(choice(",", /,\s*\\/), $.plot_element)),
			),

		plot_element: ($) =>
			prec.left(
				1,
				seq(
					field("iteration", optional($.for_block)),
					choice(
						seq(
							alias($._assignment, $.definition),
							repeat(seq(",", $._assignment)),
							",",
							$.function,
						),
						seq(field("func", $.function)),
						seq(alias($._expression, $.data), optional($.datafile_modifiers)),
					),
					repeat(
						choice(
							seq("axes", choice("x1y1", "x2y2", "x1y2", "x2y1")),
							choice(
								alias(/not(i(t(l(e)?)?)?)?/, $.not),
								seq(
									alias(/t(i(t(l(e)?)?)?)?/, $.tit),
									alias($._expression, $.title),
								),
							),
							choice(
								seq(
									alias(/w(i(t(h)?)?)?/, $.with),
									$.plot_style,
									optional($.style_opts),
								),
								$.style_opts,
							),
						),
					),
				),
			),

		plot_style: ($) =>
			choice(
				alias(/l(i(n(e(s)?)?)?)?/, $.lines),
				alias(/p(o(i(n(t(s)?)?)?)?)?/, $.points),
				alias(choice("lp", "linespoints"), $.lp),
				alias(/fin(a(n(c(e(b(a(r(s)?)?)?)?)?)?)?)?/, $.financebars),
				alias(/d(o(t(s)?)?)?/, $.dots),
				alias(/i(m(p(u(l(s(e(s)?)?)?)?)?)?)?/, $.impulses),
				seq(alias(/lab(e(l(s)?)?)?/, $.labels), repeat($.label_opts)),
				alias(/sur(f(a(c(e)?)?)?)?/, $.surface),
				alias(/st(e(p(s)?)?)?/, $.steps),
				"fsteps",
				"histeps",
				alias(/arr(o(w(s)?)?)?/, $.arrows),
				seq(
					alias(/vec(t(o(r(s)?)?)?)?/, $.vectors),
					repeat(alias($._arrow_opts, $.arrow_opts)),
				),
				alias(/(x|y|xy)errorbar/, $.errorbar),
				alias(/(x|y|xy)errorlines/, $.errorlines),
				"parallelaxes",
				"boxes",
				"boxerrorbars",
				"boxxyerror",
				"isosurface",
				"boxplot",
				"candlesticks",
				"circles",
				"zerrorfill",
				"ellipses",
				seq(
					alias(/filledc(u(r(v(e(s)?)?)?)?)?/, $.filledcurves),
					optional(
						choice(
							"closed",
							"between",
							seq(
								optional(choice("above", "below")),
								seq(
									choice("x1", "x2", "y1", "y2", "y", "r"),
									optional(seq("=", $._expression)),
								),
							),
						),
					),
					optional(seq(alias(/fill|fs/, $.fill), $.fill_style)),
				),
				seq(
					"fillsteps",
					optional(choice("above", "below")),
					optional(seq("y", "=", $._expression)),
				),
				"histograms",
				alias(/ima(g(e)?)?/, $.image),
				"pm3d",
				"rgbalpha",
				"rgbimage",
				"polygons",
				"table",
				"mask",
			),

		style_opts: ($) =>
			repeat1(
				choice(
					$.line_opts,
					seq(alias(K.pt, $.pt), $._expression),
					seq(alias(K.ps, $.ps), $._expression),
					seq(alias(choice("arrowstyle", "as"), $.as), $._expression),
					seq(alias(choice("fill", "fs"), $.fs), $.fill_style),
					seq(alias(K.fc, $.fc), $.colorspec),
					// TODO: simplify with K list
					"nohidden3d",
					"nocontours",
					/nosurf(a(c(e)?)?)?/,
					K.palette,
				),
			),

		c_print: ($) =>
			seq(
				choice("print", "printerr"),
				$._expression,
				repeat(seq(",", $._expression)),
			),

		c_replot: ($) => /rep(l(o(t)?)?)?/,

		c_reset: ($) => seq("reset", optional(choice("bind", "errors", "session"))),

		c_set: ($) =>
			seq(
				seq(alias(/set?|uns(e(t)?)?/, $.cmd), optional($.for_block)),
				field("argument", $.argument_set_show),
			),

		argument_set_show: ($) =>
			choice(
				seq(alias(/(an(g(l(e(s)?)?)?)?)/, $.opts), optional($.angles)),
				seq(alias(/arr(o(w)?)?/, $.opts), optional($.arrow)),
				seq(alias(/bor(d(e(r)?)?)?/, $.opts), optional($.border)),
				seq(alias(/box(w(i(d(t(h)?)?)?)?)?/, $.opts), optional($.boxwidth)),
				seq(alias("boxdepth", $.opts), optional($.boxdepth)),
				alias("color", $.opts), // $.color,
				seq(alias("colormap", $.opts), optional($.colormap)),
				seq(alias("colorsequence", $.opts), optional($.colorsequence)),
				seq(alias("clip", $.opts), optional($.clip)),
				seq(alias(/cntrl(a(b(e(l)?)?)?)?/, $.opts), optional($.cntrlabel)),
				seq(alias(/cntrp(a(r(a(m)?)?)?)?/, $.opts), optional($.cntrparam)),
				seq(alias(/colorb(o(x)?)?/, $.opts), optional($.colorbox)),
				seq(alias(/conto(u(r)?)?/, $.opts), optional($.contour)),
				alias(/cornerp(o(l(e(s)?)?)?)?/, $.opts),
				seq(alias(K.dt, $.opts), optional($.dashtype)),
				seq(alias(/dataf(i(l(e)?)?)?/, $.opts), optional($.datafile)),
				seq(
					alias(/dec(i(m(a(l(s(i(g(n)?)?)?)?)?)?)?)?/, $.opts),
					optional($.decimalsign),
				),
				seq(alias(/dg(r(i(d(3(d)?)?)?)?)?/, $.opts), optional($.dgrid3d)),
				seq(alias(/du(m(m(y)?)?)?/, $.opts), optional($.dummy)),
				seq(alias(/enc(o(d(i(n(g)?)?)?)?)?/, $.opts), optional($.encoding)),
				seq(alias("errorbars", $.opts), optional($.errorbars)),
				seq(alias("fit", $.opts), optional($.fit)),
				seq(alias(/form(a(t)?)?/, $.opts), optional($.format)),
				seq(alias(/gr(i(d)?)?/, $.opts), optional($.grid)),
				seq(alias(/hid(d(e(n(3(d)?)?)?)?)?/, $.opts), optional($.hidden3d)),
				seq(alias(/his(t(o(r(y)?)?)?)?/, $.opts), optional($.history)),
				seq(
					alias(/iso(s(a(m(p(l(e(s)?)?)?)?)?)?)?/, $.opts),
					optional($.isosamples),
				),
				seq(alias(/isosurf(a(c(e)?)?)?/, $.opts), optional($.isosurface)),
				alias("isotropic", $.opts), // $.isotropic,
				seq(alias("jitter", $.opts), optional($.jitter)),
				seq(alias(/k(e(y)?)?/, $.opts), optional($.key)),
				seq(alias(K.label, $.opts), optional($.label)),
				seq(alias(K.lt, $.opts), optional($.linetype)),
				// seq(optional($.link)), // p. 181
				seq(alias(/loa(d(p(a(t(h)?)?)?)?)?/, $.opts), optional($.loadpath)),
				seq(alias("locale", $.opts), optional($.locale)),
				seq(alias(K.logscale, $.opts), optional($.logscale)),
				seq(alias(/map(p(i(n(g)?)?)?)?/, $.opts), optional($.mapping)),
				seq(alias(/(l|r|t|b)?mar(g(i(n(s)?)?)?)?/, $.opts), optional($.margin)),
				seq(alias("micro", $.opts), optional($.micro)),
				alias(/minus(s(i(g(n)?)?)?)?/, $.opts), // $.minussign,
				seq(
					alias(/mono(c(h(r(o(m(e)?)?)?)?)?)?/, $.opts),
					optional($.monochrome),
				),
				seq(alias(/mo(u(s(e)?)?)?/, $.opts), optional($.mouse)),
				seq(alias(/multi(p(l(o(t)?)?)?)?/, $.opts), optional($.multiplot)),
				seq(alias(K.mxtics, $.opts), optional($.mxtics)),
				// seq(optional($.nonlinear)), // p. 191
				// seq(optional($.object)), // p. 192
				// seq(optional($.offsets)), // p. 194
				// seq(optional($.origin)), // p. 195
				seq(alias(K.output, $.opts), optional($.output)),
				seq(alias("overflow", $.opts), optional($.overflow)),
				seq(alias(K.palette, $.opts), optional($.palette)),
				alias(/pa(r(a(m(e(t(r(i(c)?)?)?)?)?)?)?)?/, $.opts), // $.parametric,
				seq(alias("paxis", $.opts), optional($.paxis)),
				// seq(optional($.pixmap)), // p. 203
				seq(alias("pm3d", $.opts), optional($.pm3d)),
				seq(
					alias(/pointint(e(r(v(a(l(b(o(x)?)?)?)?)?)?)?)?/, $.opts),
					optional($.pointintervalbox),
				),
				seq(
					alias(/poi(n(t(s(i(z(e)?)?)?)?)?)?/, $.opts),
					optional($.pointsize),
				),
				alias(/pol(a(r)?)?/, $.opts), // $.polar,
				seq(alias(/pr(i(n(t)?)?)?/, $.opts), optional($.print)),
				seq(alias("psdir", $.opts), optional($.psdir)),
				alias(/rax(i(s)?)?/, $.opts), // $.raxis,
				seq(alias("rgbmax", $.opts), optional($.rgbmax)),
				seq(alias(/sam(p(l(e(s)?)?)?)?/, $.opts), optional($.samples)),
				seq(alias(K.size, $.opts), optional($.size)),
				alias(K.spider, $.opts), // $.spiderplot,
				seq(alias(/st(y(l(e)?)?)?/, $.opts), optional($.style)),
				seq(alias(/su(r(f(a(c(e)?)?)?)?)?/, $.opts), optional($.surface)),
				seq(alias(/ta(b(l(e)?)?)?/, $.opts), optional($.table)),
				seq(
					alias(/t(e(r(m(i(n(a(l)?)?)?)?)?)?)?/, $.opts),
					optional($.terminal),
				),
				seq(alias("termoption", $.opts), optional($.termoption)),
				seq(alias("theta", $.opts), optional($.theta)),
				seq(alias(K.tics, $.opts), optional($.tics)),
				seq(alias(/times(t(a(m(p)?)?)?)?/, $.opts), optional($.timestamp)),
				seq(alias(/timef(m(t)?)?/, $.opts), optional($.timefmt)),
				seq(alias(/tit(l(e)?)?/, $.opts), optional($.title)),
				// seq(optional($.ttics)) // p. 226
				seq(alias("vgrid", $.opts), optional($.vgrid)),
				seq(alias(/vi(e(w)?)?/, $.opts), optional($.view)),
				seq(alias(/walls?/, $.opts), optional($.walls)),
				seq(alias(token(seq(K.axes, /da(t(a)?)?/)), $.opts), optional($.xdata)),
				alias(token(seq(K.axes, "d", K.tics)), $.opts), // $.xdtics,
				seq(alias(token(seq(K.axesr, K.label)), $.opts), optional($.xlabel)),
				alias(token(seq(K.axes, "m", K.tics)), $.opts), // $.xmtics,
				seq(
					alias(token(seq(/x|y|z|x2|y2|r|t|u|v|cb|vx|vy|vz/, K.range)), $.opts),
					optional($.xrange),
				),
				seq(alias(token(seq(K.axesr, K.tics)), $.opts), optional($.xtics)),
				seq(alias(/xyp(l(a(n(e)?)?)?)?/, $.opts), optional($.xyplane)),
				seq(alias(/z(e(r(o)?)?)?/, $.opts), optional($.zero)),
				seq(
					alias(/(x|y|z|x2|y2)?zeroa(x(i(s)?)?)?/, $.opts),
					optional($.zeroaxis),
				),
			),

		angles: ($) =>
			choice(/d(e(g(r(e(e(s)?)?)?)?)?)?/, /r(a(d(i(a(n(s)?)?)?)?)?)?/),

		arrow: ($) =>
			prec.left(
				seq(
					optional(alias($._expression, $._tag)),
					repeat1(
						choice(
							seq(
								optional(seq(alias("from", $._from), $.position)),
								alias(/r?to/, $._to_rto),
								$.position,
							),
							seq(
								alias("from", $._from),
								$.position,
								alias(/len(g(t(h)?)?)?/, $._len),
								alias($._expression, $.length),
								alias(/an(g(l(e)?)?)?/, $._ang),
								alias($._expression, $.angle),
							),
							alias($._arrow_opts, $.arrow_opts),
						),
					),
				),
			),

		border: ($) =>
			prec.left(
				seq(
					optional($._expression),
					repeat1(choice("front", "back", "behind", $.line_opts, "polar")),
				),
			),

		boxwidth: ($) =>
			prec.left(
				repeat1(
					choice(
						field("width", $._expression),
						/a(b(s(o(l(u(t(e)?)?)?)?)?)?)?/,
						/r(e(l(a(t(i(v(e)?)?)?)?)?)?)?/,
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
			/p(o(i(n(t(s)?)?)?)?)?|o(n(e)?)?|t(w(o)?)?|r(a(d(i(a(l)?)?)?)?)?/,

		cntrlabel: ($) =>
			repeat1(
				choice(
					seq("format", $._expression),
					seq("font", $._expression),
					seq("start", $._expression),
					seq("interval", $._expression),
					"onecolor",
				),
			),

		cntrparam: ($) =>
			choice(
				"linear",
				"cubicspline",
				"bspline",
				seq("points", $._expression),
				seq("order", $._expression),
				seq(
					/le(v(e(l(s)?)?)?)?/,
					choice(
						$._expression,
						prec.left(1, seq("auto", optional($._expression))),
						prec.left(
							1,
							seq("discrete", $._expression, repeat(seq(",", $._expression))),
						),
						prec.left(
							1,
							seq(
								/in(c(r(e(m(e(n(t(a(l)?)?)?)?)?)?)?)?)?/,
								$._expression,
								",",
								$._expression,
								optional(seq(",", $._expression)),
							),
						),
					),
					optional(/((un)?sorted)/),
					optional(seq("firstlinetype", $._expression)),
				),
			),

		colorbox: ($) =>
			repeat1(
				choice(
					/v(e(r(t(i(c(a(l)?)?)?)?)?)?)?|h(o(r(i(z(o(n(t(a(l)?)?)?)?)?)?)?)?)?/,
					/(no)?inv(e(r(t)?)?)?/,
					/def(a(u(l(t)?)?)?)?|u(s(e(r)?)?)?/,
					seq(/o(r(i(g(i(n)?)?)?)?)?/, $.position),
					seq(/s(i(z(e)?)?)?/, $.position),
					/fr(o(n(t)?)?)?|ba(c(k)?)?/,
					choice(
						/nobo(r(d(e(r)?)?)?)?/,
						/bd(f(a(u(l(t)?)?)?)?)?/,
						seq(/bo(r(d(e(r)?)?)?)?/, $.line_style),
					),
					seq("cbtics", $.line_style),
				),
			),

		contour: ($) => /ba(s(e)?)?|s(u(r(f(a(c(e)?)?)?)?)?)?|bo(t(h)?)?/,

		dashtype: ($) => seq(field("tag", $._expression), $._dash_opts),

		_dash_opts: ($) =>
			choice(
				$.number,
				"solid",
				$.string_literal,
				seq(
					// FIX: number should be expression
					// TODO: change alias for field to clean up the tree
					"(",
					alias($.number, $.solid_lenght),
					",",
					alias($.number, $.empty_lenght),
					optional(
						seq(
							",",
							alias($.number, $.solid_lenght),
							",",
							alias($.number, $.empty_lenght),
						),
					),
					optional(
						seq(
							",",
							alias($.number, $.solid_lenght),
							",",
							alias($.number, $.empty_lenght),
						),
					),
					optional(
						seq(
							",",
							alias($.number, $.solid_lenght),
							",",
							alias($.number, $.empty_lenght),
						),
					),
					")",
				),
			),

		datafile: ($) =>
			prec.left(
				choice(
					alias(/columnhead(e(r(s)?)?)?/, $.columnheaders),
					alias(/fort(r(a(n)?)?)?/, $.fortran),
					"nofpe_trap",
					seq(
						alias(/miss(i(n(g)?)?)?/, $.miss),
						alias($._expression, $.missing),
					),
					seq(
						alias(K.sep, $.sep),
						choice(
							alias(K.white, $.white),
							"tab",
							"comma",
							alias($._expression, $.separator),
						),
					),
					seq(
						alias(/com(m(e(n(t(s(c(h(a(r(s)?)?)?)?)?)?)?)?)?)?/, $.comments),
						optional(alias($._expression, $.str)),
					),
					seq("binary", $._expression), // binary list pag 160 -> 118 -> 245
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
				K.def,
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
						$.line_opts,
					),
				),
			),

		fit: ($) =>
			repeat1(
				choice(
					// default cannot be /def(a(u(l(t)?)?)?)?/
					choice(
						token(seq(K.NO, K.logfile)),
						seq(K.logfile, choice($._expression, "default")),
					),
					alias(/((no)?quiet|results|brief|verbose)/, $.fit_out),
					alias(
						/(no)?err(o(r(v(a(r(i(a(b(l(e(s)?)?)?)?)?)?)?)?)?)?)?/,
						$.errorvars,
					),
					alias(/(no)?covariancevariables/, $.covariancevars),
					alias(/(no)?errorscaling/, $.errorscaling),
					alias(/(no)?prescale/, $.prescale),
					seq("maxiter", choice(field("value", $._expression), "default")),
					seq("limit", choice(field("epsilon", $._expression), "default")),
					seq("limit_abs", field("epsilon_abs", $._expression)),
					seq("start-lambda", choice($._expression, "default")),
					seq("lambda-factor", choice($._expression, "default")),
					seq(
						"script",
						optional(choice(field("command", $._expression), "default")),
					),
					alias(/v4|v5/, $.version),
				),
			),

		format: ($) =>
			seq(
				optional(alias(choice("x", "y", "xy", "x2", "y2", "z", "cb"), $.axes)),
				field("fmt_str", $._expression),
				optional(choice("numeric", "timedate", "geographic")),
			),

		grid: ($) =>
			repeat1(
				choice(
					alias(token(seq(K.NO, /m?/, K.axesr, K.tics)), $.tics),
					seq(
						alias(token(seq(K.NO, /po(l(a(r)?)?)?/)), $.po),
						optional(alias($._expression, $.angle)),
					),
					alias(/layerd(e(f(a(u(l(t)?)?)?)?)?)?|front|back/, $.layer),
					alias(/(no)?vert(i(c(a(l)?)?)?)?/, $.vertical),
					seq($.line_opts, optional(seq(",", $.line_opts))),
				),
			),

		hidden3d: ($) =>
			choice(
				"defaults", // /def(a(u(l(t(s)?)?)?)?)?/
				repeat1(
					choice(
						alias(/front|back/, $.fb),
						seq(
							alias(token(seq(K.NO, K.offset)), $.offs),
							alias($._expression, $.offset),
						),
						seq("trianglepattern", alias($._expression, $.tp)),
						seq(
							alias(/(no)?undefined/, $.undef),
							alias($._expression, $.undefined),
						),
						alias(/((no)?altdiagonal)/, $.altdiagonal),
						alias(/((no)?bentover)/, $.bentover),
					),
				),
			),

		history: ($) =>
			repeat1(
				choice(
					field("size", seq("size", $._expression)), // cannot be K.size
					/quiet|num(b(e(r(s)?)?)?)?/,
					/full|trip/,
					/def(a(u(l(t)?)?)?)?/,
				),
			),

		isosamples: ($) =>
			prec.left(seq($._expression, optional(seq(",", $._expression)))),

		isosurface: ($) =>
			choice(
				choice("mixed", "triangles"), // /mix(e(d)?)?/ /triang(l(e(s)?)?)?/
				choice("noinsidecolor", seq("insidecolor", $._expression)), // /inside(c(o(l(o(r)?)?)?)?)?/
			),

		// isotropic: ($) => "isotropic",

		jitter: ($) =>
			repeat1(
				choice(
					seq(/over(l(a(p)?)?)?/, $._expression),
					seq("spread", $._expression),
					seq("wrap", $._expression),
					/swarm|square|vert(i(c(a(l)?)?)?)?/,
				),
			),

		key: ($) =>
			repeat1(
				choice(
					choice("on", "off"),
					K.def,
					alias(K.enhanced, $.enhanced),
					seq(
						alias(/(no)?a(u(t(o(t(i(t(l(e)?)?)?)?)?)?)?)?/, $.a),
						optional("columnheader"),
					),
					seq(alias(/(no)?box/, $.box), optional($.line_opts)),
					seq(alias(/(no)?opaque/, $.opaque), optional(seq(K.fc, $.colorspec))),
					seq("width", field("increment", $._expression)),
					seq("height", field("increment", $._expression)),
					// layout
					alias(
						/ver(t(i(c(a(l)?)?)?)?)?|hor(i(z(o(n(t(a(l)?)?)?)?)?)?)?/,
						$.layout,
					),
					seq("maxcols", optional(choice($._expression, "auto"))),
					seq("maxrows", optional(choice($._expression, "auto"))),
					seq("columns", $._expression),
					seq("keywidth", choice("screen", "graph"), $._expression),
					alias(/Left|Right/, $.lr),
					alias(/(no)?(rev(e(r(s(e)?)?)?)?|inv(e(r(t)?)?)?)/, $.reverse),
					seq("samplen", alias($._expression, $.length)),
					seq("spacing", alias($._expression, $.spacing)),
					seq(
						alias(/ti(t(l(e)?)?)?/, $.tit),
						optional(alias($._expression, $.title)),
						optional(alias(K.enhanced, $.enhanced)),
						optional(alias(choice(K.center, K.left, K.right), $.position)),
					),
					seq("font", field("face_size", $._expression)),
					seq(alias(K.tc, $.tc), choice($.colorspec, $.linetype)),
					// placement
					alias(
						/(ins(i(d(e)?)?)?|o(u(t(s(i(d(e)?)?)?)?)?)?|fixed)/,
						$.placement,
					),
					alias(/(l|r|t|b)m(a(r(g(i(n)?)?)?)?)?/, $.margin),
					seq("at", $.position),
					alias(token(choice(K.center, K.left, K.right)), $.hor),
					alias(token(choice(K.top, K.bottom, K.center)), $.vert),
				),
			),

		label: ($) =>
			repeat1(
				choice(
					field("tag", $._expression),
					field("label", $._expression),
					$.label_opts,
				),
			),

		linetype: ($) => prec.left($.line_style),

		// link: $ => // TODO: p. 181
		// set link {x2 | y2} {via <expression1> inverse <expression2>}

		loadpath: ($) => $._expression,

		locale: ($) => prec.left(field("locale", $._expression)),

		logscale: ($) => {
			const axis = choice("x", "y", "z", "x2", "y2", "cb", "r");
			return prec.left(
				seq(
					alias(token(repeat1(seq(axis))), $.axis),
					optional(field("base", $._expression)),
				),
			);
		},

		mapping: ($) => choice("cartesian", "spherical", "cylindrical"),

		margin: ($) =>
			prec.left(
				choice(
					seq(optional(seq("at", "screen")), $._expression),
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

		micro: ($) => "micro", // NOTE: experimental p. 184

		// minussign: ($) => /minus(s(i(g(n)?)?)?)?/, // NOTE: experimental p. 184

		monochrome: ($) => $.linetype,

		mouse: ($) =>
			repeat1(
				choice(
					seq(/do(u(b(l(e(c(l(i(c(k)?)?)?)?)?)?)?)?)?/, $._expression),
					/nodo(u(b(l(e(c(l(i(c(k)?)?)?)?)?)?)?)?)?/,
					/(no)?zoomco(o(r(d(i(n(a(t(e(s)?)?)?)?)?)?)?)?)?/,
					seq(
						/zoomfa(c(t(o(r(s)?)?)?)?)?/,
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
						alias(/t(i(t(l(e)?)?)?)?/, $.title),
						field("title", $._expression),
						optional(seq("font", field("font", $._expression))),
						optional(K.enhanced),
					),
					seq(
						seq(
							"layout",
							field("rows", $._expression),
							",",
							field("cols", $._expression),
						),
						optional(choice("rowsfirst", "columnsfirst")),
						optional(choice("downwards", "upwards")),
						optional(
							seq(
								"scale",
								field("xscale", $._expression),
								optional(seq(",", field("yscale", $._expression))),
							),
						),
						optional(seq(K.offset, $.position)),
						optional(
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
						),
						optional(
							seq(
								"spacing",
								field("xspacing", $._expression),
								optional(seq(",", field("yspacing", $._expression))),
							),
						),
					),
					/next|previous/,
				),
			),

		mxtics: ($) =>
			prec.left(
				choice(
					alias($._expression, $.freq),
					K.def,
					seq(
						alias($._expression, $.N),
						field(
							"units",
							choice(
								/sec(o(n(d(s)?)?)?)?/,
								/min(u(t(e(s)?)?)?)?/,
								/hours?/,
								/days?/,
								/weeks?/,
								/mon(t(h(s)?)?)?/,
								/years?/,
							),
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

		// offsets: $ => // p.194
		// set offsets <left>, <right>, <top>, <bottom>

		// origin: $ => // p.195
		// set origin <x-origin>,<y-origin>

		output: ($) => field("name", $._expression),

		overflow: ($) => choice("float", "NaN", "undefined"),

		palette: ($) =>
			repeat1(
				choice(
					choice("gray", "color"),
					seq("gamma", field("gamma", $._expression)),
					choice(
						seq(
							/rgb(f(o(r(m(u(l(a(e)?)?)?)?)?)?)?)?/,
							field("r", $._expression), // TODO: the following in seq() are optional
							",",
							field("g", $._expression),
							",",
							field("b", $._expression),
						),
						seq(
							/def(i(n(e(d)?)?)?)?/,
							optional(
								seq(
									"(",
									seq(
										field("gray", $._expression),
										field("color", $._expression),
										repeat(
											seq(
												",",
												field("gray", $._expression),
												field("color", $._expression),
											),
										),
									),
									")",
								),
							),
						),
						seq(
							"file",
							field("filename", $._expression),
							optional($.datafile_modifiers),
						),
						seq(
							/col(o(r(m(a(p)?)?)?)?)?/,
							field("colormap_name", $._expression),
						),
						seq(
							/func(t(i(o(n(s)?)?)?)?)?/,
							field("R", $._expression),
							",",
							field("G", $._expression),
							",",
							field("B", $._expression),
						),
					),
					seq(
						"cubehelix",
						optional(seq("start", field("val", $._expression))),
						optional(seq("cycles", field("val", $._expression))),
						optional(seq("saturation", field("val", $._expression))),
					),
					"viridis",
					seq(
						/mo(d(e(l)?)?)?/,
						choice(
							"RGB",
							"CMY",
							seq(
								"HSV",
								optional(seq("start", field("radians", $._expression))),
							),
						),
					),
					choice(/pos(i(t(i(v(e)?)?)?)?)?/, /neg(a(t(i(v(e)?)?)?)?)?/),
					choice("nops_allcF", "ps_allcF"),
					seq(/maxc(o(l(o(r(s)?)?)?)?)?/, field("maxcolors", $._expression)),
				),
			),

		// parametric: ($) => /pa(r(a(m(e(t(r(i(c)?)?)?)?)?)?)?)?/,

		paxis: ($) =>
			seq(
				alias($._expression, $.axisno),
				repeat(
					choice(
						seq(
							alias(K.range, $.range),
							$.range_block,
							repeat(
								choice(
									/(no)?reverse/,
									/(no)?writeback/,
									/(no)?extend/,
									"restore",
								),
							),
						),
						seq(alias(K.tics, $.tics), $.tics_opts),
						seq(alias(K.label, $.label), optional($._expression), $.label_opts),
						seq(alias(K.offset, $.offset), $.position),
					),
				),
			), // TODO: complete

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
						"interpolate",
						field("steps", $._expression),
						",",
						field("between", $._expression),
					),
					choice(
						alias(/scans(automatic|forward|backward)/, $.scanorder),
						seq(
							alias(/dep(t(h(o(r(d(e(r)?)?)?)?)?)?)?/, $.depthorder),
							optional("base"),
						),
						alias(/(no)?hi(d(d(e(n(3(d)?)?)?)?)?)?/, $.hidden3d),
					),
					seq("flush", choice("begin", "center", "end")),
					alias(/(no)?ftriangles/, $.ftriangles),
					choice(seq("clip", field("z", $._expression)), "clip1in", "clip4in"),
					alias(/(no)?clipcb/, $.clipcb),
					seq(
						"corners2color",
						choice(
							"mean",
							"geomean",
							"harmean",
							"rms",
							"median",
							"min",
							"max",
							"c1",
							"c2",
							"c3",
							"c4",
						),
					),
					seq(
						alias(/(no)?lighting/, $.lighting),
						optional(seq("primary", field("fraction", $._expression))),
						optional(seq("specular", field("fraction", $._expression))),
						optional(seq("spec2", field("fraction", $._expression))),
					),
					seq(
						alias(/(no)?border/, $.border),
						optional("retrace"),
						optional(alias($.line_opts, $.line_opts)),
					),
					choice("implicit", "explicit"),
					"map",
				),
			),

		pointintervalbox: ($) => $._expression,

		pointsize: ($) => field("multiplier", $._expression),

		// polar: ($) => /pol(a(r)?)?/,

		print: ($) => prec.left($._expression),

		psdir: ($) => $._expression,

		// raxis: ($) => /rax(i(s)?)?/,

		rgbmax: ($) => prec.left($._expression),

		samples: ($) =>
			seq(
				alias($._expression, $.s1),
				optional(seq(",", alias($._expression, $.s2))),
			),

		size: ($) =>
			prec.left(
				repeat1(
					choice(
						choice(
							/(no)?square/,
							seq(/ra(t(i(o)?)?)?/, $._expression),
							/nora(t(i(o)?)?)?/,
						),
						seq(
							field("xscale", $._expression),
							",",
							field("yscale", $._expression),
						),
					),
				),
			),

		// spiderplot: ($) => K.spider,

		style: ($) =>
			choice(
				seq(alias(/arr(o(w)?)?/, $.arrow, choice(K.def, $._arrow_opts))),
				seq(alias("boxplot", $.boxplot)), // TODO: p. 214
				// set style boxplot {range <r> | fraction <f>}
				//                   {{no}outliers} {pointtype <p>}
				//                   {candlesticks | financebars}
				//                   {medianlinewidth <width>}
				//                   {separation <x>}
				//                   {labels off | auto | x | x2}
				//                   {sorted | unsorted}
				seq(
					alias(/d(a(t(a)?)?)?/, $.data),
					choice($.plot_style, alias(K.spider, $.spiderplot)),
				),
				seq(alias(/fill|fs/, $.fill), $.fill_style),
				seq(alias(/f(u(n(c(t(i(o(n)?)?)?)?)?)?)?/, $.func), $.plot_style),
				seq(alias(/l(i(n(e)?)?)?/, $.line), $.line_style),
				seq(
					alias(/circ(l(e)?)?/, $.circle),
					repeat(
						choice(
							seq(/rad(i(u(s)?)?)?/, optional($.system), $._expression),
							/(no)?wedge/,
							/(no)?clip/,
						),
					),
				),
				seq(alias(/rect(a(n(g(l(e)?)?)?)?)?/, $.rectangle)), // TODO: p. 218
				// set style rectangle {front|back} {lw|linewidth <lw>}
				//                     {fillcolor <colorspec>} {fs <fillstyle>}
				seq(alias("ellipse", $.ellipse)), // TODO: p. 219
				// set style ellipse {units xx|xy|yy}
				//                   {size {graph|screen} <a>, {{graph|screen} <b>}}
				//                   {angle <angle>}
				//                   {clip|noclip}
				seq(
					alias("parallelaxis", $.parallelaxis),
					seq(optional(/front|back/), optional($.line_opts)),
				),
				seq(alias(K.spider, $.spiderplot)), // TODO: p. 219
				// set style spiderplot
				//                     {fillstyle <fillstyle-properties>}
				//                     {<line-properties> | <point-properties>}
				seq(alias("textbox", $.textbox)), // TODO: p. 220
				// set style textbox {<boxstyle-index>}
				//                   {opaque|transparent} {fillcolor <color>}
				//                   {{no}border {<bordercolor>}}{linewidth <lw>}
				//                   {margins <xmargin>,<ymargin>}
			),

		surface: ($) => choice("implicit", "explicit"),

		table: ($) =>
			repeat1(
				choice(
					choice($.string_literal), // TODO: add $datablock p. 220
					"append",
					// NOTE: same as in datafile
					seq(K.sep, choice(K.white, "tab", "comma", $._expression)),
				),
			),

		terminal: ($) => choice($._terminal_type, "push", "pop"),

		_terminal_type: ($) =>
			// TODO: change similar to c_set
			choice(
				$.t_cairolatex,
				$.t_canvas,
				$.t_cgm,
				$.t_context,
				$.t_domterm,
				$.t_dumb,
				$.t_dxf,
				$.t_emf,
				$.t_epscairo,
				$.t_epslatex,
				$.t_fig,
				$.t_gif,
				$.t_hpgl,
				$.t_jpeg,
				$.t_lua,
				$.t_pcl5,
				$.t_pdfcairo,
				$.t_png,
				$.t_pngcairo,
				$.t_postscript,
				$.t_pslatex,
				$.t_pstricks,
				$.t_qt,
				$.t_sixelgd,
				$.t_svg,
				$.t_tek4xxx,
				// $.t_texdraw,
				// $.t_tikz,
				// $.t_tkcanvas,
				/u(n(k(n(o(w(n)?)?)?)?)?)?/, // $.t_webp
			),

		t_cairolatex: ($) =>
			seq(
				alias(/cai(r(o(l(a(t(e(x)?)?)?)?)?)?)?/, $.name),
				repeat(
					choice(
						choice("eps", "pdf", "png"),
						choice("standalone", "input"),
						choice("blacktext", "colortext", "colourtext"),
						choice(seq("header", field("header", $._expression)), "noheader"),
						choice("mono", "color"),
						/(no)?transp(a(r(e(n(t)?)?)?)?)?/,
						/(no)?crop/,
						seq("background", field("color", $._expression)),
						seq("font", field("font", $._expression)),
						seq("fontscale", field("scale", $._expression)),
						seq(K.lw, field("lw", $._expression)),
						choice("rounded", "butt", "square"),
						seq(K.dl, field("dl", $._expression)),
						$.canvas_size,
						seq("resolution", field("dpi", $._expression)),
					),
				),
			),

		t_canvas: ($) => seq(/can(v(a(s)?)?)?/), // TODO: complete
		t_cgm: ($) => seq(/cgm?/), // TODO: complete
		t_context: ($) => seq(/co(n(t(e(x(t)?)?)?)?)?/), // TODO: complete
		t_domterm: ($) => seq(/do(m(t(e(r(m)?)?)?)?)?/), // TODO: complete
		t_dumb: ($) => seq(/du(m(b)?)?/), // TODO: complete
		t_dxf: ($) => seq(/dxf?/), // TODO: complete
		t_emf: ($) => seq(/emf?/), // TODO: complete
		t_epscairo: ($) => seq(alias(/e(p(s(c(a(i(r(o)?)?)?)?)?)?)?/, $.name)), // TODO: complete

		t_epslatex: ($) =>
			seq(
				alias(/epsl(a(t(e(x)?)?)?)?/, $.name),
				repeat(
					choice(
						// TODO: complete
						$.canvas_size,
					),
				),
			),

		t_fig: ($) => seq(/f(i(g)?)?/), // TODO: complete
		t_gif: ($) => seq(/g(i(f)?)?/), // TODO: complete
		t_hpgl: ($) => seq(/h(p(g(l)?)?)?/), // TODO: complete
		t_jpeg: ($) => seq(/j(p(e(g)?)?)?/), // TODO: complete
		t_lua: ($) => seq(/l(u(a)?)?/), // TODO: complete
		t_pcl5: ($) => seq(/pc(l(5)?)?/), // TODO: complete
		t_pdfcairo: ($) =>
			seq(
				alias(/pd(f(c(a(i(r(o)?)?)?)?)?)?/, $.name),
				repeat(choice($.canvas_size)),
			), // TODO: complete
		t_png: ($) => seq("png"), // TODO: complete
		t_pngcairo: ($) =>
			seq(alias(/pngc(a(i(r(o)?)?)?)?/, $.name), repeat(choice($.canvas_size))), // TODO: complete
		t_postscript: ($) => seq(/po(s(t(s(c(r(i(p(t)?)?)?)?)?)?)?)?/), // TODO: complete
		t_pslatex: ($) => seq(choice(/psl(a(t(e(x)?)?)?)?/, /pstex?/)), // TODO: complete
		t_pstricks: ($) => seq(/pstr(i(c(k(s)?)?)?)?/), // TODO: complete
		t_qt: ($) => seq(/qt?/), // TODO: complete
		t_sixelgd: ($) => seq(/si(x(e(l(g(d)?)?)?)?)?/), // TODO: complete
		t_svg: ($) => seq(/svg?/), // TODO: complete

		t_tek4xxx: ($) => seq(/tek4(0|1|2)\d\d/),

		// t_texdraw: $ =>
		// t_tikz: $ =>
		// t_tkcanvas: $ =>
		// t_webp: $ =>

		canvas_size: ($) =>
			seq(
				alias(K.size, $.size),
				field("x", seq($._expression, optional(choice("cm", "in")))),
				",",
				field("y", seq($._expression, optional(choice("cm", "in")))),
			),

		termoption: ($) =>
			repeat1(
				choice(
					K.enhanced,
					seq("font", $._expression), // string with font name and optional size
					seq("fontscale", $._expression),
					seq(K.lw, $._expression),
				),
			),

		theta: ($) =>
			choice(
				K.right,
				K.top,
				K.left,
				K.bottom,
				/clockwise|cw/,
				/counterclockwise|ccw/,
			),

		tics: ($) =>
			repeat1(
				choice(
					/axis|border/,
					K.mirror,
					/in|out/,
					/front|back/,
					seq(/(no)?rotate/, optional(seq("by", $._expression))),
					choice(
						seq(K.offset, field("offset", $.position)),
						token(seq(K.NO, K.offset)),
					),
					choice(K.left, K.center, K.right, K.autojustify),
					seq("format", $._expression),
					seq("font", $._expression), // string with font name and optional size
					K.enhanced,
					seq(K.tc, choice($.colorspec, $.linetype)),
				),
			),

		timestamp: ($) =>
			prec.left(
				repeat1(
					choice(
						field("format", $._expression),
						K.top,
						K.bottom,
						token(seq(K.NO, K.rotate)),
						seq(K.offset, $.position),
						// TODO: complete p. 224
					),
				),
			),

		timefmt: ($) => field("format", $._expression),

		title: ($) =>
			repeat1(
				choice(
					field("title", $._expression),
					// TODO: check offset syntax
					field("offset", seq(alias(K.offset, $.offset), $.position)),
					field("font", seq("font", $._expression)), // string with font name and optional size
					seq(alias(K.tc, $.tc), choice($.colorspec, $.linetype)),
					alias(K.enhanced, $.enhanced),
				),
			),

		vgrid: ($) => seq("$", $.identifier, optional(seq("size", $._expression))),

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
						seq(/(no)?equal/, optional(choice("xy", "xyz"))),
						seq("azimuth", $._expression),
					),
				),
			),

		walls: ($) =>
			repeat1(choice(/(x0|y0|z0|x1|y1)/, $.fill_style, seq(K.fc, $.colorspec))),

		xdata: ($) => /t(i(m(e)?)?)?/,

		// xdtics: ($) => token(seq(K.axes, "d", K.tics)),

		xlabel: ($) =>
			seq(
				optional(alias($._expression, $.label)),
				repeat1(
					choice(
						seq(alias(K.offset, $.offset), $.position),
						seq(
							alias(token.immediate(seq(K.NO, K.rotate)), $.rotate),
							optional(
								choice(seq("by", alias($._expression, $.angle)), "parallel"),
							),
						),
						seq(alias(K.tc, $.tc), choice($.colorspec, $.linetype)),
						seq("font", alias($._expression, $.font)), // string with font name and optional size
						alias(K.enhanced, $.enhanced),
					),
				),
			),

		// xmtics: ($) => token(seq(K.axes, "m", K.tics)),

		xrange: ($) =>
			seq(
				optional($.range_block), // HACK: optional(range_block) for unset command
				repeat1(
					choice(
						alias(/(no)?reverse/, $.reverse),
						alias(/(no)?writeback/, $.writeback),
						alias(/(no)?extend/, $.extend),
						"restore",
					),
				),
			),

		xtics: ($) => prec.left($.tics_opts),

		xyplane: ($) =>
			choice(
				seq("at", field("zval", $._expression)),
				seq("relative", field("val", $._expression)),
			),

		zero: ($) => prec.left($._expression),

		zeroaxis: ($) => $.line_opts,

		c_show: ($) =>
			prec.left(
				1,
				seq(
					alias(/sh(o(w)?)?/, $.show),
					choice(
						$.argument_set_show,
						"colornames",
						"functions",
						seq(
							K.palette,
							optional(
								choice(
									seq(K.palette, optional($._expression), optional($.number)),
									/gra(d(i(e(n(t)?)?)?)?)?/,
									/fit2rgb(f(o(r(m(u(l(a(e)?)?)?)?)?)?)?)?/,
									/rgbfor(m(u(l(a(e)?)?)?)?)?/,
								),
							),
						),
						/p(l(o(t)?)?)?/,
						/v(a(r(i(a(b(l(e(s)?)?)?)?)?)?)?)?/,
						seq(/ve(r(s(i(o(n)?)?)?)?)?/, optional(/l(o(n(g)?)?)?/)),
					),
				),
			),

		c_splot: ($) =>
			seq(
				// TODO: p. 244
				alias(/sp(l(o(t)?)?)?/, $.splot),
				optional("sample"),
				repeat($.range_block),
				$.plot_element, // add voxelgrids to plot_element
				repeat(seq(",", $.plot_element)),
			),

		c_stats: ($) =>
			seq(
				"stats",
				field("ranges", repeat($.range_block)),
				alias($._expression, $.filename),
				optional(
					choice(
						"matrix",
						repeat1(alias($._i_e_u_directives, $.i_e_u_directives)),
					),
				),
				repeat(
					choice(
						seq(choice("name", "prefix"), $._expression),
						alias(token(seq(K.NO, K.output)), $.output),
						seq(
							"$vgridname",
							optional(seq("name", alias($._expression, $.name))),
						),
					),
				),
			),

		c_system: ($) => seq("system", $._expression),

		c_test: ($) => prec.left(seq("test", optional(choice("test", "terminal")))),

		c_undefine: ($) =>
			prec.left(seq(/und(e(f(i(n(e)?)?)?)?)?/, repeat($._expression))),

		c_while: ($) =>
			seq(
				"while",
				"(",
				alias($._expression, $.condition),
				")",
				"{",
				repeat($._statement),
				"}",
			),

		//-------------------------------------------------------------------------

		range_block: ($) =>
			seq(
				"[",
				optional(seq(alias($.identifier, $.dummy_var), "=")),
				optional($._expression),
				optional(":"),
				optional($._expression),
				"]",
			),

		for_block: ($) =>
			seq(
				"for",
				"[",
				choice(
					seq($._expression, "in", $._expression),
					seq(
						alias($.var_def, $.start),
						":",
						alias($._expression, $.end),
						optional(seq(":", alias($._expression, $.incr))),
					),
				),
				"]",
			),

		sum_block: ($) =>
			prec.left(
				seq(
					"sum",
					"[",
					$.identifier,
					"=",
					$._expression,
					":",
					$._expression,
					"]",
					$._expression,
				),
			),

		datafile_modifiers: ($) =>
			repeat1(
				choice(
					field("binary", seq("binary")), // TODO: add binary list
					field("matrix", seq(choice("nonuniform", "sparce"), "matrix")),
					$._i_e_u_directives,
					field("skip", seq("skip", field("N_lines", $._expression))),
					seq("smooth", optional($.smooth_options)),
					seq("bins"), // TODO: finish this p. 125
					"mask",
					"convexhull",
					"volatile",
					"zsort",
					"noautoscale",
				),
			),

		_arrow_opts: ($) =>
			prec.left(
				choice(
					alias(seq(K.as, $._expression), $.as),
					alias(/(no|back)?heads?/, $.head), //choice("nohead", "head", "backhead", "heads"),
					prec(
						2,
						seq(
							// FIX: precedence over plot_element (TAL VEZ SE ARREGLA CON canvas_size)
							"size",
							$._expression,
							",",
							$._expression,
							optional(seq(",", $._expression)),
						),
					),
					"fixed",
					choice("filled", "empty", "nofilled", "noborder"),
					choice("front", "back"),
					$.line_opts,
				),
			),

		label_opts: ($) =>
			prec.left(
				choice(
					choice(
						alias(token.immediate(seq(K.NO, K.rotate)), $.norotate),
						seq(
							alias(K.rotate, $.rotate),
							optional(seq("by", field("degrees", $._expression))),
						),
					),
					seq("font", field("font", $._expression)), // string with font name and optional size
					alias(K.enhanced, $.enhanced),
					/front|back/,
					seq(alias(K.tc, $.tc), choice($.colorspec, $.linetype)),
					seq(alias(K.offset, $.offset), $.position),
					alias(choice(K.left, K.right, K.center), $.align),
					field("position", seq("at", $.position)),
					choice(seq("point", field("point", $._expression)), "nopoint"),
					choice(
						"nobox",
						seq("boxed", optional(field("bs", seq("bs", $._expression)))), // NOTE: bs == boxstyle
					),
					"hypertext",
				),
			),

		line_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						seq(alias(K.ls, $.ls), $._expression),
						seq(alias(K.lt, $.lt), $._expression),
						seq(alias(K.lw, $.lw), $._expression),
						seq(alias(K.lc, $.lc), $.colorspec),
						seq(alias(K.dt, $.dt), $._dash_opts),
					),
				),
			),

		tics_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						alias(/axis|border/, $.axis),
						alias(K.mirror, $.mirror),
						alias(/in|out/, $.inout),
						seq(
							"scale",
							optional(
								choice(
									K.def,
									seq($._expression, optional(seq(",", $._expression))),
								),
							),
						),
						seq(
							alias(/(no)?rotate/, $.rotate),
							optional(seq("by", $._expression)),
						),
						choice(seq(K.offset, $.position), token(seq(K.NO, K.offset))),
						alias(choice(K.left, K.right, K.center, K.autojustify), $.align),
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
							seq(
								"(",
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
								repeat(
									seq(
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
								")",
							),
						),
						seq("format", $._expression),
						seq("font", $._expression), // string with font name and optional size
						alias(K.enhanced, $.enhanced),
						alias(/numeric|timedate|geographic/, $.format),
						alias(token(seq(K.NO, K.logscale)), $.log),
						alias(/(no)?range(l(i(m(i(t(e(d)?)?)?)?)?)?)?/, $.rangelimit),
						seq(alias(K.tc, $.tc), choice($.colorspec, $.linetype)),
					),
				),
			),

		line_style: ($) =>
			prec.left(
				1,
				seq(
					alias($._expression, $.tag),
					repeat(
						choice(
							alias(/def(a(u(l(t)?)?)?)?/, $.default),
							seq(alias(K.lt, $.lt), $._expression),
							seq(alias(K.lw, $.lw), $._expression),
							seq(alias(K.lc, $.lc), $.colorspec),
							seq(alias(K.dt, $.dt), $._dash_opts),
							seq(alias(K.pt, $.pt), $._expression),
							seq(alias(K.ps, $.ps), $._expression),
							seq(alias(/pointinterval|pi/, $.pi), $._expression),
							seq(alias(/pointnumber|pn/, $.pn), $._expression),
							alias(K.palette, $.palette),
						),
					),
				),
			),

		fill_style: ($) =>
			seq(
				prec(
					1,
					choice(
						"empty",
						seq(
							optional(alias(K.transparent, $.transparent)),
							alias(/s(o(l(i(d)?)?)?)?/, $.solid),
							optional(alias($._expression, $.density)),
						),
						seq(
							optional(alias(K.transparent, $.transparent)),
							"pattern",
							alias($._expression, $.pattern),
							optional(field("n", $._expression)),
						),
					),
				),
				optional(
					choice(
						seq(
							"border",
							optional(seq(alias(K.lt, $.lt), $._expression)),
							optional(seq(alias(K.lc, $.lc), $.colorspec)),
						),
						alias(/nobo(r(d(e(r)?)?)?)?/, $.noborder),
					),
				),
			),

		colorspec: ($) =>
			prec.left(
				choice(
					alias($._expression, $.tag),
					seq(alias(/rgb(c(o(l(o(r)?)?)?)?)?/, $.rgbcolor), $._expression),
					seq(
						alias(K.palette, $.palette),
						optional(
							choice(
								seq("frac", alias($._expression, $.val)),
								seq("cb", alias($._expression, $.val)),
								"z",
								// $.colormap // Named palette
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
						alias(/i(n(d(e(x)?)?)?)?/, $.i),
						choice(
							seq(
								alias($._expression, $.m),
								optional(seq(":", alias($._expression, $.n))),
								optional(seq(":", alias($._expression, $.p))),
							),
							alias($._expression, $.name),
						),
					),
				),
				seq(
					alias("every", $.every),
					optional(alias($._expression, $.point_incr)),
					optional(seq(":", optional(alias($._expression, $.block_incr)))),
					optional(seq(":", optional(alias($._expression, $.start_point)))),
					optional(seq(":", optional(alias($._expression, $.start_block)))),
					optional(seq(":", optional(alias($._expression, $.end_point)))),
					optional(seq(":", optional(alias($._expression, $.end_block)))),
				),
				field(
					"using",
					seq(
						alias(/u(s(i(n(g)?)?)?)?/, $.u),
						alias($._expression, $.col),
						repeat(seq(":", alias($._expression, $.col))),
					),
				),
			),

		smooth_options: ($) =>
			choice(
				"unique",
				"frequency",
				"fnormal",
				"cumulative",
				"cnormal",
				"csplines",
				"acsplines",
				"mcsplines",
				"path",
				"bezier",
				"sbezier",
				prec.left(
					seq("kdensity", optional(field("bandwidth_period", $._expression))),
				),
				prec.left(seq("convexhull", optional(field("expand", $._expression)))),
				"unwrap",
			),

		position: ($) =>
			prec.left(
				seq(
					optional($.system),
					field("x", alias($._expression, $.x)),
					optional(","),
					optional($.system),
					optional(field("y", alias($._expression, $.y))),
					optional(
						seq(",", optional($.system), field("z", alias($._expression, $.z))),
					),
				),
			),

		system: ($) =>
			choice(
				/fir(s(t)?)?/,
				/sec(o(n(d)?)?)?/,
				/gr(a(p(h)?)?)?/,
				/sc(r(e(e(n)?)?)?)?/,
				/char(a(c(t(e(r)?)?)?)?)?/,
			),
		//-------------------------------------------------------------------------
		_assignment: ($) => choice($.func_def, $.var_def, $.array_def),

		func_def: ($) => seq($.function, "=", $._expression),

		var_def: ($) =>
			seq(
				alias($.identifier, $.var),
				"=",
				$._expression,
				repeat(seq("=", $._expression)),
			),

		array_def: ($) =>
			choice(
				seq(
					"array",
					$.array,
					optional(
						seq("=", "[", $._expression, repeat(seq(",", $._expression)), "]"),
					),
				),
				seq(
					field("name", $.identifier),
					"[",
					$._expression,
					"]",
					"=",
					$._expression,
				),
			),

		macro: ($) => seq("@", $.identifier),

		//-------------------------------------------------------------------------

		_expression: ($) =>
			prec.left(
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
					$.macro,
					// $.datablock // add datablock? p. 58
					"NaN",
				),
			),

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
			seq(
				"{",
				field("Re", $._expression),
				",",
				field("Im", $._expression),
				"}",
			),

		string_literal: ($) =>
			choice(
				seq(
					"'",
					repeat(
						choice(
							token.immediate(prec(1, /[^'%]+/)),
							$.format_specifier,
							// $.escape_sequence,
						),
					),
					"'",
				),
				seq(
					'"',
					repeat(
						choice(
							token.immediate(prec(1, /[^"%]+/)),
							$.format_specifier,
							// $.escape_sequence,
						),
					),
					'"',
				),
			),

		format_specifier: ($) =>
			token.immediate(
				seq("%", optional(/([+-]?\d+|\d+\.\d+|\.\d+)/), /[a-zA-Z]/),
			),

		// escape_sequence: ($) =>
		// 	token.immediate(
		// 		seq19(
		// 			"\\",
		// 			choice(
		// 				/[^xu0-7]/,
		// 				/[0-7]{1,3}/,
		// 				/x[0-9a-fA-F]{2}/,
		// 				/u[0-9a-fA-F]{4}/,
		// 				/u{[0-9a-fA-F]+}/,
		// 			),
		// 		),
		// 	),

		array: ($) => seq($.identifier, "[", $._expression, "]"),

		function: ($) => prec(1, seq(alias($.identifier, $.name), $._arguments)),

		_arguments: ($) =>
			prec(
				14,
				seq(
					"(",
					field("argument", alias($._expression, $.variable)),
					repeat(seq(",", field("argument", alias($._expression, $.variable)))),
					")",
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
				prec.left(PREC.UNARY, seq("$", $._expression)),
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
					alias($._expression, $.condition),
					"?",
					alias($._expression, $.true),
					":",
					alias($._expression, $.false),
				),
			),

		identifier: ($) => /([a-zA-Z_\u0370-\u26FF])+\w*/, // Not pretty but works

		comment: ($) => token(seq("#", /.*/, repeat(seq("\\\n", /.*/)))),
	},
});
