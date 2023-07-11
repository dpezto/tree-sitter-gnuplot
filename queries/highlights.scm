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
(array_def "array"
           [
            ((array) ("=" @operator)?)
            ((identifier) "[" (_) "]" "=" @operator)
            ])

(sum_block "sum" @repeat)

(for_block "for" @repeat)

(c_clear) @keyword

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

(c_pause "pause" @keyword "mouse" @field _? @attribute ("," _ @attribute)?)

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
  [
   ("axes" @field ["x1y1" "x2y2" "x1y2" "x2y1"] @attribute)
   (not) @field
   (tit) @field (title)
   [
    ((with) @field (plot_style) (style_opts)?)
    (style_opts)
    ]]*)

(style_opts [
             (line_opts)
             (pt) @field
             (ps) @field
             (as) @field
             (fs) @field
             (fc) @field
             "nohidden3d"
             "nocontours"
             ; nosurface
             ; K.palette
             ]) ; TODO: complete
(datafile_modifiers
  [
   "binary"
   matrix: (["nonuniform" "sparce"] "matrix")
   index: ((i) @field (m) (":" (n))? (":" (p))?)
   ((every) @field (point_incr)? (":" (block_incr)?)? (":" (start_point)?)? (":" (start_block)?)? (":" (end_point)?)? (":" (end_block)?)? )
   using: ((u) @field (col) (":" (col))*)
   ("skip" N_lines: _)
   ("smooth" (smooth_options)?)
   "mask" "convexhull" "volatile"
  ]+)

(c_print "print" @keyword)

(c_replot) @keyword

(c_reread) @keyword

(c_reset "reset" @keyword ["bind" "errors" "session"]? @attribute)

(c_set (cmd) @keyword (for_block)? argument: (argument_set_show))

(argument_set_show (opts) @field)

(angles) @attribute
(arrow (_tag)?
       [
        (((_from)(position))? (_to_rto) @attribute(position))
        ((_from)(position)(_len)(length)(_ang)(angle))
        (arrow_opts)
       ]* @attribute)
(border (_)? ["front" "back" "behind" (line_opts) "polar"]? @attribute)
; (boxwidth)
(boxdepth "square" @attribute)
(colormap "new" @attribute)
(colorsequence) @attribute
(clip) @attribute
; (cntrlabel)
; (cntrparam)
; (colorbox)
(contour) @attribute
; (dashtype) ; (_dash_opts)
(datafile
          [
           (columnheaders)
           (fortran)
           "nofpe_trap"
           ((miss)(missing))
           ((sep) [(white) "tab" "comma"] @property)
           ((comments)(str)?)
           ]? @attribute)
(decimalsign "locale" @attribute)
; (dgrid3d)
(encoding) @attribute
; (errorbars)
(fit
  [
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
  ]+ @attribute)
(format
        (axes)? @attribute
        fmt_str: (_)
        _? @attribute)
(grid
      [
       (tics)
       ((po)(angle)?)
       (layer)
       (vertical)
       ((line_opts)(","(line_opts))?)
      ]* @attribute)
(hidden3d
          [
           "defaults"
           (fb)
           ((offs)(offset))
           ("trianglepattern" (tp))
           ((undef)(undefined))
           (altdiagonal)
           (bentover)
          ]? @attribute)
; (hystory)
(isosurface ["mixed" "triangles" "noinsidecolor" ("insidecolor" (_))] @attribute)
; (jitter) @field
(key
    [
      "on" "off"
      "default"
      (enhanced)
      ((a)(column)? @property)
      ((box) (line_opts)?)
      ; ((opaque)("fc" @property (colorspec))?)
      ("width" increment: (_))
      ("height" increment: (_))
      (layout)
      ("maxcols" ["auto"]?)
      ("maxrows" ["auto"]?)
      ("columns" )
      ("keywidth" ["screen" "graph"] )
      (lr)
      (reverse)
      ("samplen"(length))
      ("spacing"(spacing))
      ((tit) (title)? (enhanced)? @attribute(position)? @attribute)
      ("font" face_size: (_))
      ((tc) (colorspec))
      (placement)
      (margin)
      ("at" (position))
      (hor)
      (vert)
    ]+ @attribute)
; (link)
(logscale (axis) @attribute base: (_)?)
(margin 
  [
   ("at"? "screen" @attribute(_))
   ("margins" lm: (_) "," rm: (_) "," bm: (_) "," tm: (_))
  ]? @attribute)
; (mouse)
(multiplot
  [
   ((title) title: (_) ("font" font: (_))? _?)
   ; (("layout" rows: (_) "," cols: (_)) ["rowsfirst" "columnfirst" "downwards" "upwards"]?
   ;                                     ("scale" xscale: (_) ("," yscale: (_)))?)
  ]+)
(mxtics ; TODO: verify
  [
   (freq)
   ; "default"
   ((N) units: _ )
   ]+ )
(palette
  [
   "gray" "color"
   ("gamma" gamma: (_))
   ((rgb) r: (_) "," g: (_) "," b: (_))
   ((def) ("(" gray: (_) color: (_) ("," gray: (_) color: (_))* ")")?)
   ("file" filename: (_)(datafile_modifiers)?)
   ((col) colormap_name: (_))
   ((func) R: (_) "," G: (_) "," B: (_))
   ("cubehelix" ("start" val: (_))? @property ("cycles" val: (_))? @property ("saturation" val: (_))? @property)
   "viridis"
   ((mo) (["RGB" "CMY" ("HSV" ("start" radians: (_))? @attribute)])? @property )
   (pn)
   "nops_allcF" "ps_allcF"
   ((maxc) maxcolors: (_))
   ]+ @attribute)
; (paxis)
(pm3d
  [
   ("at" (position))
   ((interp) steps: (_) "," between: (_))
   (scanorder) ((depthorder) "base"?) (hidden3d)
   ("flush" ["begin""center""end"] @property)
   (ftriangles)
   ("clip" z: (_)) "clip1in" "clip4in"
   (clipcb)
   ("corners2color" ["mean" "geomean" "harmean" "rms" "median" "min" "max" "c1" "c2" "c3" "c4"]@property)
   ((lighting) ("primary" fraction: (_))? @property ("specular" fraction: (_))? @property("spec2" fraction: (_))? @property )
   ((border) "retrace"? (line_opts)?)
   ["implicit" "explicit"]
   "map"
   ] @attribute)
; (pixmap)
; (size)
(style
  [
   ; ((arrow)["default"])
   (boxplot)
   ((data)[(plot_style) (spiderplot) @attribute])
   ((fill)(fill_style))
   ((func)(plot_style))
   ((line)(line_style))
   ((circle))
   ((rectangle))
   ((ellipse))
   ((parallelaxis))
   ; ((spiderplot))
   ((textbox))
   ] @property )
(surface ["implicit" "explicit"] @attribute)
; (table)
(terminal [(name) "push" "pop"] @property)
(t_cairolatex
              [
               "eps" "pdf" "png" "standalone" "input" "blacktext" "colortext" "colourtext" ("header"(_)) "mono" "color"
               ("background" (_)) ("font" (_)) ("fontscale" (_)) "rounded" "butt" "square"
              ]* @attribute )
; (t_canvas)
; (t_cgm)
; (t_context)
; (t_domterm)
; (t_dumb)
; (t_dxf)
; (t_emf)
; (t_epscairo)
; (t_epslatex)
; (t_fig)
; (t_gif)
; (t_hpgl)
; (t_jpeg)
; (t_lua)
; (t_pc15)
; (t_pdfcairo)
; (t_png)
; (t_pngcairo)
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

(canvas_size (size) @attribute
             x:((_) @number ["cm" "in"]? @property)
             ","
             y:((_) @number ["cm" "in"]? @property))

(font_spec "font" @attribute)

; (termoption)
(theta) @attribute
; (tics)
; (timestamp)
(title
  [
   title: (_)
   ((offset) (position))
   ("font" (_)) 
   ((tc)[(colorspec)(linetype)]) 
   (enhanced)
   ]+ @attribute)
; (vgrid)
; (view)
; (walls)
(xdata) @attribute
(xlabel (label)?
        [
         ((offset)(position))
         ((rotate)[("by" @attribute (angle)) "parallel" @attribute]?)
         ((tc)[(linetype) (colorspec)])
         ("font"(font))
         (enhanced)
         ]+ @attribute)
(xrange (range_block)?
        [(reverse)(writeback)(extend)"restore"]* @attribute)
; (xyplane); "xyplane" @field [("at" zval: (_))("relative" val: (_))]? @attribute)
;
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
   ((filledcurves)
    [
     "closed"
     "between"
     (["above""below"]?(["x1""x2""y1""y2""y""r"] @attribute ("=")?)?)
     ((fill)(fill_style))
    ]? @property)
   ("fillsteps"["above""below"]? @property ("y""="(_))?) (histograms) (image)
   "pm3d""rgbalpha""rgbimage""polygons""table""mask"] @attribute)

(fill_style
  [
   "empty"
   ((transparent)? (solid) (density)?)
   ; ((transparent)? "pattern" (pattern) (n: (_)))
  ] @attribute
  [("border" ((lt) @field (_))? @field ((lc) @field (colorspec))?) (noborder)]? @attribute)

(line_style [
             (tag)
             (default)
             (lt)(lw)(lc)(dt)(pt)(ps)(pi)(pn)(palette)
             ]@field)

(colorspec
  [
   (tag)
   ((rgbcolor)) @attribute
   ((palette) @attribute
              [
               ("frac" @attribute (val))
               ("cb" @attribute (val))
               "z" @attribute]?)]) ; TODO: complete highlights

(arrow_opts [
             (as)
             (head)
             ; size
             "fixed" "filled" "empty" "nofilled" "noborder" "front" "back"
             ]+ @attribute)

(label_opts
  [ ; TODO: complete
   (norotate)
   ((rotate) ("by"@attribute degrees: (_))?)
   ; font
   (enhanced)
   ; front back
   ((tc)(colorspec))
   ((offset)(position))
   (align)
   position: ("at" (position) @attribute)
   ; point
   ; boxed
   "hypertext"
  ] @attribute)

(tics_opts
  [
   (axis)
   (mirror)
   (inout)
   ; ("scale" ["default" ((_) ("," (_))?)]?)
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
   ; ((tc) "default")
  ]+ @attribute)

(line_opts [(ls)(lt)(lw)(lc)(dt)] @field)

(position ((system)? x: (x) ","? (system)? y: (y)? ("," (system)? z: (z))?))

(system) @attribute

(macro) @function.macro

(function (name) @function)

((function (name) @function.builtin)
 (#match? @function.builtin
  "^(abs|acos|acosh|airy|arg|asin|asinh|atan|atan2|atanh|besj0|besj1|besjn|besy0|besy1|besyn|besi0|besi1|besin|cbrt|ceil|conj|cos|cosh|EllipticK|EllipticE|EllipticPi|erf|erfc|exp|expint|floor|gamma|ibeta|inverf|igamma|imag|int|invnorm|invibeta|invigamma|LambertW|lambertw|lgamma|lnGamma|log|log10|norm|rand|real|round|sgn|sin|sinh|sqrt|SynchrotronF|tan|tanh|uigamma|voigt|zeta|cerf|cdawson|faddeva|erfi|FresnelC|FresnelS|VP|VP_fwhm|Ai|Bi|BesselH1|BesselH2|BesselJ|BesselY|BesselI|BesselK|gprintf|sprintf|strlen|strstrt|substr|strptime|srtftime|system|trim|word|words|time|timecolumn|tm_hour|tm_mday|tm_min|tm_mon|tm_sec|tm_wday|tm_week|tm_yday|tm_year|weekday_iso|weekday_cdc|column|columnhead|exists|hsv2rgb|index|palette|rgbcolor|stringcolumn|valid|value|voxel)$"))

((identifier) @variable.builtin
  (#match? @variable.builtin
   "^\\w+_(records|headers|outofrange|invalid|blank|blocks|columns|column_header|index_(min|max)(_x|_y)?|(min|max)(_x|_y)?|mean(_err)?(_x|_y)?|stddev(_err)?(_x|_y)?)$"))
((identifier)@variable.builtin
  (#match? @variable.builtin
   "^\\w+_(sdd(_x|_y)?|(lo|up)_quartile(_x|_y)?|median(_x|_y)?|sum(sq)?(_x|_y)?|skewness(_err)?(_x|_y)?)$"))
((identifier) @variable.builtin
  (#match? @variable.builtin
   "^\\w+_(kurtosis(_err)?(_x|_y)?|adev(_x|_y)?|correlation|slope(_err)?|intercept(_err)?|sumxy|pos(_min|_max)_y|size(_x|_y))$"))

((identifier) @variable.builtin
  (#match? @variable.builtin "^(GPVAL|MOUSE)_\\w+"))

; ((identifier) @text.todo
;   (#is-not? local))

(array_def "array" @keyword.function (array))
(array (identifier) @function)

(number) @number

(string_literal) @string
(format_specifier)@string.special

[
 "NaN"
 ; "I"
 ; "pi"
] @variable.builtin
