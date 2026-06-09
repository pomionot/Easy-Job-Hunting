package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"Easy-Job-Hunting/config"

	"github.com/gin-gonic/gin"
)

type ProfileRequest struct {
	UID            int64  `json:"uid"`
	Name           string `json:"name"`
	University     string `json:"university"`
	Faculty        string `json:"faculty"`
	TargetIndustry string `json:"target_industry"`
	SelfPR         string `json:"self_pr"`
}

type ProfileResponse struct {
	UID            int64  `json:"uid"`
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

	if req.UID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "一意のUIDが必要です"})
		return
	}

	query := `
		INSERT INTO profiles (user_id, name, university, faculty, target_industry, self_pr)
		VALUES (?, ?, ?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
		name = VALUES(name),
		university = VALUES(university),
		faculty = VALUES(faculty),
		target_industry = VALUES(target_industry),
		self_pr = VALUES(self_pr);
	`
	if _, err := config.DB.Exec(query, req.UID, req.Name, req.University, req.Faculty, req.TargetIndustry, req.SelfPR); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロフィールの保存に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "プロフィールを正常に保存しました！"})
}

func GetProfileHandler(c *gin.Context) {
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

	var profile ProfileResponse
	err = config.DB.QueryRow(
		`SELECT u.id, u.email, COALESCE(p.name, ''), COALESCE(p.university, ''), COALESCE(p.faculty, ''), COALESCE(p.target_industry, ''), COALESCE(p.self_pr, '')
		 FROM users u
		 LEFT JOIN profiles p ON p.user_id = u.id
		 WHERE u.id = ?`,
		uid,
	).Scan(&profile.UID, &profile.Email, &profile.Name, &profile.University, &profile.Faculty, &profile.TargetIndustry, &profile.SelfPR)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "ユーザーが見つかりません"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "プロフィールの取得に失敗しました: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, profile)
}