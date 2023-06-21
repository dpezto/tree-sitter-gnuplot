; highlights.scm

(comment) @comment

(unary_expression
  _? @operator
  (_) @variable
  _? @operator)

(binary_expression
  (_) @variable
  _ @operator
  (_) @variable)

(ternary_expression
  (condition) @variable
  "?" @conditional.ternary
  (true) @variable
  ":" @conditional.ternary
  (false) @variable)

(for_block "for" @repeat)

(c_do "do" @repeat (for_block))

(c_eval "eval" @keyword (_))

(c_fit
  "fit" @keyword
  (range_block)*
  (_)+
  "via" @keyword)

(c_if
  "if" @conditional
  "(" _ ")"
  "{" _* "}"
  ("else" @conditional "if" @conditional "(" _+ ")" "{" _* "}")*
  ("else" @conditional "{" _* "}")? )

(c_load "load" @keyword (_))

(c_plot
  ["p" "pl" "plo" "plot"] @keyword
  (range_block)*
  (plot_element
    (for_block)?
    [((definition) ("," _)* "," (function)) (function) ((data) (datafile_modifiers)?)])
  ([","] (plot_element))*) ; TODO: add linebreak ",\\\\\n"

(plot_element
  iteration: (for_block)?
  [((definition) ("," (_))* "," (function)) (function) ((data) (datafile_modifiers)?)]
  ([
    ("axes" @field ["x1y1" "x2y2" "x1y2" "x2y1"] @attribute)
    [
      ["not" "notit" "notitle"] @field ; FIX: just matches the first option
      (["t" "tit" "title"] @field (title))] ; FIX: doesn't match nothing
    [
     ((["w""with"]) @field (plot_style) (style_opts)?)
     (style_opts)
    ]
  ])*)

(plot_style) @attribute
(style_opts) @field
(datafile_modifiers
  [
    "binary"
    matrix: (["nonuniform" "sparce"] "matrix")
    index: (["i""index"] @field (m) (":" (n))? (":" (p))?); FIX: just matches the first option
    ( "every" @field (point_incr)? (":" (block_incr)?)? (":" (start_point)?)? (":" (start_block)?)? (":" (end_point)?)? (":" (end_block)?)? )
    using: (["u""using"] @field (col) (":" (col))* ); FIX: just matches the first option
    ("skip" N_lines: _)
    ("smooth" (smooth_options)?)
    "mask"
    "convexhull"
    "volatile"]+)

(colorspec)

(c_print "print" @keyword)

(c_replot) @keyword

(c_reset "reset" @keyword)

(c_set
  [("set" @keyword (for_block)?)
   ["uns" "unse" "unset"] @keyword]
  (argument_set_show)*
)

(datafile 
  ["dataf""datafi""datafil""datafile"] @field 
  ([
    ["sep" "separator"] @attribute 
    ])*)
(format
  "format" @field
  _* @attribute)
(key
  ["k" "ke" "key"] @field
  _* @attribute) ; TODO: don't be lazy and match the all the options
(logscale "logscale" @field ((["x" "y" "z" "x2" "y2" "cb" "r"])+ @attribute (#match? @attribute "^[xyz2cbr]+$")) base: (_)?)
(mxtics
  (["mxtics""mytics""mztics""mx2tics""my2tics""mrtics""mttics""mcbtics"]) @field
  ([
    (freq)
    "default"
    ((N) units: ["seconds" "minutes" "hours" "days" "weeks" "months" "years"])
   ])*)
(output ["o" "ou" "out" "outp" "outpu" "output"] @field)
(palette 
  ["pal" "palette"] @field
  ([
    "positive" "negative"
    "maxcolors"
    ])* @attribute)
(style)
(size
  "size" @field
  _* @attribute)
(terminal ["t" "te" "ter" "term" "termi" "termin" "termina" "terminal"] @field _)
(xlabel ["xlab" "ylab" "zlab" "x2lab" "y2lab" "cblab" "rlab"] @field (label) _* @attribute)
(xrange ["xran"	"xrang"	"xrange" "yran"	"yrang"	"yrange" "zran" "zrang" "zrange" "x2ran" "x2rang" "x2range" "y2ran" "y2rang" "y2range" "rran" "rrang" "rrange" "tran" "trang" "trange" "uran"	"urang"	"urange" "vran" "vrang" "vrange" "cbran" "cbrang" "cbrange" "vxran" "vxrang" "vxrange" "vyran" "vyrang" "vyrange" "vzran" "vzrang" "vzrange"] @field (range_block)? (["noreverse" "reverse" "nowriteback" "writeback" "noextend" "extend" "restore"])? @attribute)
(xtics)

(c_stats
  "stats" @keyword
  (range_block)*
  (filename)
  (["matrix" (_)+])? ; _i_e_u_directives
  ([
    (["name" "prefix"] @field (_) @attribute)
    ["o" "out" "output" "noo" "noout" "nooutput"] @field
    ; ("vgridname" ("name" (_)))
  ])*)

(c_while "while" @repeat "(" _ ")" "{" _* "}" )

(macro) @function.macro

; TODO: add MOUSE and GPVAL
((identifier) @constant
  (#match? @constant "^\\w+_(records|headers|outofrange|invalid|blank|blocks|columns|column_header|index_(min|max)(_x|_y)?|(min|max)(_x|_y)?|mean(_err)?(_x|_y)?|stddev(_err)?(_x|_y)?)$"));|sdd(_x|_y)?|(lo|up)_quartile(_x|_y)?|median(_x|_y)?)$"))
    ;"^[A-Z]+(_records|_headers|_outofrange|_invalid|_blank|_blocks|_columns|_column_header|_index_(min|max)(_x|_y)?|_(min|max)(_x|_y)?|_mean(_err)?(_x|_y)?|_stddev(_err)?(_x|_y)?|_sdd(_x|_y)?|_(lo|up)_quartile(_x|_y)?|_median(_x|_y)?|_sum(sq)?(_x|_y)?|_skewness(_err)?(_x|_y)?|_kurtosis(_err)?(_x|_y)?|_adev(_x|_y)?|_correlation|_slope(_err)?|_intercept(_err)?|_sumxy|_pos(_min|_max)_y|_size(_x|_y))$"))

(array_def "array" @keyword.function (array (identifier)) )

(function (name) @function)

((function (name) @function.builtin)
  (#match?
    @function.builtin
    "^(abs|acos|acosh|airy|arg|asin|asinh|atan|atan2|atanh|besj0|besj1|besjn|besy0|besy1|besyn|besi0|besi1|besin|cbrt|ceil|conj|cos|cosh|EllipticK|EllipticE|EllipticPi|erf|erfc|exp|expint|floor|gamma|ibeta|inverf|igamma|imag|int|invnorm|invibeta|invigamma|LambertW|lambertw|lgamma|lnGamma|log|log10|norm|rand|real|round|sgn|sin|sinh|sqrt|SynchrotronF|tan|tanh|uigamma|voigt|zeta|cerf|cdawson|faddeva|erfi|FresnelC|FresnelS|VP|VP_fwhm|Ai|Bi|BesselH1|BesselH2|BesselJ|BesselY|BesselI|BesselK|gprintf|sprintf|strlen|strstrt|substr|strptime|srtftime|system|trim|word|words|time|timecolumn|tm_hour|tm_mday|tm_min|tm_mon|tm_sec|tm_wday|tm_week|tm_yday|tm_year|weekday_iso|weekday_cdc|column|columnhead|exists|hsv2rgb|index|palette|rgbcolor|stringcolumn|valid|value|voxel)$"))

[(integer) (float)] @number

[(single_quoted_string) (double_quoted_string)]@string
