package config

import (
	"strings"
	"testing"
)

func TestBuildGmailQueryIncludesAndExcludesSenders(t *testing.T) {
	query := BuildGmailQuery(
		[]string{" HR@Example.com ", "hr@example.com", ""},
		[]string{"newsletter@example.com"},
	)

	for _, expected := range []string{
		"面接 OR 選考 OR インターン OR 説明会 OR 書類選考",
		"from:hr@example.com",
		"-from:newsletter@example.com",
		"-メルマガ",
	} {
		if !strings.Contains(query, expected) {
			t.Fatalf("queryに %q がありません: %s", expected, query)
		}
	}
	if strings.Count(query, "from:hr@example.com") != 1 {
		t.Fatalf("重複した送信元が含まれています: %s", query)
	}
}

func TestNormalizeEmailAddress(t *testing.T) {
	cases := map[string]string{
		"採用担当 " + "<HR@Example.com>": "hr@example.com",
		`  newsletter@example.com  `: "newsletter@example.com",
		`<>`:                         "",
	}

	for input, expected := range cases {
		if actual := normalizeEmailAddress(input); actual != expected {
			t.Errorf("normalizeEmailAddress(%q) = %q, want %q", input, actual, expected)
		}
	}
}
