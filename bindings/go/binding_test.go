package tree_sitter_gnuplot_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_gnuplot "github.com/tree-sitter/tree-sitter-gnuplot/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_gnuplot.Language())
	if language == nil {
		t.Errorf("Error loading Gnuplot grammar")
	}
}
