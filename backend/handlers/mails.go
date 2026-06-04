package handlers

import (
	"context"
	"fmt"
	"net/http"

	"Easy-Job-Hunting/config"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

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
	currentUserEmail := "naoto.7010.minagawa@gmail.com"

	var accessToken string
	// 🔑 ログイン中のメールアドレスに紐づくトークンをピンポイントで取得
	err := config.DB.QueryRow("SELECT access_token FROM users WHERE email = ?", currentUserEmail).Scan(&accessToken)
	if err != nil {
		fmt.Printf("❌ [一覧-DBエラー] メールアドレス '%s' のトークンが見つかりません: %v\n", currentUserEmail, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "トークンが見つかりません"})
		return
	}

	// 💡 ログ1: トークン取得チェック
	if len(accessToken) > 10 {
		fmt.Printf("🔑 [一覧-DB成功] トークンを取得しました (冒頭: %s...)\n", accessToken[:10])
	} else {
		fmt.Println("⚠️ [一覧-DB警告] トークンが空か極端に短いです:", accessToken)
	}

	token := &oauth2.Token{AccessToken: accessToken}
	client := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))

	query := config.BuildGmailQuery()
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
	currentUserEmail := "naoto.7010.minagawa@gmail.com"

	var accessToken string
	err := config.DB.QueryRow("SELECT access_token FROM users WHERE email = ?", currentUserEmail).Scan(&accessToken)
	if err != nil {
		fmt.Printf("❌ [詳細-DBエラー] トークンが見つかりません: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "MySQLからのトークン取得に失敗しました"})
		return
	}

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