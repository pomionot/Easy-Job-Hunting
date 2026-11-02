package config

import (
	"strings"
)

// 就活関連のキーワード（含めたいキーワード）
var IncludeKeywords = []string{
	"面接",
	"選考",
	"インターン",
	"説明会",
	"書類選考",
}

// 除外したいキーワード（メルマガ等）
var ExcludeKeywords = []string{
	"メルマガ",
	"おすすめ情報",
	"お知らせ",
	"配信停止",
}

func normalizeEmailAddress(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	start := strings.IndexByte(value, '<')
	end := strings.IndexByte(value, '>')
	if start >= 0 && end > start {
		value = strings.TrimSpace(value[start+1 : end])
	} else {
		value = strings.Trim(value, "<>\"'")
	}
	if idx := strings.Index(value, " "); idx >= 0 {
		value = strings.TrimSpace(value[:idx])
	}
	return strings.ToLower(value)
}

func normalizeEmailList(values []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(values))
	for _, raw := range values {
		email := normalizeEmailAddress(raw)
		if email == "" {
			continue
		}
		if !seen[email] {
			seen[email] = true
			result = append(result, email)
		}
	}
	return result
}

func BuildGmailQuery(includeEmails, excludeEmails []string) string {
	normalizedIncludeEmails := normalizeEmailList(includeEmails)
	var parts []string
	var orTerms []string
	orTerms = append(orTerms, IncludeKeywords...)
	for _, email := range normalizedIncludeEmails {
		orTerms = append(orTerms, "from:"+email)
	}
	if len(orTerms) > 0 {
		// Gmail's braces are an explicit OR group. This ensures include
		// senders are added to keyword matches instead of narrowing them.
		parts = append(parts, "{"+strings.Join(orTerms, " ")+"}")
	}

	for _, ex := range ExcludeKeywords {
		ex = strings.TrimSpace(ex)
		if ex == "" {
			continue
		}
		parts = append(parts, "-"+ex)
	}

	for _, email := range normalizeEmailList(excludeEmails) {
		if email != "" {
			parts = append(parts, "-from:"+email)
		}
	}

	return strings.Join(parts, " ")
}
