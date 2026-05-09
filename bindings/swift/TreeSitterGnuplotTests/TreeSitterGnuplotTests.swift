import XCTest
import SwiftTreeSitter
import TreeSitterGnuplot

final class TreeSitterGnuplotTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_gnuplot())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Gnuplot grammar")
    }
}
