package middleware

import (
	"net/http"

	"github.com/gin-contrib/sessions"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const UserIDSessionKey = "userID"

func AuthRequired(c *gin.Context) {
	session := sessions.Default(c)
	userID := session.Get(UserIDSessionKey)
	if userID == nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "認証が必要です"})
		return
	}

	userIDString, ok := userID.(string)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "認証情報が不正です"})
		return
	}
	parsedUserID, err := uuid.Parse(userIDString)
	if err != nil || parsedUserID == uuid.Nil {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "認証情報が不正です"})
		return
	}

	c.Set(UserIDSessionKey, parsedUserID)
	c.Next()
}
