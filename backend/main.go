package main

import (
	"context"
	"fmt"
	"log"
	"net/http"

	"Easy-Job-Hunting/auth"
	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/handlers"

	"golang.org/x/oauth2"
)

func main() {
	// 各種初期化処理の呼び出し
	config.InitDB()
	defer config.DB.Close()
	auth.InitOauth()

	// ログインURLを発行するAPI
	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		url := auth.GoogleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline, oauth2.ApprovalForce)
		w.Write([]byte(url))
	})

	// Googleからのコールバックを受け取るAPI
	http.HandleFunc("/auth/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "認証コード（Code）が見つかりません", http.StatusBadRequest)
			return
		}

		token, err := auth.GoogleOauthConfig.Exchange(context.Background(), code)
		if err != nil {
			http.Error(w, "トークンの交換に失敗しました: "+err.Error(), http.StatusInternalServerError)
			return
		}

		testEmail := "test@example.com"
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
			http.Error(w, "データベースへの保存に失敗しました: "+err.Error(), http.StatusInternalServerError)
			return
		}

		frontEndURL := "http://localhost:5173/?login=success"
		http.Redirect(w, r, frontEndURL, http.StatusSeeOther)
	})

	// 各種APIエンドポイントを外部ハンドラーにマッピング
	http.HandleFunc("/api/events", handlers.HandleEvents)
	http.HandleFunc("/api/fetch-mails", handlers.HandleFetchMails)

	fmt.Println("サーバーがポート 8080 で起動しました。 http://localhost:8080/login")
	log.Fatal(http.ListenAndServe(":8080", nil))
}