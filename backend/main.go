package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"

	"Easy-Job-Hunting/auth"
	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
)

func main() {
	// 各種初期化処理の呼び出し
	err := godotenv.Load()
	if err != nil{
		log.Println("Error loading .env file")
	}
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

		client := auth.GoogleOauthConfig.Client(context.Background(), token)
		resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
		if err != nil {
			c.JSON(500, gin.H{"error": "ユーザー情報の取得に失敗しました: " + err.Error()})
			return
		}
		defer resp.Body.Close()

		var userInfo struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
			c.JSON(500, gin.H{"error": "ユーザー情報の解析に失敗しました: " + err.Error()})
			return
		}

		loginEmail := userInfo.Email
		if loginEmail == "" {
			c.JSON(500, gin.H{"error": "Googleアカウントのメールアドレスが取得できませんでした"})
			return
		}

		insertQuery := `
			INSERT INTO users (email, access_token, refresh_token, expiry)
			VALUES (?, ?, ?, ?)
			ON DUPLICATE KEY UPDATE
			access_token = VALUES(access_token),
			refresh_token = VALUES(refresh_token),
			expiry = VALUES(expiry);
		`
		_, err = config.DB.Exec(insertQuery, loginEmail, token.AccessToken, token.RefreshToken, token.Expiry)
		if err != nil {
			c.JSON(500, gin.H{"error": "データベースへの保存に失敗しました: " + err.Error()})
			return
		}

		var userID int64
		err = config.DB.QueryRow("SELECT id FROM users WHERE email = ?", loginEmail).Scan(&userID)
		if err != nil {
			c.JSON(500, gin.H{"error": "ユーザーIDの取得に失敗しました: " + err.Error()})
			return
		}

		frontEndURL := fmt.Sprintf("http://localhost:5173/?login=success&uid=%d&email=%s", userID, url.QueryEscape(loginEmail))
		c.Redirect(303, frontEndURL)
	})

	// 各種APIエンドポイントを外部ハンドラーにマッピング
	r.GET("/api/events", handlers.HandleEvents)
	r.GET("/api/fetch-mails", handlers.HandleFetchMails)
	r.GET("/api/mails/:id", handlers.GetMailDetailHandler)
	r.GET("/api/mail-filters", handlers.GetMailFilterHandler)
	r.POST("/api/mail-filters", handlers.UpdateMailFilterHandler)
	r.PUT("/api/mail-filters", handlers.UpdateMailFilterHandler)
	r.POST("/api/mail-filters/items", handlers.AddMailFilterEntryHandler)
	r.PUT("/api/mail-filters/items/:id", handlers.UpdateMailFilterEntryHandler)
	r.DELETE("/api/mail-filters/items/:id", handlers.DeleteMailFilterEntryHandler)
	r.POST("/api/profile", handlers.UpdateProfileHandler)
	r.GET("/api/profile", handlers.GetProfileHandler)
	r.POST("/api/companies", handlers.RegisterCompanyHandler)
	r.GET("/api/companies", handlers.GetCompaniesHandler)
	r.PUT("/api/companies/status", handlers.UpdateCompanyStatusHandler)
	r.POST("/api/ai/analyze", handlers.AnalyzeCompanyHandler)

	fmt.Println("サーバーがポート 8080 で起動しました。 http://localhost:8080/login")
	log.Fatal(r.Run(":8080"))
}