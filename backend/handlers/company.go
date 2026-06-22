package handlers

import (
	"Easy-Job-Hunting/config"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 既存の CompanyRequest 構造体に Status を追加
type CompanyRequest struct {
	UID         int    `json:"uid"`
	CompanyName string `json:"company_name"`
	Industry    string `json:"industry"`
	BusinessType string `json:"business_type"`
	HomepageURL string `json:"homepage_url"`
	Status      string `json:"status"` // 👈 これを追加
}

// CompanyResponse フロントに返す企業情報の構造
type CompanyResponse struct {
	ID          int    `json:"id"`
	CompanyName string `json:"company_name"`
	Industry    string `json:"industry"`
	BusinessType string `json:"business_type"`
	HomepageURL string `json:"homepage_url"`
	Status      string `json:"status"`
}

// GetCompaniesHandler 企業一覧取得API (GET)
func GetCompaniesHandler(c *gin.Context) {
	uidStr := c.Query("uid")
	if uidStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UIDが指定されていません"})
		return
	}

	uid, err := strconv.Atoi(uidStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なUIDです"})
		return
	}

	// 🔑 ログインユーザーの企業情報を取得
	query := `
		SELECT id, company_name, industry, business_type, homepage_url, status 
		FROM companies 
		WHERE user_id = ? 
		ORDER BY id DESC;
	`
	rows, err := config.DB.Query(query, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の取得に失敗しました: " + err.Error()})
		return
	}
	defer rows.Close()

	var companies []CompanyResponse
	for rows.Next() {
		var comp CompanyResponse
		err := rows.Scan(&comp.ID, &comp.CompanyName, &comp.Industry, &comp.BusinessType, &comp.HomepageURL, &comp.Status)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "データのマッピングに失敗しました"})
			return
		}
		companies = append(companies, comp)
	}

	if companies == nil {
		companies = []CompanyResponse{}
	}

	c.JSON(http.StatusOK, companies)
}

// RegisterCompanyHandler 企業情報登録API (POST)
func RegisterCompanyHandler(c *gin.Context) {
	var req CompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}

	if req.UID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UIDが不正です"})
		return
	}

	if req.CompanyName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "企業名は必須です"})
		return
	}

	query := `
		INSERT INTO companies (user_id, company_name, industry, business_type, homepage_url, status)
		VALUES (?, ?, ?, ?, ?, ?);
	`
	_, err := config.DB.Exec(query, req.UID, req.CompanyName, req.Industry, req.BusinessType, req.HomepageURL, "検討中")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の保存に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "企業情報を正常に登録しました！"})
}

// UpdateCompanyStatusHandler 選考ステータス更新API (PUT)
func UpdateCompanyStatusHandler(c *gin.Context) {
	var req struct {
		ID     int    `json:"id"`
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}

	query := "UPDATE companies SET status = ? WHERE id = ?;"
	_, err := config.DB.Exec(query, req.Status, req.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステータスの更新に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ステータスを更新しました！"})
}