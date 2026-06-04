package models

// フロントエンドに返すメールデータの構造体
type JobMail struct {
	ID      string `json:"id"`
	Company string `json:"company"`
	Subject string `json:"subject"`
	Date    string `json:"date"`
}