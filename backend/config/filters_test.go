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
		"{面接 選考 インターン 説明会 書類選考 from:hr@example.com}",
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
	query := BuildGmailQuery([]string{"recruit@example.com", "hr@example.com"}, nil)

	expected := "{面接 選考 インターン 説明会 書類選考 from:recruit@example.com from:hr@example.com}"
	if !strings.Contains(query, expected) {
		t.Fatalf("キーワード条件と必ず含める送信者条件が同じORグループにありません: %s", query)
	}
}

func TestBuildGmailQueryExcludesSenderRegardlessOfKeywords(t *testing.T) {
	query := BuildGmailQuery([]string{"recruit@example.com"}, []string{"newsletter@example.com"})

	if !strings.Contains(query, "{面接 選考 インターン 説明会 書類選考 from:recruit@example.com}") {
		t.Fatalf("キーワードまたは必ず含める送信者の条件がありません: %s", query)
	}
	if !strings.Contains(query, "-from:newsletter@example.com") {
		t.Fatalf("除外送信者の条件がありません: %s", query)
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
