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
  condition: (_) @variable
  "?" @conditional.ternary
  true: (_) @variable
  ":" @conditional.ternary
  false: (_) @variable)

(func_def (function) "=" @operator)
(var_def (var) "=" @operator)
(array_def "array"
           [
            ((array) ("=" @operator)?)
            ((identifier) "[" (_) "]" "=" @operator)
            ])

(sum_block "sum" @repeat)

(for_block "for" @repeat "in"? @repeat)

(c_clear) @keyword

(c_do "do" @repeat (for_block))

(c_eval "eval" @keyword (_))

(c_fit
  "fit" @keyword
  (range_block)*
  (_)+
  "via" @keyword)

(c_if
  ("if" @conditional
  "(" (_) ")")
  ("{" (_)* "}"
  ("else" @conditional "if" @conditional "(" (_)+ ")" "{" (_)* "}")*
  ("else" @conditional "{" (_)* "}")? )?)

(c_load "load" @keyword (_))

(c_pause "pause" @keyword "mouse" @field _? @attribute ("," _ @attribute)?)

(c_plot
  "plot" @keyword
  "sample"? @keyword)

(plot_element
  (range_block)*
  (for_block)?
  [
   ("axes" ["x1y1" "x2y2" "x1y2" "x2y1"] @attribute)
   ("title" title: (_)?) 
   "notitle"
   ("with" with: (plot_style) (style_opts)?)
   ]* @field)

(style_opts ["as" "fs" "fc" "nohidden3d" "nocontours" "nosurf" "palette"]+ @field)
(datafile_modifiers
  [
   "binary"
   matrix: (["nonuniform" "sparce"]? "matrix" @attribute)
   ("skip" N_lines: _)
   ("smooth" (smooth_options)?)
   "mask" "convexhull" "volatile"
  ]* @attribute
  [
   index: ("index" m: (_) (":" n: (_))? (":" p: (_))?)
   ("every" point_incr: (_)? (":" block_incr: (_)?)? (":" start_point: (_)?)? (":" start_block: (_)?)? (":" end_point: (_)?)? (":" end_block: (_)?)? )
   using: ("using" (_) (":" (_))*)
   "zsort"
   ]* @field)

(smooth_options) @property

(c_print "print" @keyword)

(c_replot) @keyword

(c_reread) @keyword

(c_reset "reset" @keyword ["bind" "errors" "session"]? @attribute)

(c_set "cmd" @keyword (for_block)? "opts" @field)

(angles) @attribute
(arrow 
  [
   (("from" (position))? "to_rto" @attribute (position))
   ("from" (position) "length" length: (_) "angle" angle: (_))
   ]* @attribute)
(autoscale ["axes" "fix" "keepfix" "noextend"] @attribute)
(border (_)? ["front" "back" "behind" (line_opts) "polar"]? @attribute)
(boxwidth ["absolute" "relative"] @attribute)
(boxdepth "square" @attribute)
(colormap "new" @attribute)
(colorsequence) @attribute
(clip) @attribute
(cntrlabel ["format" "start" "interval" "onecolor"] @attribute)
(cntrparam 
  [
   "linear" "cubicspline" "bspline" "points" "order" 
   ("levels" ["auto" "discrete" "incremental"]? @property "sorted"? @attribute "firstlinetype"? @attribute)
   ]* @attribute)
(colorbox) ; TODO: complete
(contour) @attribute
(datafile
          [
           "columnheaders"
           "fortran"
           "nofpe_trap"
           "missing"
           ("sep" ["white" "tab" "comma"] @property)
           "comments"
           ]? @attribute)
(decimalsign "locale" @attribute)
(dgrid3d [
          "splines" "qnorm"
          (["gauss" "cauchy" "exp" "box" "hann"] "kdensity"? @property)
          ]+ @attribute)
(encoding) @attribute
; (errorbars)
(fit
  [
   "nolog"
   ("log" "default"? @property)
   "fit_out"
   "errorvars"
   "covariancevars"
   "errorscaling"
   "prescale"
   ("maxiter" "default"? @property)
   ("limit" "default"? @property)
   ("limit_abs" "default"? @property)
   ("start-lambda" "default"? @property)
   ("lambda-factor" "default"? @property)
   ("script" "default"? @property)
   "version"
  ]+ @attribute)
(format
        "axes"? @attribute
        fmt_str: (_)
        _? @attribute) ; TODO: check
(grid
      [
       "tics"
       "polar"
       "layer"
       "vertical"
       ]+ @attribute)
(hidden3d
  [
   "defaults"
   "fb"
   "offset"
   "trianglepattern"
   "undefined"
   "altdiagonal"
   "bentover"
   ]? @attribute)
; (hystory)
(isosurface ["mixed" "triangles" "noinsidecolor" ("insidecolor" (_))] @attribute)
(jitter ["overlap" "spread" "wrap" "moreopts"] @attribute)
(key
    [
      "on" "off"
      "default"
      "enhanced"
      ("a" "column"? @property)
      "box"
      ("opaque"("fc" @property (colorspec))?)
      ("width" increment: (_))
      ("height" increment: (_))
      "layout"
      ("maxcols" ["auto"]?)
      ("maxrows" ["auto"]?)
      ("columns" )
      ("keywidth" ["screen" "graph"] )
      "lr"
      "reverse"
      ("samplen" length: (_))
      ("spacing" spacing: (_))
      ("title" "enhanced"? @attribute(position)? @attribute)
      (font_spec)
      ("tc" (colorspec))
      "placement"
      "margin"
      ("at" (position))
      "hor"
      "vert"
    ]+ @attribute)
(link 
  [
   "x2" "y2"
   ("via" (_) "inverse" @attribute (_))
   ] @attribute) ; NOTE: maybe change highlight
(logscale "axis" @attribute)
(mapping) @attribute
(margin
  [
   ("at" "screen" @attribute(_)) ; TODO: check if correct
   ("screen" @attribute(_))
   ("margins" lm: (_) "," rm: (_) "," bm: (_) "," tm: (_))
  ]? @attribute)
; (mouse)
(multiplot
  [
   ("title" title: (_) (font_spec)? "enhanced"? @property)
   ("layout" rows: (_) "," cols: (_))
   "rowsfirst" "columnsfirst"
   "downwards" "upwards"
   ("scale" xscale: (_) ("," yscale: (_))?)
   "offset"
   ("margins" lm: (_) "," rm: (_) "," bm: (_) "," tm: (_))
   ("spacing" xspacing: (_) ("," yspacing: (_))?)
   "pn"
  ]+ @attribute)
(mxtics ; TODO: verify
  [
   "default"
   "units"
   ]* @attribute)
(palette
  [
   "gray" "color"
   ("gamma" gamma: (_))
   ("rgbformulae" r: (_) "," g: (_) "," b: (_))
   ("defined" ("(" gray: (_) color: (_) ("," gray: (_) color: (_))* ")")?)
   ("file" filename: (_)(datafile_modifiers)?)
   ("col" colormap_name: (_))
   ("func" R: (_) "," G: (_) "," B: (_))
   ("cubehelix" ("start" val: (_))? @property ("cycles" val: (_))? @property ("saturation" val: (_))? @property)
   "viridis"
   ("model" (["RGB" "CMY" ("HSV" ("start" radians: (_))? @attribute)])? @property )
   "pn"
   "nops_allcF" "ps_allcF"
   ("maxc" maxcolors: (_))
   ]+ @attribute)
(paxis ; FIX: highlight offset
  [
   ("range" ["reverse" "writeback" "extend" "restore"]* @property)
   "tics" "label" "offset"
   ]+ @attribute)
; (pixmap)
(pm3d
  [
   ("at" (position))
   ("interp" steps: (_) "," between: (_))
   "scanorder" ("depthorder" "base"? @property) "hidden3d"
   ("flush" ["begin""center""end"] @property)
   "ftriangles"
   ("clip" "z"? @property) "clip1in" "clip4in"
   "clipcb"
   ("corners2color" ["mean" "geomean" "harmean" "rms" "median" "min" "max" "c1" "c2" "c3" "c4"]@property)
   ("lighting" ("primary" fraction: (_))? @property ("specular" fraction: (_))? @property("spec2" fraction: (_))? @property )
   ("border" "retrace"? @property (line_opts)?)
   "implicit" "explicit"
   "map"
   ] @attribute)
(size [
       "square"
       "ratio"
       "noratio"
       ]+ @attribute)
(style
  [
   ("arrow" index:(_)? "def"? @attribute)
   "boxplot"
   ("data" [(plot_style) "spiderplot" @attribute])
   ("fs" (fill_style))
   ("func" (plot_style))
   ("line" (line_style))
   ("circle")
   ("rectangle")
   ("ellipse")
   ("parallelaxis")
   ; ((spiderplot))
   ("textbox")
   ] @property )
(surface ["implicit" "explicit"] @attribute)
; (table)
(terminal ["name" "push" "pop"] @property)
(t_cairolatex
              [
               "eps" "pdf" "png" "standalone" "input" "blacktext" "colortext" "colourtext" ("header"(_)) "mono" "color"
               ("background" (_)) (font_spec) ("fontscale" (_)) "rounded" "butt" "square"
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
; (t_svg [(font_spec)]* @attribute)
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
; (timestamp)
(title
  [
   ("offset" (position))
   (font_spec)
   ("tc" [(colorspec)(line_style)])
   "enhanced"
   ]+ @attribute)
; (vgrid)
(view 
  [
   ("map" "scale"?)
   ("projection" ["xy" "xz" "yz"]? @property)
   ("equal" ["xy" "xyz"]? @property)
   ("azimuth")
   ]+ @attribute)
(walls [
        "wall" @attribute
        ("fs" @field (fill_style))
        ("fc" @field (colorspec))
        ]+)
(xdata) @attribute
(xlabel
  [
    "offset"
    ("rotate" ["by" "parallel"] @attribute) ; FIX: rotate by highlight
    ("tc" [(colorspec) "lt" @field])
    "enhanced"
    ]+ @attribute)
(xrange ["reverse" "writeback" "extend" "restore"]+ @attribute)
(xyplane [("at" zval: (_))("relative" val: (_))]? @attribute)

(c_show "show" @keyword); TODO: complete

(c_splot "splot" @keyword "sample"? @keyword (range_block)* (plot_element) ("," (plot_element))*)

(c_stats
  "stats" @keyword
  (range_block)*
  filename: (_)
  [
   "matrix"? @field
   [
   index: ("index" m: (_) (":" n: (_))? (":" p: (_))?)
   ("every" point_incr: (_)? (":" block_incr: (_)?)? (":" start_point: (_)?)? (":" start_block: (_)?)? (":" end_point: (_)?)? (":" end_block: (_)?)? )
   using: ("using" (_) (":" (_))*)
   "zsort"
   ]* @field]
  [
   (["name" "prefix"] @field (_))
   "output" @field
   ; ("vgridname" ("name" (name))?)
  ]*)

(c_test)

(c_undefine)

(c_while "while" @repeat "(" (condition) ")" "{" _* "}" )

(plot_style
  ["lines" "points" "lp" "financebars" "dots" "impulses"
   ("labels" (label_opts)*)
   "surface" "steps" "fsteps" "histeps" "arrows"
   ("vectors"(arrow_opts)*)
   "sectors" "errorbar" "errorlines" "parallelaxes" "boxes" "boxerrorbars"
   "boxxyerror" "isosurface" "boxplot" "candlesticks" "circles" "zerrorfill"
   "ellipses"
   ("filledcurves"
    [
     "closed"
     "between"
     (["above" "below"]? @property ["x1""x2""y1""y2""y""r"]? @attribute) ; FIX: above below highlight
     "fs"
    ]? @property)
   ("fillsteps" ["above" "below"]? @property ("y" "=" (_))?) "histograms" "image"
   "pm3d" "rgbalpha" "rgbimage" "polygons" "table" "mask"] @attribute)

(fill_style
  [
   "empty" 
   "solid"
   ("transparent"? "solid" @attribute density: (_)?)
   ("pattern" (n)?)
   ("transparent"? "pattern" @attribute (n)?)
   ("border" [("lt"? @field (_)) @field ("lc" @field (colorspec))]?)
  ] @attribute)

(line_style [
             "default"
             "lt""lw""lc""dt""pt""ps""pi""pn""palette"
             ]@field)

(colorspec
  [
   "rgbcolor"
   ("palette"
              [
               ("frac" @property val: (_))
               ("cb" @property val: (_))
               "z" @property]?)
   "variable"
   "bgnd"
   "black"] @attribute)

(arrow_opts [
             "as"
             "head"
             "size"
             "fixed" "filled" "empty" "nofilled" "noborder" "front" "back"
             ]+ @attribute)

(tics_opts
  [
   "axis"
   "mirror"
   "inout"
   ; ("scale" ["default" ((_) ("," (_))?)]?)
   "scale"
   ("rotate" ("by" (_))?)
   ("offset" (position))
   "nooffset"
   "align"
   "add"
   "autofreq"
   "format"
   "enhanced"
   "format"
   "log"
   "rangelimit"
   "tc"
  ]+ @attribute)

(label_opts
  [
   "norotate"
   ("rotate" ("by" @attribute degrees: (_))?)
   "enhanced"
   "fb"
   ("tc" (colorspec))
   ("offset" (position))
   "align"
   position: ("at" @attribute (position))
   "nopoint"
   "point"
   "boxed"
   "nobox"
   "hypertext"
  ] @attribute)

(line_opts ["ls" "lt" "lw" "lc" "dt" "pt" "ps" "pi" "pn"] @field)

(system) @attribute

(macro) @function.macro
(datablock) @function.macro

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
  (#match? @variable.builtin "^((GPVAL|MOUSE)_\\w+|GNUTERM)$"))

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
