package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"Easy-Job-Hunting/auth" // モジュール名に合わせて調整してください

	_ "github.com/go-sql-driver/mysql" // MySQLドライバーのインポート
	"github.com/joho/godotenv"
)

var db *sql.DB

func main() {
	// 1. .env ファイルを読み込む
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// 2. MySQLに接続する
	dsn := os.Getenv("MYSQL_DSN")
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// 接続確認（Pingを打つ）
	err = db.Ping()
	if err != nil {
		log.Fatal("MySQLへの接続に失敗したで: ", err)
	}
	fmt.Println("MySQLへの接続に成功したで！")

	// 3. アプリ起動時にusersテーブルを自動作成する
	createTableQuery := `
	CREATE TABLE IF NOT EXISTS users (
		id INT AUTO_INCREMENT PRIMARY KEY,
		email VARCHAR(255) NOT NULL UNIQUE,
		access_token TEXT NOT NULL,
		refresh_token TEXT,
		expiry DATETIME,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`
	_, err = db.Exec(createTableQuery)
	if err != nil {
		log.Fatal("テーブル作成に失敗したで: ", err)
	}

	// Google OAuthの設定を初期化
	auth.InitGoogleOAuth()

	// ログインURLを表示するAPI
	http.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		url := auth.GetLoginURL()
		fmt.Fprintf(w, "このURLにブラウザでアクセスしてね:\n\n%s", url)
	})

	// Googleからのコールバックを受け取るAPI
	http.HandleFunc("/auth/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "Code not found", http.StatusBadRequest)
			return
		}

		// 認可コードをトークンに交換
		ctx := r.Context()
		token, err := auth.GoogleConfig.Exchange(ctx, code)
		if err != nil {
			http.Error(w, "Failed to exchange token: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// ★手に入れたトークン（鍵）をMySQLに保存・更新する
		// 今回は簡易的にテスト用の固定メールアドレスで保存します
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
			http.Error(w, "DBへの保存に失敗したで: "+err.Error(), http.StatusInternalServerError)
			return
		}
		frontEndURL := "http://localhost:5173/?login=success"
		http.Redirect(w, r, frontEndURL, http.StatusSeeOther)
	})

	fmt.Println("サーバーがポート 8080 で起動したで！ http://localhost:8080/login")
	log.Fatal(http.ListenAndServe(":8080", nil))
}