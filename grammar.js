/**
 * @file Amxxpawn grammar for tree-sitter
 * @author Amxray
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-nocheck

const DIGITS = /\d[\d_]*/;
const HEX_DIGITS = /[0-9a-fA-F_]+/;
const BINARY_DIGITS = /[01_]+/;
const EXPONENT = /e-?\d*/;

export default grammar({
  name: "amxxpawn",

  word: ($) => $.identifier,

  rules: {
    source_file: $ => repeat($._definition),

    _definition: $ => choice($._literal, $.identifier),

    // Literals
    _literal: ($) => choice(
      $.int_literal,
      $.float_literal,
      $.char_literal,
      $.string_literal,
      $.bool_literal,
      $.array_literal,
    ),

    int_literal: $ => token(choice(DIGITS, seq("0x", HEX_DIGITS), seq("0b", BINARY_DIGITS))),
    float_literal: $ => token(seq(DIGITS, ".", DIGITS, optional(EXPONENT))),
    bool_literal: $ => token(choice("true", "false")),
    char_literal: $ => seq(
      "'",
      choice(
        $.escape_sequence,
        alias(token.immediate(/[^\n']/), $.character)
      ),
      "'"
    ),
    string_literal: $ => seq(
      '"',
      alias(
        repeat(
          choice(
            token.immediate(prec(1, /[^"\\]|\\\r?\n/)),
            $.escape_sequence
          )),
        $.string_content),
      '"'
    ),
    array_literal: $ => seq(
      "{",
      commaSep($._literal),
      optional(","),
      "}"
    ),

    // Base
    identifier: $ => /[a-zA-Z_]\w*/,

    //Other
    escape_sequence: $ => token(
      prec(1, seq("\\", /(?:[abefnrt'\"\\%]|(?:x[a-zA-Z0-9]{0,2}|\d+);?)/))
    ),
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
