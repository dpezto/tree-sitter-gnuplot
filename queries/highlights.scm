; highlights.scm

; ((identifier) @constructor
;  (#match? @constructor "\w+"))

; builtin functions

(comment) @comment

[
  (single_quoted_string)
  (double_quoted_string)
]@string

; (builtin_func
;   "^(sin)$" @function.builtin)

(defined_func 
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

; [
;   "as"
;   "assert"
;   "async"
;   "await"
;   "break"
;   "class"
;   "continue"
;   "def"
;   "del"
;   "elif"
;   "else"
;   "except"
;   "exec"
;   "finally"
;   "for"
;   "from"
;   "global"
;   "if"
;   "import"
;   "lambda"
;   "nonlocal"
;   "pass"
;   "print"
;   "raise"
;   "return"
;   "try"
;   "while"
;   "with"
;   "yield"
;   "match"
;   "case"
; ] @keyword
