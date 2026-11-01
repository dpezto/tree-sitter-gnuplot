const assert = require("node:assert");
const { test } = require("node:test");

const Parser = require("tree-sitter");

test("can parse gnuplot", () => {
  const parser = new Parser();
  assert.doesNotThrow(() => parser.setLanguage(require(".")));
  const code = "a = \\\n1\nprint `printf 2`\n! pwd; printf hi\nplot for [i=1:2] sin(x) with lines\n";
  assert.equal(parser.parse(code).rootNode.hasError, false);
});
