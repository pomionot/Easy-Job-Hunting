package handlers

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"Easy-Job-Hunting/config"

	"github.com/gin-gonic/gin"
)

// RoadmapStep 企業ごとの選考ロードマップステップ
type RoadmapStep struct {
	ID         int    `json:"id"`
	CompanyID  int    `json:"company_id"`
	UserID     int    `json:"user_id"`
	StepOrder  int    `json:"step_order"`
	Title      string `json:"title"`
	Status     string `json:"status"` // "completed", "current", "pending", "skipped"
	TargetDate string `json:"target_date"`
	NextAction string `json:"next_action"`
	Notes      string `json:"notes"`
	CreatedAt  string `json:"created_at,omitempty"`
	UpdatedAt  string `json:"updated_at,omitempty"`
}

// CompanyRoadmapResponse ロードマップ詳細画面用レスポンス
type CompanyRoadmapResponse struct {
	CompanyID      int           `json:"company_id"`
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

// RoadmapSummaryItem 企業一覧・ダッシュボード用サマリー
type RoadmapSummaryItem struct {
	CompanyID        int    `json:"company_id"`
	CompanyName      string `json:"company_name"`
	CompanyStatus    string `json:"company_status"`
	CurrentStepTitle string `json:"current_step_title"`
	NextAction       string `json:"next_action"`
	TargetDate       string `json:"target_date"`
	TotalSteps       int    `json:"total_steps"`
	CompletedCount   int    `json:"completed_count"`
	ProgressRate     int    `json:"progress_rate"`
}

func getRoadmapUserID(c *gin.Context) (int64, error) {
	if uidParam := c.Query("uid"); uidParam != "" {
		uid, err := strconv.ParseInt(uidParam, 10, 64)
		if err == nil && uid > 0 {
			return uid, nil
		}
	}
	if emailParam := c.Query("email"); emailParam != "" {
		var uid int64
		if err := config.DB.QueryRow("SELECT id FROM users WHERE email = ?", emailParam).Scan(&uid); err == nil && uid > 0 {
			return uid, nil
		}
	}
	return 0, fmt.Errorf("ログイン情報（ユーザーIDまたはメールアドレス）が不足しています")
}

// ==========================================
// 1. 取得: 指定企業のロードマップ
// ==========================================
func GetCompanyRoadmapHandler(c *gin.Context) {
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な企業IDです"})
		return
	}

	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var compResp CompanyRoadmapResponse
	compQuery := `SELECT id, company_name, industry, business_type, status 
	              FROM companies 
	              WHERE id = ? AND user_id = ?;`
	err = config.DB.QueryRow(compQuery, companyID, uid).Scan(
		&compResp.CompanyID,
		&compResp.CompanyName,
		&compResp.Industry,
		&compResp.BusinessType,
		&compResp.CompanyStatus,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "企業が見つからないか、権限がありません"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の取得に失敗しました"})
		return
	}

	stepsQuery := `SELECT id, company_id, user_id, step_order, title, status, target_date, next_action, notes
	               FROM company_roadmap_steps
	               WHERE company_id = ? AND user_id = ?
	               ORDER BY step_order ASC;`
	rows, err := config.DB.Query(stepsQuery, companyID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ロードマップステップの取得に失敗しました"})
		return
	}
	defer rows.Close()

	var steps []RoadmapStep
	completedCount := 0
	var currentStep *RoadmapStep
	var firstPendingStep *RoadmapStep

	for rows.Next() {
		var step RoadmapStep
		var targetDate, nextAction, notes sql.NullString
		if err := rows.Scan(&step.ID, &step.CompanyID, &step.UserID, &step.StepOrder, &step.Title, &step.Status, &targetDate, &nextAction, &notes); err != nil {
			continue
		}
		if targetDate.Valid {
			step.TargetDate = targetDate.String
		}
		if nextAction.Valid {
			step.NextAction = nextAction.String
		}
		if notes.Valid {
			step.Notes = notes.String
		}

		if step.Status == "completed" {
			completedCount++
		} else if step.Status == "current" && currentStep == nil {
			stepCopy := step
			currentStep = &stepCopy
		} else if step.Status == "pending" && firstPendingStep == nil {
			stepCopy := step
			firstPendingStep = &stepCopy
		}

		steps = append(steps, step)
	}

	if steps == nil {
		steps = []RoadmapStep{}
	}

	// currentが明示されておらず、未完了ステップがあれば最初のpendingを現在地とみなす
	if currentStep == nil && firstPendingStep != nil {
		currentStep = firstPendingStep
	}

	compResp.Steps = steps
	compResp.CurrentStep = currentStep
	compResp.TotalSteps = len(steps)
	compResp.CompletedCount = completedCount

	if currentStep != nil {
		compResp.NextAction = currentStep.NextAction
	} else if len(steps) > 0 && completedCount == len(steps) {
		compResp.NextAction = "全ステップ完了！選考お疲れ様でした。"
	} else {
		compResp.NextAction = "ロードマップを作成して選考準備を進めましょう。"
	}

	if compResp.TotalSteps > 0 {
		compResp.ProgressRate = (completedCount * 100) / compResp.TotalSteps
	} else {
		compResp.ProgressRate = 0
	}

	c.JSON(http.StatusOK, compResp)
}

// ==========================================
// 2. 初期化: テンプレートまたはAIでロードマップ作成
// ==========================================
type InitRoadmapRequest struct {
	Type        string        `json:"type"` // "template" または "ai"
	CustomSteps []RoadmapStep `json:"custom_steps,omitempty"`
}

func InitCompanyRoadmapHandler(c *gin.Context) {
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な企業IDです"})
		return
	}

	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req InitRoadmapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		req.Type = "template"
	}

	// 企業情報の確認
	var compName, industry, businessType string
	err = config.DB.QueryRow("SELECT company_name, industry, business_type FROM companies WHERE id = ? AND user_id = ?", companyID, uid).Scan(&compName, &industry, &businessType)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "企業が見つかりません"})
		return
	}

	type GeneratedStep struct {
		Title      string `json:"title"`
		Status     string `json:"status"`
		TargetDate string `json:"target_date"`
		NextAction string `json:"next_action"`
		Notes      string `json:"notes"`
	}

	var newSteps []GeneratedStep

	if req.Type == "ai" {
		// AI (Gemini) によるロードマップ自動生成
		apiKey := os.Getenv("GEMINI_API_KEY")
		if apiKey != "" {
			// プロフィール情報の取得
			var university, faculty, targetIndustry, selfPR string
			_ = config.DB.QueryRow("SELECT university, faculty, target_industry, self_pr FROM profiles WHERE user_id = ?", uid).Scan(&university, &faculty, &targetIndustry, &selfPR)

			model := os.Getenv("GEMINI_MODEL")
			if model == "" {
				model = "gemini-2.5-flash"
			}
			geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

			prompt := fmt.Sprintf(`あなたは就職活動の専任メンターです。
以下の企業情報および就活生のプロフィールを分析し、この企業で内定を獲得するための具体的な「選考ロードマップ（5〜7ステップ）」を考案してください。

【企業情報】
・企業名: %s
・業界: %s
・業種: %s

【就活生プロフィール】
・大学/学部: %s %s
・志望業界: %s
・自己PR・強み: %s

【出力フォーマット】
必ず以下のキーを持つJSONオブジェクトのみを出力してください。説明文やマークダウンのバッククォートは不要です。
{
  "steps": [
    {
      "title": "ステップ名（例: 企業研究・OB訪問 / ES提出・Webテスト / 1次面接 / 2次面接 / 最終面接 / 内定など）",
      "status": "pending", // 1番目はcompleted、2番目はcurrent、以降はpendingにしてください
      "next_action": "このステップで現在地となった際に【次に行うべき具体的なToDo・アクション】（1〜2文で明確に具体化）",
      "notes": "選考突破のコツやアドバイス"
    }
  ]
}
`, compName, industry, businessType, university, faculty, targetIndustry, selfPR)

			geminiReq := GeminiRequest{
				Contents: []GeminiContent{
					{Parts: []GeminiPart{{Text: prompt}}},
				},
			}
			jsonData, _ := json.Marshal(geminiReq)
			client := &http.Client{Timeout: 20 * time.Second}
			resp, err := client.Post(geminiURL, "application/json", bytes.NewBuffer(jsonData))
			if err == nil && resp.StatusCode == http.StatusOK {
				bodyBytes, _ := io.ReadAll(resp.Body)
				resp.Body.Close()

				var gResp GeminiResponse
				if err := json.Unmarshal(bodyBytes, &gResp); err == nil && len(gResp.Candidates) > 0 && len(gResp.Candidates[0].Content.Parts) > 0 {
					rawText := strings.TrimSpace(gResp.Candidates[0].Content.Parts[0].Text)
					rawText = strings.TrimPrefix(rawText, "```json")
					rawText = strings.TrimPrefix(rawText, "```")
					rawText = strings.TrimSuffix(rawText, "```")
					rawText = strings.TrimSpace(rawText)

					var parsed struct {
						Steps []GeneratedStep `json:"steps"`
					}
					if err := json.Unmarshal([]byte(rawText), &parsed); err == nil && len(parsed.Steps) > 0 {
						newSteps = parsed.Steps
					}
				}
			}
		}
	}

	// AI生成されなかった場合、またはtemplate指定時のデフォルト選考フロー
	if len(newSteps) == 0 {
		newSteps = []GeneratedStep{
			{
				Title:      "企業研究・情報収集",
				Status:     "completed",
				NextAction: "企業の強み・理念・求める人物像の整理、採用ページやIR資料の確認",
				Notes:      "業界内での差別化ポイントを明確にしておきましょう。",
			},
			{
				Title:      "エントリーシート提出・Webテスト",
				Status:     "current",
				NextAction: "自己PRと志望動機の推敲・提出、適性検査対策の復習",
				Notes:      "締切日時の厳守と結論ファーストでの論理構成を意識してください。",
			},
			{
				Title:      "一次面接（人事・現場社員）",
				Status:     "pending",
				NextAction: "1分間自己紹介・ガクチカの準備、逆質問の用意（2〜3問）",
				Notes:      "人物面重視。明るくハキハキと結論から回答することがポイントです。",
			},
			{
				Title:      "二次面接（部門責任者）",
				Status:     "pending",
				NextAction: "事業内容への深い理解と、入社後にどう貢献できるかの具体化",
				Notes:      "なぜ競合他社ではなくこの企業なのかを自分の言葉で論理的に説明できるようにします。",
			},
			{
				Title:      "最終面接（役員・社長）",
				Status:     "pending",
				NextAction: "入社への強い熱意と覚悟の整理、役員への深い逆質問の精査",
				Notes:      "理念への共感度とカルチャーマッチ、定着意思が重視されます。",
			},
			{
				Title:      "内定・オファー面談",
				Status:     "pending",
				NextAction: "提示された労働条件や福利厚生の確認、承諾期限の把握と就活全体の意思決定",
				Notes:      "疑問点があれば面談で率直に確認しましょう。",
			},
		}
	}

	// 既存ステップを削除して再登録
	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "トランザクション開始に失敗しました"})
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec("DELETE FROM company_roadmap_steps WHERE company_id = ? AND user_id = ?", companyID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "既存ステップの削除に失敗しました"})
		return
	}

	insertQuery := `INSERT INTO company_roadmap_steps (company_id, user_id, step_order, title, status, target_date, next_action, notes)
	                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	for i, step := range newSteps {
		status := step.Status
		if status == "" {
			if i == 0 {
				status = "completed"
			} else if i == 1 {
				status = "current"
			} else {
				status = "pending"
			}
		}
		_, err := tx.Exec(insertQuery, companyID, uid, i+1, step.Title, status, step.TargetDate, step.NextAction, step.Notes)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "ロードマップステップの保存に失敗しました: " + err.Error()})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ロードマップの保存確定に失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "就活ロードマップを正常に作成しました！",
		"steps_count": len(newSteps),
	})
}

// ==========================================
// 3. ステップ追加
// ==========================================
type AddStepRequest struct {
	Title      string `json:"title" binding:"required"`
	Status     string `json:"status"`
	TargetDate string `json:"target_date"`
	NextAction string `json:"next_action"`
	Notes      string `json:"notes"`
}

func AddRoadmapStepHandler(c *gin.Context) {
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な企業IDです"})
		return
	}

	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req AddStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ステップ名(title)は必須です"})
		return
	}

	if req.Status == "" {
		req.Status = "pending"
	}

	var maxOrder int
	_ = config.DB.QueryRow("SELECT COALESCE(MAX(step_order), 0) FROM company_roadmap_steps WHERE company_id = ? AND user_id = ?", companyID, uid).Scan(&maxOrder)

	query := `INSERT INTO company_roadmap_steps (company_id, user_id, step_order, title, status, target_date, next_action, notes)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	result, err := config.DB.Exec(query, companyID, uid, maxOrder+1, req.Title, req.Status, req.TargetDate, req.NextAction, req.Notes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステップ追加に失敗しました: " + err.Error()})
		return
	}

	newID, _ := result.LastInsertId()
	c.JSON(http.StatusOK, gin.H{
		"message": "ステップを追加しました",
		"id":      newID,
	})
}

// ==========================================
// 4. ステップ更新
// ==========================================
type UpdateStepRequest struct {
	Title      string `json:"title"`
	Status     string `json:"status"`
	TargetDate string `json:"target_date"`
	NextAction string `json:"next_action"`
	Notes      string `json:"notes"`
	StepOrder  *int   `json:"step_order,omitempty"`
}

func UpdateRoadmapStepHandler(c *gin.Context) {
	stepIDStr := c.Param("step_id")
	stepID, err := strconv.Atoi(stepIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なステップIDです"})
		return
	}

	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req UpdateStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}

	query := `UPDATE company_roadmap_steps 
	          SET title = ?, status = ?, target_date = ?, next_action = ?, notes = ?
	          WHERE id = ? AND user_id = ?`
	result, err := config.DB.Exec(query, req.Title, req.Status, req.TargetDate, req.NextAction, req.Notes, stepID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステップ更新に失敗しました: " + err.Error()})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ステップが見つからないか、権限がありません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ステップを更新しました"})
}

// ==========================================
// 5. ステップ削除
// ==========================================
func DeleteRoadmapStepHandler(c *gin.Context) {
	stepIDStr := c.Param("step_id")
	stepID, err := strconv.Atoi(stepIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正なステップIDです"})
		return
	}

	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := "DELETE FROM company_roadmap_steps WHERE id = ? AND user_id = ?"
	result, err := config.DB.Exec(query, stepID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ステップ削除に失敗しました"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "ステップが見つかりません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "ステップを削除しました"})
}

// ==========================================
// 6. 現在地（Current Step）の変更・進行
// ==========================================
type SetCurrentStepRequest struct {
	StepID                int  `json:"step_id" binding:"required"`
	MarkPreviousCompleted bool `json:"mark_previous_completed"`
	SyncCompanyStatus     bool `json:"sync_company_status"`
}

func SetCurrentRoadmapStepHandler(c *gin.Context) {
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な企業IDです"})
		return
	}

	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req SetCurrentStepRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "step_id は必須です"})
		return
	}

	// 選択ステップの順序を取得
	var currentOrder int
	var currentTitle string
	err = config.DB.QueryRow(
		"SELECT step_order, title FROM company_roadmap_steps WHERE id = ? AND company_id = ? AND user_id = ?",
		req.StepID, companyID, uid,
	).Scan(&currentOrder, &currentTitle)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "指定ステップが見つかりません"})
		return
	}

	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "トランザクション開始に失敗しました"})
		return
	}
	defer tx.Rollback()

	if req.MarkPreviousCompleted {
		// 以前のステップをcompleted、以降でcompletedでないステップをpendingに整える
		_, _ = tx.Exec(
			"UPDATE company_roadmap_steps SET status = 'completed' WHERE company_id = ? AND user_id = ? AND step_order < ?",
			companyID, uid, currentOrder,
		)
		_, _ = tx.Exec(
			"UPDATE company_roadmap_steps SET status = 'pending' WHERE company_id = ? AND user_id = ? AND step_order > ? AND status = 'current'",
			companyID, uid, currentOrder,
		)
	} else {
		// 他のcurrentをpendingにする
		_, _ = tx.Exec(
			"UPDATE company_roadmap_steps SET status = 'pending' WHERE company_id = ? AND user_id = ? AND status = 'current'",
			companyID, uid,
		)
	}

	// 指定ステップを current に設定
	_, err = tx.Exec(
		"UPDATE company_roadmap_steps SET status = 'current' WHERE id = ? AND company_id = ? AND user_id = ?",
		req.StepID, companyID, uid,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "現在地の更新に失敗しました"})
		return
	}

	// 企業の選考ステータス連動（任意）
	if req.SyncCompanyStatus {
		mappedStatus := "面接中"
		lowerTitle := strings.ToLower(currentTitle)
		if strings.Contains(currentTitle, "ES") || strings.Contains(currentTitle, "エントリーシート") || strings.Contains(currentTitle, "書類") || strings.Contains(currentTitle, "テスト") {
			mappedStatus = "書類選考中"
		} else if strings.Contains(currentTitle, "企業研究") || strings.Contains(currentTitle, "情報収集") || strings.Contains(currentTitle, "エントリー前") {
			mappedStatus = "エントリー前"
		} else if strings.Contains(currentTitle, "内定") || strings.Contains(currentTitle, "オファー") {
			mappedStatus = "内定"
		} else if strings.Contains(lowerTitle, "面接") || strings.Contains(lowerTitle, "面談") || strings.Contains(lowerTitle, "選考") {
			mappedStatus = "面接中"
		}
		_, _ = tx.Exec("UPDATE companies SET status = ? WHERE id = ? AND user_id = ?", mappedStatus, companyID, uid)
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "コミットに失敗しました"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "現在地を更新しました！",
		"step_id": req.StepID,
	})
}

// ==========================================
// 7. 全企業のロードマップ概要（サマリー）取得
// ==========================================
func GetRoadmapSummaryHandler(c *gin.Context) {
	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 企業の取得
	compRows, err := config.DB.Query("SELECT id, company_name, status FROM companies WHERE user_id = ? ORDER BY id DESC", uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業リストの取得に失敗しました"})
		return
	}
	defer compRows.Close()

	var summaryList []RoadmapSummaryItem

	for compRows.Next() {
		var compID int
		var compName, compStatus string
		if err := compRows.Scan(&compID, &compName, &compStatus); err != nil {
			continue
		}

		// ステップ情報を取得
		stepRows, err := config.DB.Query(
			"SELECT title, status, target_date, next_action FROM company_roadmap_steps WHERE company_id = ? AND user_id = ? ORDER BY step_order ASC",
			compID, uid,
		)
		if err != nil {
			continue
		}

		total := 0
		completed := 0
		currentTitle := ""
		nextAction := ""
		targetDate := ""
		firstPendingTitle := ""
		firstPendingAction := ""
		firstPendingDate := ""

		for stepRows.Next() {
			var t, s, td, na sql.NullString
			if err := stepRows.Scan(&t, &s, &td, &na); err != nil {
				continue
			}
			total++
			if s.Valid && s.String == "completed" {
				completed++
			} else if s.Valid && s.String == "current" && currentTitle == "" {
				currentTitle = t.String
				nextAction = na.String
				targetDate = td.String
			} else if s.Valid && s.String == "pending" && firstPendingTitle == "" {
				firstPendingTitle = t.String
				firstPendingAction = na.String
				firstPendingDate = td.String
			}
		}
		stepRows.Close()

		if currentTitle == "" && firstPendingTitle != "" {
			currentTitle = firstPendingTitle
			nextAction = firstPendingAction
			targetDate = firstPendingDate
		}

		progress := 0
		if total > 0 {
			progress = (completed * 100) / total
		}

		if total == 0 {
			currentTitle = "未作成"
			nextAction = "ロードマップを作成して選考スケジュールを可視化しましょう"
		} else if currentTitle == "" && completed == total {
			currentTitle = "全工程完了"
			nextAction = "選考終了"
		}

		summaryList = append(summaryList, RoadmapSummaryItem{
			CompanyID:        compID,
			CompanyName:      compName,
			CompanyStatus:    compStatus,
			CurrentStepTitle: currentTitle,
			NextAction:       nextAction,
			TargetDate:       targetDate,
			TotalSteps:       total,
			CompletedCount:   completed,
			ProgressRate:     progress,
		})
	}

	if summaryList == nil {
		summaryList = []RoadmapSummaryItem{}
	}

	c.JSON(http.StatusOK, summaryList)
}

// ==========================================
// 8. AIによる現在地ステップの具体的対策アドバイス
// ==========================================
type RoadmapAdviceRequest struct {
	StepTitle  string `json:"step_title"`
	NextAction string `json:"next_action"`
}

func GetRoadmapAdviceHandler(c *gin.Context) {
	companyIDStr := c.Param("id")
	companyID, err := strconv.Atoi(companyIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不正な企業IDです"})
		return
	}

	uid, err := getRoadmapUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var req RoadmapAdviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエスト形式が不正です"})
		return
	}

	var compName, industry, businessType string
	err = config.DB.QueryRow("SELECT company_name, industry, business_type FROM companies WHERE id = ? AND user_id = ?", companyID, uid).Scan(&compName, &industry, &businessType)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "企業が見つかりません"})
		return
	}

	var selfPR, targetIndustry string
	_ = config.DB.QueryRow("SELECT COALESCE(self_pr, ''), COALESCE(target_industry, '') FROM profiles WHERE user_id = ?", uid).Scan(&selfPR, &targetIndustry)

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		// APIキー未設定時のフォールバックアドバイス
		fallback := fmt.Sprintf("【%s選考アドバイス】\n現在地「%s」に向けて、次のアクション（%s）を着実に進めましょう。\n\n◆ ポイント:\n1. 企業の事業理解と競合との違いを再確認\n2. 結論ファーストで簡潔に話す練習\n3. 企業の最新ニュースやプレスリリースのチェック", compName, req.StepTitle, req.NextAction)
		c.JSON(http.StatusOK, gin.H{"advice": fallback})
		return
	}

	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-2.5-flash"
	}
	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

	prompt := fmt.Sprintf(`あなたは優秀な就活キャリアアドバイザーです。
就活生が現在【%s】の選考フェーズ「%s」に臨んでいます。
次に行うべきアクション「%s」をより確実に成功させるための、実践的で具体的なアクションアドバイスと注意点を3点アドバイスしてください。

【企業情報】
・企業名: %s
・業界: %s / %s

【就活生プロフィール】
・志望業界: %s
・自己PR・強み: %s

【出力フォーマット】
以下の構成でマークダウン形式で簡潔に出力してください:
### 🎯 「%s」突破のためのアクション指針
1. **[アクション名]**: 具体的な進め方と準備ポイント
2. **[アクション名]**: 企業（%s）に刺さるアピールの工夫
3. **[アクション名]**: 当日の注意点・チェックリスト
`, compName, req.StepTitle, req.NextAction, compName, industry, businessType, targetIndustry, selfPR, req.StepTitle, compName)

	geminiReq := GeminiRequest{
		Contents: []GeminiContent{
			{Parts: []GeminiPart{{Text: prompt}}},
		},
	}
	jsonData, _ := json.Marshal(geminiReq)
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Post(geminiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"advice": "アドバイスの取得に失敗しました。少し時間を置いてお試しください。"})
		return
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	var gResp GeminiResponse
	if err := json.Unmarshal(bodyBytes, &gResp); err != nil || len(gResp.Candidates) == 0 || len(gResp.Candidates[0].Content.Parts) == 0 {
		c.JSON(http.StatusOK, gin.H{"advice": "アドバイスの生成結果をパースできませんでした。"})
		return
	}

	adviceText := gResp.Candidates[0].Content.Parts[0].Text
	c.JSON(http.StatusOK, gin.H{"advice": adviceText})
}
