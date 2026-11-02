package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type MailFilterEntry struct {
	ID        uuid.UUID `gorm:"type:char(36);primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:char(36);not null;index;uniqueIndex:uk_mail_filter_entries" json:"user_id"`
	EntryType string    `gorm:"size:16;not null;uniqueIndex:uk_mail_filter_entries" json:"type"`
	Email     string    `gorm:"size:255;not null;uniqueIndex:uk_mail_filter_entries" json:"email"`
	CreatedAt time.Time
}

func (m *MailFilterEntry) BeforeCreate(tx *gorm.DB) error {
	if m.ID == uuid.Nil {
		m.ID = uuid.New()
	}
	return nil
}
