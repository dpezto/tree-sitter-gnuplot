package tree_sitter_gnuplot_test

import (
	"testing"

	tree_sitter_gnuplot "github.com/dpezto/tree-sitter-gnuplot/bindings/go"
	tree_sitter "github.com/tree-sitter/go-tree-sitter"
)

func TestCanParseGnuplot(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_gnuplot.Language())
	parser := tree_sitter.NewParser()
	defer parser.Close()
	if err := parser.SetLanguage(language); err != nil {
		t.Fatal(err)
	}
	code := "a = \\\n1\nprint `printf 2`\n! pwd; printf hi\nplot for [i=1:2] sin(x) with lines\n"
	tree := parser.Parse([]byte(code), nil)
	if tree == nil {
		t.Fatal("Error parsing gnuplot")
	}
	defer tree.Close()
	if tree.RootNode().HasError() {
		t.Fatal("Unexpected parse error")
	}
}
