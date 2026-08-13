/**
 * @file Amxxpawn grammar for tree-sitter
 * @author Amxray
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "amxxpawn",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
