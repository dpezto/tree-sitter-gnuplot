#include <stdlib.h>
#include <string.h>
#include <wctype.h>

#include "tree_sitter/parser.h"

#define MAX_WORD_LENGTH 100

enum TokenType {
  DATABLOCK_START,
  DATABLOCK_END,
  CMD_FIT_KW,    // f / fi / fit
  CMD_PLOT_KW,   // p / pl / plo / plot
  CMD_SPLOT_KW,  // sp / spl / splo / splot
  CMD_PAUSE_KW,  // pa / pau / paus / pause
  CMD_PRINT_KW,  // pr / pri / prin / print
  CMD_HELP_KW,   // he / hel / help
  CMD_LOAD_KW,   // l / lo / loa / load
  KW_PLT_ST,       // plain plot style names (lines, points, boxes, ...)
  KW_CMD_BARE,     // argument-less commands: break/clear/continue/pwd/replot/reread/refresh
  KW_CMD_OPTEXPR,  // commands with optional expression: raise/lower/vclear/toggle
  KW_CMD_EXIT,     // exit / quit
  KW_CMD_EXPR,     // commands with required expression: cd/evaluate
};

// Keyword table entry for prefix-abbreviation matching.
// A word matches when min_chars <= len(word) <= len(keyword) and word is a
// prefix of keyword, or when word equals alt exactly.
typedef struct {
  const char* keyword;
  const char* alt;
  int min_chars;
} KwEntry;

// Plain plot styles: leaf nodes in plot_element with no style-specific
// continuation. Styles with trailing options (labels, vectors, isosurface,
// candlesticks, ellipses, filledcurves, fillsteps, image, pm3d) stay as
// regex tokens in grammar.js. min_chars mirror the old reg() calls.
static const KwEntry PLT_STYLE_KWS[] = {
    {"linespoints", "lp", 6},  // before "lines": "linesp..." must not be cut at 5
    {"lines", NULL, 1},
    {"points", NULL, 1},
    {"financebars", NULL, 3},
    {"dots", NULL, 1},
    {"impulses", NULL, 1},
    {"surface", NULL, 3},
    {"steps", NULL, 2},
    {"fsteps", NULL, 6},
    {"histeps", NULL, 7},
    {"arrows", NULL, 3},
    {"sectors", NULL, 3},
    {"xerrorbars", NULL, 9},    // reg("errorbars", -1): "errorbar(s)?"
    {"yerrorbars", NULL, 9},
    {"xyerrorbars", NULL, 10},
    {"xerrorlines", NULL, 11},
    {"yerrorlines", NULL, 11},
    {"xyerrorlines", NULL, 12},
    {"parallelaxes", NULL, 12},
    {"boxerrorbars", NULL, 12},
    {"boxxyerror", NULL, 10},
    {"boxplot", NULL, 7},
    {"boxes", NULL, 5},
    {"circles", NULL, 7},
    {"zerrorfill", NULL, 6},
    {"contourfill", NULL, 11},
    {"spiderplot", NULL, 6},
    {"histograms", NULL, 4},
    {"rgbalpha", NULL, 8},
    {"rgbimage", NULL, 8},
    {"polygons", NULL, 8},
    {"table", NULL, 5},
    {"mask", NULL, 4},
    {NULL, NULL, 0},
};

static bool match_kw_table(const char* word, int wlen, const KwEntry* table) {
  for (int i = 0; table[i].keyword != NULL; i++) {
    const KwEntry* e = &table[i];
    int klen = (int)strlen(e->keyword);
    if (wlen >= e->min_chars && wlen <= klen && strncmp(word, e->keyword, (size_t)wlen) == 0)
      return true;
    if (e->alt && strcmp(word, e->alt) == 0)
      return true;
  }
  return false;
}

// Command keyword table: maps each prefix-abbreviated command word to its
// external token. Groups sharing a token have identical continuations in the
// grammar. Order is first-match (mirrors the old if-else chain).
typedef struct {
  const char* keyword;
  int min_chars;
  int symbol;
} CmdKwEntry;

static const CmdKwEntry CMD_KWS[] = {
    {"fit", 1, CMD_FIT_KW},
    {"plot", 1, CMD_PLOT_KW},
    {"splot", 2, CMD_SPLOT_KW},
    {"pause", 2, CMD_PAUSE_KW},
    {"print", 2, CMD_PRINT_KW},
    {"help", 2, CMD_HELP_KW},
    {"load", 1, CMD_LOAD_KW},
    // Argument-less commands collapsed into one token:
    {"break", 5, KW_CMD_BARE},
    {"clear", 2, KW_CMD_BARE},
    {"continue", 8, KW_CMD_BARE},
    {"pwd", 3, KW_CMD_BARE},
    {"replot", 3, KW_CMD_BARE},
    {"reread", 6, KW_CMD_BARE},
    {"refresh", 3, KW_CMD_BARE},
    // Commands followed by one optional expression:
    {"raise", 2, KW_CMD_OPTEXPR},
    {"lower", 3, KW_CMD_OPTEXPR},
    {"vclear", 6, KW_CMD_OPTEXPR},
    {"toggle", 6, KW_CMD_OPTEXPR},
    {"exit", 2, KW_CMD_EXIT},
    {"quit", 1, KW_CMD_EXIT},
    // Commands followed by one required expression:
    {"cd", 2, KW_CMD_EXPR},
    {"evaluate", 4, KW_CMD_EXPR},
    {NULL, 0, 0},
};

typedef struct {
  char word[MAX_WORD_LENGTH];
} Scanner;

static inline void consume(TSLexer* lexer) {
  lexer->advance(lexer, false);
}
static inline void skip(TSLexer* lexer) {
  lexer->advance(lexer, true);
}

// Mirror the grammar's extras regex /\s|\\|;/ — the internal lexer skips these
// characters inside one lex call, so the external scanner must skip them too;
// otherwise it fails at a ';' and never gets a second chance at the word that
// follows (the internal lexer consumes it as identifier in the same call).
static inline void skip_whitespaces(TSLexer* lexer) {
  while (iswspace(lexer->lookahead) || lexer->lookahead == ';' || lexer->lookahead == '\\') skip(lexer);
}

void* tree_sitter_gnuplot_external_scanner_create() {
  return calloc(1, sizeof(Scanner));
}
void tree_sitter_gnuplot_external_scanner_destroy(void* payload) {
  free(payload);
}

unsigned tree_sitter_gnuplot_external_scanner_serialize(void* payload, char* buffer) {
  Scanner* s = (Scanner*)payload;
  unsigned len = (unsigned)strlen(s->word);
  memcpy(buffer, s->word, len);
  return len;
}

void tree_sitter_gnuplot_external_scanner_deserialize(void* payload, const char* buffer, unsigned length) {
  Scanner* s = (Scanner*)payload;
  if (length > 0) memcpy(s->word, buffer, length);
  s->word[length] = '\0';
}

static bool scan_datablock_start(TSLexer* lexer, Scanner* s) {
  if (!iswalpha(lexer->lookahead))
    return false;
  memset(s->word, 0, sizeof(s->word));
  int i = 0;
  while (iswalpha(lexer->lookahead) && i < MAX_WORD_LENGTH - 1) {
    s->word[i++] = lexer->lookahead;
    consume(lexer);
  }
  s->word[i] = '\0';
  return true;
}

static bool scan_datablock_end(TSLexer* lexer, Scanner* s) {
  // Guard: if no datablock is open, empty word would match any non-alpha pos
  if (s->word[0] == '\0')
    return false;
  int i = 0;
  while (iswalpha(lexer->lookahead) && s->word[i] != '\0' && lexer->lookahead == s->word[i]) {
    consume(lexer);
    i++;
  }
  if (s->word[i] == '\0' && !iswalpha(lexer->lookahead)) {
    return true;
  }
  return false;
}

static bool is_word_char(int32_t c) {
  return iswalnum(c) || c == '_' || c > 127;
}

// Atomically read the word at the current position into buf (cap includes the
// terminating NUL). Returns its length, or -1 when empty or longer than fits:
// tree-sitter only resets the lexer position between full scanner invocations,
// so the word must be read once and matched against all candidates.
static int read_word(TSLexer* lexer, char* buf, int cap) {
  int len = 0;
  while (len < cap - 1 && is_word_char(lexer->lookahead)) {
    buf[len++] = (char)lexer->lookahead;
    consume(lexer);
  }
  buf[len] = '\0';
  if (len == 0 || is_word_char(lexer->lookahead))
    return -1;
  return len;
}

// After reading the keyword and calling mark_end, check whether the token is
// followed by assignment syntax (= or (args)= or [idx]=). If so, this is an
// identifier in an assignment, not a command keyword.
//
// NOTE: all advances here use consume() not skip(). Calling skip() after
// mark_end causes tree-sitter to reset the token start to the mark_end
// position (it interprets skip-after-mark_end as "searching for next token
// start"), producing a zero-length anonymous node. consume() does not trigger
// that behaviour. Characters consumed here are discarded when the lexer resets
// to mark_end on a successful scan.
static bool is_assignment_context(TSLexer* lexer) {
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t') consume(lexer);

  if (lexer->lookahead == '=') {
    consume(lexer);
    return lexer->lookahead != '=';  // '=' but not '=='
  }

  if (lexer->lookahead == '(') {
    int depth = 1;
    consume(lexer);
    while (lexer->lookahead != 0 && depth > 0) {
      int32_t c = lexer->lookahead;
      consume(lexer);
      if (c == '(')
        depth++;
      else if (c == ')')
        depth--;
    }
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t') consume(lexer);
    return lexer->lookahead == '=';
  }

  // Array element assignment p[idx] = expr vs range p [lo:hi] expr:
  // A range block contains ':', an array index does not.
  if (lexer->lookahead == '[') {
    consume(lexer);
    bool has_colon = false;
    int depth = 1;
    while (lexer->lookahead != 0 && depth > 0) {
      int32_t c = lexer->lookahead;
      consume(lexer);
      if (c == '[')
        depth++;
      else if (c == ']')
        depth--;
      else if (c == ':' && depth == 1)
        has_colon = true;
    }
    if (has_colon)
      return false;
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t') consume(lexer);
    return lexer->lookahead == '=';
  }

  return false;
}

// Read the full word at the current position, then determine if it is a valid
// abbreviation of any command keyword whose token is currently valid. Returns
// true (with lexer->result_symbol set) on match.
static bool scan_ambiguous_cmd(TSLexer* lexer, const bool* valid_symbols) {
  char word[12];
  int word_len = read_word(lexer, word, sizeof(word));
  if (word_len < 0)
    return false;

  lexer->mark_end(lexer);  // mark end of keyword token before lookahead

  int sym = -1;
  for (int i = 0; CMD_KWS[i].keyword != NULL; i++) {
    const CmdKwEntry* e = &CMD_KWS[i];
    if (valid_symbols[e->symbol] && word_len >= e->min_chars &&
        word_len <= (int)strlen(e->keyword) && strncmp(word, e->keyword, (size_t)word_len) == 0) {
      sym = e->symbol;
      break;
    }
  }

  if (sym == -1)
    return false;
  if (is_assignment_context(lexer))
    return false;

  lexer->result_symbol = sym;
  return true;
}

// Read the word at the current position and match it against the plain plot
// style table. Only valid after `with` (gated by valid_symbols), so no
// assignment-context check is needed.
static bool scan_plot_style(TSLexer* lexer) {
  char word[16];
  int word_len = read_word(lexer, word, sizeof(word));
  if (word_len < 0)
    return false;

  if (!match_kw_table(word, word_len, PLT_STYLE_KWS))
    return false;

  lexer->mark_end(lexer);
  lexer->result_symbol = KW_PLT_ST;
  return true;
}

bool tree_sitter_gnuplot_external_scanner_scan(void* payload, TSLexer* lexer, const bool* valid_symbols) {
  Scanner* s = (Scanner*)payload;
  skip_whitespaces(lexer);

  // Datablock end has highest priority: if we're inside an open datablock
  // (s->word non-empty), check for the closing identifier first.
  if (valid_symbols[DATABLOCK_END] && scan_datablock_end(lexer, s)) {
    lexer->result_symbol = DATABLOCK_END;
    return true;
  }

  // Command keywords take priority over DATABLOCK_START. During error
  // recovery the parser marks all external symbols as valid; without this
  // ordering, scan_datablock_start would consume command keywords like
  // "print" or "fit" as DATABLOCK_START before the cmd scanner gets a
  // chance to match them.
  bool any_cmd_valid = valid_symbols[CMD_FIT_KW] || valid_symbols[CMD_PLOT_KW] || valid_symbols[CMD_SPLOT_KW] ||
                       valid_symbols[CMD_PAUSE_KW] || valid_symbols[CMD_PRINT_KW] || valid_symbols[CMD_HELP_KW] ||
                       valid_symbols[CMD_LOAD_KW] || valid_symbols[KW_CMD_BARE] || valid_symbols[KW_CMD_OPTEXPR] ||
                       valid_symbols[KW_CMD_EXIT] || valid_symbols[KW_CMD_EXPR];

  if (any_cmd_valid && scan_ambiguous_cmd(lexer, valid_symbols)) {
    return true;  // result_symbol set inside scan_ambiguous_cmd
  }

  // Before DATABLOCK_START: during error recovery all externals are valid and
  // scan_datablock_start would swallow style words.
  if (valid_symbols[KW_PLT_ST] && !any_cmd_valid && scan_plot_style(lexer)) {
    return true;
  }

  if (valid_symbols[DATABLOCK_START] && scan_datablock_start(lexer, s)) {
    lexer->result_symbol = DATABLOCK_START;
    return true;
  }

  return false;
}
