from unittest import TestCase

import tree_sitter
import tree_sitter_gnuplot


class TestLanguage(TestCase):
    def test_can_parse_gnuplot(self):
        language = tree_sitter.Language(tree_sitter_gnuplot.language())
        parser = tree_sitter.Parser(language)
        code = b"a = \\\n1\nprint `printf 2`\n! pwd; printf hi\nplot for [i=1:2] sin(x) with lines\n"
        tree = parser.parse(code)
        self.assertFalse(tree.root_node.has_error)
