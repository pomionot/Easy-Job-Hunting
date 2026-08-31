package handlers

import (
	"Easy-Job-Hunting/config"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// AIRequest フロントから届くリクエスト
type AIRequest struct {
	UserID     int    `json:"user_id"` // 👤 ユーザー情報を参照するために追加
	CompanyID  int    `json:"company_id"`
	PromptType string `json:"prompt_type"` // "research" または "motive"
}

// Geminiのデータ構造定義
type GeminiContent struct {
	Parts []GeminiPart `json:"parts"`
}
type GeminiPart struct {
	Text string `json:"text"`
}
type GeminiRequest struct {
	Contents         []GeminiContent        `json:"contents"`
	GenerationConfig map[string]interface{} `json:"generationConfig,omitempty"`
}
type GeminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

// AnalyzeCompanyHandler Gemini APIを叩いて解析するハンドラー
func AnalyzeCompanyHandler(c *gin.Context) {
	var req AIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "リクエストの解析に失敗しました"})
		return
	}

	// 1. データベースから企業の詳細情報を取得する
	var companyName, industry, businessType string
	companyQuery := "SELECT company_name, industry, business_type FROM companies WHERE id = ?;"
	err := config.DB.QueryRow(companyQuery, req.CompanyID).Scan(&companyName, &industry, &businessType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "企業情報の取得に失敗しました"})
		return
	}

	// 2. データベースからユーザーのプロフィール情報（スキル・自己PR・研究内容など）を取得する
	// 💡 実際のテーブル名やカラム名（skills, pr, bio など）に合わせて変更してください
	var userSkills, userPR string
	userQuery := "SELECT skills, self_pr FROM users WHERE id = ?;"
	err = config.DB.QueryRow(userQuery, req.UserID).Scan(&userSkills, &userPR)
	if err != nil {
		// プロフィールが空、または未登録の場合のフォールバック
		userSkills = "Webアプリケーション開発への興味"
		userPR = "技術学習に対する意欲"
	}

	// 3. プロンプトの組み立て（プロフィール情報をインジェクション）
	var systemPrompt string
	if req.PromptType == "motive" {
		systemPrompt = fmt.Sprintf(`あなたはプロのキャリアアドバイザーです。
以下の「企業情報」と「就カツ生のプロフィール」をもとに、新卒採用向けの説得力のある「志望動機（300文字〜400文字程度）」を作成してください。

【企業情報】
・企業名: %s
・業界: %s
・業種: %s

【就活生のプロフィール・強み】
・保有スキルや経験: %s
・自己PR・学生時代に注力したこと: %s

【出力フォーマット】
以下の構成で、プロフィールにある強みや経験が企業の事業内容とどのように結びついているかが明確に伝わる文章を作成してください。
■ 結論（なぜこの企業なのか、何に魅力を感じたか）
■ 理由（自身の経験・スキルが、企業の業界・業種や強みとどうマッチしているか）
■ 入社後に挑戦したいこと（自身の技術や強みを活かしてどう貢献したいか）`,
			companyName, industry, businessType, userSkills, userPR)

	} else {
		systemPrompt = fmt.Sprintf(`あなたは優秀な企業研究アナリストです。
以下の「企業情報」と「就カツ生のプロフィール」を掛け合わせ、就職活動の企業研究として役立つ「企業の強みと自分とのシナジー」および「面接での予想質問」を分析してください。

【企業情報】
・企業名: %s
・業界: %s
・業種: %s

【就活生のプロフィール・強み】
・保有スキルや経験: %s
・自己PR: %s

【出力フォーマット】
必ず以下の見出しと箇条書きの形式で出力してください。

### 🏢 この企業の3つの強みとあなたとの親和性
1. [強みのタイトル]：企業の強みの説明と、あなたのスキル（%s）や経験がそこでどう活かせるかの考察
2. [強みのタイトル]：企業の強みの説明とシナジー
3. [強みのタイトル]：企業の強みの説明とシナジー

### 💬 あなたのプロフィールを踏まえて面接で予想される質問
1. **[質問内容]** （例：プロフィールにある技術経験や研究を、当社の事業でどう再現するか等）
   - *この質問の意図・対策:* 就活生がどう答えるべきかのワンポイントアドバイス
2. **[質問内容]**
   - *この質問の意図・対策:* ワンポイントアドバイス
3. **[質問内容]**
   - *この質問の意図・対策:* ワンポイントアドバイス`,
			companyName, industry, businessType, userSkills, userPR, userSkills)
	}

	// 4. Gemini APIキーの取得
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "GeminiのAPIキーが設定されていません"})
		return
	}

	geminiURL := fmt.Sprintf("https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=%s", apiKey)

	// 5. APIリクエストの作成
	geminiReqBody := GeminiRequest{
		Contents: []GeminiContent{
			{
				Parts: []GeminiPart{
					{Text: systemPrompt},
				},
			},
		},
	}

	jsonData, _ := json.Marshal(geminiReqBody)
	resp, err := http.Post(geminiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gemini APIへの通信に失敗しました"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		log.Printf("🚨 Gemini API Error (Status %d): %s", resp.StatusCode, string(bodyBytes))
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Gemini APIがエラーを返しました (Status %d)", resp.StatusCode)})
		return
	}

	var geminiResp GeminiResponse
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Geminiの応答解析に失敗しました"})
		return
	}

	responseText := "解析結果を取得できませんでした。"
	if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
		responseText = geminiResp.Candidates[0].Content.Parts[0].Text
	}

	c.JSON(http.StatusOK, gin.H{"result": responseText})
}
