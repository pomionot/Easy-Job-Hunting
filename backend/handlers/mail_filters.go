package handlers

import (
	"net/http"
	"strings"

	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MailFilterEntry struct {
	ID     string `json:"id"`
	Type   string `json:"type"`
	Email  string `json:"email"`
	UserID string `json:"user_id"`
}

type MailFilterRequest struct {
	IncludeEmails string `json:"include_emails"`
	ExcludeEmails string `json:"exclude_emails"`
}

type MailFilterResponse struct {
	UID           string            `json:"uid"`
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

func loadMailFilterSettings(uid uuid.UUID) ([]string, []string, error) {
	var entries []models.MailFilterEntry
	if err := config.DB.Where("user_id = ?", uid).Order("id ASC").Find(&entries).Error; err != nil {
		return nil, nil, err
	}
	include, exclude := []string{}, []string{}
	for _, entry := range entries {
		email := normalizeEmail(entry.Email)
		if email == "" {
			continue
		}
		if entry.EntryType == "include" {
			include = append(include, email)
		} else if entry.EntryType == "exclude" {
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
	var entries []models.MailFilterEntry
	if err := config.DB.Where("user_id = ?", uid).Order("id ASC").Find(&entries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの取得に失敗しました: " + err.Error()})
		return
	}
	response := MailFilterResponse{UID: uid.String(), IncludeEmails: []MailFilterEntry{}, ExcludeEmails: []MailFilterEntry{}}
	for _, entry := range entries {
		item := MailFilterEntry{ID: entry.ID.String(), Type: entry.EntryType, Email: normalizeEmail(entry.Email), UserID: uid.String()}
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
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", uid).Delete(&models.MailFilterEntry{}).Error; err != nil {
			return err
		}
		for _, raw := range strings.Split(req.IncludeEmails, ",") {
			if email := normalizeEmail(raw); email != "" {
				if err := tx.Create(&models.MailFilterEntry{UserID: uid, EntryType: "include", Email: email}).Error; err != nil {
					return err
				}
			}
		}
		for _, raw := range strings.Split(req.ExcludeEmails, ",") {
			if email := normalizeEmail(raw); email != "" {
				if err := tx.Create(&models.MailFilterEntry{UserID: uid, EntryType: "exclude", Email: email}).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの保存に失敗しました: " + err.Error()})
		return
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
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	req.Email = normalizeEmail(req.Email)
	if req.Email == "" || (req.Type != "include" && req.Type != "exclude") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "typeまたはメールアドレスが不正です"})
		return
	}
	entry := models.MailFilterEntry{UserID: uid, EntryType: req.Type, Email: req.Email}
	if err := config.DB.Create(&entry).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールアドレスの追加に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"id": entry.ID, "type": entry.EntryType, "email": entry.Email})
}

func parseFilterEntryID(c *gin.Context) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil || id == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "idの形式が正しくありません"})
		return uuid.Nil, false
	}
	return id, true
}

func UpdateMailFilterEntryHandler(c *gin.Context) {
	id, ok := parseFilterEntryID(c)
	if !ok {
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
	if req.Email == "" || (req.Type != "include" && req.Type != "exclude") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "typeまたはメールアドレスが不正です"})
		return
	}
	result := config.DB.Model(&models.MailFilterEntry{}).Where("id = ? AND user_id = ?", id, uid).
		Updates(map[string]interface{}{"entry_type": req.Type, "email": req.Email})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールアドレスの更新に失敗しました: " + result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "メールアドレスが見つかりません"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "更新しました"})
}

func DeleteMailFilterEntryHandler(c *gin.Context) {
	id, ok := parseFilterEntryID(c)
	if !ok {
		return
	}
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	result := config.DB.Where("id = ? AND user_id = ?", id, uid).Delete(&models.MailFilterEntry{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "削除に失敗しました: " + result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "メールアドレスが見つかりません"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "削除しました"})
}
