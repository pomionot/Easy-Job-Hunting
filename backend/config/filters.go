package config

import "strings"

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

// BuildGmailQuery は Gmail API 用の検索クエリを生成します。
// 例: "面接 OR 選考 OR インターン -メルマガ -おすすめ情報"
func BuildGmailQuery() string {
    var parts []string

    if len(IncludeKeywords) > 0 {
        parts = append(parts, strings.Join(IncludeKeywords, " OR "))
    }

    for _, ex := range ExcludeKeywords {
        ex = strings.TrimSpace(ex)
        if ex == "" {
            continue
        }
        parts = append(parts, "-"+ex)
    }

    return strings.Join(parts, " ")
}
