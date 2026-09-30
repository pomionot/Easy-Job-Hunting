package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCreateEventHandlerValidatesRequiredFields(t *testing.T) {
	gin.SetMode(gin.TestMode)
	writer := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(writer)
	context.Request = httptest.NewRequest(http.MethodPost, "/api/events", strings.NewReader(`{"company":"","title":"面接"}`))
	context.Request.Header.Set("Content-Type", "application/json")

	CreateEventHandler(context)

	if writer.Code != http.StatusBadRequest {
		t.Fatalf("ステータスコード: got %d, want %d", writer.Code, http.StatusBadRequest)
	}
}

func TestExtractEventFromMailHandlerRequiresGeminiKey(t *testing.T) {
	gin.SetMode(gin.TestMode)
	t.Setenv("GEMINI_API_KEY", "")
	writer := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(writer)
	context.Request = httptest.NewRequest(http.MethodPost, "/api/extract-event", strings.NewReader(`{"subject":"面接案内","body":"2026-10-02 10:00","from":"hr@example.com"}`))
	context.Request.Header.Set("Content-Type", "application/json")

	ExtractEventFromMailHandler(context)

	if writer.Code != http.StatusInternalServerError {
		t.Fatalf("ステータスコード: got %d, want %d", writer.Code, http.StatusInternalServerError)
	}
}
