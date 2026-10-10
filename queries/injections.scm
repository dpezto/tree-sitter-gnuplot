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

; ! "command" → bash. `!` passes the rest of the line as written, quotes
; included.
(cmd_system
  "cmd" @_head
  (string_literal) @injection.content
  (#eq? @_head "!")
  (#set! injection.language "bash"))

; ! ls → bash (single word). `system cmd` is not injected: there the
; identifier is a variable holding the command.
(cmd_system
  "cmd" @_head
  (identifier) @injection.content
  (#eq? @_head "!")
  (#set! injection.language "bash"))

; system("command") → bash
((function
  name: (identifier) @_name
  parameters: (parameter_list
    (string_literal) @injection.content))
  (#eq? @_name "system")
  (#offset! @injection.content 0 1 0 -1)
  (#set! injection.language "bash"))
