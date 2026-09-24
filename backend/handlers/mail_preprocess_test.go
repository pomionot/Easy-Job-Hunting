package handlers

import (
	"strings"
	"testing"
)

func TestSanitizeMailForAI(t *testing.T) {
	result := sanitizeMailForAI(
		"面接 https://example.com/secret?token=abc",
		"山田 太郎 <Taro.Yamada@example.com>",
		"氏名: 山田太郎\n日時: 2026年10月2日 14:00\n電話: 090-1234-5678\n詳細: https://example.com/meeting/abc\n返信: > 個人情報",
	)

	for _, unwanted := range []string{"Taro.Yamada@example.com", "090-1234-5678", "token=abc", "https://example.com/meeting/abc", "山田太郎"} {
		if contains(result.Subject+result.From+result.Body, unwanted) {
			t.Fatalf("個人情報またはURLが残っています: %q", unwanted)
		}
	}
	for _, expected := range []string{"[URL:example.com]", "[SENDER]@example.com", "[PHONE]", "2026年10月2日 14:00", "[PERSONAL_DATA]"} {
		if !contains(result.Subject+result.From+result.Body, expected) {
			t.Fatalf("期待したマスク結果がありません: %q", expected)
		}
	}
}

func contains(value, target string) bool {
	return strings.Contains(value, target)
}
