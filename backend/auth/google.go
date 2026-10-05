package auth

import (
	"fmt"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/gmail/v1"
)

// GoogleConfig はOAuth2の設定を保持するグローバル変数
var GoogleConfig *oauth2.Config

// InitGoogleOAuth は.envから環境変数を読み込んでOAuth2の設定を初期化する
func InitGoogleOAuth() {
	redirectURL := os.Getenv("REDIRECT_URL")
	if redirectURL == "" {
		redirectURL = os.Getenv("GOOGLE_REDIRECT_URL")
	}
	if redirectURL == "" {
		redirectURL = "http://localhost:8080/auth/callback"
	}

	GoogleConfig = &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  redirectURL,
		Endpoint:     google.Endpoint,
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email", // メールアドレス取得用
			gmail.GmailReadonlyScope,                         // Gmail読み取り用 (全自動のため)
		},
	}
}

// GetLoginURL はユーザーをリダイレクトさせるGoogleのログイン画面のURLを生成する
func GetLoginURL() (string, error) {
	if GoogleOauthConfig == nil || GoogleOauthConfig.Endpoint.AuthURL == "" {
		return "", fmt.Errorf("OAuth設定が初期化されていません")
	}

	// "state" はセキュリティのためのランダムな文字列（今回は簡易的に"state-token"としています）
	return GoogleOauthConfig.AuthCodeURL(
		"state-token",
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "select_account"),
	), nil
}
