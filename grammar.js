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
	axes: /(x|y|z|x2|y2|cb|r|t|u|v|xy)/,
	bottom: /b(o(t(t(o(m)?)?)?)?)?/,
	center: /c(e(n(t(e(r)?)?)?)?)?/,
	def: /def(a(u(l(t(s)?)?)?)?)?/,
	dl: /dashl(e(n(g(t(h)?)?)?)?)?|dl/,
	dt: /dasht(y(p(e)?)?)?|dt/,
	enhanced: /(no)?enhanced/,
	fc: /fillc(o(l(o(r)?)?)?)?|fc/,
	fs: /fill(s(t(y(l(e)?)?)?)?)?|fs/,
	label: /lab(e(l)?)?/,
	left: /l(e(f(t)?)?)?/,
	lc: /linec(o(l(o(r)?)?)?)?|lc/,
	logfile: /log(f(i(l(e)?)?)?)?/,
	logscale: /log(s(c(a(l(e)?)?)?)?)?/,
	ls: /lines(t(y(l(e)?)?)?)?|ls/,
	lt: /linetype|lt/,
	lw: /linew(i(d(t(h)?)?)?)?|lw/,
	mirror: /(no)?mirror/,
	mxtics: /m(x|y|z|x2|y2|cb|r|t)tics?/,
	offset: /off(s(e(t(s)?)?)?)?/,
	output: /o(u(t(p(u(t)?)?)?)?)?/,
	palette: /pal(e(t(t(e)?)?)?)?/,
	pi: /pointi(n(t(e(r(v(a(l)?)?)?)?)?)?)?|pi/,
	pn: /pointn(u(m(b(e(r)?)?)?)?)?|pn/,
	ps: /points(i(z(e)?)?)?|ps/,
	pt: /pointt(y(p(e)?)?)?|pt/,
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

module.exports = grammar({
	name: "gnuplot",

	extras: ($) => [$.comment, /[\s\f\uFEFF\u2060\u200B]|\\\r?\n/, /\\/],

	// inline: ($) => [$.string_literal],

	word: ($) => $.identifier,

	conflicts: ($) => [
		[$._expression],
		[$._argument_set_show],
		[$.style_opts],
		[$.label],
		[$.position],
		[$.plot_style],
		[$._i_e_u_directives],
		[$.fill_style],
	],

	rules: {
		source_file: ($) => repeat($._statement),

		_statement: ($) =>
			prec.left(seq(choice($.command, $._assignment, $.macro), optional(";"))),

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
				$.c_pause,
				$.c_plot,
				$.c_print, // printerr
				// $.c_pwd,
				// $.c_quit,
				// $.c_raise, // p. 142
				// $.c_refresh,
				$.c_replot,
				$.c_reread, // Deprecated
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
			prec.left(
				seq(
					"if",
					"(",
					$._expression,
					")",
					choice(
						repeat1($._statement),
						seq(
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
						),
					),
					optional(seq("else", "{", repeat($._statement), "}")),
				),
			),

		c_load: ($) => seq("load", $._expression),

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
			seq(
				alias(/p(l(o(t)?)?)?/, "plot"), // FIX: p 121
				optional("sample"),
				repeat($.range_block),
				$.plot_element,
				repeat(seq(choice(",", /,\s*\\/), $.plot_element)),
			),

		plot_element: ($) =>
			prec.left(
				2,
				seq(
					optional($.for_block),
					choice(
						seq(
							$._assignment,
							repeat(seq(",", $._assignment)),
							",",
							$.function,
						),
						field("func", $.function),
						seq(field("data", $._expression), optional($.datafile_modifiers)),
					),
					repeat(
						choice(
							seq("axes", choice("x1y1", "x2y2", "x1y2", "x2y1")),
							seq(
								alias(/(no)?t(i(t(l(e)?)?)?)?/, "title"),
								optional(field("title", $._expression)),
							),
							choice(
								seq(
									alias(/w(i(t(h)?)?)?/, "with"),
									field("with", $.plot_style),
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
				alias(/l(i(n(e(s)?)?)?)?/, "lines"),
				alias(/p(o(i(n(t(s)?)?)?)?)?/, "points"),
				alias(choice("lp", "linespoints"), "lp"),
				alias(/fin(a(n(c(e(b(a(r(s)?)?)?)?)?)?)?)?/, "financebars"),
				alias(/d(o(t(s)?)?)?/, "dots"),
				alias(/i(m(p(u(l(s(e(s)?)?)?)?)?)?)?/, "impulses"),
				seq(alias(/lab(e(l(s)?)?)?/, "labels"), repeat($.label_opts)),
				alias(/sur(f(a(c(e)?)?)?)?/, "surface"),
				alias(/st(e(p(s)?)?)?/, "steps"),
				"fsteps",
				"histeps",
				alias(/arr(o(w(s)?)?)?/, "arrows"),
				seq(alias(/vec(t(o(r(s)?)?)?)?/, "vectors"), repeat($.arrow_opts)),
				alias(/sec(t(o(r(s)?)?)?)?/, "sectors"),
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
				"zerrorfill",
				"ellipses",
				seq(
					alias(/filledc(u(r(v(e(s)?)?)?)?)?/, "filledcurves"),
					optional(
						choice(
							"closed",
							"between",
							seq(
								choice("above", "below"),
								optional(
									seq(
										choice("x1", "x2", "y1", "y2", "y", "r"),
										optional(seq("=", $._expression)),
									),
								),
							),
						),
					),
					optional(seq(alias(K.fs, "fs"), $.fill_style)),
				),
				seq(
					"fillsteps",
					optional(choice("above", "below")),
					optional(seq("y", "=", $._expression)),
				),
				alias(/histograms?/, "histograms"), // TODO: add its options p.83 (should work in set style)
				alias(/ima(g(e)?)?/, "image"),
				"pm3d",
				"rgbalpha",
				"rgbimage",
				"polygons",
				"table",
				"mask",
			),

		// NOTE: line_style | line_opts | style_opts unnecessary?
		style_opts: ($) =>
			repeat1(
				choice(
					$.line_opts,
					seq(alias(K.as, "as"), $._expression),
					seq(alias(K.fs, "fs"), $.fill_style),
					seq(alias(K.fc, "fc"), $.colorspec),
					"nohidden3d",
					"nocontours",
					alias(/nosurf(a(c(e)?)?)?/, "nosurf"),
					alias(K.palette, "palette"),
				),
			),

		c_print: ($) =>
			seq(
				choice("print", "printerr"),
				$._expression,
				repeat(seq(",", $._expression)),
			),

		c_replot: ($) => /rep(l(o(t)?)?)?/,

		c_reread: ($) => "reread",

		c_reset: ($) => seq("reset", optional(choice("bind", "errors", "session"))),

		c_set: ($) =>
			seq(
				seq(alias(/set?|uns(e(t)?)?/, "cmd"), optional($.for_block)),
				$._argument_set_show,
			),

		_argument_set_show: ($) =>
			choice(
				seq(alias(/(an(g(l(e(s)?)?)?)?)/, "opts"), optional($.angles)),
				seq(alias(/arr(o(w)?)?/, "opts"), optional($.arrow)),
				seq(alias(/auto(s(c(a(l(e)?)?)?)?)?/, "opts"), optional($.autoscale)),
				seq(alias(/bor(d(e(r)?)?)?/, "opts"), optional($.border)),
				seq(alias(/box(w(i(d(t(h)?)?)?)?)?/, "opts"), optional($.boxwidth)),
				seq(alias("boxdepth", "opts"), optional($.boxdepth)),
				alias("color", "opts"),
				seq(alias("colormap", "opts"), optional($.colormap)),
				seq(alias("colorsequence", "opts"), optional($.colorsequence)),
				seq(alias("clip", "opts"), optional($.clip)),
				seq(alias(/cntrl(a(b(e(l)?)?)?)?/, "opts"), optional($.cntrlabel)),
				seq(alias(/cntrp(a(r(a(m)?)?)?)?/, "opts"), optional($.cntrparam)),
				seq(alias(/colorb(o(x)?)?/, "opts"), optional($.colorbox)),
				seq(alias(/conto(u(r(s)?)?)?/, "opts"), optional($.contour)),
				alias(/cornerp(o(l(e(s)?)?)?)?/, "opts"),
				seq(alias(K.dt, "opts"), optional($.dashtype)),
				seq(alias(/dataf(i(l(e)?)?)?/, "opts"), optional($.datafile)),
				seq(
					alias(/dec(i(m(a(l(s(i(g(n)?)?)?)?)?)?)?)?/, "opts"),
					optional($.decimalsign),
				),
				seq(alias(/dg(r(i(d(3(d)?)?)?)?)?/, "opts"), optional($.dgrid3d)),
				seq(alias(/du(m(m(y)?)?)?/, "opts"), optional($.dummy)),
				seq(alias(/enc(o(d(i(n(g)?)?)?)?)?/, "opts"), optional($.encoding)),
				seq(alias(/errorbars|b(a(r(s)?)?)?/, "opts"), optional($.errorbars)),
				seq(alias("fit", "opts"), optional($.fit)),
				seq(alias(/form(a(t)?)?/, "opts"), optional($.format)),
				seq(alias(/gr(i(d)?)?/, "opts"), optional($.grid)),
				seq(alias(/hid(d(e(n(3(d)?)?)?)?)?/, "opts"), optional($.hidden3d)),
				seq(alias(/his(t(o(r(y)?)?)?)?/, "opts"), optional($.history)),
				seq(
					alias(/iso(s(a(m(p(l(e(s)?)?)?)?)?)?)?/, "opts"),
					optional($.isosamples),
				),
				seq(alias(/isosurf(a(c(e)?)?)?/, "opts"), optional($.isosurface)),
				alias("isotropic", "opts"),
				seq(alias("jitter", "opts"), optional($.jitter)),
				seq(alias(/k(e(y)?)?/, "opts"), optional($.key)),
				seq(alias(K.label, "opts"), optional($.label)),
				seq(alias(K.lt, "opts"), optional($.line_style)), // NOTE: era redundante con line_style
				seq(alias("link", "opts"), optional($.link)),
				seq(alias(/loa(d(p(a(t(h)?)?)?)?)?/, "opts"), optional($.loadpath)),
				seq(alias("locale", "opts"), optional($.locale)),
				seq(alias(K.logscale, "opts"), optional($.logscale)),
				seq(alias(/map(p(i(n(g)?)?)?)?/, "opts"), optional($.mapping)),
				seq(alias(/(l|r|t|b)?mar(g(i(n(s)?)?)?)?/, "opts"), optional($.margin)),
				seq(alias("micro", "opts"), optional($.micro)), // NOTE: experimental p. 184
				alias(/minus(s(i(g(n)?)?)?)?/, "opts"), // NOTE: experimental p. 184
				seq(
					alias(/mono(c(h(r(o(m(e)?)?)?)?)?)?/, "opts"),
					optional($.monochrome),
				),
				seq(alias(/mo(u(s(e)?)?)?/, "opts"), optional($.mouse)),
				seq(alias(/multi(p(l(o(t)?)?)?)?/, "opts"), optional($.multiplot)),
				seq(alias(K.mxtics, "opts"), optional($.mxtics)),
				// seq(optional($.nonlinear)), // p. 191
				// seq(optional($.object)), // p. 192
				seq(alias(K.offset, "opts"), optional($.offsets)), // p. 194
				// seq(optional($.origin)), // p. 195
				seq(alias(K.output, "opts"), optional($.output)),
				seq(alias("overflow", "opts"), optional($.overflow)),
				seq(alias(K.palette, "opts"), optional($.palette)),
				alias(/pa(r(a(m(e(t(r(i(c)?)?)?)?)?)?)?)?/, "opts"),
				seq(alias("paxis", "opts"), optional($.paxis)),
				// seq(optional($.pixmap)), // p. 203
				seq(alias("pm3d", "opts"), optional($.pm3d)),
				seq(
					alias(/pointint(e(r(v(a(l(b(o(x)?)?)?)?)?)?)?)?/, "opts"),
					optional($.pointintervalbox),
				),
				seq(
					alias(/poi(n(t(s(i(z(e)?)?)?)?)?)?/, "opts"),
					optional($.pointsize),
				),
				alias(/pol(a(r)?)?/, "opts"),
				seq(alias(/pr(i(n(t)?)?)?/, "opts"), optional($.print)),
				seq(alias("psdir", "opts"), optional($.psdir)),
				alias(/rax(i(s)?)?/, "opts"),
				seq(alias("rgbmax", "opts"), optional($.rgbmax)),
				seq(alias(/sam(p(l(e(s)?)?)?)?/, "opts"), optional($.samples)),
				seq(alias(K.size, "opts"), optional($.size)),
				alias(K.spider, "opts"),
				seq(alias(/st(y(l(e)?)?)?/, "opts"), optional($.style)),
				seq(alias(/su(r(f(a(c(e)?)?)?)?)?/, "opts"), optional($.surface)),
				seq(alias(/ta(b(l(e)?)?)?/, "opts"), optional($.table)),
				seq(
					alias(/t(e(r(m(i(n(a(l)?)?)?)?)?)?)?/, "opts"),
					optional($.terminal),
				),
				seq(alias("termoption", "opts"), optional($.termoption)),
				seq(alias("theta", "opts"), optional($.theta)),
				seq(alias(K.tics, "opts"), optional($.tics)),
				seq(alias(/times(t(a(m(p)?)?)?)?/, "opts"), optional($.timestamp)),
				seq(alias(/timef(m(t)?)?/, "opts"), optional($.timefmt)),
				seq(alias(/tit(l(e)?)?/, "opts"), optional($.title)),
				// seq(optional($.ttics)) // p. 226
				seq(alias("vgrid", "opts"), optional($.vgrid)),
				seq(alias(/vi(e(w)?)?/, "opts"), optional($.view)),
				seq(alias(/walls?/, "opts"), optional($.walls)),
				seq(alias(token(seq(K.axes, /da(t(a)?)?/)), "opts"), optional($.xdata)),
				alias(token(seq(K.axes, "d", K.tics)), "opts"),
				seq(alias(token(seq(K.axes, K.label)), "opts"), optional($.xlabel)),
				alias(token(seq(K.axes, "m", K.tics)), "opts"),
				seq(
					alias(
						token(seq(/(x|y|z|x2|y2|r|t|u|v|cb|vx|vy|vz)/, K.range)),
						"opts",
					),
					optional($.xrange),
				),
				seq(alias(token(seq(K.axes, K.tics)), "opts"), optional($.xtics)),
				seq(alias(/xyp(l(a(n(e)?)?)?)?/, "opts"), optional($.xyplane)),
				seq(alias(/z(e(r(o)?)?)?/, "opts"), optional($.zero)),
				seq(
					alias(/(x|y|z|x2|y2)?zeroa(x(i(s)?)?)?/, "opts"),
					optional($.zeroaxis),
				),
			),

		angles: ($) =>
			choice(/d(e(g(r(e(e(s)?)?)?)?)?)?/, /r(a(d(i(a(n(s)?)?)?)?)?)?/),

		arrow: ($) =>
			prec.left(
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
								alias(/len(g(t(h)?)?)?/, "length"),
								field("length", $._expression),
								alias(/an(g(l(e)?)?)?/, "angle"),
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
					alias(/noext(e(n(d)?)?)?/, "noextend"),
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
						$.line_opts,
						"polar",
					),
				),
			),

		boxwidth: ($) =>
			prec.left(
				repeat1(
					choice(
						field("width", $._expression),
						alias(/a(b(s(o(l(u(t(e)?)?)?)?)?)?)?/, "absolute"),
						alias(/r(e(l(a(t(i(v(e)?)?)?)?)?)?)?/, "relative"),
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
					$.font_spec,
					seq("start", $._expression),
					seq("interval", $._expression),
					"onecolor",
				),
			),

		cntrparam: ($) =>
			repeat1(
				choice(
					alias(/li(n(e(a(r)?)?)?)?/, "linear"),
					alias(/c(u(b(i(c(s(p(l(i(n(e)?)?)?)?)?)?)?)?)?)?/, "cubicspline"),
					alias(/b(s(p(l(i(n(e)?)?)?)?)?)?/, "bspline"),
					seq(alias(/p(o(i(n(t(s)?)?)?)?)?/, "points"), $._expression),
					seq(alias(/o(r(d(e(r)?)?)?)?/, "order"), $._expression),
					seq(
						alias(/le(v(e(l(s)?)?)?)?/, "levels"),
						choice(
							$._expression,
							seq("auto", optional($._expression)),
							seq("discrete", $._expression, repeat(seq(",", $._expression))),
							seq(
								alias(/in(c(r(e(m(e(n(t(a(l)?)?)?)?)?)?)?)?)?/, "incremental"),
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
				repeat1(
					choice(
						alias(/(no)?columnhead(e(r(s)?)?)?/, "columnheaders"),
						alias(/fort(r(a(n)?)?)?/, "fortran"),
						"nofpe_trap",
						seq(
							alias(/miss(i(n(g)?)?)?/, "missing"),
							field("missing", $._expression),
						),
						seq(
							alias(K.sep, "sep"),
							choice(
								alias(K.white, "white"),
								"tab",
								"comma",
								field("separator", $._expression),
							),
						),
						seq(
							alias(/com(m(e(n(t(s(c(h(a(r(s)?)?)?)?)?)?)?)?)?)?/, "comments"),
							optional(field("srt", $._expression)),
						),
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
						alias(token(seq(K.NO, K.logfile)), "nolog"),
						seq(alias(K.logfile, "log"), choice($._expression, "default")),
					),
					alias(/((no)?quiet|results|brief|verbose)/, "fit_out"),
					alias(
						/(no)?err(o(r(v(a(r(i(a(b(l(e(s)?)?)?)?)?)?)?)?)?)?)?/,
						"errorvars",
					),
					alias(
						/(no)?cov(a(r(i(a(n(c(e(v(a(r(i(a(b(l(e(s)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?/,
						"covariancevars",
					),
					alias(/(no)?errors(c(a(l(i(n(g)?)?)?)?)?)?/, "errorscaling"),
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
				optional(alias(choice("x", "y", "xy", "x2", "y2", "z", "cb"), $.axes)),
				field("fmt_str", $._expression),
				optional(choice("numeric", "timedate", "geographic")),
			),

		grid: ($) =>
			repeat1(
				choice(
					alias(token(seq(K.NO, /m?/, K.axes, K.tics)), "tics"),
					seq(
						alias(token(seq(K.NO, /po(l(a(r)?)?)?/)), "polar"),
						optional(field("angle", $._expression)),
					),
					alias(/layerd(e(f(a(u(l(t)?)?)?)?)?)?|front|back/, "layer"),
					alias(/(no)?vert(i(c(a(l)?)?)?)?/, "vertical"),
					seq($.line_opts, optional(seq(",", $.line_opts))),
				),
			),

		hidden3d: ($) =>
			choice(
				alias(K.def, "defaults"),
				repeat1(
					choice(
						alias(/front|back/, "fb"),
						seq(
							alias(token(seq(K.NO, K.offset)), "offset"),
							field("offset", $._expression),
						),
						seq("trianglepattern", $._expression),
						seq(alias(/(no)?undefined/, "undefined"), $._expression),
						alias(/((no)?altdiagonal)/, "altdiagonal"),
						alias(/((no)?bentover)/, "bentover"),
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

		jitter: ($) =>
			repeat1(
				choice(
					seq(alias(/over(l(a(p)?)?)?/, "overlap"), $._expression),
					seq("spread", $._expression),
					seq("wrap", $._expression),
					alias(/swarm|square|vert(i(c(a(l)?)?)?)?/, "moreopts"),
				),
			),

		key: ($) =>
			repeat1(
				choice(
					choice("on", "off"),
					alias(K.def, "default"),
					alias(K.enhanced, "enhanced"),
					seq(
						alias(/(no)?a(u(t(o(t(i(t(l(e)?)?)?)?)?)?)?)?/, "a"),
						optional(alias(/column(h(e(a(d(e(r)?)?)?)?)?)?/, "column")),
					),
					seq(alias(/(no)?box/, "box"), optional($.line_opts)),
					seq(
						alias(/(no)?opaque/, "opaque"),
						optional(seq(alias(K.fc, "fc"), $.colorspec)),
					),
					seq("width", field("increment", $._expression)),
					seq("height", field("increment", $._expression)),
					// layout
					alias(
						/ver(t(i(c(a(l)?)?)?)?)?|hor(i(z(o(n(t(a(l)?)?)?)?)?)?)?/,
						"layout",
					),
					seq("maxcols", optional(choice($._expression, "auto"))),
					seq("maxrows", optional(choice($._expression, "auto"))),
					seq("columns", $._expression),
					seq("keywidth", choice("screen", "graph"), $._expression),
					alias(/Left|Right/, "lr"),
					alias(/(no)?(rev(e(r(s(e)?)?)?)?|inv(e(r(t)?)?)?)/, "reverse"),
					seq("samplen", alias($._expression, $.length)),
					seq("spacing", alias($._expression, $.spacing)),
					seq(
						alias(/ti(t(l(e)?)?)?/, "title"),
						optional($._expression),
						optional(alias(K.enhanced, $.enhanced)),
						optional(alias(choice(K.center, K.left, K.right), $.position)),
					),
					$.font_spec,
					seq(
						alias(K.tc, "tc"),
						choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
					),
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
			seq(
				optional(field("tag", $._expression)),
				repeat1(choice(field("label", $._expression), $.label_opts)),
			),

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
						alias(/t(i(t(l(e)?)?)?)?/, "title"),
						field("title", $._expression),
						optional($.font_spec),
						optional(alias(K.enhanced, "enhanced")),
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
					seq(alias(K.offset, "offset"), $.position),
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
					alias(/previous|next/, "pn"),
				),
			),

		mxtics: ($) =>
			prec.left(
				choice(
					field("freq", $._expression),
					alias(K.def, "default"),
					seq(
						field("N", $._expression),
						alias(
							choice(
								/sec(o(n(d(s)?)?)?)?/,
								/min(u(t(e(s)?)?)?)?/,
								/hours?/,
								/days?/,
								/weeks?/,
								/mon(t(h(s)?)?)?/,
								/years?/,
							),
							"units",
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
			), // p.194

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
							alias(/rgb(f(o(r(m(u(l(a(e)?)?)?)?)?)?)?)?/, "rgbformulae"),
							field("r", $._expression), // TODO: the following in seq() are optional
							",",
							field("g", $._expression),
							",",
							field("b", $._expression),
						),
						seq(
							alias(/def(i(n(e(d)?)?)?)?/, "defined"),
							optional(
								seq(
									"(",
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
										repeat(
											seq(
												",",
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
							alias(/col(o(r(m(a(p)?)?)?)?)?/, "col"),
							field("colormap_name", $._expression),
						),
						seq(
							alias(/func(t(i(o(n(s)?)?)?)?)?/, "func"),
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
						alias(/mo(d(e(l)?)?)?/, "model"),
						choice(
							"RGB",
							"CMY",
							seq(
								"HSV",
								optional(seq("start", field("radians", $._expression))),
							),
						),
					),
					alias(/pos(i(t(i(v(e)?)?)?)?)?|neg(a(t(i(v(e)?)?)?)?)?/, "pn"),
					choice("nops_allcF", "ps_allcF"),
					seq(
						alias(/maxc(o(l(o(r(s)?)?)?)?)?/, "maxc"),
						field("maxcolors", $._expression),
					),
				),
			),

		paxis: ($) =>
			seq(
				field("axisno", $._expression),
				repeat(
					choice(
						seq(
							alias(K.range, "range"),
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
						seq(alias(K.tics, "tics"), optional($.tics_opts)),
						seq(
							alias(K.label, "label"),
							optional(field("label", $._expression)),
							$.label_opts,
						),
						seq(alias(K.offset, "offset"), $.position),
					),
				),
			), // TODO: complete

		// pixmap: $ =>
		// <index> {"filename" | colormap <name>}
		//         at <position>
		//         {width <w> | height <h> | size <w>,<h>}
		//         {front|back|behind} {center}

		pm3d: ($) =>
			// TODO: check all opts
			repeat1(
				choice(
					seq("at", $.position),
					seq(
						alias(/interp(o(l(a(t(e)?)?)?)?)?/, "interp"),
						field("steps", $._expression),
						",",
						field("between", $._expression),
					),
					choice(
						alias(
							/scans(auto(m(a(t(i(c)?)?)?)?)?|forward|backward)/,
							"scanorder",
						),
						seq(
							alias(/dep(t(h(o(r(d(e(r)?)?)?)?)?)?)?/, "depthorder"),
							optional("base"),
						),
						alias(/(no)?hi(d(d(e(n(3(d)?)?)?)?)?)?/, "hidden3d"),
					),
					seq("flush", choice("begin", "center", "end")),
					alias(/(no)?ftriangles/, "ftriangles"),
					choice(seq("clip", optional("z")), "clip1in", "clip4in"),
					alias(/(no)?clipcb/, "clipcb"),
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
						alias(/(no)?lighting/, "lighting"),
						optional(seq("primary", field("fraction", $._expression))),
						optional(seq("specular", field("fraction", $._expression))),
						optional(seq("spec2", field("fraction", $._expression))),
					),
					seq(
						alias(/(no)?border/, "border"),
						optional("retrace"),
						optional(alias($.line_opts, $.line_opts)),
					),
					choice("implicit", "explicit"),
					"map",
				),
			),

		pointintervalbox: ($) => $._expression,

		pointsize: ($) => field("multiplier", $._expression),

		print: ($) => prec.left($._expression),

		psdir: ($) => $._expression,

		rgbmax: ($) => prec.left($._expression),

		samples: ($) => seq($._expression, optional(seq(",", $._expression))),

		size: ($) =>
			prec.left(
				repeat1(
					choice(
						choice(
							alias(/(no)?square/, "square"),
							seq(alias(/ra(t(i(o)?)?)?/, "ratio"), $._expression),
							alias(/nora(t(i(o)?)?)?/, "noratio"),
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
					alias(/arr(o(w)?)?/, "arrow"),
					optional(field("index", $._expression)),
					choice(alias(K.def, "def"), $.arrow_opts),
				),
				seq("boxplot"), // TODO: p. 214
				// set style boxplot {range <r> | fraction <f>}
				//                   {{no}outliers} {pointtype <p>}
				//                   {candlesticks | financebars}
				//                   {medianlinewidth <width>}
				//                   {separation <x>}
				//                   {labels off | auto | x | x2}
				//                   {sorted | unsorted}
				seq(
					alias(/d(a(t(a)?)?)?/, "data"),
					choice($.plot_style, alias(K.spider, "spiderplot")),
				),
				seq(alias(K.fs, "fs"), $.fill_style),
				seq(alias(/f(u(n(c(t(i(o(n)?)?)?)?)?)?)?/, "func"), $.plot_style),
				seq(alias(/l(i(n(e)?)?)?/, "line"), $.line_style),
				seq(
					alias(/circ(l(e)?)?/, "circle"),
					repeat(
						choice(
							seq(/rad(i(u(s)?)?)?/, optional($.system), $._expression),
							/(no)?wedge/,
							/(no)?clip/,
						),
					),
				),
				seq(alias(/rect(a(n(g(l(e)?)?)?)?)?/, "rectangle")), // TODO: p. 218
				// set style rectangle {front|back} {lw|linewidth <lw>}
				//                     {fillcolor <colorspec>} {fs <fillstyle>}
				seq(alias(/ell(i(p(s(e)?)?)?)?/, "ellipse")), // TODO: p. 219
				// set style ellipse {units xx|xy|yy}
				//                   {size {graph|screen} <a>, {{graph|screen} <b>}}
				//                   {angle <angle>}
				//                   {clip|noclip}
				seq(
					alias(/parallel(a(x(i(s)?)?)?)?/, "parallelaxis"),
					seq(optional(/front|back/), optional($.line_opts)),
				),
				seq(
					alias(K.spider, "spiderplot"),
					optional(seq(alias(K.fs, "fs"), $.fill_style)),
				), // TODO: p. 219
				// set style spiderplot
				//                     {fillstyle <fillstyle-properties>}
				//                     {<line-properties> | <point-properties>}
				seq("textbox"), // TODO: p. 220
				// set style textbox {<boxstyle-index>}
				//                   {opaque|transparent} {fillcolor <color>}
				//                   {{no}border {<bordercolor>}}{linewidth <lw>}
				//                   {margins <xmargin>,<ymargin>}
			),

		surface: ($) => choice("implicit", "explicit"),

		table: ($) =>
			prec.left(
				repeat1(
					choice(
						choice($.string_literal, $.datablock),
						"append",
						// NOTE: same as in datafile simplify?
						seq(K.sep, choice(K.white, "tab", "comma", $._expression)),
					),
				),
			),

		terminal: ($) => choice($._terminal_type, "push", "pop"),

		_terminal_type: ($) =>
			choice(
				seq(
					alias(/cai(r(o(l(a(t(e(x)?)?)?)?)?)?)?/, "name"),
					optional($.t_cairolatex),
				),
				seq(alias(/can(v(a(s)?)?)?/, "name"), optional($.t_canvas)),
				seq(alias(/cgm?/, "name"), optional($.t_cgm)),
				seq(alias(/co(n(t(e(x(t)?)?)?)?)?/, "name"), optional($.t_context)),
				// seq(alias(/do(m(t(e(r(m)?)?)?)?)?/, "name"), optional($.t_domterm)),
				seq(alias(/du(m(b)?)?/, "name"), optional($.t_dumb)),
				// seq(alias(/dxf?/, "name"), optional($.t_dxf)),
				// seq(alias(/emf?/, "name"), optional($.t_emf)),
				seq(
					alias(/e(p(s(c(a(i(r(o)?)?)?)?)?)?)?/, "name"),
					optional($.t_epscairo),
				),
				seq(alias(/epsl(a(t(e(x)?)?)?)?/, "name"), optional($.t_epslatex)),
				// seq(alias(/f(i(g)?)?/, "name"), optional($.t_fig)),
				// seq(alias(/g(i(f)?)?/, "name"), optional($.t_gif)),
				// seq(alias(/h(p(g(l)?)?)?/, "name"), optional($.t_hpgl)),
				// seq(alias(/j(p(e(g)?)?)?/, "name"), optional($.t_jpeg)),
				// seq(alias(/l(u(a)?)?/, "name"), optional($.t_lua)),
				// seq(alias(/pc(l(5)?)?/, "name"), optional($.t_pcl5)),
				seq(
					alias(/pd(f(c(a(i(r(o)?)?)?)?)?)?/, "name"),
					optional($.t_pdfcairo),
				),
				seq(alias(/png/, "name"), optional($.t_png)),
				seq(alias(/pngc(a(i(r(o)?)?)?)?/, "name"), optional($.t_pngcairo)),
				// seq(
				// 	alias(/po(s(t(s(c(r(i(p(t)?)?)?)?)?)?)?)?/, "name"),
				// 	optional($.t_postscript),
				// ),
				// seq(optional($.t_pslatex)),
				// seq(alias(/pstr(i(c(k(s)?)?)?)?/, "name"), optional($.t_pstricks)),
				seq(alias(/qt?/, "name"), optional($.t_qt)),
				// seq(alias(/si(x(e(l(g(d)?)?)?)?)?/, "name"), optional($.t_sixelgd)),
				seq(alias(/svg?/, "name"), optional($.t_svg)),
				// seq(alias(/tek4(0|1|2)\d\d/, "name"), optional($.t_tek4xxx)),
				// $.t_texdraw,
				// $.t_tikz,
				// $.t_tkcanvas,
				alias(/u(n(k(n(o(w(n)?)?)?)?)?)?/, "name"),
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
					/(no)?transp(a(r(e(n(t)?)?)?)?)?/,
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
				alias(K.size, $.size),
				field("x", seq($._expression, optional(choice("cm", "in")))),
				",",
				field("y", seq($._expression, optional(choice("cm", "in")))),
			),
		font_spec: ($) => seq("font", field("font", $._expression)),
		// ----------------------------------------------------------------
		termoption: ($) =>
			repeat1(
				choice(
					K.enhanced,
					$.font_spec, // string with font name and optional size
					seq("fontscale", $._expression),
					seq(K.lw, $._expression),
				),
			),

		theta: ($) =>
			repeat1(
				choice(
					K.right,
					K.top,
					K.left,
					K.bottom,
					/clockwise|cw/,
					/counterclockwise|ccw/,
				),
			),

		tics: ($) => $.tics_opts,

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
			prec.left(
				repeat1(
					choice(
						field("title", $._expression),
						field("offset", seq(alias(K.offset, $.offset), $.position)),
						$.font_spec,
						seq(
							alias(K.tc, $.tc),
							choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
						),
						alias(K.enhanced, $.enhanced),
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
						seq("projection", optional(choice("xy", "xz", "yz"))),
						seq(alias(/(no)?equal/, $.equal), optional(choice("xy", "xyz"))),
						seq("azimuth", $._expression),
					),
				),
			),

		walls: ($) =>
			repeat1(
				choice(
					alias(/(x0|y0|z0|x1|y1)/, "wall"),
					seq(alias(K.fs, "fs"), $.fill_style),
					seq(alias(K.fc, "fc"), $.colorspec),
				),
			),

		xdata: ($) => /t(i(m(e)?)?)?/,

		xlabel: ($) =>
			prec.left(
				repeat1(
					choice(
						field("label", $._expression),
						seq(alias(K.offset, "offset"), $.position),
						seq(
							alias(token(seq(K.NO, K.rotate)), "rotate"),
							optional(
								choice(seq("by", field("angle", $._expression)), "parallel"),
							),
						),
						seq(
							alias(K.tc, "tc"),
							choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
						),
						$.font_spec,
						alias(K.enhanced, "enhanced"),
					),
				),
			),

		xrange: ($) =>
			repeat1(
				choice(
					$.range_block,
					alias(/(no)?reverse/, "reverse"),
					alias(/(no)?writeback/, "writeback"),
					alias(/(no)?extend/, "extend"),
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

		zeroaxis: ($) => $.line_opts,

		c_show: ($) =>
			prec.left(
				2,
				seq(
					alias(/sh(o(w)?)?/, "show"),
					choice(
						$._argument_set_show,
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
				alias(/sp(l(o(t)?)?)?/, "splot"),
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
				optional(seq(field("dummy_var", $.identifier), "=")),
				optional(choice($._expression, "*")),
				optional(":"),
				optional(choice($._expression, "*")),
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
						field("start", $.var_def),
						":",
						field("end", $._expression),
						optional(seq(":", field("incr", $._expression))),
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

		// plot ’<file_name>’ {binary <binary list>}
		//                     {bins <options>}
		//                     {mask}
		datafile_modifiers: ($) =>
			repeat1(
				choice(
					field("binary", seq("binary")), // TODO: add binary list
					field("matrix", seq(choice("nonuniform", "sparce"), "matrix")), // TODO: complete sparce matrix p.247
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

		arrow_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						alias(seq(K.as, $._expression), $.as),
						alias(/(no|back)?heads?/, $.head),
						seq("size", $.position),
						"fixed",
						choice("filled", "empty", "nofilled", "noborder"),
						choice("front", "back"),
						$.line_opts,
					),
				),
			),

		label_opts: ($) =>
			prec.left(
				choice(
					choice(
						alias(token.immediate(seq(K.NO, K.rotate)), "norotate"),
						seq(
							alias(K.rotate, "rotate"),
							optional(seq("by", field("degrees", $._expression))),
						),
					),
					$.font_spec,
					alias(K.enhanced, "enhanced"),
					alias(/front|back/, "fb"),
					seq(
						alias(K.tc, "tc"),
						choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
					),
					seq(alias(K.offset, "offset"), $.position),
					alias(choice(K.left, K.right, K.center), "align"),
					field("position", seq("at", $.position)),
					choice(seq("point", field("point", $._expression)), "nopoint"),
					choice(
						"nobox",
						seq("boxed", optional(field("bs", seq("bs", $._expression)))), // NOTE: bs == boxstyle
					),
					"hypertext",
				),
			),

		// NOTE: line_style | line_opts | style_opts unnecessary?
		line_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						seq(alias(K.ls, "ls"), $._expression),
						seq(alias(K.lt, "lt"), $._expression),
						seq(alias(K.lw, "lw"), $._expression),
						seq(alias(K.lc, "lc"), $.colorspec),
						seq(alias(K.dt, "dt"), $._dash_opts),
						seq(alias(K.pt, "pt"), $._expression),
						seq(alias(K.ps, "ps"), $._expression),
						seq(alias(K.pi, "pi"), $._expression),
						seq(alias(K.pn, "pn"), $._expression),
					),
				),
			),

		tics_opts: ($) =>
			prec.left(
				repeat1(
					choice(
						alias(/axis|border/, "axis"),
						alias(token(seq(K.NO, K.mirror)), "mirror"),
						alias(/in|out/, "inout"),
						seq(
							"scale",
							optional(
								choice(
									alias(K.def, "default"),
									seq($._expression, optional(seq(",", $._expression))),
								),
							),
						),
						seq(
							alias(/(no)?rotate/, "rotate"),
							optional(seq("by", $._expression)),
						),
						choice(
							seq(alias(K.offset, "offset"), $.position),
							alias(token(seq(K.NO, K.offset)), "nooffset"),
						),
						alias(choice(K.left, K.right, K.center, K.autojustify), "align"),
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
						$.font_spec, // string with font name and optional size
						alias(K.enhanced, "enhanced"),
						alias(/numeric|timedate|geographic/, "format"),
						alias(token(seq(K.NO, K.logscale)), "log"),
						alias(/(no)?range(l(i(m(i(t(e(d)?)?)?)?)?)?)?/, "rangelimit"),
						seq(
							alias(K.tc, "tc"),
							choice($.colorspec, seq(alias(K.lt, "lt"), $._expression)),
						),
					),
				),
			),

		// NOTE: line_style | line_opts | style_opts unnecessary?
		line_style: ($) =>
			prec.left(
				1,
				seq(
					field("tag", $._expression),
					repeat(
						choice(
							alias(K.def, "default"),
							seq(alias(K.lt, "lt"), $._expression),
							seq(alias(K.lw, "lw"), $._expression),
							seq(alias(K.lc, "lc"), $.colorspec),
							seq(alias(K.dt, "dt"), $._dash_opts),
							seq(alias(K.pt, "pt"), $._expression),
							seq(alias(K.ps, "ps"), $._expression),
							seq(alias(K.pi, "pi"), $._expression),
							seq(alias(K.pn, "pn"), $._expression),
							alias(K.palette, "palette"),
						),
					),
				),
			),

		fill_style: ($) =>
			repeat1(
				choice(
					choice(
						"empty",
						seq(
							optional(alias(K.transparent, "transparent")),
							alias(/s(o(l(i(d)?)?)?)?/, "solid"),
							optional(alias($._expression, $.density)),
						),
						seq(
							optional(alias(K.transparent, "transparent")),
							alias(/pat(t(e(r(n)?)?)?)?/, "pattern"),
							optional(alias($._expression, $.n)),
						),
					),
					seq(
						alias(/(no)?bo(r(d(e(r)?)?)?)?/, "border"),
						optional(seq(optional(alias(K.lt, "lt")), $._expression)),
						optional(seq(alias(K.lc, "lc"), $.colorspec)),
					),
				),
			),

		colorspec: ($) =>
			prec.left(
				choice(
					field("tag", $._expression),
					seq(alias(/rgb(c(o(l(o(r)?)?)?)?)?/, "rgbcolor"), $._expression),
					seq(
						alias(K.palette, "palette"),
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
						alias(/i(n(d(e(x)?)?)?)?/, "index"),
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
					"every",
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
						alias(/u(s(i(n(g)?)?)?)?/, "using"),
						$._expression,
						repeat(seq(":", $._expression)),
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
				/csplines?/,
				/acsplines?/,
				/mcsplines?/,
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
			seq(
				optional($.system),
				field("x", $._expression),
				optional(","),
				optional($.system),
				optional(field("y", $._expression)),
				optional(seq(",", optional($.system), field("z", $._expression))),
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
		_assignment: ($) =>
			choice($.func_def, $.var_def, $.array_def, $.datablock_def),

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

		datablock_def: ($) =>
			seq($.datablock, "<<", $.identifier, repeat($._expression), $.identifier),

		macro: ($) => seq("@", $.identifier),

		//-------------------------------------------------------------------------

		_expression: ($) =>
			prec.left(
				1,
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
					$.datablock,
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
						choice(token.immediate(prec(1, /[^'%]+/)), $.format_specifier),
					),
					"'",
				),
				seq(
					'"',
					repeat(
						choice(token.immediate(prec(1, /[^"%]+/)), $.format_specifier),
					),
					'"',
				),
			),

		format_specifier: ($) =>
			token.immediate(
				seq("%", optional(/([+-]?\d+|\d+\.\d+|\.\d+)/), /[a-zA-Z]/),
			),

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
					alias($._expression, $.condition),
					"?",
					alias($._expression, $.true),
					":",
					alias($._expression, $.false),
				),
			),

		identifier: ($) => /([a-zA-Z_\u0370-\u26FF])+\w*/, // Not pretty but (mostly) works

		datablock: ($) => token(seq("$", /([a-zA-Z_\u0370-\u26FF])+\w*/)),

		comment: ($) => token(seq("#", /.*/, repeat(seq("\\\n", /.*/)))),
	},
});
