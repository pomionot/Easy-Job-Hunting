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
		"((from:hr@example.com) OR ((面接 OR 選考 OR インターン OR 説明会 OR 書類選考) -メルマガ -おすすめ情報 -お知らせ -配信停止))",
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

	expected := "((from:recruit@example.com OR from:hr@example.com) OR ((面接 OR 選考 OR インターン OR 説明会 OR 書類選考) -メルマガ -おすすめ情報 -お知らせ -配信停止))"
	if !strings.Contains(query, expected) {
		t.Fatalf("必ず含める送信者が除外ワードを迂回するOR条件になっていません: %s", query)
	}
}

func TestBuildGmailQueryExcludesSenderRegardlessOfKeywords(t *testing.T) {
	query := BuildGmailQuery([]string{"recruit@example.com"}, []string{"newsletter@example.com"})

	if !strings.Contains(query, "((from:recruit@example.com) OR ((面接 OR 選考 OR インターン OR 説明会 OR 書類選考) -メルマガ -おすすめ情報 -お知らせ -配信停止))") {
		t.Fatalf("必ず含める送信者が除外ワードを迂回する条件になっていません: %s", query)
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
