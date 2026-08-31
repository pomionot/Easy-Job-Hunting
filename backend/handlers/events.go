package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"Easy-Job-Hunting/config"

	"github.com/gin-gonic/gin"
)

// Event イベント（面接・説明会等）の構造体
type Event struct {
	ID                int    `json:"id"`
	Date              string `json:"date"`
	Company           string `json:"company"`
	Title             string `json:"title"`
	Time              string `json:"time"` // "HH:MM - HH:MM" の形式
	Description       string `json:"description,omitempty"`
	CreatedFromMailID string `json:"created_from_mail_id,omitempty"`
}

// ExtractedEventData メール本文から抽出されたイベント情報
type ExtractedEventData struct {
	Company    string  `json:"company"`
	Title      string  `json:"title"`
	Date       string  `json:"date"`       // YYYY-MM-DD
	StartTime  string  `json:"start_time"` // HH:MM
	EndTime    string  `json:"end_time"`   // HH:MM
	Notes      string  `json:"notes,omitempty"`
	Confidence float64 `json:"confidence"` // 0-1 の信頼度
}

// EventExtractRequest イベント抽出リクエスト
type EventExtractRequest struct {
	MailID  string `json:"mail_id"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
	From    string `json:"from"`
}

// ==========================================
// 1. 🗓️ メール本文からイベント情報を抽出
// ==========================================
func ExtractEventFromMailHandler(c *gin.Context) {
	var req EventExtractRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの形式が正しくありません"})
		return
	}

	if req.Subject == "" || req.Body == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "メールの件名と本文が必要です"})
		return
	}

	// Gemini APIキーの取得
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GeminiのAPIキーが設定されていません"})
		return
	}

	// プロンプトの作成：メール本文からイベント情報を抽出
	today := time.Now().Format("2006-01-02")
	systemPrompt := fmt.Sprintf(`あなたは就活メールの日程管理AIアシスタントです。
以下のメール内容から、面接や説明会などのイベント情報を抽出してください。
基準日は%sです。メールに年がない日付は、基準日以降で最も自然な年を補完してください。

【メール情報】
件名: %s
差出人: %s
本文:
%s

【抽出するべき情報】
- company: 企業名（企業名が明記されていなければ差出人から推測）
- title: イベントの種類（例：一次選考、二次面接、会社説明会、グループディスカッション等）
- date: 開催日（YYYY-MM-DD形式。「2026年12月10日」「12/10」「12月10日」「12月10日(火)」などを認識し、年がない場合は基準日から補完。明日・来週なども計算）
- start_time: 開始時刻（HH:MM形式）
- end_time: 終了時刻（HH:MM形式。不明な場合は start_time から1時間後を設定）
- notes: その他の重要な情報（開催地、その他注意事項など）
- confidence: 日程情報の確実性（0-1）。日時が明確なら0.9以上、推測含む場合は0.5-0.8

【出力形式】
以下のJSON形式で必ず応答してください。
イベントが見つかった場合は has_event=true、見つからない場合は has_event=false を指定してください。

{
  "has_event": true,
  "events": [
    {
      "company": "企業名",
      "title": "イベント種別",
      "date": "2026-05-25",
      "start_time": "14:00",
      "end_time": "15:00",
      "notes": "その他情報",
      "confidence": 0.95
    }
  ]
}

イベントが見つからない場合（日時やイベントの意図が本文から本当に判断できない場合のみ）：
{
  "has_event": false,
  "events": []
}

【重要なルール】
- メール本文に開催日と開始時刻があれば、終了時刻がなくてもイベントとして抽出し、終了時刻は開始時刻の1時間後にする
- 「面接」「面談」「説明会」「選考」「座談会」「インターン」「セミナー」「訪問」などの開催予定をイベントとして抽出
- 「エントリー締切」「提出期限」など日時を伴う期限も、カレンダーに登録できるイベントとして抽出し、titleに「締切」または「提出期限」を含める
- 日付は必ずYYYY-MM-DD形式で、メールに書かれた年または基準日から補完した有効な日付を使用
- 時刻は24時間形式（HH:MM）で統一
- 曜日だけで具体的な日付を推測できない場合は has_event=false とする
- JSONだけを返す。説明やマークダウンは含めない。
- 必ず { } で囲まれた有効なJSONを返してください。`, today, req.Subject, req.From, req.Body)

	// Gemini APIへのリクエスト。モデルは環境変数で差し替え可能にする。
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3.6-flash"
	}
	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)

	geminiReqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: systemPrompt},
				},
			},
		},
		GenerationConfig: map[string]interface{}{
			"responseMimeType": "application/json",
		},
	}

	jsonData, _ := json.Marshal(geminiReqBody)
	var resp *http.Response
	var body []byte
	var err error
	for attempt := 1; attempt <= 3; attempt++ {
		resp, err = http.Post(geminiURL, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			log.Printf("❌ [extract-event] Gemini API通信エラー: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini APIへの通信に失敗しました: " + err.Error()})
			return
		}

		body, _ = io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode != http.StatusServiceUnavailable && resp.StatusCode != http.StatusTooManyRequests || attempt == 3 {
			break
		}

		wait := time.Duration(1<<(attempt-1)) * time.Second
		log.Printf("⚠️ [extract-event] Gemini APIが混雑中です。%d秒後に再試行します (%d/3)", wait, attempt)
		time.Sleep(wait)
	}

	log.Printf("📊 [extract-event] Gemini APIレスポンス (ステータス: %d):\n%s", resp.StatusCode, string(body))

	// ステータスコード確認
	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{
			"error":   "Gemini APIがエラーを返しました",
			"status":  resp.StatusCode,
			"details": string(body),
		})
		return
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
		Error *struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil {
		log.Printf("❌ [extract-event] JSONパースエラー: %v\nボディ: %s", err, string(body))
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Geminiレスポンスの解析に失敗しました",
			"details": string(body),
		})
		return
	}

	// APIエラーレスポンスの確認
	if geminiResp.Error != nil {
		log.Printf("❌ [extract-event] Gemini APIエラー: Code=%d, Message=%s", geminiResp.Error.Code, geminiResp.Error.Message)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Gemini APIエラー: " + geminiResp.Error.Message,
			"details": geminiResp.Error.Message,
		})
		return
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		log.Printf("⚠️  [extract-event] イベント情報が見つかりません")
		c.JSON(http.StatusOK, gin.H{"has_event": false, "events": []interface{}{}})
		return
	}

	responseText := strings.TrimSpace(geminiResp.Candidates[0].Content.Parts[0].Text)
	responseText = strings.TrimPrefix(responseText, "```json")
	responseText = strings.TrimPrefix(responseText, "```")
	responseText = strings.TrimSuffix(responseText, "```")
	responseText = strings.TrimSpace(responseText)
	log.Printf("🤖 [extract-event] AIレスポンステキスト:\n%s", responseText)

	// JSONレスポンスをパース
	var extractedResp struct {
		Events   []ExtractedEventData `json:"events"`
		HasEvent bool                 `json:"has_event"`
	}

	if err := json.Unmarshal([]byte(responseText), &extractedResp); err != nil {
		log.Printf("⚠️  [extract-event] イベント JSON パースエラー: %v\nテキスト: %s", err, responseText)
		c.JSON(http.StatusOK, gin.H{
			"has_event":    false,
			"events":       []interface{}{},
			"raw_response": responseText,
		})
		return
	}

	log.Printf("✅ [extract-event] 抽出成功: %d件のイベント", len(extractedResp.Events))
	c.JSON(http.StatusOK, extractedResp)
}

// ==========================================
// 2. 📅 イベント一覧を取得
// ==========================================
func GetEventsHandler(c *gin.Context) {
	_, _, err := resolveUserAccessToken(c)
	if err != nil {
		// ユーザーID指定がない場合はダミーデータを返す（Dashboard用）
		jsonEvents := `[
			{"id": 1, "date": "2026-05-25", "company": "株式会社スタンバイ", "title": "一次選考（オンライン面接）", "time": "14:00 - 15:00"},
			{"id": 2, "date": "2026-05-25", "company": "未来ソリューションズ", "title": "会社説明会", "time": "16:00 - 17:30"},
			{"id": 3, "date": "2026-05-28", "company": "TechInnovation", "title": "最終面接（対面）", "time": "11:00 - 12:00"}
		]`
		c.Data(200, "application/json", []byte(jsonEvents))
		return
	}

	// ユーザーIDを取得
	var uid int64
	if uidParam := c.Query("uid"); uidParam != "" {
		uid, _ = strconv.ParseInt(uidParam, 10, 64)
	} else if emailParam := c.Query("email"); emailParam != "" {
		config.DB.QueryRow("SELECT id FROM users WHERE email = ?", emailParam).Scan(&uid)
	}

	if uid == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーIDまたはメールアドレスが必要です"})
		return
	}

	query := `SELECT id, event_date, company_name, event_title, 
	                 TIME_FORMAT(start_time, '%H:%i'), TIME_FORMAT(end_time, '%H:%i'),
	                 description, created_from_mail_id
	          FROM events 
	          WHERE user_id = ? 
	          ORDER BY event_date ASC, start_time ASC`

	rows, err := config.DB.Query(query, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "イベント取得に失敗しました"})
		return
	}
	defer rows.Close()

	var events []Event
	for rows.Next() {
		var event Event
		var startTime, endTime string
		var description, mailID *string

		if err := rows.Scan(&event.ID, &event.Date, &event.Company, &event.Title, &startTime, &endTime, &description, &mailID); err != nil {
			continue
		}

		event.Time = fmt.Sprintf("%s - %s", startTime, endTime)
		if description != nil {
			event.Description = *description
		}
		if mailID != nil {
			event.CreatedFromMailID = *mailID
		}

		events = append(events, event)
	}

	if events == nil {
		events = []Event{}
	}

	c.JSON(http.StatusOK, events)
}

// ==========================================
// 3. ➕ イベントを作成
// ==========================================
func CreateEventHandler(c *gin.Context) {
	var req struct {
		Company           string `json:"company" binding:"required"`
		Title             string `json:"title" binding:"required"`
		Date              string `json:"date" binding:"required"`
		StartTime         string `json:"start_time" binding:"required"`
		EndTime           string `json:"end_time" binding:"required"`
		Description       string `json:"description"`
		CreatedFromMailID string `json:"created_from_mail_id"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, _, err := resolveUserAccessToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	var uid int64
	if uidParam := c.Query("uid"); uidParam != "" {
		uid, _ = strconv.ParseInt(uidParam, 10, 64)
	} else if emailParam := c.Query("email"); emailParam != "" {
		config.DB.QueryRow("SELECT id FROM users WHERE email = ?", emailParam).Scan(&uid)
	}

	if uid == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーIDが必要です"})
		return
	}

	// 日付と時刻のバリデーション
	if _, err := time.Parse("2006-01-02", req.Date); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "日付の形式が不正です（YYYY-MM-DD）"})
		return
	}

	// イベントをデータベースに挿入
	query := `INSERT INTO events (user_id, company_name, event_title, event_date, start_time, end_time, description, created_from_mail_id)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`

	result, err := config.DB.Exec(query, uid, req.Company, req.Title, req.Date, req.StartTime, req.EndTime, req.Description, req.CreatedFromMailID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "イベントの作成に失敗しました: " + err.Error()})
		return
	}

	lastID, _ := result.LastInsertId()
	c.JSON(http.StatusCreated, gin.H{
		"id":      lastID,
		"message": "イベントが正常に作成されました",
	})
}

// ==========================================
// 4. ✏️ イベントを更新
// ==========================================
func UpdateEventHandler(c *gin.Context) {
	var req struct {
		Company     string `json:"company" binding:"required"`
		Title       string `json:"title" binding:"required"`
		Date        string `json:"date" binding:"required"`
		StartTime   string `json:"start_time" binding:"required"`
		EndTime     string `json:"end_time" binding:"required"`
		Description string `json:"description"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, _, err := resolveUserAccessToken(c); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	uid, err := eventUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if _, err := time.Parse("2006-01-02", req.Date); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "日付の形式が不正です（YYYY-MM-DD）"})
		return
	}

	result, err := config.DB.Exec(`UPDATE events
		SET company_name = ?, event_title = ?, event_date = ?, start_time = ?, end_time = ?, description = ?
		WHERE id = ? AND user_id = ?`, req.Company, req.Title, req.Date, req.StartTime, req.EndTime, req.Description, c.Param("id"), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "イベントの更新に失敗しました: " + err.Error()})
		return
	}
	if count, _ := result.RowsAffected(); count == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "イベントが見つかりません"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "イベントが正常に更新されました"})
}

// ==========================================
// 5. 🗑️ イベントを削除
// ==========================================
func DeleteEventHandler(c *gin.Context) {
	eventID := c.Param("id")

	_, _, err := resolveUserAccessToken(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	uid, err := eventUserID(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	query := "DELETE FROM events WHERE id = ? AND user_id = ?"
	result, err := config.DB.Exec(query, eventID, uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "イベント削除に失敗しました"})
		return
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "イベントが見つかりません"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "イベントが削除されました"})
}

func eventUserID(c *gin.Context) (int64, error) {
	if uidParam := c.Query("uid"); uidParam != "" {
		uid, err := strconv.ParseInt(uidParam, 10, 64)
		if err != nil || uid == 0 {
			return 0, fmt.Errorf("ユーザーIDの形式が正しくありません")
		}
		return uid, nil
	}
	if emailParam := c.Query("email"); emailParam != "" {
		var uid int64
		if err := config.DB.QueryRow("SELECT id FROM users WHERE email = ?", emailParam).Scan(&uid); err != nil {
			return 0, fmt.Errorf("ユーザーが見つかりません")
		}
		return uid, nil
	}
	return 0, fmt.Errorf("ユーザーIDまたはメールアドレスが必要です")
}
