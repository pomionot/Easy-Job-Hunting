package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Event struct {
	ID                uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	UserID            uuid.UUID `gorm:"type:char(36);not null;index" json:"user_id"`
	CompanyName       string    `gorm:"size:255;not null"`
	EventTitle        string    `gorm:"size:255;not null"`
	EventDate         string    `gorm:"type:date;not null"`
	StartTime         string    `gorm:"type:time;not null"`
	EndTime           string    `gorm:"type:time;not null"`
	Description       string    `gorm:"type:text"`
	CreatedFromMailID string    `gorm:"size:255"`
	CreatedAt         time.Time
	UpdatedAt         time.Time
}

func (m *Event) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
