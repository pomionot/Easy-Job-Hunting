package handlers

import (
	"net/http"

	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/models"

	"github.com/gin-gonic/gin"
)

type CompanyRequest struct {
	CompanyName  string `json:"company_name"`
	Industry     string `json:"industry"`
	BusinessType string `json:"business_type"`
	HomepageURL  string `json:"homepage_url"`
	Status       string `json:"status"`
}

type CompanyResponse struct {
	ID           string `json:"id"`
	CompanyName  string `json:"company_name"`
	Industry     string `json:"industry"`
	BusinessType string `json:"business_type"`
	HomepageURL  string `json:"homepage_url"`
	Status       string `json:"status"`
}

func GetCompaniesHandler(c *gin.Context) {
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var companies []models.Company
	if err := config.DB.Where("user_id = ?", uid).Order("id DESC").Find(&companies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の取得に失敗しました: " + err.Error()})
		return
	}
	response := make([]CompanyResponse, 0, len(companies))
	for _, company := range companies {
		response = append(response, CompanyResponse{
			ID: company.ID.String(), CompanyName: company.CompanyName, Industry: company.Industry,
			BusinessType: company.BusinessType, HomepageURL: company.HomepageURL, Status: company.Status,
		})
	}
	c.JSON(http.StatusOK, response)
}

func RegisterCompanyHandler(c *gin.Context) {
	var req CompanyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	if req.CompanyName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "企業名は必須です"})
		return
	}
	company := models.Company{
		UserID: uid, CompanyName: req.CompanyName, Industry: req.Industry,
		BusinessType: req.BusinessType, HomepageURL: req.HomepageURL, Status: "検討中",
	}
	if err := config.DB.Create(&company).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の保存に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "企業情報を正常に登録しました！", "id": company.ID})
}

func UpdateCompanyStatusHandler(c *gin.Context) {
	var req struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	result := config.DB.Model(&models.Company{}).Where("id = ? AND user_id = ?", req.ID, uid).Update("status", req.Status)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステータスの更新に失敗しました: " + result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "企業が見つかりません"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ステータスを更新しました！"})
}
