#include "tree_sitter/parser.h"
#include <stdio.h>
#include <string.h>
#include <wctype.h>

#define MAX_WORD_LENGTH 100

enum TokenType {
  DATABLOCK_START,
  DATABLOCK_END,
};

static inline void consume(TSLexer *lexer) { lexer->advance(lexer, false); }
static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

void *tree_sitter_gnuplot_external_scanner_create() { return NULL; }
void tree_sitter_gnuplot_external_scanner_destroy(void *payload) {}

char ending_word[MAX_WORD_LENGTH] = {0};

static inline void skip_whitespaces(TSLexer *lexer) {
  while (iswspace(lexer->lookahead)) {
    skip(lexer);
  }
}

static bool scan_datablock_start(TSLexer *lexer) {
  // Reset the ending_word buffer
  memset(ending_word, 0, sizeof(ending_word));
  if (iswalpha(lexer->lookahead)) {
    // Capture entire word
    int i = 0;
    while (iswalpha(lexer->lookahead) && i < MAX_WORD_LENGTH - 1) {
      ending_word[i++] = lexer->lookahead;
      consume(lexer);
    }
    ending_word[i] = '\0'; // Null terminate the string
    return true;
  }
  return false;
}

static bool scan_datablock_end(TSLexer *lexer) {
  int i = 0;
  while (iswalpha(lexer->lookahead) && ending_word[i] != '\0' &&
         lexer->lookahead == ending_word[i]) {
    consume(lexer);
    i++;
  }
  if (ending_word[i] == '\0') {
    return true;
  }
  return false;
}

unsigned tree_sitter_gnuplot_external_scanner_serialize(void *payload,
                                                        char *buffer) {
  memcpy(buffer, ending_word, strlen(ending_word));
  return strlen(ending_word);
}

void tree_sitter_gnuplot_external_scanner_deserialize(void *payload,
                                                      const char *buffer,
                                                      unsigned length) {
  if (length > 0) {
    memcpy(ending_word, buffer, length);
  }
}

bool tree_sitter_gnuplot_external_scanner_scan(void *payload, TSLexer *lexer,
                                               const bool *valid_symbols) {
  skip_whitespaces(lexer);

  if (valid_symbols[DATABLOCK_END] && scan_datablock_end(lexer)) {
    lexer->result_symbol = DATABLOCK_END;
    return true;
  }
  if (valid_symbols[DATABLOCK_START] && scan_datablock_start(lexer)) {
    lexer->result_symbol = DATABLOCK_START;
    return true;
  }
  return false;
}
