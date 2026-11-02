package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"Easy-Job-Hunting/middleware"

	"github.com/gin-contrib/sessions"
	"github.com/gin-contrib/sessions/cookie"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func newAuthTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-secret"))))
	api := router.Group("/api", middleware.AuthRequired)
	api.POST("/logout", logoutHandler)
	api.GET("/protected", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})
	return router
}

func TestLogoutClearsSessionAndProtectsAPI(t *testing.T) {
	router := newAuthTestRouter()
	loginRouter := gin.New()
	loginRouter.Use(sessions.Sessions("session", cookie.NewStore([]byte("test-secret"))))
	loginRouter.GET("/login", func(c *gin.Context) {
		session := sessions.Default(c)
		session.Set(middleware.UserIDSessionKey, uuid.New().String())
		if err := session.Save(); err != nil {
			t.Fatal(err)
		}
	})

	loginResponse := httptest.NewRecorder()
	loginRouter.ServeHTTP(loginResponse, httptest.NewRequest(http.MethodGet, "/login", nil))
	cookies := loginResponse.Result().Cookies()
	if len(cookies) == 0 {
		t.Fatal("login did not set a session cookie")
	}

	protectedRequest := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	protectedRequest.AddCookie(cookies[0])
	protectedResponse := httptest.NewRecorder()
	router.ServeHTTP(protectedResponse, protectedRequest)
	if protectedResponse.Code != http.StatusNoContent {
		t.Fatalf("protected endpoint before logout: got %d, want %d", protectedResponse.Code, http.StatusNoContent)
	}

	logoutRequest := httptest.NewRequest(http.MethodPost, "/api/logout", nil)
	logoutRequest.AddCookie(cookies[0])
	logoutResponse := httptest.NewRecorder()
	router.ServeHTTP(logoutResponse, logoutRequest)
	if logoutResponse.Code != http.StatusOK {
		t.Fatalf("logout: got %d, want %d", logoutResponse.Code, http.StatusOK)
	}

	clearedCookies := logoutResponse.Result().Cookies()
	if len(clearedCookies) == 0 || clearedCookies[0].MaxAge >= 0 {
		t.Fatal("logout did not expire the session cookie")
	}

	clearedRequest := httptest.NewRequest(http.MethodGet, "/api/protected", nil)
	clearedRequest.AddCookie(clearedCookies[0])
	clearedResponse := httptest.NewRecorder()
	router.ServeHTTP(clearedResponse, clearedRequest)
	if clearedResponse.Code != http.StatusUnauthorized {
		t.Fatalf("protected endpoint after logout: got %d, want %d", clearedResponse.Code, http.StatusUnauthorized)
	}
}
