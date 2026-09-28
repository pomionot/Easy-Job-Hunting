package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetRoadmapUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("Query uid exists", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req, _ := http.NewRequest("GET", "/api/companies/1/roadmap?uid=42", nil)
		c.Request = req

		uid, err := getRoadmapUserID(c)
		if err != nil {
			t.Fatalf("予期せぬエラー: %v", err)
		}
		if uid != 42 {
			t.Fatalf("期待値 42, 実際: %d", uid)
		}
	})

	t.Run("Missing uid and email", func(t *testing.T) {
		w := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(w)
		req, _ := http.NewRequest("GET", "/api/companies/1/roadmap", nil)
		c.Request = req

		_, err := getRoadmapUserID(c)
		if err == nil {
			t.Fatal("エラーが返るべきですがnilでした")
		}
	})
}

func TestRoadmapProgressCalculation(t *testing.T) {
	steps := []RoadmapStep{
		{ID: 1, Title: "企業研究", Status: "completed", NextAction: "競合調査"},
		{ID: 2, Title: "ES提出", Status: "completed", NextAction: "志望動機推敲"},
		{ID: 3, Title: "一次面接", Status: "current", NextAction: "自己PR練習"},
		{ID: 4, Title: "二次面接", Status: "pending", NextAction: "深掘り対策"},
	}

	total := len(steps)
	completed := 0
	var current *RoadmapStep
	for _, s := range steps {
		if s.Status == "completed" {
			completed++
		} else if s.Status == "current" && current == nil {
			stepCopy := s
			current = &stepCopy
		}
	}

	progress := (completed * 100) / total
	if progress != 50 {
		t.Fatalf("進捗率計算が不正です: 期待値 50%%, 実際 %d%%", progress)
	}

	if current == nil || current.Title != "一次面接" {
		t.Fatalf("現在地判定が不正です: %v", current)
	}

	if current.NextAction != "自己PR練習" {
		t.Fatalf("次に行うべきことの取得が不正です: %s", current.NextAction)
	}
}
