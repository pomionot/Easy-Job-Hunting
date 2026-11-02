package handlers

import (
	"errors"
	"net/http"
	"strings"

	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type RoadmapStep struct {
	ID         uuid.UUID `json:"id"`
	CompanyID  uuid.UUID `json:"company_id"`
	UserID     uuid.UUID `json:"user_id"`
	StepOrder  int       `json:"step_order"`
	Title      string    `json:"title"`
	Status     string    `json:"status"`
	TargetDate string    `json:"target_date"`
	NextAction string    `json:"next_action"`
	Notes      string    `json:"notes"`
}

type CompanyRoadmapResponse struct {
	CompanyID      uuid.UUID     `json:"company_id"`
	CompanyName    string        `json:"company_name"`
	Industry       string        `json:"industry"`
	BusinessType   string        `json:"business_type"`
	CompanyStatus  string        `json:"company_status"`
	Steps          []RoadmapStep `json:"steps"`
	CurrentStep    *RoadmapStep  `json:"current_step,omitempty"`
	NextAction     string        `json:"next_action"`
	ProgressRate   int           `json:"progress_rate"`
	TotalSteps     int           `json:"total_steps"`
	CompletedCount int           `json:"completed_count"`
}

type RoadmapSummaryItem struct {
	CompanyID        uuid.UUID `json:"company_id"`
	CompanyName      string    `json:"company_name"`
	CompanyStatus    string    `json:"company_status"`
	CurrentStepTitle string    `json:"current_step_title"`
	NextAction       string    `json:"next_action"`
	TargetDate       string    `json:"target_date"`
	TotalSteps       int       `json:"total_steps"`
	CompletedCount   int       `json:"completed_count"`
	ProgressRate     int       `json:"progress_rate"`
}

func getRoadmapUserID(c *gin.Context) (uuid.UUID, error) {
	return authenticatedUserID(c)
}

func parseRoadmapID(c *gin.Context, name, message string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil || id == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": message})
		return uuid.Nil, false
	}
	return id, true
}

func toRoadmapStep(step models.CompanyRoadmapStep) RoadmapStep {
	return RoadmapStep{ID: step.ID, CompanyID: step.CompanyID, UserID: step.UserID, StepOrder: step.StepOrder, Title: step.Title, Status: step.Status, TargetDate: step.TargetDate, NextAction: step.NextAction, Notes: step.Notes}
}

func GetCompanyRoadmapHandler(c *gin.Context) {
	companyID, ok := parseRoadmapID(c, "id", "不正な企業IDです")
	if !ok {
		return
	}
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var company models.Company
	if err := config.DB.Where("id = ? AND user_id = ?", companyID, uid).First(&company).Error; errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "企業が見つからないか、権限がありません"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の取得に失敗しました"})
		return
	}
	var records []models.CompanyRoadmapStep
	if err := config.DB.Where("company_id = ? AND user_id = ?", companyID, uid).Order("step_order ASC").Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ロードマップステップの取得に失敗しました"})
		return
	}
	steps := make([]RoadmapStep, 0, len(records))
	completed := 0
	var current, pending *RoadmapStep
	for _, record := range records {
		step := toRoadmapStep(record)
		steps = append(steps, step)
		if step.Status == "completed" {
			completed++
		} else if step.Status == "current" && current == nil {
			copy := step
			current = &copy
		} else if step.Status == "pending" && pending == nil {
			copy := step
			pending = &copy
		}
	}
	if current == nil {
		current = pending
	}
	nextAction := "ロードマップを作成して選考準備を進めましょう。"
	if current != nil {
		nextAction = current.NextAction
	} else if len(steps) > 0 && completed == len(steps) {
		nextAction = "全ステップ完了！選考お疲れ様でした。"
	}
	progress := 0
	if len(steps) > 0 {
		progress = completed * 100 / len(steps)
	}
	c.JSON(http.StatusOK, CompanyRoadmapResponse{
		CompanyID: company.ID, CompanyName: company.CompanyName, Industry: company.Industry,
		BusinessType: company.BusinessType, CompanyStatus: company.Status, Steps: steps,
		CurrentStep: current, NextAction: nextAction, ProgressRate: progress,
		TotalSteps: len(steps), CompletedCount: completed,
	})
}

type InitRoadmapRequest struct {
	Type        string        `json:"type"`
	CustomSteps []RoadmapStep `json:"custom_steps,omitempty"`
}

func InitCompanyRoadmapHandler(c *gin.Context) {
	companyID, ok := parseRoadmapID(c, "id", "不正な企業IDです")
	if !ok {
		return
	}
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var req InitRoadmapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Type = "template"
	}
	var company models.Company
	if err := config.DB.Where("id = ? AND user_id = ?", companyID, uid).First(&company).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "企業が見つかりません"})
		return
	}
	steps := req.CustomSteps
	if len(steps) == 0 {
		steps = []RoadmapStep{
			{Title: "企業研究・情報収集", Status: "completed", NextAction: "企業の強み・理念・求める人物像を整理する", Notes: "業界内での差別化ポイントを明確にしましょう。"},
			{Title: "エントリーシート提出・Webテスト", Status: "current", NextAction: "自己PRと志望動機を推敲し、適性検査対策を進める", Notes: "締切日時を厳守し、結論ファーストで構成しましょう。"},
			{Title: "一次面接", Status: "pending", NextAction: "自己紹介・ガクチカ・逆質問を準備する", Notes: "明るくハキハキと回答しましょう。"},
			{Title: "二次面接", Status: "pending", NextAction: "入社後の貢献方法を具体化する", Notes: "競合ではなくこの企業を選ぶ理由を整理しましょう。"},
			{Title: "最終面接", Status: "pending", NextAction: "入社への熱意と覚悟を整理する", Notes: "理念への共感とカルチャーマッチが重要です。"},
		}
	}
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("company_id = ? AND user_id = ?", companyID, uid).Delete(&models.CompanyRoadmapStep{}).Error; err != nil {
			return err
		}
		for i, step := range steps {
			record := models.CompanyRoadmapStep{CompanyID: companyID, UserID: uid, StepOrder: i + 1, Title: step.Title, Status: step.Status, TargetDate: step.TargetDate, NextAction: step.NextAction, Notes: step.Notes}
			if err := tx.Create(&record).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ロードマップの保存に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ロードマップを作成しました", "company_id": company.ID})
}

type AddStepRequest struct {
	Title      string `json:"title" binding:"required"`
	Status     string `json:"status"`
	TargetDate string `json:"target_date"`
	NextAction string `json:"next_action"`
	Notes      string `json:"notes"`
}

func AddRoadmapStepHandler(c *gin.Context) {
	companyID, ok := parseRoadmapID(c, "id", "不正な企業IDです")
	if !ok {
		return
	}
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var req AddStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}
	var count int64
	config.DB.Model(&models.CompanyRoadmapStep{}).Where("company_id = ? AND user_id = ?", companyID, uid).Count(&count)
	status := req.Status
	if status == "" {
		status = "pending"
	}
	record := models.CompanyRoadmapStep{CompanyID: companyID, UserID: uid, StepOrder: int(count) + 1, Title: req.Title, Status: status, TargetDate: req.TargetDate, NextAction: req.NextAction, Notes: req.Notes}
	if err := config.DB.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステップ追加に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ステップを追加しました", "id": record.ID})
}

type UpdateStepRequest struct {
	Title      string `json:"title"`
	Status     string `json:"status"`
	TargetDate string `json:"target_date"`
	NextAction string `json:"next_action"`
	Notes      string `json:"notes"`
}

func UpdateRoadmapStepHandler(c *gin.Context) {
	stepID, ok := parseRoadmapID(c, "step_id", "不正なステップIDです")
	if !ok {
		return
	}
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var req UpdateStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}
	result := config.DB.Model(&models.CompanyRoadmapStep{}).Where("id = ? AND user_id = ?", stepID, uid).Updates(map[string]interface{}{"title": req.Title, "status": req.Status, "target_date": req.TargetDate, "next_action": req.NextAction, "notes": req.Notes})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステップ更新に失敗しました: " + result.Error.Error()})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ステップが見つからないか、権限がありません"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ステップを更新しました"})
}

func DeleteRoadmapStepHandler(c *gin.Context) {
	stepID, ok := parseRoadmapID(c, "step_id", "不正なステップIDです")
	if !ok {
		return
	}
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	result := config.DB.Where("id = ? AND user_id = ?", stepID, uid).Delete(&models.CompanyRoadmapStep{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステップ削除に失敗しました"})
		return
	}
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ステップが見つかりません"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ステップを削除しました"})
}

type SetCurrentStepRequest struct {
	StepID                uuid.UUID `json:"step_id" binding:"required"`
	MarkPreviousCompleted bool      `json:"mark_previous_completed"`
	SyncCompanyStatus     bool      `json:"sync_company_status"`
}

func SetCurrentRoadmapStepHandler(c *gin.Context) {
	companyID, ok := parseRoadmapID(c, "id", "不正な企業IDです")
	if !ok {
		return
	}
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var req SetCurrentStepRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.StepID == uuid.Nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "step_id は必須です"})
		return
	}
	var selected models.CompanyRoadmapStep
	if err := config.DB.Where("id = ? AND company_id = ? AND user_id = ?", req.StepID, companyID, uid).First(&selected).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "指定ステップが見つかりません"})
		return
	}
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if req.MarkPreviousCompleted {
			if err := tx.Model(&models.CompanyRoadmapStep{}).Where("company_id = ? AND user_id = ? AND step_order < ?", companyID, uid, selected.StepOrder).Update("status", "completed").Error; err != nil {
				return err
			}
			if err := tx.Model(&models.CompanyRoadmapStep{}).Where("company_id = ? AND user_id = ? AND step_order > ? AND status = ?", companyID, uid, selected.StepOrder, "current").Update("status", "pending").Error; err != nil {
				return err
			}
		} else if err := tx.Model(&models.CompanyRoadmapStep{}).Where("company_id = ? AND user_id = ? AND status = ?", companyID, uid, "current").Update("status", "pending").Error; err != nil {
			return err
		}
		if err := tx.Model(&models.CompanyRoadmapStep{}).Where("id = ? AND company_id = ? AND user_id = ?", req.StepID, companyID, uid).Update("status", "current").Error; err != nil {
			return err
		}
		if req.SyncCompanyStatus {
			status := "面接中"
			title := strings.ToLower(selected.Title)
			if strings.Contains(selected.Title, "ES") || strings.Contains(selected.Title, "エントリーシート") || strings.Contains(selected.Title, "書類") || strings.Contains(selected.Title, "テスト") {
				status = "書類選考中"
			} else if strings.Contains(selected.Title, "企業研究") || strings.Contains(selected.Title, "情報収集") {
				status = "エントリー前"
			} else if strings.Contains(selected.Title, "内定") || strings.Contains(selected.Title, "オファー") {
				status = "内定"
			} else if !strings.Contains(title, "面接") && !strings.Contains(title, "面談") && !strings.Contains(title, "選考") {
				status = "面接中"
			}
			return tx.Model(&models.Company{}).Where("id = ? AND user_id = ?", companyID, uid).Update("status", status).Error
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "現在地の更新に失敗しました: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "現在地を更新しました！", "step_id": req.StepID})
}

func GetRoadmapSummaryHandler(c *gin.Context) {
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var companies []models.Company
	if err := config.DB.Where("user_id = ?", uid).Order("id DESC").Find(&companies).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業リストの取得に失敗しました"})
		return
	}
	summary := make([]RoadmapSummaryItem, 0, len(companies))
	for _, company := range companies {
		var steps []models.CompanyRoadmapStep
		config.DB.Where("company_id = ? AND user_id = ?", company.ID, uid).Order("step_order ASC").Find(&steps)
		item := RoadmapSummaryItem{CompanyID: company.ID, CompanyName: company.CompanyName, CompanyStatus: company.Status, TotalSteps: len(steps)}
		for _, step := range steps {
			if step.Status == "completed" {
				item.CompletedCount++
			} else if step.Status == "current" && item.CurrentStepTitle == "" {
				item.CurrentStepTitle, item.NextAction, item.TargetDate = step.Title, step.NextAction, step.TargetDate
			}
		}
		if item.TotalSteps > 0 {
			item.ProgressRate = item.CompletedCount * 100 / item.TotalSteps
		}
		summary = append(summary, item)
	}
	c.JSON(http.StatusOK, summary)
}

type RoadmapAdviceRequest struct {
	Focus string `json:"focus"`
}

func GetRoadmapAdviceHandler(c *gin.Context) {
	companyID, ok := parseRoadmapID(c, "id", "不正な企業IDです")
	if !ok {
		return
	}
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}
	var company models.Company
	if err := config.DB.Where("id = ? AND user_id = ?", companyID, uid).First(&company).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "企業が見つかりません"})
		return
	}
	var step models.CompanyRoadmapStep
	config.DB.Where("company_id = ? AND user_id = ? AND status = ?", companyID, uid, "current").First(&step)
	c.JSON(http.StatusOK, gin.H{"advice": "現在のステップ「" + step.Title + "」に集中し、次のアクションを具体化しましょう。", "company": company.CompanyName})
}
