package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"Easy-Job-Hunting/auth"
	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/handlers"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
)

func main() {
	// 各種初期化処理の呼び出し
	config.InitDB()
	defer config.DB.Close()
	auth.InitOauth()

	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:5173")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// ログインURLを発行するAPI
	r.GET("/login", func(c *gin.Context) {
		url := auth.GoogleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline, oauth2.ApprovalForce)
		c.String(200, url)
	})

	// Googleからのコールバックを受け取るAPI
	r.GET("/auth/callback", func(c *gin.Context) {
		code := c.Query("code")
		if code == "" {
			c.JSON(400, gin.H{"error": "認証コード（Code）が見つかりません"})
			return
		}

		token, err := auth.GoogleOauthConfig.Exchange(context.Background(), code)
		if err != nil {
			c.JSON(500, gin.H{"error": "トークンの交換に失敗しました: " + err.Error()})
			return
		}

		// 💡 ここを test@example.com からご自身のアドレスに変更！
		testEmail := "naoto.7010.minagawa@gmail.com"
		insertQuery := `
			INSERT INTO users (email, access_token, refresh_token, expiry)
			VALUES (?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
			access_token = VALUES(access_token),
			refresh_token = VALUES(refresh_token),
			expiry = VALUES(expiry);
		`
		_, err = config.DB.Exec(insertQuery, testEmail, token.AccessToken, token.RefreshToken, token.Expiry)
		if err != nil {
			c.JSON(500, gin.H{"error": "データベースへの保存に失敗しました: " + err.Error()})
			return
		}

		frontEndURL := "http://localhost:5173/?login=success"
		c.Redirect(303, frontEndURL)
	})

	// 各種APIエンドポイントを外部ハンドラーにマッピング
	r.GET("/api/events", handlers.HandleEvents)
	r.GET("/api/fetch-mails", handlers.HandleFetchMails)
	r.GET("/api/mails/:id", handlers.GetMailDetailHandler)

	fmt.Println("サーバーがポート 8080 で起動しました。 http://localhost:8080/login")
	log.Fatal(r.Run(":8080"))
}