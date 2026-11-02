package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CompanyRoadmapStep struct {
	ID         uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	CompanyID  uuid.UUID `gorm:"type:char(36);not null;index" json:"company_id"`
	UserID     uuid.UUID `gorm:"type:char(36);not null;index" json:"user_id"`
	StepOrder  int       `gorm:"not null" json:"step_order"`
	Title      string    `gorm:"size:255;not null" json:"title"`
	Status     string    `gorm:"size:50;not null" json:"status"`
	TargetDate string    `gorm:"size:50" json:"target_date"`
	NextAction string    `gorm:"type:text" json:"next_action"`
	Notes      string    `gorm:"type:text" json:"notes"`
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (m *CompanyRoadmapStep) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
