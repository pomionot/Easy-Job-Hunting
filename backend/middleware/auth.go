package middleware

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
)

const UserIDSessionKey = "userID"

func AuthRequired(c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get(UserIDSessionKey)
	if userID == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	c.Set(UserIDSessionKey, userID)
	c.Next()
}
