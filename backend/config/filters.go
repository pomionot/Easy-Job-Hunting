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
    value = strings.Trim(value, "<>\"'")
    if value == "" {
        return ""
    }
    if idx := strings.Index(value, "<"); idx >= 0 && strings.Contains(value, ">") {
        if end := strings.Index(value[idx+1:], ">") ; end >= 0 {
            value = strings.TrimSpace(value[idx+1 : idx+1+end])
        }
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
    var parts []string

    keywordGroup := strings.Join(IncludeKeywords, " OR ")
    if keywordGroup != "" {
        parts = append(parts, keywordGroup)
    }

    for _, email := range normalizeEmailList(includeEmails) {
        if email != "" {
            parts = append(parts, "from:"+email)
        }
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
