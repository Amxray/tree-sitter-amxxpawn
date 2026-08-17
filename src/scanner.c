#include <tree_sitter/parser.h>
#include <wctype.h>

enum TokenType {
  PREPROC_ARG
};

void *tree_sitter_amxxpawn_external_scanner_create() { return NULL; }
void tree_sitter_amxxpawn_external_scanner_destroy(void *p) {}
unsigned tree_sitter_amxxpawn_external_scanner_serialize(void *p, char *buffer) { return 0; }
void tree_sitter_amxxpawn_external_scanner_deserialize(void *p, const char *b, unsigned n) {}

static void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static bool preproc_arg(TSLexer *lexer)
{
  lexer->result_symbol = PREPROC_ARG;

  if (lexer->lookahead == '(')
  {
    // Macro declaration.
    return false;
  }

  int in_string = 0;
  bool is_escaped = false;
  bool ends_with_multiline_comment = false;
  for (;;)
  {
    if (lexer->lookahead == '/')
    {
      // Check if we are in a comment.
      // Halt the preproc_arg token matching in case it's a comment.
      lexer->mark_end(lexer);
      advance(lexer);
      if (lexer->lookahead == '/')
      {
        // Single line comment, return true here, line continuation
        // would be invalid anyways.
        return true;
      }

      if (lexer->lookahead == '*')
      {
        // Multiline comment, look for the end.
        advance(lexer);
        bool end = false;
        while (!end)
        {
          if (lexer->lookahead == '\n' && !is_escaped)
          {
            // EOL reached without any line continuation.
            // Return true as we are no longer in a preproc_arg.
            return true;
          }
          if (lexer->lookahead != '\r')
          {
            // Reached a potential line continuation, and avoid
            // it being cancelled by a carriage return.
            is_escaped = lexer->lookahead == '\\';
          }
          if (lexer->lookahead != '*')
          {
            // Can't be the end of the multiline comment, skip.
            advance(lexer);
            continue;
          }
          // Check for the end of the multiline comment or EOF.
          advance(lexer);
          end = lexer->lookahead == '/' || lexer->lookahead == 0;
        }
        // For now, assume the preproc_arg token has ended.
        ends_with_multiline_comment = true;
        advance(lexer);
      }
    }

    if (!(iswspace(lexer->lookahead) || lexer->lookahead == 0) && ends_with_multiline_comment)
    {
      // Found a token that is not a WS/EOF, after a multiline comment,
      // the preproc_arg is therefore not finished.
      ends_with_multiline_comment = false;
    }

    if ((lexer->lookahead == '\n' && !is_escaped) || lexer->lookahead == 0)
    {
      if (!ends_with_multiline_comment)
      {
        // Does not end with a multiline comment, move the end of the
        // preproc_arg here.
        lexer->mark_end(lexer);
      }
      advance(lexer);
      return true;
    }

    if (lexer->lookahead != '\r')
    {
      // Reached a potential line continuation, and avoid
      // it being cancelled by a carriage return.
      is_escaped = lexer->lookahead == '\\';
    }

    advance(lexer);
  }
}


bool tree_sitter_amxxpawn_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[PREPROC_ARG])
  {
    return preproc_arg(lexer);
  }

  return false;
}
