((comment_content) @injection.content
  (#set! injection.language "comment"))

; system "command" → bash. gnuplot passes the string's value, so the
; quotes are not part of the shell text.
(cmd_system
  "cmd" @_head
  (string_literal) @injection.content
  (#eq? @_head "system")
  (#offset! @injection.content 0 1 0 -1)
  (#set! injection.language "bash"))

; `!` passes the rest of the logical line verbatim, including quotes.
((shell_command) @injection.content
  (#set! injection.language "bash"))

((command_substitution) @injection.content
  (#not-eq? @injection.content "`")
  (#match? @injection.content "`$")
  (#offset! @injection.content 0 1 0 -1)
  (#set! injection.language "bash"))

; An unterminated backquote ends at the line boundary, without a closing byte.
((command_substitution) @injection.content
  (#not-match? @injection.content "`$")
  (#offset! @injection.content 0 1 0 0)
  (#set! injection.language "bash"))

; system("command") → bash
((function
  name: (identifier) @_name
  parameters: (parameter_list
    (string_literal) @injection.content))
  (#eq? @_name "system")
  (#offset! @injection.content 0 1 0 -1)
  (#set! injection.language "bash"))
