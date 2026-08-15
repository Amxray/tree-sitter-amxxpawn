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
    // #region Main
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.global_variable_declaration,
    ),
    // #endregion

    // #region Vars
    global_variable_declaration: $ => seq(
      alias($.global_variable_modifiers, $.modifiers),
      commaSep1($.variable),
      optional($._semicolon)
    ),

    variable_declaration: $ => seq(
      alias($.variable_modifiers, $.modifiers),
      commaSep1($.variable),
      optional($._semicolon),
    ),

    variable: $ => seq(
      optional($._type_definition),
      field("name", $.identifier),
      repeat($.dimension),
      optional($._value),
    ),
    // #endregion

    // #region Expressions
    _expression: $ => choice( //Todo
      $.identifier,
      $._literal
    ),
    // #endregion

    // #region Literals
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
    // #endregion

    // #region Base
    _value: $ => seq("=", field("value", $._expression)),
    dimension: $ => seq("[", optional(field("size", $._expression)), "]"),
    _type_definition: $ => seq(field("type", $._type), ":"),
    _type: $ => choice($.builtin_type, $.identifier, $.any_type),
    builtin_type: $ => choice("Float", "bool", "_"),
    any_type: $ => "any",
    identifier: $ => /[a-zA-Z_]\w*/,
    // #endregion

    // #region Other
    global_variable_modifiers: $ => repeat1(choice("new", "static", "public", "stock", "const")),
    variable_modifiers: $ => repeat1(choice("new", "static", "const")),
    escape_sequence: $ => token(prec(1, seq("\\", /(?:[abefnrt'\"\\%]|(?:x[a-zA-Z0-9]{0,2}|\d+);?)/))),
    _semicolon: $ => ";",
    // #endregion
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
