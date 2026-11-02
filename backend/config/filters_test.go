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
		"({面接 選考 インターン 説明会 書類選考} OR {from:hr@example.com})",
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

func TestBuildGmailQueryIncludeSenderBypassesKeywords(t *testing.T) {
	query := BuildGmailQuery([]string{"recruit@example.com"}, nil)

	if !strings.Contains(query, "({面接 選考 インターン 説明会 書類選考} OR {from:recruit@example.com})") {
		t.Fatalf("必ず含める送信者がキーワード条件とORになっていません: %s", query)
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
