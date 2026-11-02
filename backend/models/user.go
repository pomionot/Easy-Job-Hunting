package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID  `gorm:"type:char(36);primaryKey" json:"id"`
	Email        string     `gorm:"size:255;not null;uniqueIndex" json:"email"`
	AccessToken  string     `gorm:"type:text" json:"-"`
	RefreshToken string     `gorm:"type:text" json:"-"`
	Expiry       *time.Time `json:"-"`
	CreatedAt    time.Time
}

func (m *User) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
