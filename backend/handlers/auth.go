package handlers

import (
	"fmt"
	"strconv"

	"github.com/gin-gonic/gin"
)

func authenticatedUserID(c *gin.Context) (int64, error) {
	value, exists := c.Get("userID")
	if !exists {
		return 0, fmt.Errorf("認証済みユーザーIDがありません")
	}

	switch userID := value.(type) {
	case int64:
		if userID > 0 {
			return userID, nil
		}
	case int:
		if userID > 0 {
			return int64(userID), nil
		}
	case string:
		parsed, err := strconv.ParseInt(userID, 10, 64)
		if err == nil && parsed > 0 {
			return parsed, nil
		}
	}

	return 0, fmt.Errorf("認証済みユーザーIDが不正です")
}
