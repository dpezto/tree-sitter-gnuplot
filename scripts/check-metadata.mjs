// Project-metadata consistency check.
//
// Two defects motivated this, both latent across multiple releases because
// nothing asserted them:
//
//   - package.json carried no `repository` field at all. npm builds its
//     provenance statement from the Actions context and then refuses the
//     upload when package.json disagrees, so 4.0.0 failed with
//     `E422 ... "repository.url" is "", expected to match ...`. The publish
//     had already succeeded at the transparency log by that point, so the
//     failure surfaced only at the very last step of a release.
//   - tree-sitter.json's metadata.version sat at 2.0.1 for three releases,
//     because it was not listed in .release-please-config.json's extra-files
//     and nothing compared it to anything.
//
// Both are the same class: metadata that drifts silently because only a
// release exercises it. This runs on every push instead.
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
// extra-files. A file dropped from that list goes stale silently, which is
// exactly what happened to tree-sitter.json.
const version = pkg.version;
const versions = [
  ["tree-sitter.json", ts.metadata?.version],
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

// ---------- report ----------
if (errors.length) {
  console.error(`project metadata is inconsistent (${errors.length}):\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log(`project metadata consistent: version ${version}, repository ${expected}`);
for (const [file] of versions) console.log(`  ${file}`);
