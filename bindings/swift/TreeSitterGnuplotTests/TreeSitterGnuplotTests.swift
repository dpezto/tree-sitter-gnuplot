import XCTest
import SwiftTreeSitter
import TreeSitterGnuplot

final class TreeSitterGnuplotTests: XCTestCase {
    func testCanParseGnuplot() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_gnuplot())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Gnuplot grammar")
        let code = "a = \\\n1\nprint `printf 2`\n! pwd; printf hi\nplot for [i=1:2] sin(x) with lines\n"
        let tree = try XCTUnwrap(parser.parse(code))
        let root = try XCTUnwrap(tree.rootNode)
        XCTAssertFalse(root.hasError)
    }
}
