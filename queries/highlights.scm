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
  "(" (_) ")"
  "{" (_)* "}"
  ("else" @conditional "if" @conditional "(" (_)+ ")" "{" (_)* "}")*
  ("else" @conditional "{" (_)* "}")? )

(c_load "load" @keyword (_))

(c_plot
  ["p" "pl" "plo" "plot"] @keyword
  (range_block)*
  (plot_element
    (for_block)?
    [((definition) ("," _)* "," (function)) (function) ((data) (datafile_modifiers)?)])
  ([","] (plot_element))*)

(plot_element
  iteration: (for_block)?
  [((definition) ("," (_))* "," (function)) (function) ((data) (datafile_modifiers)?)]
  ([
    ("axes" @field ["x1y1" "x2y2" "x1y2" "x2y1"] @attribute)
      (tit) @field (title)?
    [
     ((with) @field (plot_style) (style_opts)?)
     (style_opts)
    ]
  ])*)

(plot_style 
  [(lines)(points)(lp)(financebars)(dots)(impulses)((labels)(label_opts)*)
   (surface)(steps)"fsteps""histeps"(arrows)((vectors)(arrow_opts)*)
   (errorbar)(errorlines)"parallelaxes""boxes""boxerrorbars""boxxyerror"
   "isosurface""boxplot""candlesticks""circles""zerrorfill""ellipses"
   ((filledcurves) [
                    "closed"
                    "between"
                    (["above""below"]?(["x1""x2""y1""y2""y""r"] @attribute ("=")?)?)
                    ((fill)(fill_style))
                    ]? @property)
   ("fillsteps"["above""below"]? @property ("y""="(_))?)"histograms"(image)
   "pm3d""rgbalpha""rgbimage""polygons""table""mask"] @attribute)
(style_opts) @field
(datafile_modifiers
  [
    "binary"
    matrix: (["nonuniform" "sparce"] "matrix")
    index: ((i) @field (m) (":" (n))? (":" (p))?)
    ( (every) @field (point_incr)? (":" (block_incr)?)? (":" (start_point)?)? (":" (start_block)?)? (":" (end_point)?)? (":" (end_block)?)? )
    using: ((u) @field (col) (":" (col))* )
    ("skip" N_lines: _)
    ("smooth" (smooth_options)?)
    "mask"
    "convexhull"
    "volatile"]+)

; (colorspec)

(c_print "print" @keyword)

(c_replot) @keyword

(c_reset "reset" @keyword)

(c_set
  [((set) @keyword (for_block)?)
   (unset) @keyword]
  (argument_set_show)*
)

(datafile (datafile) @field
  [(columnheaders) (fortran) "nofpe_trap" ((miss)[(missing) "NaN"]) ((sep) [(whitespace) "tab" "comma" (separator)])]? @attribute
)
(format "format" @field (axes) @attribute fmt_str: (_) _? @attribute)
(grid (grid) @field [
                     (tics)
                     ("polar"(angle))
                     (layer)
                     (vertical)
                     ((line_prop_major)(","(line_prop_minor))?)
                     ]* @attribute)
(key (key) @field
  _* @attribute) ; TODO: don't be lazy and match the all the options
(logscale "logscale" @field (axis) @attribute base: (_)?)
(margin (margin) @field)
(mxtics (mxtics) @field
  ([
    (freq)
    "default"
    ((N) units: ["seconds" "minutes" "hours" "days" "weeks" "months" "years"])
   ])*)
(multiplot "multiplot" @field)
(output (output) @field)
(palette (palette) @field
  ([
    "positive" "negative"
    "maxcolors"
    ])* @attribute)
(palette) @field
; (pm3d)
(pointsize (pointsize) @field (multiplier) @attribute)
(polar) @field
; (print)
; (psdir)
(raxis) @field
; (rgbmax)
(samples (samp) @field (samples1)(","(samples2))?)
; (size)
; (spiderplot)
(style (style) @field
  [
   ((arrow)["default"])
   (boxplot)
   ((data)(plot_style))
   ((fill)(fill_style))
   ((func)(plot_style))
   ; ((line)(line_style))
   ((circle))
   ((rectangle))
   ((ellipse))
   ((parallelaxis))
   ] @property)
; (surface)
; (table)
(terminal (terminal) @field)
(t_cairolatex (name) @property
  (["eps" "pdf" "png" "standalone" "input" "blacktext" "colortext" "colourtext" ("header"(_)) "mono" "color"
    ("background" (_)) ("font" (_)) ("fontscale" (_)) "rounded" "butt" "square"
    (["si" "siz" "size"] x: (_) ["cm" "in"] @property "," y: (_) ["cm" "in"] @property)])* @attribute )
; (t_canvas)
; (t_cgm)
; (t_context)
; (t_domterm)
; (t_dumb)
; (t_dxf)
; (t_emf)
(t_epscairo (name) @field)
(t_epslatex (name) @field)
; (t_fig)
; (t_gif)
; (t_hpgl)
; (t_jpeg)
; (t_lua)
; (t_pc15)
(t_pdfcairo (name) @field)
; (t_png)
(t_pngcairo (name) @field)
; (t_postscript)
; (t_pslatex)
; (t_pstricks)
; (t_qt)
; (t_sixelgd)
; (t_svg)
; (t_tek4xxx)
; (t_texdraw)
; (t_tikz)
; (t_tkcanvas)

; (termoption)
; (theta)
; (tics)
; (timefmt)
; (title)
; (version)
; (vgrid)
; (view)
; (walls)
; (xdata)
; (xdtics)
(xlabel (xlabel) @field (label) _* @attribute); TODO: complete
(xmtics) @field
(xrange (range) @field (range_block)? (["noreverse" "reverse" "nowriteback" "writeback" "noextend" "extend" "restore"])? @attribute)
(xtics)
; (xyplane)
; (zero)
; (zeroaxis)

(c_show (show) @keyword); TODO: complete

(c_splot (splot) @keyword (range_block)* (plot_element) ("," (plot_element))*)

(c_stats
  "stats" @keyword
  (range_block)*
  (filename)
  ["matrix" (i_e_u_directives)+]? @field
  [
    (["name" "prefix"] @field (_))
    (output) @field
    ; ("vgridname" ("name" (name))?)
  ]*)

(c_test)

(c_undefine)

(c_while "while" @repeat "(" (condition) ")" "{" _* "}" )

(fill_style [
             "empty"
             ((transparent)? (solid) (density)?)
             ; ((transparent)? "pattern" (pattern) (n: (_)))
             ] @attribute
            [("border" "lt"? @field ("lc" @field (colorspec))?) (noborder)]? @attribute
)
; (line_style)
(colorspec [
            (tag) @attribute
            ((rgbcolor)) @attribute
            ((palette) @attribute [
                                   ("frac" @attribute (val))
                                   ("cb" @attribute (val)) 
                                   "z" @attribute]?)
            ]) ; TODO: complete highlights

(macro) @function.macro

(function (name) @function)

((function (name) @function.builtin)
 (#match?
  @function.builtin
  "^(abs|acos|acosh|airy|arg|asin|asinh|atan|atan2|atanh|besj0|besj1|besjn|besy0|besy1|besyn|besi0|besi1|besin|cbrt|ceil|conj|cos|cosh|EllipticK|EllipticE|EllipticPi|erf|erfc|exp|expint|floor|gamma|ibeta|inverf|igamma|imag|int|invnorm|invibeta|invigamma|LambertW|lambertw|lgamma|lnGamma|log|log10|norm|rand|real|round|sgn|sin|sinh|sqrt|SynchrotronF|tan|tanh|uigamma|voigt|zeta|cerf|cdawson|faddeva|erfi|FresnelC|FresnelS|VP|VP_fwhm|Ai|Bi|BesselH1|BesselH2|BesselJ|BesselY|BesselI|BesselK|gprintf|sprintf|strlen|strstrt|substr|strptime|srtftime|system|trim|word|words|time|timecolumn|tm_hour|tm_mday|tm_min|tm_mon|tm_sec|tm_wday|tm_week|tm_yday|tm_year|weekday_iso|weekday_cdc|column|columnhead|exists|hsv2rgb|index|palette|rgbcolor|stringcolumn|valid|value|voxel)$"))

((identifier) @variable.builtin
  (#match? @variable.builtin "^\\w+_(records|headers|outofrange|invalid|blank|blocks|columns|column_header|index_(min|max)(_x|_y)?|(min|max)(_x|_y)?|mean(_err)?(_x|_y)?|stddev(_err)?(_x|_y)?)$"));|sdd(_x|_y)?|(lo|up)_quartile(_x|_y)?|median(_x|_y)?)$"))
    ;"^[A-Z]+(_records|_headers|_outofrange|_invalid|_blank|_blocks|_columns|_column_header|_index_(min|max)(_x|_y)?|_(min|max)(_x|_y)?|_mean(_err)?(_x|_y)?|_stddev(_err)?(_x|_y)?|_sdd(_x|_y)?|_(lo|up)_quartile(_x|_y)?|_median(_x|_y)?|_sum(sq)?(_x|_y)?|_skewness(_err)?(_x|_y)?|_kurtosis(_err)?(_x|_y)?|_adev(_x|_y)?|_correlation|_slope(_err)?|_intercept(_err)?|_sumxy|_pos(_min|_max)_y|_size(_x|_y))$"))
((identifier) @variable.builtin
  (#match? @variable.builtin "^(GPVAL|MOUSE)_\\w+"))

(array_def "array" @keyword.function (array))
(array (identifier) @function)

(number) @number

(string_literal) @string
[
 "NaN" 
 ; "I"
 ; "pi"
] @variable.builtin
