package auth

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var GoogleOauthConfig *oauth2.Config

func InitOauth() {
	if err := godotenv.Load(); err != nil {
		log.Println(".envの読み込みに失敗したけど、そのまま環境変数を見にいくで: ", err)
	}

	GoogleOauthConfig = &oauth2.Config{
		RedirectURL:  "http://localhost:8080/auth/callback",
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/gmail.readonly"},
		Endpoint:     google.Endpoint,
	}
}