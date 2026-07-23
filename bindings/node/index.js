const { readFileSync } = require("node:fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");

module.exports =
  typeof process.versions.bun === "string"
    // Support `bun build --compile` by being statically analyzable enough to find the .node file at build-time
    ? require(`../../prebuilds/${process.platform}-${process.arch}/tree-sitter-gnuplot.node`)
    : require("node-gyp-build")(root);

try {
  module.exports.nodeTypeInfo = require("../../src/node-types.json");
} catch (_) {}

const queries = [
  ["HIGHLIGHTS_QUERY", "queries/highlights.scm"],
  ["INJECTIONS_QUERY", "queries/injections.scm"],
  ["LOCALS_QUERY", "queries/locals.scm"],
  ["TAGS_QUERY", "queries/tags.scm"],
];

for (const [prop, rel] of queries) {
  Object.defineProperty(module.exports, prop, {
    configurable: true,
    enumerable: true,
    get() {
      delete module.exports[prop];
      try {
        module.exports[prop] = readFileSync(path.join(root, rel), "utf8");
      } catch (_) {}
      return module.exports[prop];
    },
  });
}
