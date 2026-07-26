// Project-metadata consistency check.
//
// One defect motivated this, latent across several releases because nothing
// asserted it: package.json carried no `repository` field at all. npm builds
// its provenance statement from the Actions context and then refuses the
// upload when package.json disagrees, so the 4.0.0 publish failed with
// `E422 ... "repository.url" is "", expected to match ...`. The provenance had
// already been accepted by the transparency log by that point, so the failure
// surfaced at the very last step of a release and nowhere earlier.
//
// tree-sitter.json's metadata.version was corrected at the same time but is
// deliberately NOT asserted. It had sat at 2.0.1 for three releases, and that
// is staleness rather than a defect: nothing consumed it and nothing broke.
// The extra-files guard at the bottom explains why it is left alone.
//
// Deliberately NOT checked: whether the versions match the newest git tag.
// release-please bumps these files in the release PR, so between that merge
// and the tag they are legitimately ahead.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");
const json = (f) => JSON.parse(read(f));

const REPO = "dpezto/tree-sitter-gnuplot";
const errors = [];
const fail = (f, msg) => errors.push(`${f}: ${msg}`);

const pkg = json("package.json");

// ---------- repository / bugs / homepage ----------
//
// npm normalises `git+https://…​.git` to the bare https URL before comparing
// against provenance, so accept either spelling and compare normalised.
const normalise = (u) =>
  String(u ?? "")
    .replace(/^git\+/, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");

const expected = `https://github.com/${REPO}`;
const repoUrl = normalise(pkg.repository?.url);
if (!repoUrl) {
  fail("package.json", "repository.url is missing or empty — npm rejects the publish with E422");
} else if (repoUrl !== expected) {
  fail("package.json", `repository.url normalises to ${repoUrl}, expected ${expected}`);
}
for (const [field, value] of [
  ["bugs.url", pkg.bugs?.url],
  ["homepage", pkg.homepage],
]) {
  if (!value) fail("package.json", `${field} is missing — npm surfaces it on the package page`);
  else if (!String(value).startsWith(expected)) {
    fail("package.json", `${field} is ${value}, expected it under ${expected}`);
  }
}

// ---------- tree-sitter.json agrees with package.json ----------
const ts = json("tree-sitter.json");
if (normalise(ts.metadata?.links?.repository) !== expected) {
  fail("tree-sitter.json", `metadata.links.repository is ${ts.metadata?.links?.repository}, expected ${expected}`);
}

// ---------- every version-bearing file agrees ----------
//
// release-please keeps these in step only for the files listed in its
// extra-files, so a file dropped from that list goes stale silently. Every
// file below IS listed there; tree-sitter.json is deliberately not, and is
// therefore deliberately absent from this list.
const version = pkg.version;
const versions = [
  ["Cargo.toml", read("Cargo.toml").match(/^version\s*=\s*"([^"]+)"/m)?.[1]],
  ["pyproject.toml", read("pyproject.toml").match(/^version\s*=\s*"([^"]+)"/m)?.[1]],
  ["CITATION.cff", read("CITATION.cff").match(/^version:\s*(\S+)/m)?.[1]],
  ["Makefile", read("Makefile").match(/^VERSION\s*:?=\s*([0-9][^\s#]*)/m)?.[1]],
  ["CMakeLists.txt", read("CMakeLists.txt").match(/VERSION\s+"([0-9][^"]*)"/)?.[1]],
];
for (const [file, found] of versions) {
  if (!found) fail(file, "no version found — the pattern in this check may need updating");
  else if (found !== version) fail(file, `version is ${found}, package.json says ${version}`);
}

// ---------- tree-sitter.json must stay OUT of release-please's extra-files ----------
//
// This looks like an omission and is not. tree-sitter.json's metadata.version
// is compiled into src/parser.c as the language's metadata struct, and
// release-please cannot regenerate parser.c. Adding it to extra-files makes
// every release PR bump the JSON, leave parser.c behind, and fail the
// generate-diff check in tree-sitter/parser-test-action on all three runners —
// which is unmergeable under branch protection.
//
// A stale metadata.version breaks nothing: no consumer reads it. The npm
// repository.url above is the opposite case, and is asserted. Do not treat the
// two as the same class.
//
// If the version genuinely needs to move, bump tree-sitter.json and commit a
// regenerated parser.c together, by hand, outside a release PR.
{
  const rp = json(".release-please-config.json");
  const extra = rp.packages?.["."]?.["extra-files"] ?? [];
  const listed = extra.some((e) => (typeof e === "string" ? e : e.path) === "tree-sitter.json");
  if (listed) {
    fail(
      ".release-please-config.json",
      "tree-sitter.json is in extra-files. Its metadata.version is compiled into " +
        "src/parser.c, which release-please cannot regenerate, so every release PR " +
        "would fail the generate-diff check. Remove it; see the note in this script.",
    );
  }
}

// ---------- report ----------
if (errors.length) {
  console.error(`project metadata is inconsistent (${errors.length}):\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`project metadata consistent: version ${version}, repository ${expected}`);
for (const [file] of versions) console.log(`  ${file}`);
