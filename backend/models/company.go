package models

import (
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Company struct {
	ID           uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	UserID       uuid.UUID `gorm:"type:char(36);not null;index" json:"user_id"`
	CompanyName  string    `gorm:"size:255;not null" json:"company_name"`
	Industry     string    `gorm:"size:255" json:"industry"`
	BusinessType string    `gorm:"size:255" json:"business_type"`
	HomepageURL  string    `gorm:"size:500" json:"homepage_url"`
	Status       string    `gorm:"size:50" json:"status"`
}

func (m *Company) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
