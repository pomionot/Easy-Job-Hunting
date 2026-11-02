package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"Easy-Job-Hunting/config"

	"github.com/gin-gonic/gin"
)

type MailFilterEntry struct {
	ID     int64  `json:"id"`
	Type   string `json:"type"`
	Email  string `json:"email"`
	UserID int64  `json:"user_id"`
}

type MailFilterRequest struct {
	IncludeEmails string `json:"include_emails"`
	ExcludeEmails string `json:"exclude_emails"`
}

type MailFilterResponse struct {
	UID           int64             `json:"uid"`
	IncludeEmails []MailFilterEntry `json:"include_emails"`
	ExcludeEmails []MailFilterEntry `json:"exclude_emails"`
}

func normalizeEmail(value string) string {
	value = strings.TrimSpace(value)
	value = strings.Trim(value, "<>\"'")
	if value == "" {
		return ""
	}
	return strings.ToLower(value)
}

func loadMailFilterSettings(uid int64) ([]string, []string, error) {
	rows, err := config.DB.Query(`SELECT entry_type, email FROM mail_filter_entries WHERE user_id = ? ORDER BY id ASC`, uid)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	include := []string{}
	exclude := []string{}
	for rows.Next() {
		var entryType string
		var email string
		if err := rows.Scan(&entryType, &email); err != nil {
			return nil, nil, err
		}
		email = normalizeEmail(email)
		if email == "" {
			continue
		}
		if entryType == "include" {
			include = append(include, email)
		} else if entryType == "exclude" {
			exclude = append(exclude, email)
		}
	}
	return include, exclude, nil
}

func GetMailFilterHandler(c *gin.Context) {
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	rows, err := config.DB.Query(`SELECT id, entry_type, email FROM mail_filter_entries WHERE user_id = ? ORDER BY id ASC`, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの取得に失敗しました: " + err.Error()})
		return
	}
	defer rows.Close()

	response := MailFilterResponse{UID: uid}
	for rows.Next() {
		var item MailFilterEntry
		if err := rows.Scan(&item.ID, &item.Type, &item.Email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの読込に失敗しました: " + err.Error()})
			return
		}
		item.Email = normalizeEmail(item.Email)
		item.UserID = uid
		if item.Type == "include" {
			response.IncludeEmails = append(response.IncludeEmails, item)
		} else if item.Type == "exclude" {
			response.ExcludeEmails = append(response.ExcludeEmails, item)
		}
	}

	c.JSON(http.StatusOK, response)
}

func UpdateMailFilterHandler(c *gin.Context) {
	var req MailFilterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストデータの解析に失敗しました"})
		return
	}
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	// 既存のレコードを削除してから保存し直す（単純な構成）
	if _, err := config.DB.Exec("DELETE FROM mail_filter_entries WHERE user_id = ?", uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "既存フィルターのクリアに失敗しました: " + err.Error()})
		return
	}

	for _, email := range strings.Split(req.IncludeEmails, ",") {
		email = normalizeEmail(email)
		if email == "" {
			continue
		}
		if _, err := config.DB.Exec("INSERT INTO mail_filter_entries (user_id, entry_type, email) VALUES (?, 'include', ?)", uid, email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "含めるメールアドレスの保存に失敗しました: " + err.Error()})
			return
		}
	}
	for _, email := range strings.Split(req.ExcludeEmails, ",") {
		email = normalizeEmail(email)
		if email == "" {
			continue
		}
		if _, err := config.DB.Exec("INSERT INTO mail_filter_entries (user_id, entry_type, email) VALUES (?, 'exclude', ?)", uid, email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "除外メールアドレスの保存に失敗しました: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "メールフィルターを保存しました"})
}

func AddMailFilterEntryHandler(c *gin.Context) {
	var req struct {
		Type  string `json:"type"`
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストデータの解析に失敗しました"})
		return
	}
	if req.Type == "" || req.Type != "include" && req.Type != "exclude" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "typeが正しくありません"})
		return
	}
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	req.Email = normalizeEmail(req.Email)
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "メールアドレスが空です"})
		return
	}

	res, err := config.DB.Exec("INSERT INTO mail_filter_entries (user_id, entry_type, email) VALUES (?, ?, ?)", uid, req.Type, req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールアドレスの追加に失敗しました: " + err.Error()})
		return
	}
	id, _ := res.LastInsertId()
	c.JSON(http.StatusOK, gin.H{"id": id, "type": req.Type, "email": req.Email})
}

func UpdateMailFilterEntryHandler(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "idの形式が正しくありません"})
		return
	}

	var req struct {
		Type  string `json:"type"`
		Email string `json:"email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストデータの解析に失敗しました"})
		return
	}
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	req.Email = normalizeEmail(req.Email)
	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "メールアドレスが空です"})
		return
	}
	if req.Type != "include" && req.Type != "exclude" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "typeが正しくありません"})
		return
	}

	if _, err := config.DB.Exec("UPDATE mail_filter_entries SET entry_type = ?, email = ? WHERE id = ? AND user_id = ?", req.Type, req.Email, id, uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールアドレスの更新に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "更新しました"})
}

func DeleteMailFilterEntryHandler(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseInt(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "idの形式が正しくありません"})
		return
	}

	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	if _, err := config.DB.Exec("DELETE FROM mail_filter_entries WHERE id = ? AND user_id = ?", id, uid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "削除に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "削除しました"})
}
