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

static inline void skip_whitespaces(TSLexer* lexer) {
  while (iswspace(lexer->lookahead)) skip(lexer);
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

// Atomically read the full word at the current position, then determine if it
// is a valid abbreviation of any command keyword. Returns true (with
// lexer->result_symbol set) on match. Returns false otherwise.
//
// KEY DESIGN: reads the word as a SINGLE operation to avoid the problem where
// multiple sequential `consume` calls within one scanner invocation corrupt the
// position for subsequent keyword attempts. Tree-sitter only resets the lexer
// position between full scanner invocations, not within one.
static bool scan_ambiguous_cmd(TSLexer* lexer, const bool* valid_symbols) {
  char word[12] = {0};
  int word_len = 0;

  while (word_len < 11 && is_word_char(lexer->lookahead)) {
    word[word_len++] = (char)lexer->lookahead;
    consume(lexer);
  }
  word[word_len] = '\0';

  if (word_len == 0)
    return false;
  if (is_word_char(lexer->lookahead))
    return false;  // word longer than 11 chars

  lexer->mark_end(lexer);  // mark end of keyword token before lookahead

// Match: word is a valid prefix of KEYWORD (at least MIN chars)
#define MATCH(TOKEN, KEYWORD, MIN)                                                      \
  (valid_symbols[TOKEN] && word_len >= (MIN) && word_len <= (int)sizeof(KEYWORD) - 1 && \
   strncmp(word, KEYWORD, word_len) == 0)

  int sym = -1;
  if (MATCH(CMD_FIT_KW, "fit", 1))
    sym = CMD_FIT_KW;
  else if (MATCH(CMD_PLOT_KW, "plot", 1))
    sym = CMD_PLOT_KW;
  else if (MATCH(CMD_SPLOT_KW, "splot", 2))
    sym = CMD_SPLOT_KW;
  else if (MATCH(CMD_PAUSE_KW, "pause", 2))
    sym = CMD_PAUSE_KW;
  else if (MATCH(CMD_PRINT_KW, "print", 2))
    sym = CMD_PRINT_KW;
  else if (MATCH(CMD_HELP_KW, "help", 2))
    sym = CMD_HELP_KW;
  else if (MATCH(CMD_LOAD_KW, "load", 1))
    sym = CMD_LOAD_KW;
#undef MATCH

  if (sym == -1)
    return false;
  if (is_assignment_context(lexer))
    return false;

  lexer->result_symbol = sym;
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
                       valid_symbols[CMD_LOAD_KW];

  if (any_cmd_valid && scan_ambiguous_cmd(lexer, valid_symbols)) {
    return true;  // result_symbol set inside scan_ambiguous_cmd
  }

  if (valid_symbols[DATABLOCK_START] && scan_datablock_start(lexer, s)) {
    lexer->result_symbol = DATABLOCK_START;
    return true;
  }

  return false;
}
