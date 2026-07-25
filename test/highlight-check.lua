-- Loads queries/highlights.scm in Neovim and highlights a sample buffer,
-- failing on any error raised while evaluating the query's predicates.
--
-- Why this exists: `tree-sitter query` validates syntax with Rust regex, but
-- Neovim evaluates `#match?` through Vim's NFA engine, which has different
-- syntax and caps capturing groups at 9. A query that passes the CLI can still
-- abort at runtime with `E872: (NFA regexp) Too many '('`, leaving everything
-- after the failing predicate unhighlighted. Only a real Neovim run catches it.
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

print(("highlight check: %d captures over %s, no errors"):format(count, sample))
