package handlers

import (
	"errors"
	"net/http"

	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ProfileRequest struct {
	Name           string `json:"name"`
	University     string `json:"university"`
	Faculty        string `json:"faculty"`
	TargetIndustry string `json:"target_industry"`
	SelfPR         string `json:"self_pr"`
}

type ProfileResponse struct {
	UID            string `json:"uid"`
	Email          string `json:"email"`
	Name           string `json:"name"`
	University     string `json:"university"`
	Faculty        string `json:"faculty"`
	TargetIndustry string `json:"target_industry"`
	SelfPR         string `json:"self_pr"`
}

func UpdateProfileHandler(c *gin.Context) {
	var req ProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストデータの解析に失敗しました"})
		return
	}
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	profile := models.Profile{
		UserID:         uid,
		Name:           req.Name,
		University:     req.University,
		Faculty:        req.Faculty,
		TargetIndustry: req.TargetIndustry,
		SelfPR:         req.SelfPR,
	}
	err = config.DB.Where("user_id = ?", uid).Assign(profile).FirstOrCreate(&profile).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロフィールの保存に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "プロフィールを正常に保存しました！"})
}

func GetProfileHandler(c *gin.Context) {
	uid, err := authenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	var user models.User
	err = config.DB.First(&user, "id = ?", uid).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ユーザー情報の取得に失敗しました: " + err.Error()})
		return
	}

	var profile models.Profile
	err = config.DB.Where("user_id = ?", uid).First(&profile).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		profile.UserID = uid
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロフィールの取得に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, ProfileResponse{
		UID:            user.ID.String(),
		Email:          user.Email,
		Name:           profile.Name,
		University:     profile.University,
		Faculty:        profile.Faculty,
		TargetIndustry: profile.TargetIndustry,
		SelfPR:         profile.SelfPR,
	})
}
