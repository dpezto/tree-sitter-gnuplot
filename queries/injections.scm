((comment_content) @injection.content
  (#set! injection.language "comment"))

; system "command" → bash
(cmd_system (string_literal) @injection.content
  (#set! injection.language "bash"))

; system("command") → bash
((function
    name: (identifier) @_name
    parameters: (parameter_list (string_literal) @injection.content))
  (#eq? @_name "system")
  (#set! injection.language "bash"))
