-- Loads queries/highlights.scm in Neovim and highlights a sample buffer,
-- failing on any error raised while evaluating the query's predicates.
--
-- Why this exists: `tree-sitter query` validates syntax with Rust regex, but
-- Neovim evaluates `#match?` through Vim's NFA engine, which has different
-- syntax and caps capturing groups at 9. A query that passes the CLI can still
-- abort at runtime with `E872: (NFA regexp) Too many '('`, leaving everything
-- after the failing predicate unhighlighted. Only a real Neovim run catches it.
--
-- It also runs a few pinned checks on small snippets (injected regions and
-- single captures), listed near the end of this file.
--
-- Usage: nvim --headless --clean -l test/highlight-check.lua <parser.so> [file]

local parser_path = _G.arg[1] or error("usage: highlight-check.lua <parser.so> [file]")
local sample = _G.arg[2] or "test/oracle/synthetic.plt"

-- uv_dlopen does not resolve relative paths against the cwd, so accept either
-- form and hand it an absolute one.
parser_path = vim.fn.fnamemodify(parser_path, ":p")

vim.treesitter.language.add("gnuplot", { path = parser_path })

local src = table.concat(vim.fn.readfile(sample), "\n")
local query_src = table.concat(vim.fn.readfile("queries/highlights.scm"), "\n")

local ok, query = pcall(vim.treesitter.query.parse, "gnuplot", query_src)
if not ok then
  io.stderr:write("highlights.scm failed to parse: " .. tostring(query) .. "\n")
  os.exit(1)
end

local tree = vim.treesitter.get_string_parser(src, "gnuplot"):parse()[1]

local count = 0
local ok_run, err = pcall(function()
  for _, node in query:iter_captures(tree:root(), src) do
    local _ = node
    count = count + 1
  end
end)

if not ok_run then
  io.stderr:write("highlighting raised an error: " .. tostring(err) .. "\n")
  os.exit(1)
end

-- A query that silently matches nothing would also "succeed"; require that the
-- sample produced a substantial number of captures so dead predicates surface.
if count < 100 then
  io.stderr:write(("only %d captures over %s — predicates may be silently dead\n")
    :format(count, sample))
  os.exit(1)
end

-- Targeted checks: small snippets whose captures or injections are pinned.
local function read_query(name)
  return vim.treesitter.query.parse("gnuplot", table.concat(vim.fn.readfile("queries/" .. name), "\n"))
end

local function root_of(text)
  return vim.treesitter.get_string_parser(text, "gnuplot"):parse()[1]:root()
end

-- iter_matches yields a node list per capture on Neovim 0.11+, a node before.
local function as_list(nodes)
  return type(nodes) == "table" and nodes or { nodes }
end

-- Every { lang, text } injection region of `text`, with #offset! applied.
local injections_query = read_query("injections.scm")
local function injections(text)
  local out = {}
  for _, match, metadata in injections_query:iter_matches(root_of(text), text, 0, -1) do
    for id, nodes in pairs(match) do
      if injections_query.captures[id] == "injection.content" then
        for _, node in ipairs(as_list(nodes)) do
          -- get_range applies #offset! on every Neovim version; the
          -- metadata layout it reads from has changed between releases
          local range = vim.treesitter.get_range(node, text, metadata[id])
          out[#out + 1] = {
            lang = metadata["injection.language"],
            text = text:sub(range[3] + 1, range[6]),
          }
        end
      end
    end
  end
  return out
end

local failures = {}
local function check(ok, msg)
  if not ok then
    failures[#failures + 1] = msg
  end
end

-- expected = injected text, or nil for "no injection at all"
local injection_cases = {
  -- `system` hands the string's value to the shell, without the quotes
  { 'system "printf hi"', "printf hi" },
  { 'x = system("printf hi")', "printf hi" },
  -- `!` hands the rest of the line to the shell as written, quotes included
  { '! "printf hi"', '"printf hi"' },
  { "! pwd", "pwd" },
  -- `system cmd` runs the command stored in the variable `cmd`
  { 'cmd = "printf hi"\nsystem cmd', nil },
}
for _, case in ipairs(injection_cases) do
  local src_text, expected = case[1], case[2]
  local got = {}
  for _, inj in ipairs(injections(src_text)) do
    if inj.lang == "bash" then
      got[#got + 1] = inj.text
    end
  end
  if expected == nil then
    check(#got == 0, ("%s: expected no bash injection, got %s"):format(src_text, vim.inspect(got)))
  else
    check(#got == 1 and got[1] == expected,
      ("%s: expected bash injection %q, got %s"):format(src_text, expected, vim.inspect(got)))
  end
end

-- { snippet, node text, capture that node must receive }
local highlights_query = query
local capture_cases = {
  { "stats $D using (strlen(columnheader(1))) nooutput", "columnheader", "function.builtin" },
}
for _, case in ipairs(capture_cases) do
  local src_text, needle, expected = case[1], case[2], case[3]
  local found = {}
  for id, node in highlights_query:iter_captures(root_of(src_text), src_text) do
    if vim.treesitter.get_node_text(node, src_text) == needle then
      found[highlights_query.captures[id]] = true
    end
  end
  check(found[expected], ("%s: expected %q on %q, got %s"):format(
    src_text, "@" .. expected, needle, vim.inspect(vim.tbl_keys(found))))
end

if #failures > 0 then
  io.stderr:write("query checks failed:\n  " .. table.concat(failures, "\n  ") .. "\n")
  os.exit(1)
end

print(("highlight check: %d captures over %s, no errors"):format(count, sample))
