package handlers

import (
	"Easy-Job-Hunting/config"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CompanyRequest フロントから届くデータの構造
type CompanyRequest struct {
	UID         int    `json:"uid"`
	CompanyName string `json:"company_name"`
	Industry    string `json:"industry"`
	BusinessType string `json:"business_type"`
	HomepageURL string `json:"homepage_url"`
}

// RegisterCompanyHandler 企業情報登録API
func RegisterCompanyHandler(c *gin.Context) {
	var req CompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストデータの解析に失敗しました"})
		return
	}

	if req.UID == 0 || req.CompanyName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UIDと企業名は必須です"})
		return
	}

	// 🔑 企業情報をインサート
	query := `
		INSERT INTO companies (user_id, company_name, industry, business_type, homepage_url)
		VALUES (?, ?, ?, ?, ?);
	`
	_, err := config.DB.Exec(query, req.UID, req.CompanyName, req.Industry, req.BusinessType, req.HomepageURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の保存に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "企業情報を正常に登録しました！"})
}