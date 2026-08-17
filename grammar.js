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
  IF: 0,
  ELSE: 1,
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
  PRIMARY: 15,
};

const DIGITS = /\d[\d_]*/;
const HEX_DIGITS = /[0-9a-fA-F_]+/;
const BINARY_DIGITS = /[01_]+/;
const EXPONENT = /e-?\d+/;

const name_field = (rule) => field("name", rule);
const value_field = (rule) => field("value", rule);
const operator_field = (rule) => field("operator", rule);
const body_field = (rule) => field("body", rule);
const condition_field = (rule) => field("condition", rule);
const consequence_field = (rule) => field("consequence", rule);
const alternative_field = (rule) => field("alternative", rule);
const expression_field = (rule) => field("expression", rule);
const left_field = (rule) => field("left", rule);
const right_field = (rule) => field("right", rule);
const argument_field = (rule) => field("argument", rule);

export default grammar({
  name: "amxxpawn",

  word: ($) => $.identifier,

  extras: ($) => [/\s|\\\r?\n/, $.comment],

  inline: ($) => [
    $._type_definition,
    $._initializer,
    $._definition,
    $._statement,
    $._meta_argument,
    $._semicolon,
  ],

  conflicts: ($) => [
    [$.function_definition_modifiers, $.global_variable_modifiers],
    [$.function_definition],
  ],

  rules: {
    // #region Main
    source_file: ($) => repeat($._definition),

    _definition: ($) =>
      choice(
        $.enum,
        $.global_variable_declaration,
        $.function_definition,
        $.function_declaration,
      ),

    parameters: ($) => seq("(", commaSep($.parameter), ")"),

    parameter: ($) =>
      seq(
        optional(alias($.parameter_modifiers, $.modifiers)),
        optional($._type_definition),
        name_field($.identifier),
        repeat(choice($.dimension, $.fixed_dimension)),
        optional($._initializer),
      ),
    parameter_modifiers: ($) => choice(seq("const", optional("&")), "&"),
    function_definition_modifiers: ($) =>
      repeat1(choice("public", "static", "stock")),
    function_declaration_modifiers: ($) => choice("native", "forward"),
    function_declaration: ($) =>
      seq(
        alias($.function_declaration_modifiers, $.modifiers),
        optional($._type_definition),
        name_field($.identifier),
        $.parameters,
        optional($._semicolon),
      ),
    function_definition: ($) =>
      seq(
        optional(alias($.function_definition_modifiers, $.modifiers)),
        optional($._type_definition),
        name_field($.identifier),
        $.parameters,
        choice(body_field($._statement), optional($._semicolon)),
      ),
    // #endregion

    // #region Vars
    global_variable_declaration: ($) =>
      seq(
        alias($.global_variable_modifiers, $.modifiers),
        commaSep1($.variable),
        optional($._semicolon),
      ),

    variable_declaration: ($) =>
      seq(alias($.variable_modifiers, $.modifiers), commaSep1($.variable)),

    variable: ($) =>
      seq(
        optional($._type_definition),
        name_field($.identifier),
        repeat(choice($.dimension, $.fixed_dimension)),
        optional($._initializer),
      ),
    global_variable_modifiers: ($) =>
      repeat1(choice("new", "static", "public", "stock", "const")),
    variable_modifiers: ($) => repeat1(choice("new", "static", "const")),
    // #endregion

    // #region Enum
    enum: ($) =>
      seq(
        "enum",
        optional($._type_definition),
        optional(name_field($.identifier)),
        optional(
          seq(
            ...parenthesized(
              operator_field(choice("+=", "*=", "<<=")),
              value_field($._expression),
            ),
          ),
        ),
        field("entries", $.enum_entries),
        optional($._semicolon),
      ),

    enum_entries: ($) => seq(...braced(commaSep($.enum_entry), optional(","))),

    enum_entry: ($) =>
      seq(
        optional($._type_definition),
        name_field($.identifier),
        optional($.fixed_dimension),
        optional($._initializer),
      ),
    // #endregion

    // #region Statement
    _statement: ($) =>
      choice(
        $.variable_declaration_statement,
        $.block,
        $.expression_statement,
        $.if_statement,
        $.while_statement,
        $.do_while_statement,
        $.for_statement,
        $.switch_statement,
        $.break_statement,
        $.continue_statement,
        $.return_statement,
      ),
    variable_declaration_statement: ($) =>
      seq($.variable_declaration, optional($._semicolon)),
    block: ($) => seq(...braced(repeat($._statement))),
    expression_statement: ($) =>
      prec.right(seq($._expression, optional($._semicolon))),
    if_statement: ($) =>
      prec.right(
        PREC.IF,
        seq(
          "if",
          ...parenthesized(condition_field($._expression)),
          consequence_field($._statement),
          optional(
            seq("else", prec(PREC.ELSE, alternative_field($._statement))),
          ),
        ),
      ),
    while_statement: ($) =>
      seq(
        "while",
        ...parenthesized(condition_field($._expression)),
        body_field($._statement),
      ),
    do_while_statement: ($) =>
      seq(
        "do",
        body_field($._statement),
        "while",
        ...parenthesized(condition_field($._expression)),
        optional($._semicolon),
      ),
    for_statement: ($) =>
      seq(
        "for",
        ...parenthesized(
          optional(
            field(
              "initialization",
              choice(
                $.variable_declaration,
                commaSep1($.assignment_expression),
              ),
            ),
          ),
          $._semicolon,
          optional(condition_field($._expression)),
          $._semicolon,
          optional(field("iteration", $._expression)),
        ),
        body_field($._statement),
      ),
    switch_statement: ($) =>
      seq(
        "switch",
        ...parenthesized(condition_field($._expression)),
        ...braced(repeat($.switch_case)),
      ),
    switch_case: ($) =>
      prec.right(
        seq(
          choice(
            seq("case", value_field(commaSep1($._expression)), ":"),
            seq("default", ":"),
          ),
          body_field($._statement),
        ),
      ),
    break_statement: ($) => seq("break", optional($._semicolon)),
    continue_statement: ($) => seq("continue", optional($._semicolon)),
    return_statement: ($) =>
      prec.right(
        seq(
          "return",
          optional(expression_field($._expression)),
          optional($._semicolon),
        ),
      ),
    // #endregion

    // #region Expressions
    assignment_expression: ($) =>
      prec.right(
        PREC.ASSIGNMENT,
        seq(
          left_field(choice($.identifier, $.index_expression)),
          operator_field(
            choice(
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
              ">>>=",
            ),
          ),
          right_field($._expression),
        ),
      ),
    _meta_argument: ($) =>
      seq(argument_field($.identifier), repeat($.dimension)),
    meta_expression: ($) =>
      prec(
        PREC.META,
        seq(
          operator_field(choice("sizeof", "tagof")),
          choice(seq(...parenthesized($._meta_argument)), $._meta_argument),
        ),
      ),
    update_expression: ($) =>
      choice(
        prec.right(
          PREC.UNARY,
          seq(
            operator_field(choice("++", "--")),
            argument_field($._expression),
          ),
        ),
        prec.left(
          PREC.CALL,
          seq(
            argument_field($._expression),
            operator_field(choice("++", "--")),
          ),
        ),
      ),
    ternary_expression: ($) =>
      prec.right(
        PREC.TERNARY,
        seq(
          condition_field($._expression),
          "?",
          consequence_field($._expression),
          ":",
          alternative_field($._expression),
        ),
      ),
    binary_expression: ($) => {
      const table = [
        [PREC.MULTIPLY, choice("*", "/", "%")],
        [PREC.ADD, choice("+", "-")],
        [PREC.SHIFT, choice("<<", ">>", ">>>")],
        [PREC.RELATIONAL, choice("<", "<=", ">", ">=")],
        [PREC.EQUAL, choice("==", "!=")],
        [PREC.BITWISE_AND, "&"],
        [PREC.EXCLUSIVE_OR, "^"],
        [PREC.INCLUSIVE_OR, "|"],
        [PREC.LOGICAL_AND, "&&"],
        [PREC.LOGICAL_OR, "||"],
      ];

      return choice(
        ...table.map(([precedence, operator]) =>
          prec.left(
            precedence,
            seq(
              left_field($._expression),
              operator_field(operator),
              right_field($._expression),
            ),
          ),
        ),
      );
    },
    unary_expression: ($) =>
      prec.right(
        PREC.UNARY,
        seq(
          operator_field(choice("!", "~", "-", "+", "&")),
          argument_field($._expression),
        ),
      ),
    comma_expression: ($) =>
      prec.left(
        PREC.COMMA,
        seq(left_field($._expression), ",", right_field($._expression)),
      ),
    parenthesized_expression: ($) =>
      prec(
        PREC.PRIMARY,
        seq(...parenthesized(expression_field($._expression))),
      ),
    index_expression: ($) =>
      prec(
        PREC.PRIMARY,
        seq(
          field("array", choice($.identifier, $.index_expression)),
          ...bracketed(field("index", $._expression)),
        ),
      ),
    type_cast: ($) =>
      prec.left(PREC.CAST, seq($._type_definition, value_field($._expression))),
    named_argument: ($) => seq(".", name_field($.identifier), $._initializer),
    arguments: ($) =>
      commaSep1(choice($.named_argument, $.omitted_argument, $._expression)),
    call_expression: ($) =>
      prec(
        PREC.CALL,
        seq(name_field($.identifier), ...parenthesized(optional($.arguments))),
      ),
    _expression: ($) =>
      choice(
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
        $.identifier,
      ),
    // #endregion

    // #region Literals
    _literal: ($) =>
      choice(
        $.int_literal,
        $.float_literal,
        $.char_literal,
        $.string_literal,
        $.bool_literal,
      ),
    int_literal: ($) =>
      token(choice(DIGITS, seq("0x", HEX_DIGITS), seq("0b", BINARY_DIGITS))),
    float_literal: ($) => token(seq(DIGITS, ".", DIGITS, optional(EXPONENT))),
    bool_literal: ($) => token(choice("true", "false")),
    char_literal: ($) =>
      seq(
        "'",
        choice(
          $.escape_sequence,
          alias(token.immediate(/[^\n']/), $.character),
        ),
        "'",
      ),
    string_literal: ($) =>
      seq(
        '"',
        alias(
          repeat(
            choice(
              token.immediate(prec(1, /[^"\\]|\\\r?\n/)),
              $.escape_sequence,
            ),
          ),
          $.string_content,
        ),
        '"',
      ),
    array_literal: ($) =>
      seq(
        ...braced(commaSep(choice($._literal, $.array_literal)), optional(",")),
      ),
    // #endregion

    // #region Base
    _initializer: ($) =>
      seq("=", value_field(choice($._expression, $.array_literal))),
    dimension: ($) => seq(...bracketed()),
    fixed_dimension: ($) => seq(...bracketed(field("size", $._expression))),
    _type_definition: ($) =>
      seq(
        field("type", choice($.builtin_type, $.identifier, $.any_type)),
        token.immediate(":"),
      ),
    builtin_type: ($) => choice("Float", "bool", "_"),
    any_type: ($) => "any",
    identifier: ($) => /[a-zA-Z_]\w*/,
    // #endregion

    // #region Other
    omitted_argument: ($) => "_",
    escape_sequence: ($) =>
      token(
        prec(
          1,
          seq(
            choice("\\", "^"),
            choice(
              /[abefnrtvwyd\\'"%?]/,
              /x[0-9a-fA-F]+;?/,
              /[0-9]+;?/,
              /d[0-9]{3};?/,
            ),
          ),
        ),
      ),
    _semicolon: ($) => ";",
    comment: ($) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),
    // #endregion
  },
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function bracketed(...rules) {
  return surround("[", "]", ...rules);
}

function parenthesized(...rules) {
  return surround("(", ")", ...rules);
}

function braced(...rules) {
  return surround("{", "}", ...rules);
}

function surround(open, close, ...rules) {
  return [open, ...rules, close];
}
