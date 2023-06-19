; highlights.scm

; ((identifier) @constructor
;  (#match? @constructor "\w+"))

(comment) @comment 

[
  (single_quoted_string)
  (double_quoted_string)
]@string

((function (name) @function.builtin)
 (#match?
   @function.builtin
   "^(abs|acos|acosh|airy|arg|asin|asinh|atan|atan2|atanh|besj0|besj1|besjn|besy0|besy1|besyn|besi0|besi1|besin|cbrt|ceil|conj|cos|cosh|EllipticK|EllipticE|EllipticPi|erf|erfc|exp|expint|floor|gamma|ibeta|inverf|igamma|imag|int|invnorm|invibeta|invigamma|LambertW|lambertw|lgamma|lnGamma|log|log10|norm|rand|real|round|sgn|sin|sinh|sqrt|SynchrotronF|tan|tanh|uigamma|voigt|zeta|cerf|cdawson|faddeva|erfi|FresnelC|FresnelS|VP|VP_fwhm|Ai|Bi|BesselH1|BesselH2|BesselJ|BesselY|BesselI|BesselK|gprintf|sprintf|strlen|strstrt|substr|strptime|srtftime|system|trim|word|words|time|timecolumn|tm_hour|tm_mday|tm_min|tm_mon|tm_sec|tm_wday|tm_week|tm_yday|tm_year|weekday_iso|weekday_cdc|column|columnhead|exists|hsv2rgb|index|palette|rgbcolor|stringcolumn|valid|value|voxel)$"))

(function
  (name) @function)

[
 (integer)
 (float)
] @number

(datafile_modifiers
  _ @keyword)

(unary_expression
  _? @operator
  (_) @variable
  _? @operator)

(binary_expression
  (_) @variable
  _ @operator
  (_) @variable)

(ternary_expression ; FIX: last part not highlighted correctly
  (_) @variable
  _ @operator
  (_) @variable
  _ @operator
  (_) @variable)
