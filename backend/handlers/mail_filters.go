package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"Easy-Job-Hunting/config"

	"github.com/gin-gonic/gin"
)

type MailFilterRequest struct {
	UID           int64  `json:"uid"`
	IncludeEmails string `json:"include_emails"`
	ExcludeEmails string `json:"exclude_emails"`
}

type MailFilterResponse struct {
	UID           int64  `json:"uid"`
	IncludeEmails string `json:"include_emails"`
	ExcludeEmails string `json:"exclude_emails"`
}

func parseEmailList(value string) []string {
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	seen := map[string]bool{}
	for _, p := range parts {
		email := strings.TrimSpace(p)
		email = strings.Trim(email, "<>\"'")
		if email == "" {
			continue
		}
		email = strings.ToLower(email)
		if !seen[email] {
			seen[email] = true
			items = append(items, email)
		}
	}
	return items
}

func serializeEmailList(items []string) string {
	if len(items) == 0 {
		return ""
	}
	cleaned := make([]string, 0, len(items))
	seen := map[string]bool{}
	for _, item := range items {
		email := strings.TrimSpace(item)
		email = strings.Trim(email, "<>\"'")
		email = strings.ToLower(email)
		if email == "" || seen[email] {
			continue
		}
		seen[email] = true
		cleaned = append(cleaned, email)
	}
	return strings.Join(cleaned, ",")
}

func valueOrEmpty(v sql.NullString) string {
	if v.Valid {
		return v.String
	}
	return ""
}

func loadMailFilterSettings(uid int64) ([]string, []string, error) {
	var includeEmails sql.NullString
	var excludeEmails sql.NullString

	err := config.DB.QueryRow("SELECT include_emails, exclude_emails FROM mail_filters WHERE user_id = ?", uid).Scan(&includeEmails, &excludeEmails)
	if err == sql.ErrNoRows {
		return nil, nil, nil
	}
	if err != nil {
		return nil, nil, err
	}

	return parseEmailList(valueOrEmpty(includeEmails)), parseEmailList(valueOrEmpty(excludeEmails)), nil
}

func GetMailFilterHandler(c *gin.Context) {
	uidParam := c.Query("uid")
	if uidParam == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "uidパラメータが必要です"})
		return
	}

	uid, err := strconv.ParseInt(uidParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "uidの形式が正しくありません"})
		return
	}

	var includeEmails, excludeEmails sql.NullString
	query := "SELECT include_emails, exclude_emails FROM mail_filters WHERE user_id = ?"
	if err := config.DB.QueryRow(query, uid).Scan(&includeEmails, &excludeEmails); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusOK, MailFilterResponse{UID: uid, IncludeEmails: "", ExcludeEmails: ""})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの取得に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, MailFilterResponse{
		UID:           uid,
		IncludeEmails: valueOrEmpty(includeEmails),
		ExcludeEmails: valueOrEmpty(excludeEmails),
	})
}

func UpdateMailFilterHandler(c *gin.Context) {
	var req MailFilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストデータの解析に失敗しました"})
		return
	}

	if req.UID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "uidが不正です"})
		return
	}

	includeText := serializeEmailList(parseEmailList(req.IncludeEmails))
	excludeText := serializeEmailList(parseEmailList(req.ExcludeEmails))

	query := `
		INSERT INTO mail_filters (user_id, include_emails, exclude_emails)
		VALUES (?, ?, ?)
		ON DUPLICATE KEY UPDATE
		include_emails = VALUES(include_emails),
		exclude_emails = VALUES(exclude_emails);
	`
	if _, err := config.DB.Exec(query, req.UID, includeText, excludeText); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの保存に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "メールフィルターを保存しました"})
}
