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

(func_def (function) "=" @operator)
(var_def (var) "=" @operator)
(array_def "array" [
                    ((array) ("=" @operator)?)
                    ((identifier) "[" (_) "]" "="@operator)
                    ])

(sum_block "sum" @repeat)

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
  (plot) @keyword
  "sample"? @keyword
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
    (not) @field
    (tit) @field (title)
    [
     ((with) @field (plot_style) (style_opts)?)
     (style_opts)
    ]
  ])*)

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

(c_print "print" @keyword)

(c_replot) @keyword

(c_reset "reset"@keyword ["bind" "errors" "session"]?@attribute)

(c_set
  [((_set) @keyword (for_block)?)
   (unset) @keyword]
  (argument_set_show)*
)

(angles (_angles) @field ["degrees" "radians"]?)
(arrow (_arrow) @field (_tag)? [
                      (((_from)(position))? (_to_rto) @attribute(position))
                      ((_from)(position)(_len)(length)(_ang)(angle))
                      (arrow_opts)
                      ]* @attribute)
(border (_border) @field (_)? ["front" "back" "behind" (line_opts) "polar"]? @attribute)
; (boxwidth)
; (boxdepth)
; (color)
; (colormap)
; (colorsequence)
; (clip)
; (cntrlabel)
; (cntrparam)
; (colorbox)
; (contour)
; (cornerpoles)
; (dashtype) ; (_dash_opts)
(datafile (datafile) @field
  [
   (columnheaders)
   (fortran)
   "nofpe_trap"
   ((miss)[(missing) "NaN"])
   ((sep) [(whitespace) "tab" "comma" (separator)])
   ((comments)(str)?)]? @attribute
)
; (decimalsign)
; (dgrid3d)
(dummy ("dummy" @field (dv1) "," (dv2)))
; (encoding)
; (errorbars)
(fit ("fit" @field [
                    ; log
                    (fit_out)
                    (errorvars)
                    (covariancevars)
                    (errorscaling)
                    (prescale)
                    ; maxiter
                    ; limit
                    ; limit_abs
                    ; start-lambda
                    ; lambda-factor
                    ; script
                    (version)
                    ]* @attribute))
(format "format" @field (axes)? @attribute fmt_str: (_) _? @attribute)
(grid (grid) @field [
                     (tics)
                     ((po)(angle)?)
                     (layer)
                     (vertical)
                     ((line_opts)(","(line_opts))?)
                     ]* @attribute )
(hidden3d (hidden3d) @field [
                             "defaults"
                             (fb)
                             ((offs)(offset))
                             ("trianglepattern" (tp))
                             ((undef)(undefined))
                             (altdiagonal)
                             (bentover)
                             ]? @attribute)
; (hystory)
(isosamples (isosamples) @field)
; (isosurface)
; (isotropic)
; (jitter) @field
(key ((key) @field
     [
      "on" "off"
      "default"
      (enhanced)
      ((a)"columnheader"? @property)
      ((box) (line_opts)?)
      ((opaque)("fc" @property (colorspec))?)
      ("width" increment: (_))
      ("height" increment: (_))
      (layout)
      ; ("maxcols" ["auto"]?)
      ; ("maxrows" ["auto"]?)
      ; ("columns" )
      ; ("keywidth" ["screen" "graph"] )
      (lr)
      (reverse)
      ("samplen"(length))
      ("spacing"(spacing))
      ((tit) (title)? (enhanced)?@attribute(position)?@attribute)
      ("font" face_size: (_))
      ((tc) (colorspec))
      (placement)
      (margin)
      ("at" (position))
      (hor)
      (vert)
      ]* @attribute))
(label (lab)@field (tag)? @attribute (label) @attribute (label_opts)*)
(linetype (lt)@field)
; (link)
; (loadpath)
; (locale)
(logscale (log)@field (axis) @attribute base: (_)?)
(margin (margin) @field
        [
         ("at" "screen" @attribute(_))
         ; (lm: (_) "," rm: (_) "," bm: (_) "," tm: (_))
         ]? @attribute)
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
    "gray" "color"
    ("gamma" gamma: (_))
    ("rgbformulae" r: (_) "," g: (_) "," b: (_))
    ("defined" ("(" gray: (_) color: (_) ("," gray: (_) color: (_))* ")")?)
    ("file" filename: (_)(datafile_modifiers)?)
    ("colormap" colormap_name: (_))
    ("functions" R: (_) "," G: (_) "," B: (_))
    ("cubehelix" ("start" val: (_))? @property ("cycles" val: (_))? @property ("saturation" val: (_))? @property)
    "viridis"
    ("model" (["RGB" "CMY" ("HSV" ("start" radians: (_))? @attribute)])? @property )
    "positive" "negative"
    "nops_allcF" "ps_allcF"
    ("maxcolors" maxcolors: (_))
    ])* @attribute)
(parametric) @field
(paxis (paxis) @field) ; TODO: complete
(pm3d "pm3d" @field [
                     ("at" (position))
                     ("interpolate" steps: (_) "," between: (_))
                     (scanorder) ((depthorder) "base"?) (hidden3d)
                     ("flush" ["begin""center""end"]@property)
                     (ftriangles)
                     ("clip" z: (_)) "clip1in" "clip4in"
                     (clipcb)
                     ("corners2color" ["mean" "geomean" "harmean" "rms" "median" "min" "max" "c1" "c2" "c3" "c4"]@property)
                     ((lighting) ("primary" fraction: (_))? @property ("specular" fraction: (_))? @property("spec2" fraction: (_))? @property )
                     ((border) "retrace"? (line_opts)?)
                     ["implicit" "explicit"]
                     "map"
                     ]@attribute)
; (pixmap)
(pointsize (pointsize) @field (multiplier) @attribute)
(polar) @field
(print (print) @field (_)?)
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
   ((data)[(plot_style) (spiderplot)@attribute])
   ((fill)(fill_style))
   ((func)(plot_style))
   ((line)(line_style))
   ((circle))
   ((rectangle))
   ((ellipse))
   ((parallelaxis))
   ; ((spiderplot))
   ((textbox))
   ]@property )
; (surface)
; (table)
(terminal (terminal) @field)
(t_cairolatex (name) @property
  ([
    "eps" "pdf" "png" "standalone" "input" "blacktext" "colortext" "colourtext" ("header"(_)) "mono" "color"
    ("background" (_)) ("font" (_)) ("fontscale" (_)) "rounded" "butt" "square"
    ; ((size) x: (_) ["cm" "in"] @property "," y: (_) ["cm" "in"] @property)
    ; (canvas_size)
    ])* @attribute )
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

(canvas_size (size)@field
             x:((_)@number ["cm" "in"]?@property);([(noint)(int)]["cm""in"]?)
             ","
             y:((_)@number ["cm" "in"]?@property));([(noint)(int)]["cm""in"]?))

; (termoption)
; (theta)
; (tics)
; (timestamp)
; (timefmt)
(title (tit) @field (title)? ((offset) (_))?@attribute ("font" (_))?@attribute ((tc) [(colorspec) "default" @property])?@attribute (enhanced)?@attribute)
(version "version" @field "long"? @attribute)
; (vgrid)
(view "view" @field) ; TODO: complete
; (walls)
(xdata (xdata)@field "time"?@attribute)
(xdtics) @field
(xlabel (xlabel) @field (label)? [
                                  ((offset)(position))
                                  ((rotate)[("by" (angle)) "parallel"]?)
                                  ((tc) (colorspec))
                                  ("font"(font))
                                  (enhanced)
                                  ]* @attribute)
(xmtics) @field
(xrange (range) @field (range_block)?
        ([(reverse)(writeback)(extend)"restore"])* @attribute)
(xtics (xtics) @field (tics_opts)?)
(xyplane "xyplane"@field [("at" zval: (_))("relative" val: (_))]?@attribute)
(zero (zero)@field (_)?)
; (zeroaxis)

(c_show (show) @keyword); TODO: complete

(c_splot (splot) @keyword "sample"? @keyword (range_block)* (plot_element) ("," (plot_element))*)

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

(fill_style [
             "empty"
             ((transparent)? (solid) (density)?)
             ; ((transparent)? "pattern" (pattern) (n: (_)))
             ] @attribute
            [("border" ((lt) @field (_))? @field ((lc) @field (colorspec))?) (noborder)]? @attribute
)

(line_style) @field

(colorspec [
            (tag) @attribute
            ((rgbcolor)) @attribute
            ((palette) @attribute [
                                   ("frac" @attribute (val))
                                   ("cb" @attribute (val))
                                   "z" @attribute]?)
            ]) ; TODO: complete highlights

(label_opts [ ; TODO: complete
              (norotate)
              ((rotate) ("by"@attribute degrees: (_))?)
              ; font
              (enhanced)
              ; front back
              ((tc)(colorspec))
              ((offset)(position))
              (align)
              position: ("at" (position)@attribute)
              ; point
              ; boxed
              "hypertext"
             ]@attribute)

(tics_opts [
            (axis)
            (mirror)
            (inout)
            ("scale" ["default" ((_) ("," (_))?)]?)
            ((rotate) ("by" (_))?)
            ; ("offset" (_)) "noofset"
            (align)
            "add"
            "autofreq"
            ; (_)
            ; (start: (_) "," incr: (_) ("," end: (_))?)
            ; ("(" [pos: (_)] ")")
            ("format" (_))
            ("font" (_))
            (enhanced)
            (format)
            (log)
            (rangelimit)
            ((tc) [(colorspec) "default"])
            ]+ @attribute)

(line_opts [(ls)(lt)(lw)(lc)(dt)] @field)

(position ((system)? x: (x) ","? (system)? y: (y)? ("," (system)? z: (z))?))

(system) @attribute

(macro) @function.macro

(function (name) @function)

((function (name) @function.builtin)
 (#match?
  @function.builtin
  "^(abs|acos|acosh|airy|arg|asin|asinh|atan|atan2|atanh|besj0|besj1|besjn|besy0|besy1|besyn|besi0|besi1|besin|cbrt|ceil|conj|cos|cosh|EllipticK|EllipticE|EllipticPi|erf|erfc|exp|expint|floor|gamma|ibeta|inverf|igamma|imag|int|invnorm|invibeta|invigamma|LambertW|lambertw|lgamma|lnGamma|log|log10|norm|rand|real|round|sgn|sin|sinh|sqrt|SynchrotronF|tan|tanh|uigamma|voigt|zeta|cerf|cdawson|faddeva|erfi|FresnelC|FresnelS|VP|VP_fwhm|Ai|Bi|BesselH1|BesselH2|BesselJ|BesselY|BesselI|BesselK|gprintf|sprintf|strlen|strstrt|substr|strptime|srtftime|system|trim|word|words|time|timecolumn|tm_hour|tm_mday|tm_min|tm_mon|tm_sec|tm_wday|tm_week|tm_yday|tm_year|weekday_iso|weekday_cdc|column|columnhead|exists|hsv2rgb|index|palette|rgbcolor|stringcolumn|valid|value|voxel)$"))

((identifier) @variable.builtin
  (#match? @variable.builtin "^\\w+_(records|headers|outofrange|invalid|blank|blocks|columns|column_header|index_(min|max)(_x|_y)?|(min|max)(_x|_y)?|mean(_err)?(_x|_y)?|stddev(_err)?(_x|_y)?)$"))
((identifier)@variable.builtin
  (#match? @variable.builtin "^\\w+_(sdd(_x|_y)?|(lo|up)_quartile(_x|_y)?|median(_x|_y)?|sum(sq)?(_x|_y)?|skewness(_err)?(_x|_y)?)$")) 
((identifier) @variable.builtin
  (#match? @variable.builtin "^\\w+_(kurtosis(_err)?(_x|_y)?|adev(_x|_y)?|correlation|slope(_err)?|intercept(_err)?|sumxy|pos(_min|_max)_y|size(_x|_y))$"))
((identifier) @variable.builtin
  (#match? @variable.builtin "^(GPVAL|MOUSE)_\\w+"))

(array_def "array" @keyword.function (array))
(array (identifier) @function)

(number) @number

(string_literal) @string
(format_specifier)@string.special
; (escape_sequence)@string.escape
[
 "NaN"
 ; "I"
 ; "pi"
] @variable.builtin
