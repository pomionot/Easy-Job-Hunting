package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strconv"

	"Easy-Job-Hunting/config"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

func resolveUserAccessToken(c *gin.Context) (string, string, error) {
	uidParam := c.Query("uid")
	if uidParam != "" {
		uid, err := strconv.ParseInt(uidParam, 10, 64)
		if err != nil {
			return "", "", fmt.Errorf("uidの形式が正しくありません")
		}

		var accessToken string
		var email string
		if err := config.DB.QueryRow("SELECT access_token, email FROM users WHERE id = ?", uid).Scan(&accessToken, &email); err != nil {
			return "", "", err
		}

		return accessToken, email, nil
	}

	emailParam := c.Query("email")
	if emailParam != "" {
		var accessToken string
		if err := config.DB.QueryRow("SELECT access_token FROM users WHERE email = ?", emailParam).Scan(&accessToken); err != nil {
			return "", "", err
		}

		return accessToken, emailParam, nil
	}

	return "", "", fmt.Errorf("uidまたはemailが必要です")
}

// MailSummary は一覧用の軽いデータ構造
type MailSummary struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
	From    string `json:"from"`
	Date    string `json:"date"`
	Snippet string `json:"snippet"`
}

// MailDetail は詳細用のフルデータ構造
type MailDetail struct {
	ID      string `json:"id"`
	Subject string `json:"subject"`
	From    string `json:"from"`
	Date    string `json:"date"`
	Body    string `json:"body"`
}

// ==========================================
// 1. 📬 メール一覧取得API（厳重ログ版）
// ==========================================
func GetMailsHandler(c *gin.Context) {
	ctx := context.Background()
	accessToken, userRef, err := resolveUserAccessToken(c)
	if err != nil {
		fmt.Printf("❌ [一覧-DBエラー] トークンが見つかりません: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var uid int64
	if c.Query("uid") != "" {
		uid, err = strconv.ParseInt(c.Query("uid"), 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "uidの形式が正しくありません"})
			return
		}
	} else if c.Query("email") != "" {
		var email string
		if err := config.DB.QueryRow("SELECT id FROM users WHERE email = ?", c.Query("email")).Scan(&uid); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "ユーザーIDの取得に失敗しました: " + err.Error()})
			return
		}
		email = c.Query("email")
		_ = email
	}

	includeEmails, excludeEmails, err := loadMailFilterSettings(uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メールフィルターの取得に失敗しました: " + err.Error()})
		return
	}

	if len(accessToken) > 10 {
		fmt.Printf("🔑 [一覧-DB成功] %s のトークンを取得しました (冒頭: %s...)\n", userRef, accessToken[:10])
	} else {
		fmt.Println("⚠️ [一覧-DB警告] トークンが空か極端に短いです:", accessToken)
	}

	token := &oauth2.Token{AccessToken: accessToken}
	client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))

	query := config.BuildGmailQuery(includeEmails, excludeEmails)
	fmt.Println("🔍 [一覧-Gmailクエリ] 実行するクエリ:", query)

	srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		fmt.Printf("❌ [一覧-Gmailエラー] サービスの初期化失敗: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "初期化失敗"})
		return
	}

	// クエリを使ってメール一覧を検索
	res, err := srv.Users.Messages.List("me").Q(query).MaxResults(10).Do()
	if err != nil {
		fmt.Printf("❌ [一覧-Gmail APIエラー] メールのリスト取得に失敗: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gmail APIの呼び出し失敗", "details": err.Error()})
		return
	}

	if res == nil || len(res.Messages) == 0 {
		fmt.Println("⚠️ [一覧-Gmail結果] APIは成功しましたが、検索結果が本当に【0件】です。")
		c.JSON(http.StatusOK, []MailSummary{})
		return
	}

	var mails []MailSummary
	fmt.Printf("✨ [一覧-Gmailヒット] %d 件のメールをパースします...\n", len(res.Messages))

	for i, m := range res.Messages {
		msg, err := srv.Users.Messages.Get("me", m.Id).Format("metadata").MetadataHeaders("Subject", "From", "Date").Do()
		if err != nil {
			fmt.Printf("❌ [一覧-%d個目] メタデータ取得エラー (ID: %s): %v\n", i, m.Id, err)
			continue
		}

		var subject, from, date string
		for _, h := range msg.Payload.Headers {
			switch h.Name {
			case "Subject":	subject = h.Value
			case "From":	from = h.Value
			case "Date":	date = h.Value
			}
		}

		fmt.Printf("📬 [一覧-%d個目] 取得成功 | 件名: %s\n", i, subject)

		mails = append(mails, MailSummary{
			ID:      m.Id,
			Subject: subject,
			From:    from,
			Date:    date,
			Snippet: msg.Snippet,
		})
	}

	c.JSON(http.StatusOK, mails)
}

// HandleFetchMails は既存ルート互換のためのラッパー
func HandleFetchMails(c *gin.Context) {
	GetMailsHandler(c)
}

// ==========================================
// 2. 👀 メール詳細（本文）取得API
// ==========================================
func GetMailDetailHandler(c *gin.Context) {
	id := c.Param("id")
	ctx := context.Background()
	accessToken, userRef, err := resolveUserAccessToken(c)
	if err != nil {
		fmt.Printf("❌ [詳細-DBエラー] トークンが見つかりません: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	_ = userRef

	token := &oauth2.Token{AccessToken: accessToken}
	client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))

	srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gmailサービスの初期化に失敗しました"})
		return
	}

	// メール本文を含めてフルで取得
	msg, err := srv.Users.Messages.Get("me", id).Format("full").Do()
	if err != nil {
		fmt.Printf("❌ [詳細-Gmailエラー] メールID %s の取得に失敗: %v\n", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "メール詳細の取得に失敗しました"})
		return
	}

	var subject, from, date string
	for _, h := range msg.Payload.Headers {
		switch h.Name {
		case "Subject":	subject = h.Value
		case "From":	from = h.Value
		case "Date":	date = h.Value
		}
	}

	body := msg.Snippet
	if msg.Payload.Body != nil && msg.Payload.Body.Data != "" {
		body = "（ここにデコードした本文が入ります）"
	}

	c.JSON(http.StatusOK, MailDetail{
		ID:      id,
		Subject: subject,
		From:    from,
		Date:    date,
		Body:    body,
	})
}