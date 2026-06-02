package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

var (
	googleOauthConfig *oauth2.Config
	db                *sql.DB
)

type JobMail struct {
	ID      string `json:"id"`
	Company string `json:"company"`
	Subject string `json:"subject"`
	Date    string `json:"date"`
}

func main() {
	googleOauthConfig = &oauth2.Config{
		RedirectURL:  "http://localhost:8080/auth/callback",
		ClientID:     "YOUR_CLIENT_ID.apps.googleusercontent.com", // ★ご自身のIDに置き換えてください
		ClientSecret: "YOUR_CLIENT_SECRET",                       // ★ご自身のシークレットに置き換えてください
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/gmail.readonly"},
		Endpoint:     google.Endpoint,
	}

	var err error
	dst := "root:root@tcp(127.0.0.1:3306)/easy_job_hunting?parseTime=true"
	db, err = sql.Open("mysql", dst)
	if err != nil {
		log.Fatal("データベースの接続設定に失敗しました: ", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatal("MySQLに接続できませんでした。Dockerコンテナが起動しているか確認してください: ", err)
	}
	fmt.Println("MySQLへの接続に成功しました。")

	// ログインURLを発行するAPI
	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		url := googleOauthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline, oauth2.ApprovalForce)
		w.Write([]byte(url))
	})

	// Googleからのコールバックを受け取るAPI
	http.HandleFunc("/auth/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "認証コード（Code）が見つかりません", http.StatusBadRequest)
			return
		}

		token, err := googleOauthConfig.Exchange(context.Background(), code)
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
		_, err = db.Exec(insertQuery, testEmail, token.AccessToken, token.RefreshToken, token.Expiry)
		if err != nil {
			http.Error(w, "データベースへの保存に失敗しました: "+err.Error(), http.StatusInternalServerError)
			return
		}

		frontEndURL := "http://localhost:5173/?login=success"
		http.Redirect(w, r, frontEndURL, http.StatusSeeOther)
	})

	// カレンダー用API
	http.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Content-Type", "application/json")
		jsonEvents := `[
			{"id": 1, "date": "2026-05-25", "company": "株式会社スタンバイ", "title": "一次選考（オンライン面接）", "time": "14:00 - 15:00"},
			{"id": 2, "date": "2026-05-25", "company": "未来ソリューションズ", "title": "会社説明会", "time": "16:00 - 17:30"},
			{"id": 3, "date": "2026-05-28", "company": "TechInnovation", "title": "最終面接（対面）", "time": "11:00 - 12:00"}
		]`
		w.Write([]byte(jsonEvents))
	})

	// Gmailから就活メールをスキャンして取得するAPI
	http.HandleFunc("/api/fetch-mails", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Content-Type", "application/json")

		var accessToken, refreshToken string
		var expiry time.Time
		err := db.QueryRow("SELECT access_token, refresh_token, expiry FROM users WHERE email = ?", "test@example.com").Scan(&accessToken, &refreshToken, &expiry)
		if err != nil {
			http.Error(w, "認証トークンが見つかりません。先にログインを行ってください: "+err.Error(), http.StatusUnauthorized)
			return
		}

		token := &oauth2.Token{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			Expiry:       expiry,
		}
		ctx := context.Background()
		client := googleOauthConfig.Client(ctx, token)

		srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
		if err != nil {
			http.Error(w, "Gmailサービスの起動に失敗しました: "+err.Error(), http.StatusInternalServerError)
			return
		}

		query := "面接 OR 選考 OR インターン"
		user := "me"
		rList, err := srv.Users.Messages.List(user).Q(query).MaxResults(5).Do()
		if err != nil {
			http.Error(w, "メール一覧の取得に失敗しました: "+err.Error(), http.StatusInternalServerError)
			return
		}

		var jobMails []JobMail

		for _, m := range rList.Messages {
			msg, err := srv.Users.Messages.Get(user, m.Id).Do()
			if err != nil {
				continue
			}

			var subject, from, date string
			for _, header := range msg.Payload.Headers {
				switch header.Name {
				case "Subject":
					subject = header.Value
				case "From":
					from = header.Value
				case "Date":
					date = header.Value
				}
			}

			company := extractCompanyName(from)

			jobMails = append(jobMails, JobMail{
				ID:      m.Id,
				Company: company,
				Subject: subject,
				Date:    date,
			})
		}

		json.NewEncoder(w).Encode(jobMails)
	})

	fmt.Println("サーバーがポート 8080 で起動しました。 http://localhost:8080/login")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func extractCompanyName(from string) string {
	if idx := strings.Index(from, "<"); idx != -1 {
		from = from[:idx]
	}
	from = strings.TrimSpace(strings.ReplaceAll(from, "\"", ""))
	if from == "" {
		return "不明な企業"
	}
	return from
}