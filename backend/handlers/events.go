package handlers

import (
	"net/http"
)

func HandleEvents(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
    w.Header().Set("Content-Type", "application/json")
    jsonEvents := `[
        {"id": 1, "date": "2026-05-25", "company": "株式会社スタンバイ", "title": "一次選考（オンライン面接）", "time": "14:00 - 15:00"},
        {"id": 2, "date": "2026-05-25", "company": "未来ソリューションズ", "title": "会社説明会", "time": "16:00 - 17:30"},
        {"id": 3, "date": "2026-05-28", "company": "TechInnovation", "title": "最終面接（対面）", "time": "11:00 - 12:00"}
    ]`
    w.Write([]byte(jsonEvents))
}
