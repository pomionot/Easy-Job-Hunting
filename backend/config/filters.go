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
	var keywordTerms []string
	for _, keyword := range IncludeKeywords {
		if keyword = strings.TrimSpace(keyword); keyword != "" {
			keywordTerms = append(keywordTerms, keyword)
		}
	}

	var keywordQuery string
	if len(keywordTerms) > 0 {
		keywordQuery = "(" + strings.Join(keywordTerms, " OR ") + ")"
		for _, keyword := range ExcludeKeywords {
			keyword = strings.TrimSpace(keyword)
			if keyword != "" {
				keywordQuery += " -" + keyword
			}
		}
	}

	var parts []string
	normalizedIncludeEmails := normalizeEmailList(includeEmails)
	if len(normalizedIncludeEmails) > 0 && keywordQuery != "" {
		includeTerms := make([]string, 0, len(normalizedIncludeEmails))
		for _, email := range normalizedIncludeEmails {
			includeTerms = append(includeTerms, "from:"+email)
		}
		// Included senders bypass keyword exclusions. Excluded senders are
		// appended below so they remain excluded from every branch.
		parts = append(parts, "(("+strings.Join(includeTerms, " OR ")+") OR ("+keywordQuery+"))")
	} else if len(normalizedIncludeEmails) > 0 {
		includeTerms := make([]string, 0, len(normalizedIncludeEmails))
		for _, email := range normalizedIncludeEmails {
			includeTerms = append(includeTerms, "from:"+email)
		}
		parts = append(parts, "("+strings.Join(includeTerms, " OR ")+")")
	} else if keywordQuery != "" {
		parts = append(parts, keywordQuery)
	}

	for _, email := range normalizeEmailList(excludeEmails) {
		parts = append(parts, "-from:"+email)
	}

	return strings.Join(parts, " ")
}
