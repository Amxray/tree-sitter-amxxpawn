package tree_sitter_amxxpawn_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_amxxpawn "github.com/Amxray/tree-sitter-amxxpawn/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_amxxpawn.Language())
	if language == nil {
		t.Errorf("Error loading Amxxpawn grammar")
	}
}
