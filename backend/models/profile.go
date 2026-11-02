package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Profile struct {
	UserID         uuid.UUID `gorm:"type:char(36);primaryKey" json:"user_id"`
	Name           string    `gorm:"size:100"`
	University     string    `gorm:"size:100"`
	Faculty        string    `gorm:"size:100"`
	TargetIndustry string    `gorm:"size:100"`
	SelfPR         string    `gorm:"type:text"`
}

func (m *Profile) BeforeCreate(tx *gorm.DB) error { return nil }
