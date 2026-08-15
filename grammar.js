/**
 * @file Amxxpawn grammar for tree-sitter
 * @author Amxray
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-nocheck

const PREC = {
  COMMA: -2,
  ASSIGNMENT: -1,
  DEFAULT: 0,
  TERNARY: 1,
  LOGICAL_OR: 2,
  LOGICAL_AND: 3,
  INCLUSIVE_OR: 4,
  EXCLUSIVE_OR: 5,
  BITWISE_AND: 6,
  EQUAL: 7,
  RELATIONAL: 8,
  SHIFT: 9,
  ADD: 10,
  MULTIPLY: 11,
  UNARY: 12,
  META: 12,
  CAST: 13,
  CALL: 14,
  FIELD: 15,
  PRIMARY: 16,
};

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
      // $.global_variable_declaration,
      $._expression
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
      optional($._initializer),
    ),
    // #endregion

    // #region Expressions
    assignment_expression: $ => prec.right(
      PREC.ASSIGNMENT,
      seq(
        field("left", choice(
          $.identifier,
          $.index_expression,
        )),
        field("operator", choice(
          "=",
          "+=",
          "-=",
          "*=",
          "/=",
          "%=",
          "&=",
          "|=",
          "^=",
          "<<=",
          ">>=",
          ">>>="
        )),
        field("right", $._expression)
      )
    ),
    _meta_argument: $ => seq(
      field("argument", $._expression),
      repeat(field("dimension", seq("[", "]")))
    ),
    meta_expression: $ => prec(
      PREC.META,
      seq(
        field("operator", choice("sizeof", "tagof")),
        choice(
          seq("(", $._meta_argument, ")"),
          $._meta_argument
        )
      )
    ),
    update_expression: $ => choice(
      prec.right(
        PREC.UNARY,
        seq(
          field("operator", choice("++", "--")),
          field("argument", $._expression)
        )
      ),
      prec.left(
        PREC.CALL,
        seq(
          field("argument", $._expression),
          field("operator", choice("++", "--"))
        )
      )
    ),
    ternary_expression: $ => prec.right(
      PREC.TERNARY,
      seq(
        field("condition", $._expression),
        "?",
        field("consequence", $._expression),
        ":",
        field("alternative", $._expression)
      )
    ),
    binary_expression: $ => {
      const table = [
        [PREC.MULTIPLY, choice('*', '/', '%')],
        [PREC.ADD, choice('+', '-')],
        [PREC.SHIFT, choice('<<', '>>', '>>>')],
        [PREC.RELATIONAL, choice('<', '<=', '>', '>=')],
        [PREC.EQUAL, choice('==', '!=')],
        [PREC.BITWISE_AND, '&'],
        [PREC.EXCLUSIVE_OR, '^'],
        [PREC.INCLUSIVE_OR, '|'],
        [PREC.LOGICAL_AND, '&&'],
        [PREC.LOGICAL_OR, '||'],
      ];

      return choice(...table.map(([precedence, operator]) =>
        prec.left(precedence, seq(
          field('left', $._expression),
          field('operator', operator),
          field('right', $._expression),
        ))
      ));
    },
    unary_expression: $ => prec.right(
      PREC.UNARY,
      seq(
        field("operator", choice(
          "!", "~", "-", "+", "&"
        )),
        field("argument", $._expression)
      )
    ),
    comma_expression: $ => prec.left(
      PREC.COMMA,
      seq(
        field("left", $._expression),
        ",",
        field("right", $._expression),
      )
    ),
    parenthesized_expression: $ => prec(
      PREC.PRIMARY,
      seq(
        "(",
        field("expression", $._expression),
        ")"
      )
    ),
    index_expression: ($) => seq(
      field("array", choice($.identifier, $.index_expression)),
      "[",
      field("index", $._expression),
      "]"
    ),
    type_cast: ($) => prec.left(
      PREC.CAST,
      seq(
        $._type_definition,
        $._value
      ),
    ),
    named_argument: $ => seq(
      ".",
      field("name", $.identifier),
      $._initializer
    ),
    _arguments: $ => seq(
      "(",
      optional(commaSep1(choice(
        $.named_argument,
        $.omitted_argument,
        $._expression,
      ))),
      ")"
    ),
    call_expression: $ => prec(
      PREC.CALL,
      seq(
        field("function", $.identifier),
        field("arguments", $._arguments)
      )
    ),
    _expression: $ => choice(
      $.assignment_expression,
      $.call_expression,
      $.index_expression,
      $.ternary_expression,
      $.unary_expression,
      $.binary_expression,
      $.update_expression,
      $.meta_expression,
      $.type_cast,
      $._literal,
      $.parenthesized_expression,
      $.comma_expression,
      $.identifier
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
    _value: $ => field("value", $._expression),
    _initializer: $ => seq("=", $._value),
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
    omitted_argument: $ => "_",
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
