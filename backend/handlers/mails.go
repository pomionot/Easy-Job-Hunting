package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"Easy-Job-Hunting/auth"
	"Easy-Job-Hunting/config"
	"Easy-Job-Hunting/models"

	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

func HandleFetchMails(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	w.Header().Set("Content-Type", "application/json")

	var accessToken, refreshToken string
	var expiry time.Time
	
	// config.DB からデータを取得
	err := config.DB.QueryRow("SELECT access_token, refresh_token, expiry FROM users WHERE email = ?", "test@example.com").Scan(&accessToken, &refreshToken, &expiry)
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
	client := auth.GoogleOauthConfig.Client(ctx, token)

	srv, err := gmail.NewService(ctx, option.WithHTTPClient(client))
	if err != nil {
		http.Error(w, "Gmailサービスの起動に失敗しました: "+err.Error(), http.StatusInternalServerError)
		return
	}

	query := config.BuildGmailQuery()
	user := "me"
	rList, err := srv.Users.Messages.List(user).Q(query).MaxResults(5).Do()
	if err != nil {
		http.Error(w, "メール一覧の取得に失敗しました: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var jobMails []models.JobMail

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

		jobMails = append(jobMails, models.JobMail{
			ID:      m.Id,
			Company: company,
			Subject: subject,
			Date:    date,
		})
	}

	json.NewEncoder(w).Encode(jobMails)
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