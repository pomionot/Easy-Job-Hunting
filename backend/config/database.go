package config

import (
	"fmt"
	"log"
	"os"

	"Easy-Job-Hunting/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "root:root@tcp(127.0.0.1:3306)/easy_job_hunting?parseTime=true"
	}

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("GORMのデータベース接続設定に失敗しました: ", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("GORMのSQL接続取得に失敗しました: ", err)
	}
	if err := sqlDB.Ping(); err != nil {
		log.Fatal("MySQLに接続できませんでした。Dockerコンテナが起動しているか確認してください: ", err)
	}

	if err := DB.AutoMigrate(
		&models.User{},
		&models.Profile{},
		&models.Company{},
		&models.Event{},
		&models.MailFilterEntry{},
		&models.CompanyRoadmapStep{},
	); err != nil {
		log.Fatal("GORMのマイグレーションに失敗しました: ", err)
	}

	fmt.Println("MySQLへのGORM接続に成功しました。")
}
