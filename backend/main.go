package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"Easy-Job-Hunting/auth"
	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func envOrDefault(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func main() {
	// 各種初期化処理の呼び出し
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}
	config.InitDB()
	defer config.DB.Close()
	if err := auth.InitOauth(); err != nil {
		log.Fatal("OAuth設定の初期化に失敗しました: ", err)
	}
	frontEndURL := strings.TrimRight(envOrDefault("FRONTEND_URL", "http://localhost:5173"), "/")
	port := strings.TrimPrefix(envOrDefault("PORT", "8080"), ":")

	r := gin.Default()

	distPath := "../frontend/dist"
	if info, err := os.Stat(distPath); err == nil && info.IsDir() {
		r.Static("/assets", distPath+"/assets")
		if _, err := os.Stat(distPath + "/favicon.svg"); err == nil {
			r.StaticFile("/favicon.svg", distPath+"/favicon.svg")
		}

		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api/") ||
				c.Request.URL.Path == "/login" ||
				strings.HasPrefix(c.Request.URL.Path, "/auth/") {
				c.JSON(http.StatusNotFound, gin.H{"error": "リソースが見つかりません"})
				return
			}
			c.File(distPath + "/index.html")
		})
	}

	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", frontEndURL)
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// ログインURLを発行するAPI
	r.GET("/login", func(c *gin.Context) {
		loginURL, err := auth.GetLoginURL()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.String(http.StatusOK, loginURL)
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

		redirectURL := fmt.Sprintf("%s/?login=success&uid=%d&email=%s", frontEndURL, userID, url.QueryEscape(loginEmail))
		c.Redirect(303, redirectURL)
	})

	// 各種APIエンドポイントを外部ハンドラーにマッピング
	r.GET("/api/events", handlers.GetEventsHandler)
	r.POST("/api/events", handlers.CreateEventHandler)
	r.PUT("/api/events/:id", handlers.UpdateEventHandler)
	r.DELETE("/api/events/:id", handlers.DeleteEventHandler)
	r.POST("/api/extract-event", handlers.ExtractEventFromMailHandler)
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

	// 企業ロードマップ関連API
	r.GET("/api/companies/:id/roadmap", handlers.GetCompanyRoadmapHandler)
	r.POST("/api/companies/:id/roadmap/init", handlers.InitCompanyRoadmapHandler)
	r.POST("/api/companies/:id/roadmap/steps", handlers.AddRoadmapStepHandler)
	r.PUT("/api/companies/:id/roadmap/steps/:step_id", handlers.UpdateRoadmapStepHandler)
	r.DELETE("/api/companies/:id/roadmap/steps/:step_id", handlers.DeleteRoadmapStepHandler)
	r.PUT("/api/companies/:id/roadmap/current", handlers.SetCurrentRoadmapStepHandler)
	r.GET("/api/roadmaps/summary", handlers.GetRoadmapSummaryHandler)
	r.POST("/api/companies/:id/roadmap/advice", handlers.GetRoadmapAdviceHandler)

	fmt.Printf("サーバーがポート %s で起動しました。 http://localhost:%s/login\n", port, port)
	log.Fatal(r.Run(":" + port))
}
