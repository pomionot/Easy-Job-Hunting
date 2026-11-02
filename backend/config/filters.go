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
	var alternatives []string
	normalizedIncludeEmails := normalizeEmailList(includeEmails)

	if len(IncludeKeywords) > 0 {
		// Gmail's braces mean OR between terms. Keeping the keyword and sender
		// alternatives in one group makes "include" senders bypass keywords.
		alternatives = append(alternatives, "{"+strings.Join(IncludeKeywords, " ")+"}")
	}
	if len(normalizedIncludeEmails) > 0 {
		fromTerms := make([]string, 0, len(normalizedIncludeEmails))
		for _, email := range normalizedIncludeEmails {
			fromTerms = append(fromTerms, "from:"+email)
		}
		alternatives = append(alternatives, "{"+strings.Join(fromTerms, " ")+"}")
	}

	var parts []string
	if len(alternatives) > 0 {
		parts = append(parts, "("+strings.Join(alternatives, " OR ")+")")
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
