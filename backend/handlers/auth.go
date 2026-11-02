package handlers

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func authenticatedUserID(c *gin.Context) (uuid.UUID, error) {
	value, exists := c.Get("userID")
	if !exists {
		return uuid.Nil, fmt.Errorf("認証済みユーザーIDがありません")
	}

	switch userID := value.(type) {
	case uuid.UUID:
		if userID != uuid.Nil {
			return userID, nil
		}
	case string:
		parsed, err := uuid.Parse(userID)
		if err == nil && parsed != uuid.Nil {
			return parsed, nil
		}
	}

	return uuid.Nil, fmt.Errorf("認証済みユーザーIDが不正です")
}
