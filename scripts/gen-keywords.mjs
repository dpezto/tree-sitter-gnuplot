#!/usr/bin/env node
// Generates keywords.json: the gnuplot keyword dictionary for downstream
// tooling (LSP/completion). The parser collapses most keywords into opaque
// tier tokens ("arg", "flag", "cmd", ...), so a completion engine cannot
// recover the member keywords from the parse tables — this script mines them
// from the two authoritative sources instead:
//
//   1. src/scanner.c keyword tables (PLT_STYLE_KWS, STYLE_KWS, GOPT_KWS,
//      CMD_KWS) — the scanner-collapsed sets.
//   2. grammar.js `key("word", min, "tier"[, opt])` call sites whose alias is
//      a tier name — grammar-level tokens that are equally opaque in the
//      parse tables — plus the collapsed TERM_NAME terminal-name block.
//
// Deliberately skipped (they self-describe in the parse tables, so tooling
// reads them straight from the grammar): key() calls aliased to their own
// word, key1() axis families (xrange/xtics/... surface as rule names), and
// K.l/r/t/b/c positional regexes (their words are already GOPT_KWS rows).
//
// Entry shape: { "kw", "tier", "min", "alt"?, "no"? }
//   kw   canonical full keyword (completion label/insert text)
//   tier highlight/lookahead tier the token surfaces as
//   min  minimum abbreviation length (negative = scanner optional-suffix
//        convention, e.g. -1 on "pstex" = "pste(x)?"); informational only
//   alt  exact-match alternate form ("lp" for linespoints)
//   no   accepts a "no" prefix ((no)invert)

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scannerC = readFileSync(join(root, "src", "scanner.c"), "utf8");
const grammarJs = readFileSync(join(root, "grammar.js"), "utf8");

const entries = [];
const skipped = { selfNamed: 0, ruleAliased: 0, key1: 0, nonLiteral: 0 };

const add = (kw, tier, min, alt, no) => {
  entries.push({ kw, tier, min, ...(alt ? { alt } : {}), ...(no ? { no: true } : {}) });
};

// ---------- 1. scanner.c tables ----------

const SYMBOL_TIER = {
  CMD_FIT_KW: "cmd", CMD_PLOT_KW: "cmd", CMD_SPLOT_KW: "cmd",
  CMD_PAUSE_KW: "cmd", CMD_PRINT_KW: "cmd", CMD_HELP_KW: "cmd",
  CMD_LOAD_KW: "cmd", KW_CMD_BARE: "cmd", KW_CMD_OPTEXPR: "cmd",
  KW_CMD_EXIT: "cmd", KW_CMD_EXPR: "cmd",
  KW_SA: "sa", KW_LT: "lt", KW_LC: "lc", KW_DT: "dt", KW_PT: "pt",
  KW_PS: "ps", KW_FS: "fs", KW_FC: "fc", KW_TC: "tc",
  KW_G_ARG: "arg", KW_G_FLAG: "flag", KW_G_MOD: "mod", KW_G_COORD: "coord",
};

// Extract the body of `static const <T> NAME[] = { ... };`
function tableBody(name) {
  const m = scannerC.match(new RegExp(` ${name}\\[\\]\\s*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (!m) throw new Error(`table ${name} not found in scanner.c`);
  // strip // comments so words in comments never parse as rows
  return m[1].replace(/\/\/[^\n]*/g, "");
}

// Row regexes per table shape. NULL alt handled by the alternation.
const str = '"([^"]+)"';
const alt = '(?:"([^"]+)"|NULL)';

for (const m of tableBody("PLT_STYLE_KWS").matchAll(
  new RegExp(`\\{${str},\\s*${alt},\\s*(-?\\d+)\\}`, "g"),
)) add(m[1], "plt_st", Number(m[3]), m[2]);

for (const m of tableBody("STYLE_KWS").matchAll(
  new RegExp(`\\{${str},\\s*${alt},\\s*(-?\\d+),\\s*(\\w+)\\}`, "g"),
)) add(m[1], SYMBOL_TIER[m[4]], Number(m[3]), m[2]);

for (const m of tableBody("GOPT_KWS").matchAll(
  new RegExp(`\\{${str},\\s*(-?\\d+),\\s*(\\w+),\\s*([01])\\}`, "g"),
)) add(m[1], SYMBOL_TIER[m[3]], Number(m[2]), null, m[4] === "1");

for (const m of tableBody("CMD_KWS").matchAll(
  new RegExp(`\\{${str},\\s*(-?\\d+),\\s*(\\w+)\\}`, "g"),
)) add(m[1], SYMBOL_TIER[m[3]], Number(m[2]));

for (const e of entries) if (!e.tier) throw new Error(`unmapped scanner symbol for ${e.kw}`);

// ---------- 2. grammar.js ----------

// Tier aliases used by key() call sites. An aka outside this set is the
// keyword's own (or bespoke) name — self-describing in the parse tables.
const TIERS = new Set(["cmd", "opt", "arg", "flag", "mod", "coord", "attr", "plt_st", "st_opt"]);

for (const m of grammarJs.matchAll(
  /key\(\s*"([^"]+)"\s*(?:,\s*(-?\d+|undefined))?(?:,\s*(?:"([^"]+)"|(undefined)|\$\.(\w+)))?(?:,\s*([^()]*?))?\s*\)/g,
)) {
  const [, word, minRaw, aka, , ruleAka, optRaw] = m;
  if (ruleAka) { skipped.ruleAliased++; continue; }
  if (!aka || !TIERS.has(aka)) { skipped.selfNamed++; continue; }
  const min = !minRaw || minRaw === "undefined" ? word.length : Number(minRaw);
  const no = optRaw?.trim() === "1";
  add(word, aka, min, null, no);
}

// bare-literal tier aliases: alias("stats", "cmd"), alias("locale", "arg") —
// full words with no abbreviation regex, equally opaque in the parse tables
for (const m of grammarJs.matchAll(/alias\(\s*"([a-z][a-z0-9_]*)"\s*,\s*"(\w+)"\s*\)/g)) {
  if (TIERS.has(m[2])) add(m[1], m[2], m[1].length);
}

// External tokens aliased to a TIER are just as opaque as a bare literal, but
// the scanner holds their text, so grammar.js has nothing to mine — the word
// is mapped here. (An external aliased to a non-tier name, e.g.
// alias($.unit_pi, "pi"), self-describes in the parse tables and needs no row.)
const EXTERNAL_WORD = { kw_filter_if: "if" };
for (const m of grammarJs.matchAll(/alias\(\s*\$\.(\w+)\s*,\s*"(\w+)"\s*\)/g)) {
  const word = EXTERNAL_WORD[m[1]];
  if (word && TIERS.has(m[2])) add(word, m[2], word.length);
}

skipped.key1 = [...grammarJs.matchAll(/key1\(/g)].length;

// TERM_NAME block: terminal names collapsed into one token aliased "name".
const termBlock = grammarJs.match(/const TERM_NAME = token\(\s*choice\(([\s\S]*?)\),\s*\);/);
if (!termBlock) throw new Error("TERM_NAME block not found in grammar.js");
for (const m of termBlock[1].matchAll(
  // reg("word"[, min]) | bare "word" | anything else (regex literals) skipped
  /reg\(\s*"([^"]+)"\s*(?:,\s*(-?\d+))?\s*\)|"([^"]+)"|\/[^/]+\//g,
)) {
  if (m[1]) add(m[1], "name", m[2] ? Number(m[2]) : m[1].length);
  else if (m[3]) add(m[3], "name", m[3].length);
  else skipped.nonLiteral++; // e.g. /tek4(0|1|2)\d\d/
}

// ---------- option-name heads from grammar.json ----------
//
// Completion needs the set/show option NAMES. Named option rules surface in
// the parse tables, but two classes don't: token-only heads (`encoding`,
// `locale` — the body rule follows the token) and abbreviation-regex
// families whose rule is named after one member (`yrange` parses as rule
// xrange; `lmargin` hides inside rule margin's pattern). Walk
// _argument_set_show's branches down to each leftmost token and expand its
// pattern into the family's canonical words, marking dictionary rows
// `head: true`.

// Expand the reg()/key1()-generated regex subset: literals, (a|b) groups,
// top-level alternation, `?` on a group or trailing char. Returns all words.
function expandPattern(src) {
  const joinAtoms = (atoms) =>
    atoms.reduce((acc, opts) => acc.flatMap((p) => opts.map((o) => p + o)), [""]);
  function parse(s) {
    const alts = [[]];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === "|") {
        alts.push([]);
        i++;
      } else if (c === "(") {
        let depth = 1, j = i + 1;
        while (j < s.length && depth > 0) {
          if (s[j] === "(") depth++;
          if (s[j] === ")") depth--;
          j++;
        }
        let inner = s.slice(i + 1, j - 1);
        if (inner.startsWith("?:")) inner = inner.slice(2);
        const innerAlts = parse(inner);
        if (!innerAlts) return null;
        let opts = innerAlts.flatMap(joinAtoms);
        i = j;
        if (s[i] === "?") {
          opts = [...opts, ""];
          i++;
        }
        alts[alts.length - 1].push(opts);
      } else if (/[a-zA-Z0-9_$]/.test(c)) {
        let j = i;
        while (j < s.length && /[a-zA-Z0-9_$]/.test(s[j])) j++;
        const lit = s.slice(i, j);
        i = j;
        if (s[i] === "?") {
          // trailing `?` applies to the last char only
          alts[alts.length - 1].push([lit, lit.slice(0, -1)]);
          i++;
        } else {
          alts[alts.length - 1].push([lit]);
        }
      } else {
        return null; // unsupported metachar (classes, escapes): skip pattern
      }
    }
    return alts;
  }
  const parsed = parse(src);
  return parsed ? parsed.flatMap(joinAtoms) : [];
}

const grammarJson = JSON.parse(readFileSync(join(root, "src", "grammar.json"), "utf8"));

function leftmostTokens(node, depth, seen) {
  if (!node) return [];
  switch (node.type) {
    case "STRING":
      return [node.value];
    case "PATTERN":
      return [node];
    case "SEQ":
      return leftmostTokens(node.members[0], depth, seen);
    case "CHOICE":
      return node.members.flatMap((m) => leftmostTokens(m, depth, seen));
    case "ALIAS":
    case "FIELD":
    case "PREC":
    case "PREC_LEFT":
    case "PREC_RIGHT":
    case "PREC_DYNAMIC":
    case "TOKEN":
    case "IMMEDIATE_TOKEN":
    case "REPEAT":
    case "REPEAT1":
      return leftmostTokens(node.content, depth, seen);
    case "SYMBOL": {
      const rule = grammarJson.rules[node.name];
      if (!rule || seen.has(node.name) || depth > 2) return [];
      seen.add(node.name);
      return leftmostTokens(rule, depth + 1, seen);
    }
    default:
      return [];
  }
}

const headWords = new Map(); // canonical word -> min abbrev length
{
  const tokens = leftmostTokens(grammarJson.rules._argument_set_show, 0, new Set());
  for (const t of tokens) {
    const words = typeof t === "string" ? [t] : expandPattern(t.value);
    // keep maximal words (not a prefix of a longer sibling); min = shortest
    // expansion that prefixes the maximal word
    for (const w of words) {
      if (!/^[a-z][a-z0-9]*$/.test(w)) continue;
      if (words.some((o) => o !== w && o.startsWith(w))) continue; // abbreviation
      const min = Math.min(
        ...words.filter((p) => w.startsWith(p)).map((p) => p.length),
      );
      headWords.set(w, Math.min(headWords.get(w) ?? Infinity, min));
    }
  }
  assert(headWords.size > 40, `only ${headWords.size} option heads mined`);
}

// canonical corrections: the grammar's abbreviation regex makes the maximal
// expansion `lmargins` etc., but gnuplot's canonical spelling is singular
// (only the collective `set margins` is plural)
for (const [plural, singular] of [
  ["lmargins", "lmargin"], ["rmargins", "rmargin"],
  ["tmargins", "tmargin"], ["bmargins", "bmargin"],
]) {
  if (headWords.has(plural)) {
    headWords.set(singular, headWords.get(plural));
    headWords.delete(plural);
  }
}

for (const [w, min] of headWords) {
  // heads carry the "opt" tier (set/show statement, option-selector family)
  const existing = entries.find((e) => e.kw === w && e.tier === "opt");
  if (existing) {
    existing.head = true;
    if (min < existing.min) existing.min = min;
  } else {
    entries.push({ kw: w, tier: "opt", min, head: true });
  }
}

// every opt-tier entry is an option head by definition (show-only heads live
// outside _argument_set_show and miss the walk above)
for (const e of entries) if (e.tier === 'opt') e.head = true;

// ---------- parent map from the pre-redesign grammar ----------
//
// The generic-body redesign (2026-07-01) collapsed ~60 per-option bodies into
// shared rules, erasing which sub-keywords belong to which option. The last
// revision BEFORE the first conversion commit still lists every option's
// keywords inside its own rule — mine it for a word → option-rules map so
// downstream tooling can narrow completion per enclosing option. Requires
// full git history (CI: fetch-depth 0).
const PRE_REDESIGN_REV = "14c6af1";

const parents = new Map(); // word -> Set(rule names)
try {
  const old = execFileSync("git", ["show", `${PRE_REDESIGN_REV}:grammar.js`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1 << 24,
  });
  const rulesStart = old.indexOf("rules: {");
  // top-level rule headers are tab-indented `name: ($) =>`
  const ruleRe = /\n\t\t([a-zA-Z_]\w*):\s*\(\$\)\s*=>/g;
  const bounds = [];
  let m;
  while ((m = ruleRe.exec(old.slice(rulesStart)))) {
    bounds.push({ name: m[1], start: rulesStart + m.index });
  }
  for (let i = 0; i < bounds.length; i++) {
    const body = old.slice(bounds[i].start, bounds[i + 1]?.start ?? old.length);
    for (const w of body.matchAll(/(?:key|reg)\(\s*"([^"]+)"/g)) {
      if (!parents.has(w[1])) parents.set(w[1], new Set());
      parents.get(w[1]).add(bounds[i].name);
    }
  }
  assert(bounds.length > 100, `only ${bounds.length} old rules`);
} catch (e) {
  // shallow clone or missing rev: emit without parents rather than fail
  console.warn(`parent mining skipped: ${e.message.split("\n")[0]}`);
}

for (const e of entries) {
  const p = parents.get(e.kw);
  // a word appearing in very many rules is effectively global — no narrowing
  if (p && p.size > 0 && p.size <= 12) e.parents = [...p].sort();
}

// ---------- dedup, sort, emit ----------

const byKey = new Map();
for (const e of entries) {
  const k = `${e.tier} ${e.kw}`;
  const prev = byKey.get(k);
  // keep the row with the laxer abbreviation if duplicated across sources;
  // parents/head survive from whichever source carried them
  if (!prev || e.min < prev.min)
    byKey.set(k, {
      ...prev,
      ...e,
      ...(e.parents || prev?.parents ? { parents: e.parents ?? prev.parents } : {}),
      ...(e.head || prev?.head ? { head: true } : {}),
    });
}
const keywords = [...byKey.values()].sort(
  (a, b) => a.tier.localeCompare(b.tier) || a.kw.localeCompare(b.kw),
);

const out = {
  $comment:
    "Generated by scripts/gen-keywords.mjs from src/scanner.c and grammar.js — do not edit. " +
    "Gnuplot keyword dictionary for downstream tooling; entries cover only tokens that are " +
    "opaque tier symbols in the parse tables.",
  keywords,
};
writeFileSync(join(root, "keywords.json"), JSON.stringify(out, null, "\t") + "\n");

// ---------- self-check ----------

const tier = (t) => keywords.filter((e) => e.tier === t);
const has = (t, kw) => tier(t).some((e) => e.kw === kw);

assert(has("plt_st", "lines") && has("plt_st", "linespoints"), "plot styles missing");
assert(tier("plt_st").find((e) => e.kw === "linespoints").alt === "lp", "alt lost");
assert(has("cmd", "plot") && has("cmd", "replot"), "scanner commands missing");
assert(has("cmd", "set") && has("cmd", "show"), "grammar-level commands missing");
assert(has("arg", "levels"), "GOPT args missing");
assert(has("name", "pngcairo") && has("name", "png"), "terminal names missing");
assert(has("sa", "linewidth") && has("tc", "textcolor"), "style attrs missing");
assert(keywords.length >= 250, `only ${keywords.length} keywords — a table went missing`);
{
    const levels = tier("arg").find((e) => e.kw === "levels");
    assert(
        !parents.size || levels?.parents?.includes("cntrparam"),
        "parent mining broke: levels should belong to cntrparam",
    );
}

const counts = {};
for (const e of keywords) counts[e.tier] = (counts[e.tier] ?? 0) + 1;
console.log(`keywords.json: ${keywords.length} entries`, counts);
console.log("skipped (self-describing in parse tables):", skipped);
